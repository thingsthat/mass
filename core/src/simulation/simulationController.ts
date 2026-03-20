import { getDatabaseClient } from 'core/src/database/client';
import { log, LogCategory } from 'core/src/helpers/logger';
import { getRandomSubset } from 'core/src/helpers/random';
import { getPersonasByIds } from 'core/src/personas/controllers/personas';
import {
  generateSimulationAction,
  type SimulationActionResult,
} from 'core/src/simulation/llm/generateSimulationAction';
import {
  createTask,
  getTaskById,
  markTaskAsCompleted,
  markTaskAsFailed,
  markTaskAsRunning,
  updateTask,
  updateTaskProgress,
} from 'core/src/tasks/tasksController';
import { getWorkspaceById } from 'core/src/workspace/controllers/workspaces';
import { v4 as uuidv4 } from 'uuid';

import type { DatabaseClient } from 'core/src/database/types';
import type {
  Conversation,
  Message,
  PersonaRelationshipState,
} from 'core/src/workspace/conversation.types';
import type { SimulationEffectsMeta, ScenarioEvent, SimulationWorkflow, InterventionHistoryEntry, CausalHistoryEntry, SimulationWorkflowStatus } from 'core/src/simulation/simulation.types';
import type { Workspace } from 'core/src/workspace/workspace.types';

export { getWorkspaceById };

const SIMULATION_RUN_METADATA_WORKSPACE_ID = 'workspace_id';
const SWARM_SAMPLE_SIZE = 10;
const DEFAULT_MAX_STEPS = 10;
const VARIABLE_CLAMP_MIN = 0;
const VARIABLE_CLAMP_MAX = 100;
const STANCE_SCORE_MIN = 1;
const STANCE_SCORE_MAX = 10;
const DEFAULT_CORE_ISSUE = 'Current policy or issue under debate';
const MAX_PERSONA_MEMORIES = 20;

function isSimulationWorkflow(workflow: unknown): workflow is SimulationWorkflow {
  return (
    typeof workflow === 'object' &&
    workflow !== null &&
    (workflow as SimulationWorkflow).type === 'simulation'
  );
}

/**
 * Get the most recent simulation_run task for a workspace (by created_at).
 */
export const getLatestSimulationTaskForWorkspace = async (
  db: DatabaseClient,
  workspaceId: string
): Promise<{ id: string; status: string } | null> => {
  const { data, error } = await db
    .from('tasks')
    .select('id, status')
    .eq('workspace_id', workspaceId)
    .eq('task_type', 'simulation_run')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error || !data) {
    return null;
  }
  return data as { id: string; status: string };
};

/**
 * Select a subset of persona ids to act this step. Uses persona_metadata (influence, conflict) when present; otherwise random.
 */
export const selectActors = (
  personaIds: string[],
  personaMetadata: Record<string, Record<string, unknown>> | undefined,
  count: number
): string[] => {
  if (!personaIds.length) {
    return [];
  }
  const capped = Math.min(count, personaIds.length);
  const meta = personaMetadata ?? {};
  const weighted = personaIds.map(personaId => {
    const m = meta[personaId] as
      | { relationships?: Record<string, PersonaRelationshipState> }
      | undefined;
    const relationships = m?.relationships ?? {};
    const influenceSum = Object.values(relationships).reduce((s, r) => s + r.influence, 0);
    const conflictSum = Object.values(relationships).reduce((s, r) => s + r.conflict, 0);
    const weight =
      0.5 + (influenceSum / (Object.keys(relationships).length || 1)) * 0.3 + conflictSum * 0.2;
    return { value: personaId, weight: Math.max(0.1, weight) };
  });
  const totalWeight = weighted.reduce((s, w) => s + w.weight, 0);
  if (totalWeight <= 0) {
    return getRandomSubset(personaIds, capped);
  }
  const selected: string[] = [];
  let remaining = [...weighted];
  for (let i = 0; i < capped && remaining.length > 0; i++) {
    let r = Math.random() * remaining.reduce((s, w) => s + w.weight, 0);
    for (let j = 0; j < remaining.length; j++) {
      r -= remaining[j].weight;
      if (r <= 0) {
        selected.push(remaining[j].value);
        remaining.splice(j, 1);
        break;
      }
    }
  }
  return selected.length ? selected : getRandomSubset(personaIds, capped);
};

