import { GraphQLJSON } from 'backend/src/graphql/types/common';
import { ConversationInputType } from 'backend/src/graphql/workspace/types/conversation';
import { log } from 'core/src/helpers/logger';
import {
  GraphQLBoolean,
  GraphQLInputObjectType,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql';
import { v4 as uuidv4 } from 'uuid';

import type { Context } from 'backend/src/context';
import type { GraphResolver } from 'backend/src/graphql/graphql.types';

export type UpsertWorkspaceResponse = {
  upsert_workspace: {
    id: string;
    success: boolean;
  };
};

/**
 * GraphQL mutation to save a workspace (create or update)
 */
export const UPSERT_WORKSPACE = `
  mutation UpsertWorkspace($workspace: WorkspaceInput!) {
    upsert_workspace(workspace: $workspace) {
      id
      success
    }
  }
`;

// Workspace input type
export const WorkspaceInputType = new GraphQLInputObjectType({
  name: 'WorkspaceInput',
  fields: () => ({
    id: { type: GraphQLString },
    name: { type: GraphQLString },
    conversation: { type: new GraphQLNonNull(ConversationInputType) },
    workflow: { type: GraphQLJSON },
    description: { type: GraphQLString },
  }),
});

// Upsert workspace response type
export const UpsertWorkspaceResponseType = new GraphQLObjectType({
  name: 'UpsertWorkspaceResponse',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLString) },
    success: { type: new GraphQLNonNull(GraphQLBoolean) },
  }),
});

// Save workspace resolver with GraphQL type definition
export const UpsertWorkspaceResolver: GraphResolver = {
  type: UpsertWorkspaceResponseType,
  args: {
    workspace: { type: WorkspaceInputType },
  },
  resolve: async (_root: any, { workspace }: { workspace: any }, context: Context) => {
    const { db } = context;

    try {
      if (!workspace) {
        throw new Error('Workspace is required');
      }

      let workspaceId: string;
      const now = new Date().toISOString();

      if (workspace.id) {
        workspaceId = workspace.id;
        const updateData: Record<string, unknown> = {
          id: workspaceId,
          updated_at: now,
        };
        if (workspace.name !== undefined) {
          updateData.name = workspace.name;
        }
        if (workspace.conversation !== undefined) {
          updateData.conversation = workspace.conversation;
        }
        if (workspace.workflow !== undefined) {
          updateData.workflow = workspace.workflow;
        }
        if (workspace.description !== undefined) {
          updateData.description = workspace.description;
        }

        const result = await db
          .from('workspaces')
          .upsert(updateData as Record<string, unknown>, { onConflict: 'id' });

        if (result.error) {
          throw new Error(`Failed to update workspace: ${result.error.message}`);
        }
      } else {
        workspaceId = uuidv4();
        const insertResult = await db
          .from('workspaces')
          .insert({
            id: workspaceId,
            name: workspace.name,
            conversation: workspace.conversation,
            workflow: workspace.workflow,
            description: workspace.description,
            created_at: now,
            updated_at: now,
          })
          .select('id')
          .single();

        if (insertResult.error) {
          throw new Error(`Failed to create workspace: ${insertResult.error.message}`);
        }
        if (!insertResult.data?.id) {
          throw new Error('Failed to create workspace - no data returned');
        }
      }

      return {
        id: workspaceId,
        success: true,
      };
    } catch (error) {
      log.error('GRAPHQL', 'Error in upsertWorkspace resolver:', error);
      throw error;
    }
  },
};
