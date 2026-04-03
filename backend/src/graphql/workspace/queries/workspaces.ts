import { log } from 'core/src/helpers/logger';
import { GraphQLList, GraphQLNonNull, GraphQLObjectType } from 'graphql';

import { WorkspaceType } from 'backend/src/graphql/workspace/types/workspace';

import type { Context } from 'backend/src/context';
import type { GraphResolver } from 'backend/src/graphql/graphql.types';
import type { Conversation } from 'core/src/workspace/conversation.types';
import type { Workspace } from 'core/src/workspace/workspace.types';

export type WorkspacesResponse = {
  workspaces: {
    workspaces: {
      id: string;
      name: string;
      conversation: Conversation;
      created_at?: string;
      updated_at?: string;
      description?: string;
      report_overview?: string | null;
    }[];
  };
};

export const GET_WORKSPACES = `
  query GetWorkspaces {
    workspaces {
      workspaces {
        id
        name
        conversation {
          id
          messages
          name
          status
          cohort_ids
          persona_ids
          persona_metadata
          fork
        }
        workflow
        created_at
        updated_at
        description
        report_overview
      }
    }
  }
`;

export const WorkspacesResolver: GraphResolver = {
  type: new GraphQLObjectType({
    name: 'WorkspacesResponse',
    fields: () => ({
      workspaces: { type: new GraphQLNonNull(new GraphQLList(WorkspaceType)) },
    }),
  }),
  args: {},
  resolve: async (_root: any, _args: Record<string, never>, context: Context) => {
    const { db } = context;

    try {
      const result = await db
        .from('workspaces')
        .select('id, name, conversation, workflow, created_at, updated_at, description')
        .order('updated_at', { ascending: false });

      const data = result.data ?? [];
      const error = result.error;

      if (error) {
        throw new Error(`Failed to load workspaces: ${error.message}`);
      }

      const workspacesList = (
        Array.isArray(data) ? (data as unknown as Workspace[]) : []
      ) as Workspace[];
      const workspaces = workspacesList.map((workspace: Workspace) => ({
        id: workspace.id,
        name: workspace.name,
        description: workspace.description ?? '',
        conversation: workspace.conversation,
        workflow: workspace.workflow,
        created_at: workspace.created_at,
        updated_at: workspace.updated_at,
        report_overview: null,
      }));

      return { workspaces };
    } catch (error) {
      log.error('GRAPHQL', 'Error in workspaces resolver:', error);
      throw error;
    }
  },
};