/**
 * Apply a scenario event's effects to the current workflow variables.
 * Only top-level keys with number, string, or boolean values are applied; nested objects and arrays are ignored.
 */
const applyEventEffects = (
  variables: Record<string, number | string | boolean>,
  effects: Record<string, unknown>
): Record<string, number | string | boolean> => {
  const next = { ...variables };
  for (const [key, value] of Object.entries(effects)) {
    if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
      next[key] = value;
    }
  }
  return next;
};

/**
 * Apply aggregated numeric deltas to workflow variables, clamping numeric values to [VARIABLE_CLAMP_MIN, VARIABLE_CLAMP_MAX].
 * Non-numeric variables are left unchanged.
 */
const applyWorldDeltas = (
  variables: Record<string, number | string | boolean>,
  deltas: Record<string, number>
): Record<string, number | string | boolean> => {
  const next = { ...variables };
  for (const [key, delta] of Object.entries(deltas)) {
    const current = next[key];
    if (typeof current === 'number' && !Number.isNaN(current)) {
      const value = current + delta;
      next[key] = Math.max(VARIABLE_CLAMP_MIN, Math.min(VARIABLE_CLAMP_MAX, Math.round(value)));
    }
  }
  return next;
};

/**
 * Run a single simulation step: select actors, generate dummy actions, resolve effects, update workspace state.
 */
