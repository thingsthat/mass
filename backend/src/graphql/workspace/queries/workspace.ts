import { WorkspaceType } from 'backend/src/graphql/workspace/types/workspace';
import { log } from 'core/src/helpers/logger';
import { GraphQLObjectType, GraphQLString } from 'graphql';
import { v4 as uuidv4 } from 'uuid';

import type { Context } from 'backend/src/context';
import type { GraphResolver } from 'backend/src/graphql/graphql.types';
import type { Conversation, Message } from 'core/src/workspace/conversation.types';

export type WorkspaceResponse = {
  workspace: {
    workspace: {
      id: string;
      name: string;
      description: string;
      created_at: string;
      updated_at: string;
      conversation: Conversation;
      workflow?: unknown;
    };
  };
};

export const GET_WORKSPACE = `
  query GetWorkspace($workspaceId: String) {
    workspace(workspaceId: $workspaceId) {
      workspace {
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
      }
    }
  }
`;

export const WorkspaceResolver: GraphResolver = {
  type: new GraphQLObjectType({
    name: 'WorkspaceResponse',
    fields: () => ({
      workspace: { type: WorkspaceType },
    }),
  }),
  args: {
    workspaceId: { type: GraphQLString },
  },
  resolve: async (_root: any, { workspaceId }: { workspaceId?: string }, context: Context) => {
    const { db } = context;

    try {
      let data: Record<string, unknown> | null = null;
      let error: { message: string; code?: string } | null = null;

      if (workspaceId) {
        const result = await db
          .from('workspaces')
          .select('id, name, conversation, workflow, created_at, updated_at, description')
          .eq('id', workspaceId)
          .single();
        data = result.data;
        error = result.error;

        if (error?.code === 'PGRST116') {
          throw new Error('Workspace not found');
        }
        if (error) {
          throw new Error(`Failed to load workspace: ${error.message}`);
        }
      } else {
        const result = await db
          .from('workspaces')
          .select('id, name, conversation, workflow, created_at, updated_at, description')
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();
        data = result.data;
        error = result.error;

        if (error && error.code === 'PGRST116') {
          return {
            workspace: {
              id: '',
              name: '',
              created_at: '',
              updated_at: '',
              description: '',
              conversation: {
                id: '',
                messages: [],
                name: '',
                status: '',
                cohort_ids: [],
                persona_ids: [],
                persona_metadata: {},
              },
              workflow: undefined,
            },
          };
        }
        if (error) {
          throw new Error(`Failed to load workspace: ${error.message}`);
        }
      }

      if (!data) {
        return {
          workspace: {
            id: '',
            name: '',
            created_at: '',
            updated_at: '',
            description: '',
            conversation: {
              id: '',
              messages: [],
              name: '',
              status: '',
              cohort_ids: [],
              persona_ids: [],
              persona_metadata: {},
            },
            workflow: undefined,
          },
        };
      }

      const conversation = data.conversation as Conversation | undefined;
      if (conversation?.messages?.length) {
        const messages = (conversation.messages as Message[]).map((message: Message) =>
          message.id ? message : { ...message, id: uuidv4() }
        );
        await db
          .from('workspaces')
          .update({ conversation: { ...conversation, messages } })
          .eq('id', data.id);
        (data as Record<string, unknown>).conversation = { ...conversation, messages };
      }

      const conv = (data.conversation || {}) as Conversation;
      return {
        workspace: {
          id: String(data.id ?? ''),
          name: String(data.name ?? ''),
          created_at: String(data.created_at ?? ''),
          updated_at: String(data.updated_at ?? ''),
          description: String(data.description ?? ''),
          conversation: {
            id: String(conv.id ?? ''),
            messages: Array.isArray(conv.messages) ? conv.messages : [],
            name: String(conv.name ?? ''),
            status: String(conv.status ?? ''),
            cohort_ids: Array.isArray(conv.cohort_ids) ? conv.cohort_ids : [],
            persona_ids: Array.isArray(conv.persona_ids) ? conv.persona_ids : [],
            persona_metadata:
              conv.persona_metadata && typeof conv.persona_metadata === 'object'
                ? conv.persona_metadata
                : {},
          },
          workflow: data.workflow ?? undefined,
        },
      };
    } catch (error) {
      log.error('GRAPHQL', 'Error in workspace resolver:', error);
      throw error;
    }
  },
};
