import fs from 'node:fs/promises';
import path from 'node:path';

import { log } from 'core/src/helpers/logger';

export type ResolvedFile = {
  data: string;
  mimeType: string;
  name?: string;
};

const EXTENSION_TO_MIME: Record<string, string> = {
  '.ts': 'text/typescript',
  '.tsx': 'text/tsx',
  '.js': 'text/javascript',
  '.jsx': 'text/jsx',
  '.json': 'application/json',
  '.md': 'text/markdown',
  '.txt': 'text/plain',
  '.html': 'text/html',
  '.css': 'text/css',
  '.csv': 'text/csv',
  '.yaml': 'text/yaml',
  '.yml': 'text/yaml',
  '.xml': 'application/xml',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
};

function inferMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return EXTENSION_TO_MIME[ext] ?? 'text/plain';
}

/**
 * Resolve one or more file paths to base64-encoded file payloads.
 * Paths must be under allowedRoot (default process.cwd()) to avoid reading arbitrary files.
 */
export async function resolveFilePathsToBase64(
  paths: string[],
  options?: { allowedRoot?: string }
): Promise<ResolvedFile[]> {
  const root = path.resolve(options?.allowedRoot ?? process.cwd());
  const result: ResolvedFile[] = [];

  for (const p of paths) {
    if (!p?.trim()) {
      continue;
    }
    let absolute: string;
    try {
      absolute = path.resolve(p);
      absolute = await fs.realpath(absolute);
    } catch (err) {
      log.warn('HELPERS', 'Path not found or not accessible:', p, err);
      continue;
    }
    if (!absolute.startsWith(root)) {
      log.warn('HELPERS', 'Path outside allowed root, skipping:', absolute);
      continue;
    }
    let buf: Buffer;
    try {
      buf = await fs.readFile(absolute);
    } catch (err) {
      log.warn('HELPERS', 'Failed to read file:', absolute, err);
      continue;
    }
    const mimeType = inferMimeType(absolute);
    const name = path.basename(absolute);
    result.push({
      data: buf.toString('base64'),
      mimeType,
      name,
    });
  }

  return result;
}