export const runSimulationStep = async (
  db: DatabaseClient,
  workspace: Workspace,
  taskId: string
): Promise<{ workspace: Workspace; done: boolean }> => {
  const conversation = workspace.conversation;
  const workflow = workspace.workflow;
  if (!isSimulationWorkflow(workflow) || workflow.status !== 'running') {
    log.info(
      LogCategory.MASS,
      `Simulation step skipped: workspace has no running workflow (status: ${isSimulationWorkflow(workflow) ? workflow.status : 'not simulation'}).`
    );
    return { workspace, done: true };
  }

  const variableHistoryBase = workflow.variable_history ?? [];

  let variables = { ...workflow.variables };
  const activeEvents = [...(workflow.active_events ?? [])];
  const scheduled = [...(workflow.scheduled_events ?? [])];
  const nowTriggered = scheduled.filter(e => e.trigger_step === workflow.current_step);
  const stillScheduled = scheduled.filter(e => e.trigger_step !== workflow.current_step);
  const appliedEventsThisStep = [...activeEvents, ...nowTriggered];
  const now = new Date().toISOString();
  for (const event of appliedEventsThisStep) {
    variables = applyEventEffects(variables, event.effects);
  }

  const appliedEventIds = new Set(appliedEventsThisStep.map(e => e.id));
  const updatedInterventionHistory: InterventionHistoryEntry[] = (
    workflow.intervention_history ?? []
  ).map(entry =>
    appliedEventIds.has(entry.id) && entry.status === 'pending'
      ? {
          ...entry,
          status: 'applied' as const,
          applied_at: now,
          applied_step: workflow.current_step,
        }
      : entry
  );
  const appliedInterventionMessages: Message[] = appliedEventsThisStep.map(event => ({
    id: uuidv4(),
    role: 'system',
    content: `Intervention applied at step ${workflow.current_step}: ${event.title}`,
    timestamp: now,
    _metadata: {
      intervention: {
        title: event.title,
        description: event.description,
        status: 'applied',
        trigger_step: event.trigger_step,
        applied_step: workflow.current_step,
        effects: event.effects,
        type: event.type,
      },
    },
  }));

  const personaIds = conversation.persona_ids ?? [];
  const personas = await getPersonasByIds(db, personaIds);
  const validPersonaIds = personas.map(p => p.id);
  const personaById = new Map(personas.map(p => [p.id, p]));

  const selectedActorIds = selectActors(
    validPersonaIds,
    conversation.persona_metadata,
    SWARM_SAMPLE_SIZE
  );

  const newMessages: Message[] = [];
  const recentMessages = conversation.messages.filter(
    m => m.role === 'assistant' && (m.persona_id || m._metadata?.simulationEffects)
  );
  const coreIssue = workflow.core_issue ?? DEFAULT_CORE_ISSUE;
  const stanceKeys = workflow.stances?.length ? workflow.stances : ['default'];

  const actionResults: { actorId: string; result: SimulationActionResult }[] = [];
  const aggregatedDeltas: Record<string, number> = {};

  for (const actorId of selectedActorIds) {
    const persona = personaById.get(actorId);
    const existingMeta = (conversation.persona_metadata?.[actorId] ?? {}) as Record<
      string,
      unknown
    >;
    const actorMemories = Array.isArray(existingMeta.memories)
      ? (existingMeta.memories as string[])
      : [];
    let result: SimulationActionResult;
    if (persona) {
      try {
        result = await generateSimulationAction(
          persona,
          workflow.current_step,
          variables,
          recentMessages,
          coreIssue,
          actorMemories,
          stanceKeys
        );
      } catch (error) {
        log.error(LogCategory.MASS, 'Simulation action LLM failed for persona', {
          actorId,
          error: error instanceof Error ? error.message : String(error),
        });
        const emptyShifts = Object.fromEntries(stanceKeys.map(k => [k, 0]));
        result = {
          action: 'speak',
          content: `[Step ${workflow.current_step}] ${persona.details?.name ?? 'Someone'} (no response: LLM error).`,
          stance_shifts: emptyShifts,
          world_deltas: {},
        };
      }
    } else {
      const emptyShifts = Object.fromEntries(stanceKeys.map(k => [k, 0]));
      result = {
        action: 'speak',
        content: `[Step ${workflow.current_step}] Persona ${actorId} took an action.`,
        stance_shifts: emptyShifts,
        world_deltas: {},
      };
    }
    actionResults.push({ actorId, result });
  }

  const speakers = actionResults.filter(({ result: r }) => r.action === 'speak');
  for (const { result: r } of speakers) {
    for (const [key, delta] of Object.entries(r.world_deltas)) {
      aggregatedDeltas[key] = (aggregatedDeltas[key] ?? 0) + delta;
    }
  }

  variables = applyWorldDeltas(variables, aggregatedDeltas);

  const RELATIONSHIP_DELTA_MIN = -10;
  const RELATIONSHIP_DELTA_MAX = 10;
  const RELATIONSHIP_SCORE_MIN = 0;
  const RELATIONSHIP_SCORE_MAX = 10;

  const personaMetadata = { ...(conversation.persona_metadata ?? {}) };
  for (const { actorId, result } of speakers) {
    const existing = (personaMetadata[actorId] ?? {}) as Record<string, unknown>;
    const existingScores = (existing.stance_scores as Record<string, number> | undefined) ?? {};
    const nextScores = { ...existingScores };
    for (const [stanceKey, shift] of Object.entries(result.stance_shifts)) {
      const currentStance =
        typeof existingScores[stanceKey] === 'number' ? existingScores[stanceKey] : 5;
      nextScores[stanceKey] = Math.max(
        STANCE_SCORE_MIN,
        Math.min(STANCE_SCORE_MAX, Math.round(currentStance + shift))
      );
    }
    const existingMemories = Array.isArray(existing.memories)
      ? (existing.memories as string[])
      : [];
    const shiftSummary =
      Object.entries(result.stance_shifts)
        .filter(([, v]) => v !== 0)
        .map(([k, v]) => `${k}: ${v > 0 ? '+' : ''}${v}`)
        .join(', ') || 'no change';
    const memoryEntry = `Step ${workflow.current_step}: You said: "${result.content.slice(0, 80)}${result.content.length > 80 ? '...' : ''}" and shifted stances (${shiftSummary}).`;
    const nextMemories = [...existingMemories, memoryEntry].slice(-MAX_PERSONA_MEMORIES);

    // Update relationship state from typed effects where channel is 'relationship' and a specific target persona is named.
    const existingRelationships = (existing.relationships as Record<string, PersonaRelationshipState> | undefined) ?? {};
    const nextRelationships = { ...existingRelationships };
    const relationshipEffects = (result.effects ?? []).filter(
      e => e.channel === 'relationship' && e.targetType === 'persona' && e.targetId
    );
    for (const effect of relationshipEffects) {
      const targetId = effect.targetId as string;
      const current: PersonaRelationshipState = nextRelationships[targetId] ?? {
        trust: 5,
        influence: 5,
        affinity: 5,
        conflict: 5,
      };
      const variable = effect.variable as keyof PersonaRelationshipState;
      if (variable in current) {
        const clampedDelta = Math.max(
          RELATIONSHIP_DELTA_MIN,
          Math.min(RELATIONSHIP_DELTA_MAX, effect.delta ?? 0)
        );
        nextRelationships[targetId] = {
          ...current,
          [variable]: Math.max(
            RELATIONSHIP_SCORE_MIN,
            Math.min(RELATIONSHIP_SCORE_MAX, Math.round(current[variable] + clampedDelta))
          ),
        };
      }
    }

    personaMetadata[actorId] = {
      ...existing,
      stance_scores: nextScores,
      memories: nextMemories,
      relationships: nextRelationships,
    };
  }

  // Build causal history entries for this step from typed effects on each speaker and any applied events.
  const stepCausalEntries: CausalHistoryEntry[] = [];
  for (const { actorId, result } of speakers) {
    const actorEffects = result.effects ?? [];
    if (actorEffects.length > 0) {
      stepCausalEntries.push({
        step: workflow.current_step,
        actorId,
        actorType: 'persona',
        effects: actorEffects,
      });
    }
  }
  for (const event of appliedEventsThisStep) {
    const eventEffects = Object.entries(event.effects ?? {})
      .filter(([, v]) => typeof v === 'number' && v !== 0)
      .map(([key, rawValue]) => ({
        sourceType: 'event' as const,
        targetType: 'world' as const,
        channel: 'world' as const,
        variable: key,
        operator: 'set' as const,
        value: rawValue as number,
        because: `Applied by event: ${event.title}`,
      }));
    if (eventEffects.length > 0) {
      stepCausalEntries.push({
        step: workflow.current_step,
        actorId: event.id,
        actorType: 'event',
        effects: eventEffects,
      });
    }
  }

  for (const { actorId, result } of speakers) {
    const messageId = uuidv4();
    const simulationEffects: SimulationEffectsMeta = {
      step: workflow.current_step,
      actorId,
      stance_shifts: result.stance_shifts,
      world_deltas: result.world_deltas,
      effects: result.effects && result.effects.length > 0 ? result.effects : undefined,
    };

    newMessages.push({
      id: messageId,
      role: 'assistant',
      content: result.content,
      timestamp: now,
      persona_id: actorId,
      _metadata: {
        simulationEffects,
      },
    });
    recentMessages.push({
      id: messageId,
      role: 'assistant',
      content: result.content,
      timestamp: now,
      persona_id: actorId,
      _metadata: {
        simulationEffects,
      },
    });
  }

  const updatedConversation: Conversation = {
    ...conversation,
    messages: [
      ...conversation.messages,
      ...appliedInterventionMessages,
      ...newMessages,
    ],
    persona_metadata:
      Object.keys(personaMetadata).length > 0 ? personaMetadata : conversation.persona_metadata,
  };

  const nextStep = workflow.current_step + 1;
  const isDone = nextStep >= workflow.max_steps;
  const status: SimulationWorkflowStatus = isDone ? 'completed' : 'running';

  const variableHistoryExistingByStep = new Map<number, { step: number; variables: Record<string, number | string | boolean> }>();
  for (const entry of variableHistoryBase) {
    if (typeof entry.step === 'number' && !Number.isNaN(entry.step)) {
      variableHistoryExistingByStep.set(entry.step, {
        step: entry.step,
        variables: { ...entry.variables },
      });
    }
  }

  if (!variableHistoryExistingByStep.has(0)) {
    variableHistoryExistingByStep.set(0, {
      step: 0,
      variables: { ...(workflow.variables ?? {}) },
    });
  }

  variableHistoryExistingByStep.set(nextStep, {
    step: nextStep,
    variables: { ...variables },
  });

  const variableHistory = Array.from(variableHistoryExistingByStep.values()).sort(
    (a, b) => a.step - b.step
  );

  const causalHistoryBase = workflow.causal_history ?? [];
  const updatedCausalHistory = [...causalHistoryBase, ...stepCausalEntries];

  const updatedWorkflow: SimulationWorkflow = {
    ...workflow,
    current_step: nextStep,
    status,
    variables,
    active_events: [],
    scheduled_events: stillScheduled,
    intervention_history: updatedInterventionHistory,
    variable_history: variableHistory,
    causal_history: updatedCausalHistory,
  };

  const latestWorkspace = await getWorkspaceById(db, workspace.id);
  const latestWorkflow = latestWorkspace?.workflow;
  const mergedWorkflow: SimulationWorkflow = !latestWorkflow || !isSimulationWorkflow(latestWorkflow)
    ? updatedWorkflow
    : (() => {
        const latestSimulationWorkflow = latestWorkflow as SimulationWorkflow;
        const baseInterventionHistory = latestSimulationWorkflow.intervention_history ?? [];
        const baseScheduledEvents = latestSimulationWorkflow.scheduled_events ?? [];
        const baseActiveEvents = latestSimulationWorkflow.active_events ?? [];

        const updatedHistoryEntries = updatedWorkflow.intervention_history ?? [];
        const updatedHistoryById = new Map<string, InterventionHistoryEntry>();
        for (const entry of updatedHistoryEntries) {
          updatedHistoryById.set(entry.id, entry);
        }
        const mergedHistory: InterventionHistoryEntry[] = [
          ...baseInterventionHistory.filter(entry => !updatedHistoryById.has(entry.id)),
          ...updatedHistoryEntries,
        ];

        const existingScheduledIds = new Set((updatedWorkflow.scheduled_events ?? []).map(e => e.id));
        const mergedScheduled = [
          ...(updatedWorkflow.scheduled_events ?? []),
          ...baseScheduledEvents.filter(event => !existingScheduledIds.has(event.id)),
        ];

        const existingActiveIds = new Set((updatedWorkflow.active_events ?? []).map(e => e.id));
        const mergedActiveEvents = [
          ...(updatedWorkflow.active_events ?? []),
          ...baseActiveEvents.filter(event => !existingActiveIds.has(event.id)),
        ];

        // Merge causal history: preserve any entries from the latest persisted state that this step did not emit,
        // then append this step's new entries without duplicating by step+actorId.
        const baseCausalHistory = latestSimulationWorkflow.causal_history ?? [];
        const updatedCausalKeys = new Set(
          (updatedWorkflow.causal_history ?? []).map(e => `${e.step}||${e.actorId}`)
        );
        const mergedCausalHistory: CausalHistoryEntry[] = [
          ...baseCausalHistory.filter(e => !updatedCausalKeys.has(`${e.step}||${e.actorId}`)),
          ...(updatedWorkflow.causal_history ?? []),
        ];

        return {
          ...updatedWorkflow,
          active_events: mergedActiveEvents,
          scheduled_events: mergedScheduled,
          intervention_history: mergedHistory,
          causal_history: mergedCausalHistory,
        };
      })();

  const latestConversation = latestWorkspace?.conversation ?? workspace.conversation;
  const existingMessagesById = new Map(
    (latestConversation.messages ?? []).map(message => [message.id, message])
  );
  const mergedMessages = [
    ...latestConversation.messages,
    ...updatedConversation.messages.filter(message => !existingMessagesById.has(message.id)),
  ];

  const finalConversation: Conversation = {
    ...updatedConversation,
    messages: mergedMessages,
  };

  const updatedWorkspace: Workspace = {
    ...workspace,
    conversation: finalConversation,
    workflow: mergedWorkflow,
    updated_at: now,
  };

  const { error: updateError } = await db
    .from('workspaces')
    .update({
      conversation: finalConversation,
      workflow: mergedWorkflow,
      updated_at: now,
    })
    .eq('id', workspace.id);

  if (updateError) {
    throw new Error(`Failed to update workspace: ${updateError.message}`);
  }

  await updateTaskProgress(db, taskId, {
    current: nextStep,
    total: workflow.max_steps,
    stage: isDone ? 'completed' : 'running',
  });

  return {
    workspace: updatedWorkspace,
    done: isDone,
  };
};

