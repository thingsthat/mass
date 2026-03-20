import { Command } from 'commander';

import { runWorkspaceDelete } from 'cli/src/commands/workspace/delete';
import { runWorkspaceFork } from 'cli/src/commands/workspace/fork';
import { runWorkspaceList } from 'cli/src/commands/workspace/list';
import { runWorkspaceRename } from 'cli/src/commands/workspace/rename';

export const registerWorkspaceCommands = (program: Command): void => {
  const workspaceCmd = program.command('workspace').description('Workspace commands');

  workspaceCmd
    .command('list')
    .description('List workspaces (id, name, description, created_at)')
    .action(async () => {
      const root = program.opts() as { dataDir?: string };
      if (root.dataDir) {
        process.env.MASS_DATA_DIR = root.dataDir;
      }
      await runWorkspaceList();
    });

  workspaceCmd
    .command('delete [id]')
    .description('Delete a workspace by ID (prompts to select if omitted and interactive)')
    .action(async (id: string | undefined) => {
      const root = program.opts() as { dataDir?: string };
      if (root.dataDir) {
        process.env.MASS_DATA_DIR = root.dataDir;
      }
      await runWorkspaceDelete(id);
    });

  workspaceCmd
    .command('rename [id] [name]')
    .description('Rename a workspace by ID (prompts when omitted and interactive)')
    .action(async (id: string | undefined, name: string | undefined) => {
      const root = program.opts() as { dataDir?: string };
      if (root.dataDir) {
        process.env.MASS_DATA_DIR = root.dataDir;
      }
      await runWorkspaceRename(id, name);
    });

  workspaceCmd
    .command('fork <workspace-id>')
    .description('Duplicate workspace for A/B branching (same state, new workspace id)')
    .option('-n, --name <name>', 'Name for the forked workspace')
    .action(async (workspaceId: string, opts: { name?: string }) => {
      const root = program.opts() as { dataDir?: string };
      if (root.dataDir) {
        process.env.MASS_DATA_DIR = root.dataDir;
      }
      await runWorkspaceFork({
        workspaceId,
        name: opts.name,
      });
    });

  workspaceCmd.action(() => workspaceCmd.help());
};
