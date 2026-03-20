import { Command } from 'commander';

import { runScenarioCreate } from 'cli/src/commands/simulation/runScenarioCreate';
import { runSimulationInject } from 'cli/src/commands/simulation/runSimulationInject';
import { runSimulationRun } from 'cli/src/commands/simulation/runSimulationRun';

export const registerSimulationCommands = (program: Command): void => {
  const simCmd = program.command('simulation').description('Simulation and scenario commands');

  simCmd
    .command('run')
    .description(
      'Run a simulation: create a scenario then run (use --config and -n), or run an existing workspace/task (-w or -t). Creates a task if needed, then runs until completion or pause.'
    )
    .option(
      '--config <json>',
      'Scenario config when creating: core_issue (string), initial_variables (object), optional stances (array). See docs/simulations.md for examples.'
    )
    .option('-n, --name <name>', 'Scenario name (required with --config to create-then-run)')
    .option('-d, --description <text>', 'Description (when creating)')
    .option('--max-steps <number>', 'Max simulation steps', '10')
    .option(
      '-c, --cohort <id>',
      'Cohort ID when creating (personas in cohort act in the simulation)'
    )
    .option(
      '--persona-count <number>',
      'When creating without -c: pick this many personas at random from the database'
    )
    .option(
      '--persona <id>',
      'Persona ID when creating (repeat for multiple)',
      (v: string, prev: string[]) => (prev ?? []).concat(v)
    )
    .option(
      '-w, --workspace <id>',
      'Workspace ID (use when not creating; required unless -t or --config/-n set)'
    )
    .option('-t, --task <id>', 'Task ID (run existing task only; no auto-create)')
    .action(
      async (opts: {
        config?: string;
        name?: string;
        description?: string;
        maxSteps?: string;
        cohort?: string;
        personaCount?: string;
        persona?: string[];
        workspace?: string;
        task?: string;
      }) => {
        const root = program.opts() as { dataDir?: string };
        if (root.dataDir) {
          process.env.MASS_DATA_DIR = root.dataDir;
        }
        const maxStepsParsed = opts.maxSteps ? parseInt(opts.maxSteps, 10) : undefined;
        const personaCountParsed = opts.personaCount ? parseInt(opts.personaCount, 10) : undefined;
        if (opts.config !== undefined || opts.name !== undefined) {
          if (!opts.config || !opts.name) {
            throw new Error(
              'To create and run a scenario you must provide both --config and -n/--name. To run an existing simulation use -w/--workspace <id> or -t/--task <id>.'
            );
          }
        }
        if (opts.config && opts.name) {
          let config: {
            core_issue: string;
            initial_variables: Record<string, number | string | boolean>;
            stances?: string[];
          };
          try {
            config = JSON.parse(opts.config) as typeof config;
          } catch {
            throw new Error('--config must be valid JSON with core_issue and initial_variables');
          }
          if (
            typeof config.core_issue !== 'string' ||
            typeof config.initial_variables !== 'object' ||
            config.initial_variables === null
          ) {
            throw new Error(
              '--config must include "core_issue" (string) and "initial_variables" (object)'
            );
          }
          const workspaceId = await runScenarioCreate({
            config: {
              core_issue: config.core_issue,
              initial_variables: config.initial_variables,
              stances: Array.isArray(config.stances) ? config.stances : undefined,
            },
            name: opts.name,
            description: opts.description,
            maxSteps: maxStepsParsed,
            cohortId: opts.cohort,
            personaIds: opts.persona,
            personaCount: personaCountParsed,
          });
          await runSimulationRun({
            workspaceId,
            maxSteps: maxStepsParsed,
          });
        } else {
          await runSimulationRun({
            workspaceId: opts.workspace,
            taskId: opts.task,
            maxSteps: maxStepsParsed,
          });
        }
      }
    );

  simCmd
    .command('inject <workspace-id>')
    .description('Inject an intervention (e.g. Policy Draft Leak, Campaign Speech)')
    .requiredOption('--type <type>', 'Event type: news, policy, market, product, social, incident')
    .requiredOption('--title <title>', 'Event title')
    .requiredOption('--description <text>', 'Event description')
    .requiredOption(
      '--effects <json>',
      'JSON object: keys are variable names, values must be number/string/boolean (e.g. \'{"public_approval":40,"polarisation_index":60}\')'
    )
    .option('--at-step <number>', 'Apply at this step (default: next step)')
    .action(
      async (
        workspaceId: string,
        opts: {
          type: 'news' | 'policy' | 'market' | 'product' | 'social' | 'incident';
          title: string;
          description: string;
          effects: string;
          atStep?: string;
        }
      ) => {
        const root = program.opts() as { dataDir?: string };
        if (root.dataDir) {
          process.env.MASS_DATA_DIR = root.dataDir;
        }
        await runSimulationInject({
          workspaceId,
          type: opts.type,
          title: opts.title,
          description: opts.description,
          effectsJson: opts.effects,
          atStep: opts.atStep ? parseInt(opts.atStep, 10) : undefined,
        });
      }
    );

  simCmd.action(() => simCmd.help());
};
