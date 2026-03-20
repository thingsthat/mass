import { getDatabaseClient } from 'core/src/database/client';
import { log, LogCategory } from 'core/src/helpers/logger';
import { getRandomPersonaIds } from 'core/src/personas/controllers/personas';
import { createScenario, type ScenarioConfig } from 'core/src/simulation/scenarioPresets';

export type RunScenarioCreateOptions = {
  config: ScenarioConfig;
  name: string;
  description?: string;
  maxSteps?: number;
  cohortId?: string;
  personaIds?: string[];
  /** When no cohort and no persona IDs: pick this many personas at random. */
  personaCount?: number;
};

export async function runScenarioCreate(options: RunScenarioCreateOptions): Promise<string> {
  const db = getDatabaseClient();

  let personaIds = options.personaIds;
  if (
    !options.cohortId &&
    personaIds === undefined &&
    options.personaCount != null &&
    options.personaCount > 0
  ) {
    personaIds = await getRandomPersonaIds(db, options.personaCount);
    log.info(LogCategory.MASS, `Selected ${personaIds.length} random personas.`);
  }

  const workspace = await createScenario(db, {
    name: options.name,
    description: options.description,
    config: options.config,
    max_steps: options.maxSteps,
    cohort_ids: options.cohortId ? [options.cohortId] : undefined,
    persona_ids: personaIds,
  });
  log.info(LogCategory.MASS, 'Scenario created.');
  log.info(LogCategory.MASS, `Workspace ID: ${workspace.id}`);
  log.info(LogCategory.MASS, `Variables: ${JSON.stringify(workspace.workflow?.variables)}`);
  return workspace.id;
}
