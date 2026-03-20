/**
 * Reserved for future use (e.g. chat/reports runtime state). Not yet used in CLI.
 */
import fs from 'node:fs';

import { getDataRoot, getPersonaDir, getPersonaStateFile } from 'core/src/storage/paths';

import type { PersonaRuntimeState } from 'core/src/personas/state/personaRuntimeState.types';

function ensurePersonaDir(personaId: string): string {
  const root = getDataRoot();
  const dir = getPersonaDir(root, personaId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Load runtime state for a persona. Returns null if no state file exists.
 */
export function loadPersonaRuntimeState(personaId: string): PersonaRuntimeState | null {
  const root = getDataRoot();
  const filePath = getPersonaStateFile(root, personaId);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as PersonaRuntimeState;
  } catch {
    return null;
  }
}

/**
 * Save runtime state for a persona. Overwrites the file.
 */
export function savePersonaRuntimeState(state: PersonaRuntimeState): void {
  ensurePersonaDir(state.personaId);
  const root = getDataRoot();
  const filePath = getPersonaStateFile(root, state.personaId);
  const toWrite = { ...state, updatedAt: new Date().toISOString() };
  fs.writeFileSync(filePath, JSON.stringify(toWrite, null, 2), 'utf-8');
}
