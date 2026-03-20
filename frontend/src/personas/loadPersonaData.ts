import { log } from 'core/src/helpers/logger';

import type {
  ConnectionType,
  PersonaConnection,
  PersonaMetadata,
  PersonaMetadataExtended,
} from 'core/src/personas/persona.types';

type ConnectionsIndex = {
  edges: Array<{
    persona_a: string;
    persona_b: string;
    type: ConnectionType;
    metadata?: Record<string, unknown>;
  }>;
};

/** Shape of one entry in the persona index JSON (index.json / index_extended.json) */
export type PersonaIndexEntry = {
  name: string;
  username?: string;
  has_image?: boolean;
  metadata?: PersonaMetadata;
  metadata_extended?: PersonaMetadataExtended;
  [key: string]: unknown;
};

export type PersonaIndexResult = {
  personaIndex: { personas: Record<string, PersonaIndexEntry> };
  extendedPersonaIndex: { personas: Record<string, PersonaIndexEntry> };
  personaIds: string[];
};

/**
 * Loads the local persona index (bundled JSON). Same shape as core's getPersonaIndex
 * but uses frontend data for the browser.
 */
export const getPersonaIndex = async (): Promise<PersonaIndexResult> => {
  const personaIndexModule = await import('data/index.json');
  const extendedPersonaIndexModule = await import('data/index_extended.json');
  const rawPersonaIndex =
    (personaIndexModule as { default?: { personas: Record<string, unknown> } }).default ??
    personaIndexModule;
  const rawExtendedPersonaIndex =
    (extendedPersonaIndexModule as { default?: { personas: Record<string, unknown> } }).default ??
    extendedPersonaIndexModule;
  const personaIds = Object.keys(rawPersonaIndex.personas);

  return {
    personaIndex: rawPersonaIndex as PersonaIndexResult['personaIndex'],
    extendedPersonaIndex: rawExtendedPersonaIndex as PersonaIndexResult['extendedPersonaIndex'],
    personaIds,
  };
};

async function loadConnectionsIndex(): Promise<ConnectionsIndex | null> {
  try {
    const connectionsModule = await import('data/connections.json');
    return connectionsModule.default as ConnectionsIndex;
  } catch (error) {
    log.warn(
      'PERSONA',
      '[loadConnectionsIndex]',
      'Connections index not found or could not be loaded:',
      error
    );
    return null;
  }
}

/**
 * Get all connections for a specific persona (browser: loads from bundled data).
 */
export async function getPersonaConnections(personaId: string): Promise<PersonaConnection[]> {
  const connectionsIndex = await loadConnectionsIndex();
  if (!connectionsIndex) {
    return [];
  }

  const connections: PersonaConnection[] = [];

  for (const edge of connectionsIndex.edges) {
    if (edge.persona_a === personaId) {
      connections.push({
        persona_id: edge.persona_b,
        type: edge.type,
        metadata: edge.metadata,
      });
    } else if (edge.persona_b === personaId) {
      connections.push({
        persona_id: edge.persona_a,
        type: edge.type,
        metadata: edge.metadata,
      });
    }
  }

  return connections;
}
