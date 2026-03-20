import { getDatabaseClient } from 'core/src/database/client';
import { log, LogCategory } from 'core/src/helpers/logger';
import { renameWorkspace } from 'core/src/workspace/controllers/workspaces';

import { input, isInteractive, selectFromList } from 'cli/src/commands/prompts';

export async function runWorkspaceRename(workspaceId?: string, name?: string): Promise<void> {
  const db = getDatabaseClient();
  let id = workspaceId;
  if (id == null || id === '') {
    if (!isInteractive()) {
      throw new Error('Workspace ID required. Use: mass workspace rename <id> <name>');
    }
    const response = await db.from('workspaces').select('id, name, description');
    if (response.error) {
      throw new Error(response.error.message);
    }
    const rows = (response.data ?? []) as { id: string; name?: string; description?: string }[];
    if (rows.length === 0) {
      log.info(LogCategory.MASS, 'No workspaces.');
      return;
    }
    const choices = rows.map(r => ({
      value: r.id,
      name: `${r.name ?? r.id} (${r.id})`,
    }));
    id = await selectFromList(choices, 'Select workspace to rename');
  }
  let newName = name?.trim();
  if (newName == null || newName === '') {
    if (!isInteractive()) {
      throw new Error('New name required. Use: mass workspace rename <id> <name>');
    }
    newName = await input('New workspace name?');
    if (!newName.trim()) {
      throw new Error('New name is required.');
    }
  }
  await renameWorkspace(db, id, newName);
  log.info(LogCategory.MASS, 'Renamed workspace', id, 'to', newName);
}
