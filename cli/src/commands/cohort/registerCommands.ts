import { Command } from 'commander';

import { runCohortCreate } from 'cli/src/commands/cohort/create';
import { runCohortDelete } from 'cli/src/commands/cohort/delete';
import { runCohortList } from 'cli/src/commands/cohort/list';

export const registerCohortCommands = (program: Command): void => {
  const cohortCmd = program.command('cohort').description('Cohort commands');

  cohortCmd
    .command('create [name]')
    .description(
      'Create a cohort with LLM-generated config (prompts for missing values when interactive)'
    )
    .option('-n, --name <name>', 'Cohort name')
    .option('-p, --prompt <text>', 'Cohort description/prompt for the LLM')
    .option('-c, --count <n>', 'Number of personas to create (1-10)', '5')
    .option('--no-personas', 'Only create cohort config, do not create personas')
    .action(
      async (
        nameArg: string | undefined,
        opts: { name?: string; prompt?: string; count: string; personas: boolean }
      ) => {
        const name = opts.name ?? nameArg;
        await runCohortCreate({
          name,
          prompt: opts.prompt,
          count: opts.count,
          createPersonas: opts.personas,
        });
      }
    );

  cohortCmd
    .command('list')
    .description('List cohorts (id, name, description, persona count)')
    .action(async () => {
      const root = program.opts() as { dataDir?: string };
      if (root.dataDir) {
        process.env.MASS_DATA_DIR = root.dataDir;
      }
      await runCohortList();
    });

  cohortCmd
    .command('delete [id]')
    .description('Delete a cohort by ID (prompts to select if omitted and interactive)')
    .action(async (id: string | undefined) => {
      const root = program.opts() as { dataDir?: string };
      if (root.dataDir) {
        process.env.MASS_DATA_DIR = root.dataDir;
      }
      await runCohortDelete(id);
    });

  cohortCmd.action(() => cohortCmd.help());
};
