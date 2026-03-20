import { Command } from 'commander';

import { runReportDelete } from 'cli/src/commands/report/delete';
import { runReport } from 'cli/src/commands/report/generate';
import { runReportList } from 'cli/src/commands/report/list';
import { runReportShow } from 'cli/src/commands/report/show';

export const registerReportCommands = (program: Command): void => {
  const reportCmd = program.command('report').description('Report commands');

  reportCmd
    .command('generate')
    .description('Generate a report and optionally write HTML')
    .option('-p, --prompt <text>', 'Report prompt (e.g. what to ask the cohort)')
    .option('--cohort <id>', 'Cohort ID to use')
    .option('--personas <ids>', 'Comma-separated persona IDs (alternative to cohort)')
    .option(
      '-t, --type <type>',
      'Report type: feedback | debate | questionnaire | ideas',
      'feedback'
    )
    .option(
      '--debate-rounds <n>',
      'Debate only: max speaking turns (default 20)',
      (value: string) => parseInt(value, 10)
    )
    .option(
      '--debate-duration <minutes>',
      'Debate only: stop after N minutes; 0 = no limit (default 2)',
      (value: string) => parseInt(value, 10)
    )
    .option('-o, --out <path>', 'Write report HTML to this path')
    .option('-f, --file-path <path>', 'File path to ask opinion on')
    .option('-w, --workspace <id>', 'Use existing workspace ID')
    .action(
      async (opts: {
        prompt?: string;
        cohort?: string;
        personas?: string;
        type: string;
        debateRounds?: number;
        debateDuration?: number;
        out?: string;
        filePath?: string;
        workspace?: string;
      }) => {
        const root = program.opts() as { dataDir?: string };
        if (root.dataDir) {
          process.env.MASS_DATA_DIR = root.dataDir;
        }
        await runReport({
          prompt: opts.prompt,
          cohortId: opts.cohort,
          personaIds: opts.personas
            ? opts.personas.split(',').map(value => value.trim())
            : undefined,
          reportType: opts.type as 'feedback' | 'debate' | 'questionnaire' | 'ideas',
          debateRounds: opts.debateRounds,
          debateDurationMinutes: opts.debateDuration,
          outPath: opts.out,
          filePath: opts.filePath,
          workspaceId: opts.workspace,
        });
      }
    );

  reportCmd
    .command('list')
    .description('List reports (optionally by workspace)')
    .option('-w, --workspace <id>', 'Filter by workspace ID')
    .action(async (opts: { workspace?: string }) => {
      const root = program.opts() as { dataDir?: string };
      if (root.dataDir) {
        process.env.MASS_DATA_DIR = root.dataDir;
      }
      await runReportList({ workspaceId: opts.workspace });
    });

  reportCmd
    .command('show [report-id]')
    .description('Show report by ID (prompts to select if omitted and interactive)')
    .option('-o, --out <path>', 'Write report HTML (and JSON) to this path')
    .action(async (reportId: string | undefined, opts: { out?: string }) => {
      const root = program.opts() as { dataDir?: string };
      if (root.dataDir) {
        process.env.MASS_DATA_DIR = root.dataDir;
      }
      await runReportShow({ reportId, outPath: opts.out });
    });

  reportCmd
    .command('delete [report-id]')
    .description('Delete a report by ID (prompts to select if omitted and interactive)')
    .action(async (reportId: string | undefined) => {
      const root = program.opts() as { dataDir?: string };
      if (root.dataDir) {
        process.env.MASS_DATA_DIR = root.dataDir;
      }
      await runReportDelete(reportId);
    });

  reportCmd.action(() => reportCmd.help());
};
