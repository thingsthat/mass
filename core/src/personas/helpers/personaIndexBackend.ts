import fs from 'node:fs';
import path from 'node:path';

import { getDataRoot, getPersonasDir, getPersonaFile } from 'core/src/storage/paths';

/**
 * Build persona index from the local personas directory (used when MASS_CLI / JSON store).
 */
async function getPersonaIndexFromStore(): Promise<{
  personaIndex: {
    personas: Record<string, { name: string; username?: string; metadata?: unknown }>;
  };
  extendedPersonaIndex: { personas: Record<string, unknown> };
  personaIds: string[];
}> {
  const root = getDataRoot();
  const dir = getPersonasDir(root);
  const personas: Record<string, { name: string; username?: string; metadata?: unknown }> = {};
  const extendedPersonas: Record<string, unknown> = {};
  if (!fs.existsSync(dir)) {
    return {
      personaIndex: { personas },
      extendedPersonaIndex: { personas: extendedPersonas },
      personaIds: [],
    };
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (!e.isDirectory()) {
      continue;
    }
    const id = e.name;
    const filePath = getPersonaFile(root, id);
    if (!fs.existsSync(filePath)) {
      continue;
    }
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const row = JSON.parse(raw) as Record<string, unknown>;
      const details = (row.details as Record<string, unknown>) ?? {};
      const name = (details.name as string) ?? id;
      personas[id] = {
        name,
        username: details.username as string | undefined,
        metadata: details.metadata as unknown,
      };
      extendedPersonas[id] = { ...details, id };
    } catch {
      // skip invalid files
    }
  }
  return {
    personaIndex: { personas },
    extendedPersonaIndex: { personas: extendedPersonas },
    personaIds: Object.keys(personas),
  };
}

export const getPersonaIndexBackend = async () => {
  if (process.env.MASS_CLI === 'true' || process.env.MASS_USE_JSON_STORE === 'true') {
    return getPersonaIndexFromStore();
  }
  const root = getDataRoot();
  const indexPath = path.join(root, 'index.json');
  const indexExtendedPath = path.join(root, 'index_extended.json');
  if (!fs.existsSync(indexPath) || !fs.existsSync(indexExtendedPath)) {
    return {
      personaIndex: { personas: {} },
      extendedPersonaIndex: { personas: {} },
      personaIds: [] as string[],
    };
  }
  const personaIndex = JSON.parse(fs.readFileSync(indexPath, 'utf-8')) as {
    personas: Record<string, { name: string; username?: string; metadata?: unknown }>;
  };
  const extendedPersonaIndex = JSON.parse(fs.readFileSync(indexExtendedPath, 'utf-8')) as {
    personas: Record<string, unknown>;
  };
  const personaIds = Object.keys(personaIndex.personas);

  return {
    personaIndex,
    extendedPersonaIndex,
    personaIds,
  };
};
