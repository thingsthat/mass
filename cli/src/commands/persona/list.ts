import { getDatabaseClient } from 'core/src/database/client';
import { log, LogCategory } from 'core/src/helpers/logger';

export type PersonaListOptions = {
  cohortId?: string;
};

export async function runPersonaList(options: PersonaListOptions): Promise<void> {
  const db = getDatabaseClient();
  let response: { data: unknown[] | null; error: { message: string } | null };
  if (options.cohortId) {
    const { data: cohort, error: cohortError } = await db
      .from('cohorts')
      .select('id, data')
      .eq('id', options.cohortId)
      .single();
    if (cohortError || !cohort) {
      throw new Error(`Cohort not found: ${options.cohortId}`);
    }
    const personaIds = (cohort as { data?: { persona_ids?: string[] } }).data?.persona_ids ?? [];
    if (personaIds.length === 0) {
      log.info(LogCategory.MASS, 'Cohort has no personas.');
      return;
    }
    const rows: { id: string; name?: string; metadata?: Record<string, unknown> }[] = [];
    for (const id of personaIds) {
      const { data: p, error } = await db
        .from('personas')
        .select('id, name, metadata')
        .eq('id', id)
        .single();
      if (!error && p) {
        rows.push(p as { id: string; name?: string; metadata?: Record<string, unknown> });
      }
    }
    if (rows.length === 0) {
      log.info(LogCategory.MASS, 'No personas found for this cohort.');
      return;
    }
    for (const r of rows) {
      const name = (r.name ?? (r.metadata as { name?: string })?.name ?? r.id).slice(0, 40);
      log.info(LogCategory.MASS, `${r.id}\t${name}`);
    }
    return;
  }
  response = await db.from('personas').select('id, name, metadata');
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
  for (const r of rows) {
    const name = (r.name ?? (r.metadata as { name?: string })?.name ?? r.id).slice(0, 40);
    log.info(LogCategory.MASS, `${r.id}\t${name}`);
  }
}
