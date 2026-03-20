import { log } from 'core/src/helpers/logger';
import { getGeneration, getPersonaImage } from 'core/src/personas/helpers/personaHelpers';
import { computed, ref } from 'vue';

import { fetchPersona, fetchPersonas } from 'frontend/src/personas/api/personaApi';
import { getPersonaConnections, getPersonaIndex } from 'frontend/src/personas/loadPersonaData';

import type { ConnectionType, PersonaItem } from 'core/src/personas/persona.types';

const createPersonaState = () => {
  // Global state
  const personasStatic = ref<PersonaItem[]>([]);
  const personasRemote = ref<PersonaItem[]>([]);

  const personasAll = computed(() => {
    // Merge static and remote so both static and custom cohort personas are available.
    // Remote entries override static for the same id (e.g. user persona with same id).
    const byId = new Map<string, PersonaItem>();
    personasStatic.value.forEach(p => byId.set(p.id, p));
    personasRemote.value.forEach(p => byId.set(p.id, p));
    return Array.from(byId.values());
  });

  const getPersonaById = async (id: string): Promise<PersonaItem | null> => {
    const staticPersona = personasStatic.value.find(p => p.id === id);

    if (staticPersona) {
      return staticPersona;
    }

    // Else fetch the persona from the server
    const persona = await fetchPersona(id);

    if (!persona) {
      return null;
    }

    return {
      id,
      name: persona.details.name,
      username: persona.details.username ?? '',
      has_image: persona.details.media?.original !== '',
      image_url: persona.details.media?.original,
      generation: getGeneration(persona.details.metadata?.age ?? 0),
      metadata: persona.details.metadata,
      metadata_extended: persona.details.metadata_extended,
    };
  };

  const loadPersonas = async (isAuthenticated: boolean = false) => {
    if (isAuthenticated) {
      const response = await fetchPersonas();
      const { personaIndex, extendedPersonaIndex } = await getPersonaIndex();

      personasRemote.value = response.map((persona: any) => {
        const hasImage =
          (persona.details.media?.original && persona.details.media?.original !== '') ||
          personaIndex.personas[persona.id]?.has_image;
        const imageUrl = hasImage ? getPersonaImage(persona.id) : null;

        return {
          id: persona.id,
          name: persona.details.name,
          username: persona.details.username,
          has_image: hasImage,
          image_url: imageUrl,
          generation: getGeneration(persona.details.metadata.age),
          metadata: persona.details.metadata,
          metadata_extended:
            persona.details.metadata_extended ||
            extendedPersonaIndex?.personas?.[persona.id]?.metadata_extended,
        };
      });
      return;
    }

    if (personasStatic.value.length > 0) {
      return;
    }

    try {
      const { personaIndex, extendedPersonaIndex, personaIds } = await getPersonaIndex();

      // Personas that have no images
      personasStatic.value = personaIds.map(id => {
        const entry = personaIndex.personas[id];
        return {
          id,
          name: entry.name,
          username: entry.username ?? '',
          has_image: entry.has_image ?? false,
          image_url: entry.has_image ? getPersonaImage(id) : null,
          generation: getGeneration(entry.metadata?.age ?? 0),
          metadata: entry.metadata,
          metadata_extended: extendedPersonaIndex?.personas?.[id]?.metadata_extended,
        };
      });
    } catch (error) {
      log.error('PERSONA', '[usePersonas] Failed to load persona index or data.', error);
    }
  };

  const getPersonaConnectionsWithDetails = async (
    personaId: string
  ): Promise<
    Array<{
      persona_id: string;
      persona_name: string;
      has_image: boolean;
      type: ConnectionType;
      metadata?: {
        strength?: string;
        duration?: string;
        context?: string;
        status?: string;
        notes?: string;
      };
    }>
  > => {
    const connections = await getPersonaConnections(personaId);

    if (connections.length === 0) {
      return [];
    }

    // Ensure personas are loaded
    await loadPersonas(false);

    // Try multiple sources for persona information
    const { personaIndex } = await getPersonaIndex();

    // Create a map of all available personas from multiple sources
    const personaMap = new Map<string, { name: string; has_image: boolean }>();

    // Add from static personas
    personasStatic.value.forEach(persona => {
      personaMap.set(persona.id, {
        name: persona.name,
        has_image: persona.has_image || false,
      });
    });

    // Add from remote personas
    personasRemote.value.forEach(persona => {
      personaMap.set(persona.id, {
        name: persona.name,
        has_image: persona.has_image || false,
      });
    });

    // Add from index (fallback)
    Object.entries(personaIndex.personas).forEach(([id, persona]: [string, any]) => {
      if (!personaMap.has(id)) {
        personaMap.set(id, {
          name: persona.name,
          has_image: persona.has_image || false,
        });
      }
    });

    // Resolve all connections with persona details
    const connectionsWithDetails = await Promise.all(
      connections.map(async conn => {
        // Try to get persona from map first, then from index
        let personaName = 'Unknown';
        let hasImage = false;

        const personaFromMap = personaMap.get(conn.persona_id);
        const personaFromIndex = personaIndex.personas[conn.persona_id];

        if (personaFromMap) {
          personaName = personaFromMap.name;
          hasImage = personaFromMap.has_image;
        } else if (personaFromIndex) {
          personaName = personaFromIndex.name;
          hasImage = personaFromIndex.has_image || false;
        } else {
          // Final fallback: try to fetch the persona directly
          try {
            const fetchedPersona = await getPersonaById(conn.persona_id);
            if (fetchedPersona) {
              personaName = fetchedPersona.name;
              hasImage = fetchedPersona.has_image || false;
            }
          } catch (_error) {
            log.warn(
              'PERSONA',
              '[getPersonaConnectionsWithDetails]',
              `Could not find persona ${conn.persona_id} in any source`
            );
          }
        }

        return {
          persona_id: conn.persona_id,
          persona_name: personaName,
          has_image: hasImage,
          type: conn.type,
          metadata: conn.metadata,
        };
      })
    );

    return connectionsWithDetails;
  };

  return {
    personasStatic,
    personasRemote,
    personasAll,
    getPersonaById,
    loadPersonas,
    getPersonaConnectionsWithDetails,
  };
};

const globalPersonaState = createPersonaState();

export const usePersonas = () => {
  return globalPersonaState;
};
