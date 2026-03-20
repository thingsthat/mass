import { GraphQLJSON } from 'backend/src/graphql/types/common';
import { createTypeSafeObjectType } from 'backend/src/graphql/utils/typeSafeGraphQL';
import { GraphQLString, GraphQLNonNull } from 'graphql';

import type { Task } from 'core/src/tasks/tasks.types';

export const TaskType = createTypeSafeObjectType<Task>({
  name: 'Task',
  description: 'A background task with status and result',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLString) },
    workspace_id: { type: GraphQLString },
    task_type: { type: new GraphQLNonNull(GraphQLString) },
    status: { type: new GraphQLNonNull(GraphQLString) },
    result: { type: GraphQLJSON },
    error: { type: GraphQLString },
    metadata: { type: GraphQLJSON },
    created_at: { type: new GraphQLNonNull(GraphQLString) },
    updated_at: { type: new GraphQLNonNull(GraphQLString) },
  }),
});
