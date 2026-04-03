import { v4 as uuidv4 } from 'uuid';

import { expandPersonaIds } from 'core/src/workspace/expandPersonaIds';

import { ScenarioEventType, SimulationWorkflow } from './simulation.types';

import type { DatabaseClient } from 'core/src/database/types';
import type { Conversation } from 'core/src/workspace/conversation.types';
import type { Workspace } from 'core/src/workspace/workspace.types';

/**
 * Dynamic configuration for a simulation scenario. Replaces presets so stances, variables, and core issue can be supplied per use case.
 */
export type ScenarioConfig = {
  core_issue: string;
  initial_variables: Record<string, number | string | boolean>;
  stances?: string[];
};

export type CreateScenarioInput = {
  name: string;
  description?: string;
  config: ScenarioConfig;
  max_steps?: number;
  cohort_ids?: string[];
  persona_ids?: string[];
};

/**
 * Create a workspace configured as a simulation scenario with config-driven world variables, stances, and core issue.
 */
export const createScenario = async (
  db: DatabaseClient,
  input: CreateScenarioInput
): Promise<Workspace> => {
  const id = uuidv4();
  const now = new Date().toISOString();
  const maxSteps = input.max_steps ?? 10;
  const variables = { ...input.config.initial_variables };

  let personaIds: string[] = input.persona_ids ?? [];
  if (input.cohort_ids?.length) {
    const { allPersonaIds } = await expandPersonaIds(db, personaIds, input.cohort_ids);
    personaIds = Array.from(new Set(allPersonaIds));
  }

  const conversation: Conversation = {
    name: input.name,
    messages: [],
    persona_ids: personaIds.length ? personaIds : undefined,
    cohort_ids: input.cohort_ids,
  };

  const workflow: SimulationWorkflow = {
    type: 'simulation',
    current_step: 0,
    max_steps: maxSteps,
    status: 'running',
    variables,
    active_events: [],
    scheduled_events: [],
    core_issue: input.config.core_issue,
    stances: input.config.stances?.length ? input.config.stances : undefined,
    variable_history: [
      {
        step: 0,
        variables: { ...variables },
      },
    ],
  };

  const workspace: Workspace = {
    id,
    name: input.name,
    description: input.description ?? '',
    conversation,
    workflow,
    created_at: now,
    updated_at: now,
  };

  const result = await db
    .from('workspaces')
    .insert({
      id,
      name: input.name,
      description: input.description ?? '',
      conversation,
      workflow,
      created_at: now,
      updated_at: now,
    })
    .select('id')
    .single();

  if (result.error) {
    throw new Error(`Failed to create scenario workspace: ${result.error.message}`);
  }

  return workspace;
};

export type CreateInterventionInput = {
  type: ScenarioEventType;
  title: string;
  description: string;
  effects: Record<string, unknown>;
  trigger_step?: number;
};

/**
 * Build a scenario event for injection (e.g. Policy Draft Leak, Campaign Speech).
 */
export const createScenarioEvent = (
  input: CreateInterventionInput
): {
  id: string;
  type: ScenarioEventType;
  title: string;
  description: string;
  effects: Record<string, unknown>;
  trigger_step?: number;
} => ({
  id: uuidv4(),
  type: input.type,
  title: input.title,
  description: input.description,
  effects: input.effects,
  ...(input.trigger_step !== undefined && { trigger_step: input.trigger_step }),
});
