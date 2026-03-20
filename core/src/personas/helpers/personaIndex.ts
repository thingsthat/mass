import fs from 'node:fs';
import path from 'node:path';

import { getDataRoot } from 'core/src/storage/paths';

export const getPersonaIndex = async () => {
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
  const personaIndexModule = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  const extendedPersonaIndexModule = JSON.parse(fs.readFileSync(indexExtendedPath, 'utf-8'));
  const personaIndex = personaIndexModule.default ?? personaIndexModule;
  const extendedPersonaIndex = extendedPersonaIndexModule.default ?? extendedPersonaIndexModule;
  const personaIds = Object.keys(personaIndex.personas);

  return {
    personaIndex,
    extendedPersonaIndex,
    personaIds,
  };
};
