import { getDatabaseClient } from 'core/src/database/client';
import { log, LogCategory } from 'core/src/helpers/logger';

import { isInteractive, selectFromList } from 'cli/src/commands/prompts';

export async function runPersonaDelete(personaId?: string): Promise<void> {
  const db = getDatabaseClient();
  let id = personaId;
  if (id == null || id === '') {
    if (!isInteractive()) {
      throw new Error('Persona ID required. Use: mass persona delete <id>');
    }
    const response = await db.from('personas').select('id, name, metadata');
    if (response.error) {
      throw new Error(response.error.message);
    }
    const rows = (response.data ?? []) as {
      id: string;
      name?: string;
      metadata?: Record<string, unknown>;
    }[];
    if (rows.length === 0) {
      log.info(LogCategory.MASS, 'No personas.');
      return;
    }
    const choices = rows.map(r => {
      const name = (r.name ?? (r.metadata as { name?: string })?.name ?? r.id).slice(0, 50);
      return { value: r.id, name: `${name} (${r.id})` };
    });
    id = await selectFromList(choices, 'Select persona to delete');
  }
  const { error } = await db.from('personas').delete().eq('id', id);
  if (error) {
    throw new Error(`Failed to delete persona: ${error.message}`);
  }
  log.info(LogCategory.MASS, 'Deleted persona:', id);
}
