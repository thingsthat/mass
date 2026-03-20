import { GET_TASK, type TaskResponse } from 'backend/src/graphql/tasks/queries/task';
import { GET_TASKS, type TasksResponse } from 'backend/src/graphql/tasks/queries/tasks';

import { executeGraphQL } from 'frontend/src/api/graphqlClient';

import type { Task } from 'core/src/tasks/tasks.types';

/**
 * Fetches background tasks for a workspace or user
 */
export const fetchTasks = async (options?: {
  workspaceId?: string;
  taskType?: string;
  status?: string;
}): Promise<Task[]> => {
  const variables: Record<string, string | undefined> = {};

  if (options?.workspaceId) {
    variables.workspaceId = options.workspaceId;
  }
  if (options?.taskType) {
    variables.taskType = options.taskType;
  }
  if (options?.status) {
    variables.status = options.status;
  }

  const result = await executeGraphQL<TasksResponse>(GET_TASKS, variables, true);

  return result.tasks.tasks;
};

/**
 * Fetches a single background task by ID
 */
export const fetchTask = async (taskId: string): Promise<Task | null> => {
  const result = await executeGraphQL<TaskResponse>(GET_TASK, { taskId }, true);

  return result.task.task;
};
