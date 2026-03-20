import { getDatabaseClient } from 'core/src/database/client';
import { log, LogCategory } from 'core/src/helpers/logger';

export async function runWorkspaceList(): Promise<void> {
  const db = getDatabaseClient();
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
  for (const r of rows) {
    const name = (r.name ?? '').slice(0, 40);
    const desc = (r.description ?? '').slice(0, 50);
    log.info(
      LogCategory.MASS,
      `${r.id}\t${name}\t${desc}${(r.description ?? '').length > 50 ? '...' : ''}\t${r.created_at ?? ''}`
    );
  }
}
