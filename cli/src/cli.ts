#!/usr/bin/env node
/**
 * Mass CLI. Set MASS_CLI=true (or use pnpm run cli) so the app uses the local JSON store.
 * Data lives under data by default (MASS_DATA_DIR to override).
 */
import 'core/src/env';

import { Command } from 'commander';
import { logApp } from 'core/src/helpers/logger';

import { runChat } from 'cli/src/commands/chat';
import { registerCohortCommands } from 'cli/src/commands/cohort/registerCommands';
import { registerPersonaCommands } from 'cli/src/commands/persona/registerCommands';
import { registerReportCommands } from 'cli/src/commands/report/registerCommands';
import { registerSimulationCommands } from 'cli/src/commands/simulation/registerCommands';
import { registerWorkspaceCommands } from 'cli/src/commands/workspace/registerCommands';

const program = new Command();

program
  .name('mass')
  .description('CLI for cohorts, personas, chat, and reports (local JSON store)')
  .version('0.2.0')
  .option(
    '-d, --data-dir <path>',
    'Data directory for personas, cohorts, workspaces, reports (default: data)'
  )
  .option('-v, --verbose', 'Enable verbose (debug/info) logging');

registerCohortCommands(program);
registerPersonaCommands(program);
registerWorkspaceCommands(program);
registerSimulationCommands(program);

program
  .command('chat')
  .description('Chat with persona(s) or workspace (use workspace personas/cohorts if -w is set)')
  .option('-w, --workspace <id>', 'Workspace ID (creates one if omitted)')
  .option('-p, --persona <id>', 'Persona ID (repeat for multiple)', (v: string, prev: string[]) =>
    (prev ?? []).concat(v)
  )
  .option('-c, --cohort <id>', 'Cohort ID (ask all personas in cohort)')
  .option('-m, --message <text>', 'Message to send (otherwise stdin)')
  .option('-f, --file-path <path>', 'File path to ask opinion on')
  .action(
    async (opts: {
      workspace?: string;
      persona?: string | string[];
      message?: string;
      filePath?: string;
      cohort?: string;
    }) => {
      const root = program.opts() as { dataDir?: string };
      if (root.dataDir) {
        process.env.MASS_DATA_DIR = root.dataDir;
      }
      const personaIds = Array.isArray(opts.persona)
        ? opts.persona
        : opts.persona
          ? [opts.persona]
          : undefined;
      await runChat({
        workspaceId: opts.workspace,
        personaIds,
        cohortId: opts.cohort,
        message: opts.message,
        filePath: opts.filePath,
      });
    }
  );

registerReportCommands(program);

program.action(() => {
  logApp();
  program.help();
});

if (process.argv.includes('-v') || process.argv.includes('--verbose')) {
  process.env.MASS_VERBOSE = '1';
}

program.parseAsync(process.argv).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
