import { log } from 'core/src/helpers/logger';
import { deleteWorkspace as deleteWorkspaceController } from 'core/src/workspace/controllers/workspaces';
import { GraphQLBoolean, GraphQLNonNull, GraphQLObjectType, GraphQLString } from 'graphql';

import type { Context } from 'backend/src/context';
import type { GraphResolver } from 'backend/src/graphql/graphql.types';

export type DeleteWorkspaceResponse = {
  delete_workspace: {
    success: boolean;
  };
};

export const DELETE_WORKSPACE = `
  mutation DeleteWorkspace($workspaceId: String!) {
    delete_workspace(workspaceId: $workspaceId) {
      success
    }
  }
`;

const DeleteWorkspaceResponseType = new GraphQLObjectType({
  name: 'DeleteWorkspaceResponse',
  fields: () => ({
    success: { type: new GraphQLNonNull(GraphQLBoolean) },
  }),
});

export const DeleteWorkspaceResolver: GraphResolver = {
  type: DeleteWorkspaceResponseType,
  args: {
    workspaceId: { type: new GraphQLNonNull(GraphQLString) },
  },
  resolve: async (_root: unknown, { workspaceId }: { workspaceId: string }, context: Context) => {
    try {
      await deleteWorkspaceController(context.db, workspaceId);
      return { success: true };
    } catch (error) {
      log.error('GRAPHQL', 'Error in deleteWorkspace resolver:', error);
      throw error;
    }
  },
};
