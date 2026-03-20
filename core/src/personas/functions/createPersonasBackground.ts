import { getDatabaseClient } from 'core/src/database/client';
import { log } from 'core/src/helpers/logger';
import { Cohort, CohortWeightedConfig } from 'core/src/personas/cohort.types';
import {
  createCohortConfig,
  createPersonaFromCohort,
} from 'core/src/personas/functions/cohortPersonaCreation';
import { createUsernameFromName } from 'core/src/personas/helpers/personaHelpers';
import { getPersonaIndexBackend } from 'core/src/personas/helpers/personaIndexBackend';
import {
  createTask,
  markTaskAsRunning,
  markTaskAsCompleted,
  markTaskAsFailed,
  updateTaskProgress,
} from 'core/src/tasks/tasksController';

import type { DatabaseClient } from 'core/src/database/types';
import type {
  CreatePersonasRequest,
  CreatePersonasResponse,
} from 'core/src/personas/functions/types';

/**
 * Get existing persona names from the persona index to avoid duplicates
 */
async function getExistingPersonaNames(): Promise<string[]> {
  try {
    const { personaIndex } = await getPersonaIndexBackend();
    const names = Object.values(personaIndex.personas)
      .map((persona: any) => persona.name)
      .filter((name: any) => typeof name === 'string') as string[];

    return names;
  } catch (error) {
    log.error('PERSONA', 'Error reading persona index:', error);
    return [];
  }
}

export type CreatePersonasProgressCallback = (
  current: number,
  total: number,
  message?: string
) => void;

/**
 * Create multiple personas based on a cohort prompt, saving each one as we go
 */