export type StartSimulationRunInput = {
  workspace_id: string;
  max_steps?: number;
  initial_variables?: Record<string, number | string | boolean>;
};

export type StartSimulationRunResult = {
  task_id: string;
  workspace_id: string;
};

/**
 * Create a simulation_run task and optionally initialise workflow on the workspace.
 */
export const startSimulationRun = async (
  db: DatabaseClient,
  input: StartSimulationRunInput
): Promise<StartSimulationRunResult> => {
  const workspace = await getWorkspaceById(db, input.workspace_id);
  if (!workspace) {
    throw new Error('Workspace not found');
  }

  const existingWorkflow = workspace.workflow;
  if (!isSimulationWorkflow(existingWorkflow)) {
    throw new Error(
      'Workspace has no simulation scenario. Create one first with: simulation run --config \'{"core_issue":"...","initial_variables":{...}}\' -n <name> -c <cohort-id> [--max-steps 10]'
    );
  }

  const maxSteps = input.max_steps ?? existingWorkflow.max_steps ?? DEFAULT_MAX_STEPS;
  const workflowToSet: SimulationWorkflow = {
    ...existingWorkflow,
    status: 'running',
    max_steps: maxSteps,
  };

  const task = await createTask(db, {
    workspace_id: input.workspace_id,
    task_type: 'simulation_run',
    metadata: {
      [SIMULATION_RUN_METADATA_WORKSPACE_ID]: input.workspace_id,
      max_steps: maxSteps,
    },
  });

  await db
    .from('workspaces')
    .update({
      workflow: workflowToSet,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.workspace_id);

  return {
    task_id: task.id,
    workspace_id: input.workspace_id,
  };
};

/**
 * Run the simulation loop for a task until completion or pause. Call this from a background runner or API.
 */
export const runSimulationLoop = async (taskId: string): Promise<void> => {
  const db = getDatabaseClient();

  const task = await getTaskById(db, taskId);
  if (!task) {
    throw new Error('Task not found');
  }
  if (task.task_type !== 'simulation_run') {
    throw new Error('Task is not a simulation run');
  }
  if (task.status !== 'pending' && task.status !== 'running') {
    log.info(
      LogCategory.MASS,
      `Task ${taskId} is not runnable (status: ${task.status}). Nothing to do.`
    );
    return;
  }

  const workspaceId =
    (task.metadata?.[SIMULATION_RUN_METADATA_WORKSPACE_ID] as string) ?? task.workspace_id;
  if (!workspaceId) {
    await markTaskAsFailed(db, taskId, 'Simulation task has no workspace_id');
    return;
  }

  await markTaskAsRunning(db, taskId);

  try {
    let workspace = await getWorkspaceById(db, workspaceId);
    if (!workspace) {
      await markTaskAsFailed(db, taskId, 'Workspace not found');
      return;
    }

    let done = false;
    while (!done) {
      workspace = await getWorkspaceById(db, workspaceId);
      if (!workspace) {
        await markTaskAsFailed(db, taskId, 'Workspace not found');
        return;
      }
      const workflow = workspace.workflow;
      if (!isSimulationWorkflow(workflow)) {
        await markTaskAsFailed(db, taskId, 'Workspace has no simulation workflow');
        return;
      }
      if (workflow.status === 'paused') {
        break;
      }

      const result = await runSimulationStep(db, workspace, taskId);
      workspace = result.workspace;
      done = result.done;
    }

    const workflow = workspace.workflow;
    if (isSimulationWorkflow(workflow) && workflow.status === 'completed') {
      await markTaskAsCompleted(db, taskId, {
        workspace_id: workspaceId,
        final_step: workflow.current_step,
        variables: workflow.variables,
      });
    } else if (isSimulationWorkflow(workflow) && workflow.status === 'paused') {
      const current = await getTaskById(db, taskId);
      const existingMetadata = (current?.metadata ?? {}) as Record<string, unknown>;
      await updateTask(db, taskId, {
        metadata: {
          ...existingMetadata,
          paused: true,
          current: workflow.current_step,
          total: workflow.max_steps,
          stage: 'paused',
        },
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error(LogCategory.MASS, 'Simulation loop failed', { taskId, error: message });
    await markTaskAsFailed(db, taskId, message);
    throw error;
  }
};

/**
 * Inject an event into a running simulation. If event.trigger_step is set, the event is scheduled for that step; otherwise it is applied on the next step.
 * Records the intervention in workflow.intervention_history and appends a system message to the conversation.
 */
export const injectSimulationIntervention = async (
  db: DatabaseClient,
  workspaceId: string,
  event: ScenarioEvent
): Promise<Workspace | null> => {
  const workspace = await getWorkspaceById(db, workspaceId);
  if (!workspace || !isSimulationWorkflow(workspace.workflow)) {
    return null;
  }
  const workflow = workspace.workflow as SimulationWorkflow;
  const now = new Date().toISOString();
  const interventionEntry: InterventionHistoryEntry = {
    ...event,
    status: 'pending',
    injected_at: now,
  };
  const updatedWorkflow: SimulationWorkflow =
    event.trigger_step !== undefined
      ? {
          ...workflow,
          scheduled_events: [...(workflow.scheduled_events ?? []), event],
          intervention_history: [...(workflow.intervention_history ?? []), interventionEntry],
        }
      : {
          ...workflow,
          active_events: [...(workflow.active_events ?? []), event],
          intervention_history: [...(workflow.intervention_history ?? []), interventionEntry],
        };
  const triggerLabel =
    event.trigger_step !== undefined
      ? `scheduled for step ${event.trigger_step}`
      : 'scheduled for next step';
  const injectContent = `Intervention ${triggerLabel}: ${event.title} - ${event.description}`;
  const injectMessage: Message = {
    id: uuidv4(),
    role: 'system',
    content: injectContent,
    timestamp: now,
    _metadata: {
      intervention: {
        title: event.title,
        description: event.description,
        status: 'pending',
        trigger_step: event.trigger_step,
        effects: event.effects,
        type: event.type,
      },
    },
  };
  const updatedConversation: Conversation = {
    ...workspace.conversation,
    messages: [...workspace.conversation.messages, injectMessage],
  };
  const { error } = await db
    .from('workspaces')
    .update({
      workflow: updatedWorkflow,
      conversation: updatedConversation,
      updated_at: now,
    })
    .eq('id', workspaceId);
  if (error) {
    return null;
  }
  return {
    ...workspace,
    workflow: updatedWorkflow,
    conversation: updatedConversation,
    updated_at: now,
  };
};

/**
 * Pause a running simulation (set workflow.status to 'paused').
 */
export const pauseSimulation = async (
  db: DatabaseClient,
  workspaceId: string
): Promise<Workspace | null> => {
  const workspace = await getWorkspaceById(db, workspaceId);
  if (!workspace || !isSimulationWorkflow(workspace.workflow)) {
    return null;
  }
  const workflow = workspace.workflow as SimulationWorkflow;
  const updatedWorkflow: SimulationWorkflow = {
    ...workflow,
    status: 'paused',
  };
  const now = new Date().toISOString();
  const { error } = await db
    .from('workspaces')
    .update({ workflow: updatedWorkflow, updated_at: now })
    .eq('id', workspaceId);
  if (error) {
    return null;
  }
  return { ...workspace, workflow: updatedWorkflow, updated_at: now };
};

/**
 * Duplicate a simulation workspace (conversation + workflow) for A/B branching. Returns the new workspace id.
 */
export const branchSimulationWorkspace = async (
  db: DatabaseClient,
  workspaceId: string,
  newName?: string
): Promise<string> => {
  const workspace = await getWorkspaceById(db, workspaceId);
  if (!workspace) {
    throw new Error('Workspace not found');
  }
  const now = new Date().toISOString();
  const newId = uuidv4();
  const name = newName ?? `${workspace.name} (Branch)`;
  const conversation = JSON.parse(JSON.stringify(workspace.conversation)) as Conversation;
  const workflow = workspace.workflow
    ? (JSON.parse(JSON.stringify(workspace.workflow)) as SimulationWorkflow)
    : undefined;
  const result = await db
    .from('workspaces')
    .insert({
      id: newId,
      name,
      description: workspace.description ?? '',
      conversation,
      workflow: workflow ?? null,
      created_at: now,
      updated_at: now,
    })
    .select('id')
    .single();
  if (result.error) {
    throw new Error(`Failed to branch workspace: ${result.error.message}`);
  }
  return newId;
};
