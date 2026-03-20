import fs from 'node:fs';
import path from 'node:path';

import { log } from 'core/src/helpers/logger';
import { getDataRoot } from 'core/src/storage/paths';

import type {
  ConnectionType,
  ConnectionsIndex,
  PersonaConnection,
} from 'core/src/personas/persona.types';

export type { ConnectionsIndex } from 'core/src/personas/persona.types';

/**
 * Load connections index from data file
 */
export async function loadConnectionsIndex(): Promise<ConnectionsIndex | null> {
  try {
    const filePath = path.join(getDataRoot(), 'connections.json');
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const raw = await fs.promises.readFile(filePath, 'utf-8');
    const connectionsModule = JSON.parse(raw) as { default: ConnectionsIndex } | ConnectionsIndex;
    return 'default' in connectionsModule ? connectionsModule.default : connectionsModule;
  } catch (error) {
    log.warn('PERSONA', 'Connections index not found or could not be loaded:', error);
    return null;
  }
}

/**
 * Get all connections for a specific persona
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

/**
 * Get the connection type between two personas
 */
export async function getConnectionType(
  personaIdA: string,
  personaIdB: string
): Promise<ConnectionType | null> {
  const connectionsIndex = await loadConnectionsIndex();
  if (!connectionsIndex) {
    return null;
  }

  for (const edge of connectionsIndex.edges) {
    if (
      (edge.persona_a === personaIdA && edge.persona_b === personaIdB) ||
      (edge.persona_a === personaIdB && edge.persona_b === personaIdA)
    ) {
      return edge.type;
    }
  }

  return null;
}

/**
 * Filter connections for a persona by connection type
 */
export async function filterConnectionsByType(
  personaId: string,
  type: ConnectionType
): Promise<PersonaConnection[]> {
  const allConnections = await getPersonaConnections(personaId);
  return allConnections.filter(connection => connection.type === type);
}

/**
 * Check if two personas are connected
 */
export async function arePersonasConnected(
  personaIdA: string,
  personaIdB: string
): Promise<boolean> {
  const connectionType = await getConnectionType(personaIdA, personaIdB);
  return connectionType !== null;
}
