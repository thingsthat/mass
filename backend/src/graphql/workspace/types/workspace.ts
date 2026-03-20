import { GraphQLJSON } from 'backend/src/graphql/types/common';
import { createTypeSafeObjectType } from 'backend/src/graphql/utils/typeSafeGraphQL';
import { ConversationType } from 'backend/src/graphql/workspace/types/conversation';
import { GraphQLString, GraphQLNonNull } from 'graphql';

import type { Workspace } from 'core/src/workspace/workspace.types';

// Type-safe Workspace GraphQL type - ensures all fields from Workspace type are present
export const WorkspaceType = createTypeSafeObjectType<Workspace>({
  name: 'Workspace',
  description: 'A workspace containing a conversation and metadata',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLString) },
    name: { type: GraphQLString },
    conversation: { type: new GraphQLNonNull(ConversationType) },
    workflow: { type: GraphQLJSON },
    description: { type: GraphQLString },
    created_at: { type: GraphQLString },
    updated_at: { type: GraphQLString },
    report_overview: { type: GraphQLString },
  }),
});
