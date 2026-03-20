import { getDatabaseClient } from 'core/src/database/client';
import { log, LogCategory } from 'core/src/helpers/logger';
import { branchSimulationWorkspace } from 'core/src/simulation/simulationController';

export type WorkspaceForkOptions = {
  workspaceId: string;
  name?: string;
};

export async function runWorkspaceFork(options: WorkspaceForkOptions): Promise<void> {
  const db = getDatabaseClient();
  const newId = await branchSimulationWorkspace(db, options.workspaceId, options.name);
  log.info(LogCategory.MASS, 'Branch created.');
  log.info(LogCategory.MASS, `New workspace ID: ${newId}`);
}
