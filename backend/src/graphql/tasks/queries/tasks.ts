import { log } from 'core/src/helpers/logger';
import { GraphQLList, GraphQLObjectType, GraphQLString } from 'graphql';

import { TaskType } from 'backend/src/graphql/tasks/types/task';

import type { Context } from 'backend/src/context';
import type { GraphResolver } from 'backend/src/graphql/graphql.types';
import type { Task } from 'core/src/tasks/tasks.types';

/**
 * GraphQL response type for multiple background tasks
 */
export type TasksResponse = {
  tasks: {
    tasks: Task[];
  };
};

/**
 * GraphQL query to fetch background tasks for a workspace or user
 */
export const GET_TASKS = `
  query GetTasks($workspaceId: String, $taskType: String, $status: String) {
    tasks(workspaceId: $workspaceId, taskType: $taskType, status: $status) {
      tasks {
        id
        workspace_id
        task_type
        status
        result
        error
        metadata
        created_at
        updated_at
      }
    }
  }
`;

/**
 * Background tasks resolver - fetches multiple tasks
 */
export const TasksResolver: GraphResolver = {
  type: new GraphQLObjectType({
    name: 'TasksResponse',
    fields: () => ({
      tasks: { type: new GraphQLList(TaskType) },
    }),
  }),
  args: {
    workspaceId: { type: GraphQLString },
    taskType: { type: GraphQLString },
    status: { type: GraphQLString },
  },
  resolve: async (
    _root: any,
    {
      workspaceId,
      taskType,
      status,
    }: {
      workspaceId?: string;
      taskType?: string;
      status?: string;
    },
    context: Context
  ) => {
    const { db } = context;

    try {
      let query = db.from('tasks').select('*').order('created_at', { ascending: false });

      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      }
      if (taskType) {
        query = query.eq('task_type', taskType);
      }
      if (status) {
        query = query.eq('status', status);
      }

      const result = await query;
      const tasks = result.data ?? [];
      const error = result.error;

      if (error) {
        throw new Error(`Failed to load background tasks: ${error.message}`);
      }

      return { tasks: Array.isArray(tasks) ? tasks : [] };
    } catch (error) {
      log.error('GRAPHQL', 'Error in background tasks resolver:', error);
      throw error;
    }
  },
};
