import { Command } from 'commander';

import { runPersonaCreate } from 'cli/src/commands/persona/create';
import { runPersonaDelete } from 'cli/src/commands/persona/delete';
import { runPersonaList } from 'cli/src/commands/persona/list';

export const registerPersonaCommands = (program: Command): void => {
  const personaCmd = program.command('persona').description('Persona commands');

  personaCmd
    .command('create')
    .description(
      'Create personas for an existing cohort (prompts to select cohort if -c omitted and interactive)'
    )
    .option('-c, --cohort <id>', 'Cohort ID')
    .option('-n, --count <n>', 'Number of personas to create', '5')
    .action(async (opts: { cohort?: string; count: string }) => {
      const root = program.opts() as { dataDir?: string };
      if (root.dataDir) {
        process.env.MASS_DATA_DIR = root.dataDir;
      }
      await runPersonaCreate({
        cohortId: opts.cohort,
        count: opts.count,
      });
    });

  personaCmd
    .command('list')
    .description('List personas (optionally filter by cohort)')
    .option('-c, --cohort <id>', 'Filter by cohort ID')
    .action(async (opts: { cohort?: string }) => {
      const root = program.opts() as { dataDir?: string };
      if (root.dataDir) {
        process.env.MASS_DATA_DIR = root.dataDir;
      }
      await runPersonaList({ cohortId: opts.cohort });
    });

  personaCmd
    .command('delete [id]')
    .description('Delete a persona by ID (prompts to select if omitted and interactive)')
    .action(async (id: string | undefined) => {
      const root = program.opts() as { dataDir?: string };
      if (root.dataDir) {
        process.env.MASS_DATA_DIR = root.dataDir;
      }
      await runPersonaDelete(id);
    });

  personaCmd.action(() => personaCmd.help());
};
