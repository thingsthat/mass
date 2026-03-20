/**
 * Load .env from the project root and read env. Single place for env so backend/CLI
 * don't need DOTENV_CONFIG_PATH and other code (e.g. logger) doesn't duplicate process.env guards.
 */

/** Safe to use in browser or Node; returns undefined when process.env is not available. */
export const getEnv = (key: string): string | undefined =>
  typeof process !== 'undefined' && process.env ? process.env[key] : undefined;

function findProjectRoot(): string {
  const path = require('node:path');
  const fs = require('node:fs');
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.resolve(dir, '.env'))) {
      return dir;
    }
    const parent = path.resolve(dir, '..');
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  return process.cwd();
}

/**
 * Load .env from project root and set MASS_DATA_DIR default if unset.
 * Node only; no-op in browser.
 */
export function loadEnv(): void {
  if (typeof process === 'undefined' || !process.env) {
    return;
  }
  const path = require('node:path');
  const fs = require('node:fs');
  const { config } = require('dotenv');
  const projectRoot = findProjectRoot();
  const envPath = path.resolve(projectRoot, '.env');
  if (!fs.existsSync(envPath)) {
    return;
  }
  config({ path: envPath });
  if (!process.env.MASS_DATA_DIR) {
    process.env.MASS_DATA_DIR = path.resolve(projectRoot, 'data');
  }
}

const isNode =
  typeof globalThis !== 'undefined' &&
  typeof (globalThis as unknown as { window?: unknown }).window === 'undefined';
if (isNode) {
  loadEnv();
}
