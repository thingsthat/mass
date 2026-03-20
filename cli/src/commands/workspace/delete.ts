import { getDatabaseClient } from 'core/src/database/client';
import { log, LogCategory } from 'core/src/helpers/logger';

import { isInteractive, selectFromList } from 'cli/src/commands/prompts';

export async function runWorkspaceDelete(workspaceId?: string): Promise<void> {
  const db = getDatabaseClient();
  let id = workspaceId;
  if (id == null || id === '') {
    if (!isInteractive()) {
      throw new Error('Workspace ID required. Use: mass workspace delete <id>');
    }
    const response = await db.from('workspaces').select('id, name, description, created_at');
    if (response.error) {
      throw new Error(response.error.message);
    }
    const rows = (response.data ?? []) as {
      id: string;
      name?: string;
      description?: string;
      created_at?: string;
    }[];
    if (rows.length === 0) {
      log.info(LogCategory.MASS, 'No workspaces.');
      return;
    }
    const choices = rows.map(r => {
      const name = (r.name ?? r.id).slice(0, 40);
      return { value: r.id, name: `${name} (${r.id})` };
    });
    id = await selectFromList(choices, 'Select workspace to delete');
  }
  const { error } = await db.from('workspaces').delete().eq('id', id);
  if (error) {
    throw new Error(`Failed to delete workspace: ${error.message}`);
  }
  log.info(LogCategory.MASS, 'Deleted workspace:', id);
}
