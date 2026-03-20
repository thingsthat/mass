import { getDatabaseClient } from 'core/src/database/client';
import { log, LogCategory } from 'core/src/helpers/logger';
import { startSimulationRun } from 'core/src/simulation/simulationController';

export type RunSimulationStartOptions = {
  workspaceId: string;
  maxSteps?: number;
};

export async function runSimulationStart(options: RunSimulationStartOptions): Promise<void> {
  const db = getDatabaseClient();
  const result = await startSimulationRun(db, {
    workspace_id: options.workspaceId,
    max_steps: options.maxSteps,
  });
  log.info(LogCategory.MASS, 'Simulation run started.');
  log.info(LogCategory.MASS, `Task ID: ${result.task_id}`);
  log.info(LogCategory.MASS, `Workspace ID: ${result.workspace_id}`);
}
