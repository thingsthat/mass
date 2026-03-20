import { getDatabaseClient } from 'core/src/database/client';
import { log, LogCategory } from 'core/src/helpers/logger';
import {
  createScenarioEvent,
  type CreateInterventionInput,
} from 'core/src/simulation/scenarioPresets';
import { injectSimulationIntervention } from 'core/src/simulation/simulationController';

export type RunSimulationInjectOptions = {
  workspaceId: string;
  type: CreateInterventionInput['type'];
  title: string;
  description: string;
  effectsJson: string;
  atStep?: number;
};

function isPrimitiveEffectValue(value: unknown): value is number | string | boolean {
  return typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean';
}

export async function runSimulationInject(options: RunSimulationInjectOptions): Promise<void> {
  const db = getDatabaseClient();
  let effects: Record<string, unknown>;
  try {
    effects = JSON.parse(options.effectsJson) as Record<string, unknown>;
  } catch {
    throw new Error(
      'effects must be valid JSON, e.g. \'{"public_approval":40,"polarisation_index":60}\''
    );
  }
  const invalidKeys = Object.entries(effects).filter(
    ([, value]) => value !== null && value !== undefined && !isPrimitiveEffectValue(value)
  );
  if (invalidKeys.length > 0) {
    const keys = invalidKeys.map(([key]) => key).join(', ');
    throw new Error(
      `effects values must be number, string, or boolean; invalid keys: ${keys}. Nested objects or arrays are not applied.`
    );
  }
  const event = createScenarioEvent({
    type: options.type,
    title: options.title,
    description: options.description,
    effects,
    trigger_step: options.atStep,
  });
  const workspace = await injectSimulationIntervention(db, options.workspaceId, event);
  if (!workspace) {
    throw new Error('Workspace not found or has no simulation workflow');
  }
  log.info(LogCategory.MASS, `Intervention injected: ${options.title}`);
  if (options.atStep !== undefined) {
    log.info(LogCategory.MASS, `Scheduled at step ${options.atStep}`);
  }
}
