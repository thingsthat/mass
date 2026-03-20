import {
  UPSERT_CREATION,
  type UpsertPersonaResponse,
} from 'backend/src/graphql/personas/mutations/upsertPersona';
import { GET_PERSONA, type PersonaResponse } from 'backend/src/graphql/personas/queries/persona';
import { GET_PERSONAS, type PersonasResponse } from 'backend/src/graphql/personas/queries/personas';

import { executeGraphQL } from 'frontend/src/api/graphqlClient';

import type { Persona } from 'core/src/personas/persona.types';

/**
 * Loads all workspaces from the server using GraphQL
 */
export const fetchPersonas = async (): Promise<Persona[]> => {
  const response = await executeGraphQL<{ personas: PersonasResponse }>(GET_PERSONAS, {}, true);

  // Transform the GraphQL data to our application model
  return (
    response.personas.personas?.map(persona => {
      return {
        ...persona,
        created_at: new Date(persona.created_at),
        updated_at: new Date(persona.updated_at),
      };
    }) || []
  );
};

/**
 * Loads a specific persona from the server using GraphQL
 * @param personaId Optional ID of the persona to load. If not provided, loads the most recent persona.
 */
export const fetchPersona = async (personaId?: string): Promise<Persona> => {
  const response = await executeGraphQL<PersonaResponse>(GET_PERSONA, { personaId }, true);

  return response.persona.persona;
};

/**
 * Saves a persona to the server using GraphQL
 * @param details The details of the persona to save
 * @param personaId Optional ID of the persona. If provided, updates that persona; otherwise creates a new one.
 */
export const upsertPersona = async (
  details: Record<string, unknown>,
  personaId?: string
): Promise<{ id: string }> => {
  const response = await executeGraphQL<UpsertPersonaResponse>(
    UPSERT_CREATION,
    {
      persona: {
        id: personaId,
        details,
      },
    },
    true
  );

  return { id: response.upsert_persona.id };
};
