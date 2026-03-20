/**
 * Local JSON store paths. Personas and cohorts live under data (or MASS_DATA_DIR);
 * workspaces and reports use the same data root so one store backs everything.
 */

import * as path from 'node:path';

const DEFAULT_DATA_ROOT = 'data';

/**
 * Directory the CLI was invoked from (for default output paths).
 * Set MASS_INVOKE_CWD when running via pnpm run cli so output goes to the repo root, not cli/.
 */
export function getInvokeCwd(): string {
  const env = process.env.MASS_INVOKE_CWD;
  return path.resolve(env ? env : process.cwd());
}

export function getDataRoot(): string {
  const env = process.env.MASS_DATA_DIR;
  if (env) {
    return path.isAbsolute(env) ? env : path.join(process.cwd(), env);
  }
  return path.join(process.cwd(), DEFAULT_DATA_ROOT);
}

export function getPersonasDir(root: string): string {
  return path.join(root, 'personas');
}

export function getCohortsDir(root: string): string {
  return path.join(root, 'cohorts');
}

export function getWorkspacesDir(root: string): string {
  return path.join(root, 'workspaces');
}

export function getReportsDir(root: string): string {
  return path.join(root, 'reports');
}

export function getReportResponsesDir(root: string): string {
  return path.join(root, 'report_responses');
}

export function getTasksDir(root: string): string {
  return path.join(root, 'tasks');
}

export function getExecutionsDir(root: string): string {
  return path.join(root, 'executions');
}

export function getUsersDir(root: string): string {
  return path.join(root, 'users');
}

export function getPersonaDir(root: string, id: string): string {
  return path.join(getPersonasDir(root), id);
}

export function getPersonaFile(root: string, id: string): string {
  return path.join(getPersonaDir(root, id), `${id}.json`);
}

export function getPersonaStateFile(root: string, id: string): string {
  return path.join(getPersonaDir(root, id), `${id}_state.json`);
}

export function getCohortFile(root: string, id: string): string {
  return path.join(getCohortsDir(root), `${id}.json`);
}

export function getWorkspaceFile(root: string, id: string): string {
  return path.join(getWorkspacesDir(root), `${id}.json`);
}

export function getReportFile(root: string, id: string): string {
  return path.join(getReportsDir(root), `${id}.json`);
}

export function getReportResponsesFile(root: string, workspaceId: string): string {
  return path.join(getReportResponsesDir(root), `${workspaceId}.json`);
}

export function getTaskFile(root: string, id: string): string {
  return path.join(getTasksDir(root), `${id}.json`);
}

export function getExecutionFile(root: string, id: string): string {
  return path.join(getExecutionsDir(root), `${id}.json`);
}

export function getUserFile(root: string, id: string): string {
  return path.join(getUsersDir(root), `${id}.json`);
}
