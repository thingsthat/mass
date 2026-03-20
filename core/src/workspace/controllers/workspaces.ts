import { log } from 'core/src/helpers/logger';

import type { DatabaseClient } from 'core/src/database/types';
import type { Report } from 'core/src/reports/reports.types';
import type { Workspace } from 'core/src/workspace/workspace.types';

export const getWorkspaceById = async (
  db: DatabaseClient,
  workspace_id: string
): Promise<Workspace | null> => {
  const { data, error } = await db.from('workspaces').select('*').eq('id', workspace_id).single();
  if (error || !data) {
    return null;
  }
  return data as Workspace;
};

export const getWorkspaceReport = async (
  db: DatabaseClient,
  workspace_id: string
): Promise<Report | null> => {
  const { data: report } = await db
    .from('reports')
    .select('*')
    .eq('workspace_id', workspace_id)
    .eq('status', 'completed')
    .single();
  return report as Report | null;
};

/**
 * Rename a workspace by ID. DB-only; used by CLI (and formerly GraphQL).
 */
export async function renameWorkspace(
  db: DatabaseClient,
  workspaceId: string,
  name: string
): Promise<void> {
  if (!workspaceId || !name || name.trim() === '') {
    throw new Error('Workspace ID and name are required');
  }
  const trimmed = name.trim();
  if (trimmed.length > 40) {
    throw new Error('Name must be less than 40 characters');
  }
  const { data: workspace, error: fetchError } = await db
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .single();
  if (fetchError || !workspace) {
    throw new Error('Workspace not found');
  }
  const { error } = await db
    .from('workspaces')
    .update({
      name: trimmed,
      updated_at: new Date().toISOString(),
    })
    .eq('id', workspaceId)
    .select()
    .single();
  if (error) {
    log.error('WORKSPACE', 'Error renaming workspace:', error);
    throw new Error(`Failed to rename workspace: ${error.message}`);
  }
}

/**
 * Fork a workspace at a given message ID. Creates a new workspace with conversation up to that message. DB-only; used by CLI (and formerly GraphQL).
 */
export async function forkWorkspace(
  db: DatabaseClient,
  workspaceId: string,
  messageId: string
): Promise<{ workspaceId: string }> {
  if (!workspaceId) {
    throw new Error('Workspace is required');
  }
  if (!messageId) {
    throw new Error('Message ID is required');
  }
  const { data: originalWorkspace, error: fetchError } = await db
    .from('workspaces')
    .select('*')
    .eq('id', workspaceId)
    .single();
  if (fetchError || !originalWorkspace) {
    throw new Error('Workspace not found or access denied');
  }
  const conversation = originalWorkspace.conversation as
    | { messages?: { id: string }[]; [key: string]: unknown }
    | undefined;
  const messages = conversation?.messages ?? [];
  const messageIndex = messages.findIndex((msg: { id: string }) => msg.id === messageId);
  if (messageIndex === -1) {
    throw new Error('Message not found in conversation');
  }
  const forkedMessages = messages.slice(0, messageIndex + 1);
  const forkedConversation = {
    ...(conversation ?? {}),
    messages: forkedMessages,
    fork: {
      workspaceId,
      messageId,
      timestamp: new Date().toISOString(),
    },
  };
  const orig = originalWorkspace as { name?: string; description?: string };
  const { data: newWorkspace, error: insertError } = await db
    .from('workspaces')
    .insert({
      name: `${orig.name ?? 'Workspace'} (Fork)`,
      conversation: forkedConversation,
      description: orig.description ?? '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (insertError || !newWorkspace) {
    throw new Error(`Failed to create forked workspace: ${insertError?.message}`);
  }
  const newId = (newWorkspace as { id: string }).id;
  const { data: originalReports, error: reportsError } = await db
    .from('reports')
    .select('*')
    .eq('workspace_id', workspaceId);
  if (reportsError) {
    log.error('WORKSPACE', 'Error fetching original reports:', reportsError);
  } else if (originalReports && Array.isArray(originalReports) && originalReports.length > 0) {
    for (const report of originalReports as { report: unknown; status: string }[]) {
      const { error: duplicateError } = await db
        .from('reports')
        .insert({
          workspace_id: newId,
          report: report.report,
          status: report.status,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('*')
        .single();
      if (duplicateError) {
        log.error('WORKSPACE', 'Error duplicating report:', duplicateError);
        break;
      }
    }
  }
  return { workspaceId: newId };
}

/**
 * Delete a workspace by ID. Removes the workspace row; any reports linked to it
 * are left as-is (caller or DB constraints may handle them).
 */
export async function deleteWorkspace(db: DatabaseClient, workspaceId: string): Promise<void> {
  if (!workspaceId) {
    throw new Error('Workspace ID is required');
  }
  const { error } = await db.from('workspaces').delete().eq('id', workspaceId);
  if (error) {
    log.error('WORKSPACE', 'Error deleting workspace:', error);
    throw new Error(`Failed to delete workspace: ${error.message}`);
  }
}
