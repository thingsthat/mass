import { getDatabaseClient } from 'core/src/database/client';
import { log, LogCategory } from 'core/src/helpers/logger';
import {
  getLatestSimulationTaskForWorkspace,
  runSimulationLoop,
  startSimulationRun,
} from 'core/src/simulation/simulationController';
import { getTaskById } from 'core/src/tasks/tasksController';

type RunSimulationRunOptions = {
  taskId?: string;
  workspaceId?: string;
  maxSteps?: number;
};

export async function runSimulationRun(options: RunSimulationRunOptions): Promise<void> {
  const db = getDatabaseClient();
  let taskId = options.taskId;
  if (!taskId && options.workspaceId) {
    const latest = await getLatestSimulationTaskForWorkspace(db, options.workspaceId);
    const canResume = latest && latest.status !== 'completed' && latest.status !== 'failed';
    if (!canResume) {
      log.info(LogCategory.MASS, 'No runnable task for workspace; creating one.');
      const result = await startSimulationRun(db, {
        workspace_id: options.workspaceId,
        max_steps: options.maxSteps,
      });
      taskId = result.task_id;
    } else if (latest) {
      taskId = latest.id;
    }
  }
  if (!taskId) {
    throw new Error('Provide either --task <id> or --workspace <id>');
  }
  const task = await getTaskById(db, taskId);
  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }
  if (task.task_type !== 'simulation_run') {
    throw new Error('Task is not a simulation run');
  }
  log.info(LogCategory.MASS, `Running simulation loop for task ${taskId}...`);
  await runSimulationLoop(taskId);
  const updated = await getTaskById(db, taskId);
  log.info(LogCategory.MASS, `Task status: ${updated?.status ?? 'unknown'}`);
  if (updated?.result) {
    log.info(LogCategory.MASS, `Result: ${JSON.stringify(updated.result)}`);
  }
}
