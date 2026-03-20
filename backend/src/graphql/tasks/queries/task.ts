import { TaskType } from 'backend/src/graphql/tasks/types/task';
import { log } from 'core/src/helpers/logger';
import { GraphQLObjectType, GraphQLString } from 'graphql';

import type { Context } from 'backend/src/context';
import type { GraphResolver } from 'backend/src/graphql/graphql.types';
import type { Task } from 'core/src/tasks/tasks.types';

/**
 * GraphQL response type for single background task
 */
export type TaskResponse = {
  task: {
    task: Task | null;
  };
};

/**
 * GraphQL query to fetch a single background task by ID
 */
export const GET_TASK = `
  query GetTask($taskId: String!) {
    task(taskId: $taskId) {
      task {
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
 * Background task resolver - fetches a single task by ID
 */
export const TaskResolver: GraphResolver = {
  type: new GraphQLObjectType({
    name: 'TaskResponse',
    fields: () => ({
      task: { type: TaskType },
    }),
  }),
  args: {
    taskId: { type: GraphQLString },
  },
  resolve: async (_root: any, { taskId }: { taskId?: string }, context: Context) => {
    const { db } = context;

    if (!taskId) {
      throw new Error('Task ID is required');
    }

    try {
      const result = await db.from('tasks').select('*').eq('id', taskId).single();

      if (result.error) {
        if (result.error.code === 'PGRST116') {
          return { task: null };
        }
        throw new Error(`Failed to load background task: ${result.error.message}`);
      }

      return { task: result.data };
    } catch (error) {
      log.error('GRAPHQL', 'Error in background task resolver:', error);
      throw error;
    }
  },
};
