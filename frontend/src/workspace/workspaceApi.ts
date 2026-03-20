import {
  DELETE_WORKSPACE,
  type DeleteWorkspaceResponse,
} from 'backend/src/graphql/workspace/mutations/deleteWorkspace';
import {
  UPSERT_WORKSPACE,
  type UpsertWorkspaceResponse,
} from 'backend/src/graphql/workspace/mutations/upsertWorkspace';
import {
  GET_WORKSPACE,
  type WorkspaceResponse,
} from 'backend/src/graphql/workspace/queries/workspace';
import {
  GET_WORKSPACES,
  type WorkspacesResponse,
} from 'backend/src/graphql/workspace/queries/workspaces';
import { log } from 'core/src/helpers/logger';

import { executeGraphQL } from 'frontend/src/api/graphqlClient';

import type { Conversation } from 'core/src/workspace/conversation.types';
import type { Workspace } from 'core/src/workspace/workspace.types';

type FetchWorkspacesOptions = {
  /** When false, return the list without updating the workspace store. Default true. */
  storeResult?: boolean;
};

/**
 * Loads workspaces from the server
 * @param forceRefresh If true, always fetches fresh data even if already refreshing
 * @param options When storeResult is false, the list is returned without updating the store.
 */
export const fetchWorkspaces = async (
  forceRefresh = false,
  _options?: FetchWorkspacesOptions
): Promise<Workspace[]> => {
  try {
    log.debug('WORKSPACE', '[workspaceApi]', 'Fetching workspaces from server...', {
      forceRefresh,
    });
    const data = await executeGraphQL<WorkspacesResponse>(GET_WORKSPACES, {}, true);
    log.debug(
      'WORKSPACE',
      '[workspaceApi]',
      'Received workspaces from server:',
      data.workspaces.workspaces.length
    );

    const freshWorkspaces =
      data.workspaces.workspaces.map(workspace => {
        const conversation = workspace.conversation;
        return {
          ...workspace,
          name: workspace.name || '',
          description: workspace.description || '',
          conversation,
          created_at: workspace.created_at,
          updated_at: workspace.updated_at,
          report_overview: workspace.report_overview ?? undefined,
        };
      }) || [];

    return freshWorkspaces;
  } catch (error) {
    log.error('WORKSPACE', '[workspaceApi]', 'Error loading workspaces:', error);
    return [];
  }
};

/**
 * Loads a specific workspace from the server using GraphQL
 * @param workspaceId Optional ID of the workspace to load. If not provided, loads the most recent workspace.
 */
export const fetchWorkspace = async (workspaceId?: string): Promise<Workspace> => {
  const data = await executeGraphQL<WorkspaceResponse>(GET_WORKSPACE, { workspaceId }, true);

  if (!data.workspace.workspace) {
    throw new Error('Workspace not found');
  }

  // Transform the GraphQL data back to our application model
  const conversation = data.workspace.workspace.conversation;
  const rawWorkflow = data.workspace.workspace.workflow;

  return {
    id: data.workspace.workspace.id || '',
    name: data.workspace.workspace.name || '',
    description: data.workspace.workspace.description || '',
    created_at: data.workspace.workspace.created_at,
    updated_at: data.workspace.workspace.updated_at,
    conversation,
    workflow: rawWorkflow != null ? (rawWorkflow as Workspace['workflow']) : null,
  };
};

/**
 * Saves a workspace to the server using GraphQL
 * @param conversation The conversation to save
 * @param name Name of the workspace
 * @param description Description of the workspace
 * @param workspaceId Optional ID of the workspace. If provided, updates that workspace; otherwise creates a new one.
 * @param workflow Optional workflow instance to save
 */
export const upsertWorkspaceConversation = async (
  conversation: Conversation,
  name: string,
  description: string,
  workspaceId?: string
): Promise<{ id: string }> => {
  const response = await executeGraphQL<UpsertWorkspaceResponse>(
    UPSERT_WORKSPACE,
    {
      workspace: {
        id: workspaceId,
        name,
        description,
        conversation,
      },
    },
    true,
    0,
    45000
  );
  return { id: response.upsert_workspace.id };
};

/**
 * Deletes a workspace by ID.
 */
export const deleteWorkspace = async (workspaceId: string): Promise<void> => {
  const response = await executeGraphQL<DeleteWorkspaceResponse>(
    DELETE_WORKSPACE,
    { workspaceId },
    true
  );
  if (!response.delete_workspace?.success) {
    throw new Error('Failed to delete workspace');
  }
};
