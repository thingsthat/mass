import { getDatabaseClient } from 'core/src/database/client';
import { log, LogCategory } from 'core/src/helpers/logger';
import { createPersonasBackground } from 'core/src/personas/functions/createPersonasBackground';
import { generateCohortConfig } from 'core/src/personas/llm/controllers/cohort/cohortConfigLLM';

import {
  clearProgress,
  createProgressReporter,
  input,
  isInteractive,
  number,
} from 'cli/src/commands/prompts';

type CohortCreateOptions = {
  name?: string;
  prompt?: string;
  count: string;
  createPersonas: boolean;
};

export async function runCohortCreate(options: CohortCreateOptions): Promise<void> {
  const db = getDatabaseClient();
  let { name, prompt, count: countOpt, createPersonas } = options;

  if (name == null || name === '') {
    if (!isInteractive()) {
      throw new Error('Cohort name required. Use: mass cohort create <name>');
    }
    name = await input('Cohort name?');
    if (!name.trim()) {
      throw new Error('Cohort name is required.');
    }
  }

  if (prompt == null || prompt === '') {
    if (isInteractive()) {
      prompt = await input('Cohort description/prompt for the LLM?', name);
    } else {
      prompt = name;
    }
  }
  prompt = prompt?.trim() || name;

  let count: number;
  if (isInteractive() && (name == null || options.name == null || options.name === '')) {
    count = await number('Number of personas to create (1-10)?', 5, 1, 10);
  } else {
    count = Math.min(Math.max(1, parseInt(countOpt, 10) || 5), 10);
  }

  log.info(LogCategory.MASS, 'Generating cohort config', { name, prompt });
  if (process.stdout.isTTY) {
    process.stdout.write('\rGenerating cohort config...'.padEnd(60));
  }
  const _cohortConfig = await generateCohortConfig(prompt);
  if (process.stdout.isTTY) {
    process.stdout.write('\r' + ' '.repeat(60) + '\r');
  }

  const cohortId = crypto.randomUUID();
  const cohortData = {
    status: 'processing' as const,
    persona_ids: [] as string[],
  };

  const { error: insertError } = await db
    .from('cohorts')
    .insert({
      id: cohortId,
      name,
      description: prompt,
      data: cohortData,
    })
    .select('id')
    .single();

  if (insertError) {
    throw new Error(`Failed to create cohort: ${insertError.message}`);
  }

  log.info(LogCategory.MASS, `Cohort created: ${cohortId} (${name})`);

  if (createPersonas) {
    log.info(LogCategory.MASS, 'Creating personas', { cohortId, count });
    const reportProgress = createProgressReporter();
    const result = await createPersonasBackground(
      {
        cohortId,
        cohortPrompt: prompt,
        count,
      },
      { onProgress: reportProgress }
    );
    clearProgress();
    log.info(
      LogCategory.MASS,
      `Personas created: ${result.created} (${result.errors?.length ?? 0} errors)`
    );
    if (result.errors?.length) {
      result.errors.forEach((e: string) => log.error(LogCategory.MASS, '  ', e));
    }
  } else {
    log.info(
      LogCategory.MASS,
      'Run `mass persona create -c ' + cohortId + ' -n ' + count + '` to create personas.'
    );
  }
}