async function createPersonasFromPrompt(
  db: DatabaseClient,
  prompt: string,
  count: number,
  cohort: Cohort,
  existingNames: string[] = [],
  taskId?: string,
  onProgress?: CreatePersonasProgressCallback
): Promise<{
  cohortConfig: CohortWeightedConfig;
  savedPersonas: any[];
  errors: string[];
}> {
  // Generate cohort configuration
  const cohortConfig = await createCohortConfig(prompt);

  const savedPersonas: any[] = [];
  const errors: string[] = [];
  const namesUsed = new Set(existingNames);

  // Create a local copy of cohort data to avoid parameter reassignment
  let currentPersonaIds = [...(cohort.data.persona_ids || [])];

  // Process personas one by one to avoid concurrency issues
  for (let i = 0; i < count; i++) {
    try {
      onProgress?.(i + 1, count, `Creating persona ${i + 1}/${count}...`);

      const persona = await createPersonaFromCohort(cohortConfig, Array.from(namesUsed));

      // Check for duplicate names
      if (namesUsed.has(persona.details.name)) {
        errors.push(`Duplicate name generated: ${persona.details.name}`);
        continue;
      }

      persona.details.username = createUsernameFromName(persona.details.name);

      // Save persona to database and get the generated ID
      const { data: savedPersona, error: saveError } = await db
        .from('personas')
        .insert({
          ...persona,
        })
        .select('id')
        .single();

      if (saveError) {
        log.error('PERSONA', 'Error saving persona', {
          error: saveError,
          personaName: persona.details.name,
          index: i + 1,
          errorMessage: saveError.message,
          errorCode: saveError.code,
          errorDetails: saveError.details,
        });
        errors.push(`Failed to save persona ${persona.details.name}: ${saveError.message}`);
        continue;
      }

      if (!savedPersona?.id) {
        log.error('PERSONA', 'No ID returned for saved persona', {
          personaName: persona.details.name,
          savedPersona,
          index: i + 1,
        });
        errors.push(`Failed to get ID for persona ${persona.details.name}`);
        continue;
      }

      onProgress?.(i + 1, count, `Created ${persona.details.name}`);

      // Add the generated ID to the persona object
      const personaWithId = {
        ...persona,
        id: savedPersona.id,
      };

      // Update cohort with new persona ID immediately
      currentPersonaIds.push(personaWithId.id);

      const { error: cohortError } = await db
        .from('cohorts')
        .update({
          data: {
            ...cohort.data,
            persona_ids: currentPersonaIds,
            size: currentPersonaIds.length,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', cohort.id);

      if (cohortError) {
        log.error('PERSONA', 'Error updating cohort', {
          error: cohortError,
          cohortId: cohort.id,
          personaId: personaWithId.id,
          personaName: persona.details.name,
          errorMessage: cohortError.message,
          errorCode: cohortError.code,
          errorDetails: cohortError.details,
        });
        errors.push(
          `Failed to update cohort with persona ${persona.details.name}: ${cohortError.message}`
        );
      }

      namesUsed.add(persona.details.name);
      savedPersonas.push(personaWithId);

      // Update background task progress if taskId is provided
      if (taskId) {
        try {
          await updateTaskProgress(db, taskId, {
            completed: savedPersonas.length,
            total: count,
            current: i + 1,
          });
        } catch (updateError) {
          log.error('PERSONA', 'Error updating task progress:', updateError);
          // Don't fail the whole operation if progress update fails
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('PERSONA', 'Error in persona creation loop', {
        error,
        errorMessage,
        index: i + 1,
        total: count,
        stack: error instanceof Error ? error.stack : undefined,
      });
      errors.push(`Failed to create persona ${i + 1}: ${errorMessage}`);
    }
  }

  return {
    cohortConfig,
    savedPersonas,
    errors,
  };
}

export type CreatePersonasBackgroundOptions = {
  onProgress?: CreatePersonasProgressCallback;
};

/**
 * Core logic for creating personas (background version)
 */
export async function createPersonasBackground(
  requestData: CreatePersonasRequest,
  options?: CreatePersonasBackgroundOptions
): Promise<CreatePersonasResponse> {
  const onProgress = options?.onProgress;

  // Validate required fields
  if (!requestData.cohortPrompt || typeof requestData.cohortPrompt !== 'string') {
    log.error('PERSONA', 'Invalid cohortPrompt', requestData);
    throw new Error('cohortPrompt is required and must be a string');
  }

  if (!requestData.cohortId || typeof requestData.cohortId !== 'string') {
    log.error('PERSONA', 'Invalid cohortId', requestData);
    throw new Error('cohortId is required and must be a string');
  }

  const db = getDatabaseClient();
  // Get cohort from database
  const { data: cohort, error: cohortError } = await db
    .from('cohorts')
    .select('*')
    .eq('id', requestData.cohortId)
    .single();

  if (cohortError) {
    log.error('PERSONA', 'Error fetching cohort:', {
      error: cohortError,
      cohortId: requestData.cohortId,
    });
    throw new Error('Failed to fetch cohort');
  }

  if (!cohort) {
    log.error('PERSONA', 'Cohort not found', {
      cohortId: requestData.cohortId,
    });
    throw new Error('Cohort not found');
  }

  const cohortTyped = cohort as Cohort;

  const count = Math.min(requestData.count || 1, 10); // Default 1, max 10 per request
  const cohortPrompt = requestData.cohortPrompt.trim();

  try {
    // Use existing task_id if provided, otherwise create a new background task
    let task;
    if (requestData.task_id) {
      // Task was already created by the regular function, fetch it
      const { data: existingTask, error: taskError } = await db
        .from('tasks')
        .select('*')
        .eq('id', requestData.task_id)
        .single();

      if (taskError) {
        log.error('PERSONA', 'Error fetching existing task', {
          error: taskError,
          taskId: requestData.task_id,
        });
        throw new Error('Task not found');
      }

      if (!existingTask) {
        log.error('PERSONA', 'Task not found', {
          taskId: requestData.task_id,
        });
        throw new Error('Task not found');
      }

      task = existingTask as { id: string; status?: string; [key: string]: unknown };
    } else {
      // Create background task
      task = await createTask(db, {
        workspace_id: null,
        task_type: 'create_personas',
        metadata: {
          cohortId: requestData.cohortId,
          cohortPrompt: cohortPrompt,
          count: count,
        },
      });
    }

    // Mark task as running
    await markTaskAsRunning(db, task.id);

    try {
      // Get existing persona names to avoid duplicates
      const existingNames = await getExistingPersonaNames();

      // Create personas using the cohort approach (saves each one as we go)
      const result = await createPersonasFromPrompt(
        db,
        cohortPrompt,
        count,
        cohortTyped,
        existingNames,
        task.id,
        onProgress
      );

      const response: CreatePersonasResponse = {
        success: result.savedPersonas.length > 0,
        created: result.savedPersonas.length,
        requested: count,
        personas: result.savedPersonas,
        errors: result.errors,
        cohortConfig: result.cohortConfig,
      };

      const currentPersonaIds =
        (cohortTyped.data as { persona_ids?: string[] } | undefined)?.persona_ids || [];
      const newPersonaIds = result.savedPersonas.map(persona => persona.id);
      const allPersonaIds = Array.from(new Set([...currentPersonaIds, ...newPersonaIds]));

      const cohortDataSpread = (cohortTyped.data || {}) as Record<string, unknown>;
      const updateData: Record<string, unknown> = {
        data: {
          ...cohortDataSpread,
          size: allPersonaIds.length,
          persona_ids: allPersonaIds,
          status: 'completed',
        },
      };

      const { error: cohortUpdateError } = await db
        .from('cohorts')
        .update(updateData)
        .eq('id', cohortTyped.id);

      if (cohortUpdateError) {
        log.error('PERSONA', 'Error updating cohort final status', {
          error: cohortUpdateError,
          cohortId: cohort.id,
          errorMessage: cohortUpdateError.message,
          errorCode: cohortUpdateError.code,
          errorDetails: cohortUpdateError.details,
        });
      }

      // Mark background task as completed
      await markTaskAsCompleted(db, task.id, {
        success: true,
        created: result.savedPersonas.length,
        requested: count,
        personaIds: newPersonaIds,
        errors: result.errors,
      });

      return { ...response, task_id: task.id };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create personas';
      log.error('PERSONA', 'Error in persona creation process', {
        error,
        errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        taskId: task.id,
        cohortId: requestData.cohortId,
      });

      // Mark background task as failed
      try {
        await markTaskAsFailed(db, task.id, errorMessage);
      } catch (markError) {
        log.error('PERSONA', 'Error marking task as failed', {
          error: markError,
          taskId: task.id,
        });
      }

      throw error;
    }
  } catch (error) {
    log.error('PERSONA', 'Fatal error in createPersonasBackground', {
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      requestData,
    });
    throw error;
  }
}
