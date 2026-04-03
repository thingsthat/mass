import { log } from 'core/src/helpers/logger';
import { GraphQLNonNull, GraphQLObjectType, GraphQLString } from 'graphql';

import { PersonaType } from 'backend/src/graphql/personas/types/persona';

import type { Context } from 'backend/src/context';
import type { GraphResolver } from 'backend/src/graphql/graphql.types';
import type { Persona } from 'core/src/personas/persona.types';

export type PersonaResponse = {
  persona: {
    persona: Persona;
  };
};

/**
 * GraphQL query to fetch a specific workspace or the most recent one
 */
export const GET_PERSONA = `
  query GetPersona($personaId: String) {
    persona(personaId: $personaId) {
      persona {
        id
        details
        type
        created_at
        updated_at
      }
    }
  }
`;

// Query variables
type PersonaQueryVariables = {
  personaId?: string;
};

// Persona response type
const PersonaResponseType = new GraphQLObjectType({
  name: 'PersonaResponse',
  fields: () => ({
    persona: { type: new GraphQLNonNull(PersonaType) },
  }),
});

export const PersonaResolver: GraphResolver = {
  type: PersonaResponseType,
  args: {
    personaId: { type: GraphQLString },
  },
  resolve: async (_root: any, { personaId }: PersonaQueryVariables, context: Context) => {
    const { db } = context;

    if (!personaId) {
      throw new Error('Persona ID is required');
    }

    try {
      const result = await db
        .from('personas')
        .select('id, details, type, created_at, updated_at')
        .eq('id', personaId)
        .single();

      const data = result.data as Persona | null;
      const error = result.error;

      // Handle no results case - throw error since persona field is non-nullable
      if (error && error.code === 'PGRST116') {
        throw new Error(`Persona not found: ${personaId}`);
      }

      if (error) {
        throw new Error(`Failed to load persona: ${error.message}`);
      }

      // Ensure we have data before proceeding
      if (!data) {
        throw new Error(`Persona not found: ${personaId}`);
      }

      const { persona: _personaRemoved, ...detailsWithoutPersona } = data.details;
      const metadata = detailsWithoutPersona.metadata;
      const { personality_traits: _traitsRemoved, ...metadataWithoutTraits } = metadata ?? {};
      const cleanedDetails = {
        ...detailsWithoutPersona,
        metadata: Object.keys(metadataWithoutTraits).length > 0 ? metadataWithoutTraits : undefined,
      };

      return {
        persona: {
          id: data?.id || '',
          details: cleanedDetails,
          type: data?.type || '',
          created_at: data?.created_at || '',
          updated_at: data?.updated_at || '',
        },
      };
    } catch (error) {
      log.error('GRAPHQL', 'Error in persona resolver:', error);
      throw error;
    }
  },
};
