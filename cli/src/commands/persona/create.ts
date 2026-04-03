import { getDatabaseClient } from 'core/src/database/client';
import { log, LogCategory } from 'core/src/helpers/logger';
import { createPersonasBackground } from 'core/src/personas/functions/createPersonasBackground';

import { isInteractive, number, selectFromList } from 'cli/src/commands/prompts';

type PersonaCreateOptions = {
  cohortId?: string;
  count: string;
};

export async function runPersonaCreate(options: PersonaCreateOptions): Promise<void> {
  const db = getDatabaseClient();
  let cohortId = options.cohortId;
  if (cohortId == null || cohortId === '') {
    if (!isInteractive()) {
      throw new Error('Cohort ID required. Use: mass persona create -c <cohort-id>');
    }
    const response = await db.from('cohorts').select('id, name, description');
    if (response.error) {
      throw new Error(response.error.message);
    }
    const rows = (response.data ?? []) as { id: string; name?: string; description?: string }[];
    if (rows.length === 0) {
      log.info(
        LogCategory.MASS,
        'No cohorts. Create one with: mass cohort create <name> -p "<prompt>"'
      );
      return;
    }
    const choices = rows.map(r => ({
      value: r.id,
      name: `${r.name ?? r.id} (${(r.description ?? '').slice(0, 40)}...)`,
    }));
    cohortId = await selectFromList(choices, 'Select cohort');
  }

  let count: number;
  if (isInteractive() && (options.cohortId == null || options.cohortId === '')) {
    count = await number('Number of personas to create?', 5, 1, 20);
  } else {
    count = Math.min(Math.max(1, parseInt(options.count, 10) || 5), 20);
  }

  const { data: cohort, error: cohortError } = await db
    .from('cohorts')
    .select('*')
    .eq('id', cohortId)
    .single();

  if (cohortError || !cohort) {
    throw new Error(
      `Cohort not found: ${cohortId}. Create one with \`mass cohort create <name> -p "<prompt>"\`.`
    );
  }

  const prompt = (cohort as { description?: string }).description ?? cohortId;
  const result = await createPersonasBackground({
    cohortId,
    cohortPrompt: prompt,
    count,
  });

  log.info(LogCategory.MASS, `Personas created: ${result.created}`);
  if (result.errors?.length) {
    result.errors.forEach((e: string) => log.error(LogCategory.MASS, '  ', e));
  }
}
