import { getDatabaseClient } from 'core/src/database/client';
import { log, LogCategory } from 'core/src/helpers/logger';

export async function runCohortList(): Promise<void> {
  const db = getDatabaseClient();
  const response = await db.from('cohorts').select('id, name, description, data');
  if (response.error) {
    throw new Error(response.error.message);
  }
  const rows = (response.data ?? []) as {
    id: string;
    name?: string;
    description?: string;
    data?: { persona_ids?: string[] };
  }[];
  if (rows.length === 0) {
    log.info(LogCategory.MASS, 'No cohorts.');
    return;
  }
  for (const r of rows) {
    const count = r.data?.persona_ids?.length ?? 0;
    log.info(
      LogCategory.MASS,
      `${r.id}\t${r.name ?? ''}\t${(r.description ?? '').slice(0, 60)}${(r.description ?? '').length > 60 ? '...' : ''}\t(personas: ${count})`
    );
  }
}
