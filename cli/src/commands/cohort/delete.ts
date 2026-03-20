import { getDatabaseClient } from 'core/src/database/client';
import { log, LogCategory } from 'core/src/helpers/logger';

import { isInteractive, selectFromList } from 'cli/src/commands/prompts';

export async function runCohortDelete(cohortId?: string): Promise<void> {
  const db = getDatabaseClient();
  let id = cohortId;
  if (id == null || id === '') {
    if (!isInteractive()) {
      throw new Error('Cohort ID required. Use: mass cohort delete <id>');
    }
    const response = await db.from('cohorts').select('id, name, description');
    if (response.error) {
      throw new Error(response.error.message);
    }
    const rows = (response.data ?? []) as { id: string; name?: string; description?: string }[];
    if (rows.length === 0) {
      log.info(LogCategory.MASS, 'No cohorts.');
      return;
    }
    const choices = rows.map(r => ({
      value: r.id,
      name: `${r.name ?? r.id} (${r.id})`,
    }));
    id = await selectFromList(choices, 'Select cohort to delete');
  }
  const { error } = await db.from('cohorts').delete().eq('id', id);
  if (error) {
    throw new Error(`Failed to delete cohort: ${error.message}`);
  }
  log.info(LogCategory.MASS, 'Deleted cohort:', id);
}
