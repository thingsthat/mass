import { log } from 'core/src/helpers/logger';
import { GraphQLList, GraphQLNonNull, GraphQLObjectType } from 'graphql';
import { GraphQLString } from 'graphql/type';

import { PersonaType } from 'backend/src/graphql/personas/types/persona';

import type { Context } from 'backend/src/context';
import type { GraphResolver } from 'backend/src/graphql/graphql.types';
import type { DatabaseClient } from 'core/src/database/types';
import type { Persona } from 'core/src/personas/persona.types';

/**
 * GraphQL response types
 */
export type CohortsPersonasResponse = {
  cohort_personas: { cohort_personas: Persona[] };
};

/**
 * GraphQL query to fetch all cohorts with optional metadata filters
 */
export const GET_COHORT_PERSONAS = `
  query GetCohortPersonas($cohortId: String) {
    cohort_personas(cohortId: $cohortId) {
      cohort_personas {
        id
        details
        type
        created_at
        updated_at
      }
    }
  }
`;

const expandPersonaIdsByCohortId = async (
  db: DatabaseClient,
  cohortId: string
): Promise<{ personasIds: string[] }> => {
  const personasIds: string[] = [];
  const result = await db.from('cohorts').select('data').eq('id', cohortId).single();
  const cohort = result.data as { data?: { persona_ids?: string[] } } | null;
  if (cohort?.data?.persona_ids) {
    personasIds.push(...cohort.data.persona_ids);
  } else if (result.error) {
    log.error('GRAPHQL', `Failed to fetch cohort ${cohortId}:`, result.error.message);
  }
  return { personasIds };
};

// Cohorts response type
const CohortsPersonasResponseType = new GraphQLObjectType({
  name: 'CohortsPersonasResponse',
  fields: () => ({
    cohort_personas: { type: new GraphQLNonNull(new GraphQLList(PersonaType)) },
  }),
});

// Cohorts resolver with GraphQL type definition
export const CohortsPersonasResolver: GraphResolver = {
  type: CohortsPersonasResponseType,
  args: {
    cohortId: { type: GraphQLString },
  },
  resolve: async (
    _root: any,
    args: {
      cohortId: string;
    },
    context: Context
  ) => {
    const { db } = context;

    const { personasIds } = await expandPersonaIdsByCohortId(db, args.cohortId);

    try {
      if (personasIds.length === 0) {
        return { cohort_personas: [] };
      }

      const result = await db
        .from('personas')
        .select('id, details, type, created_at, updated_at')
        .in('id', personasIds);

      const cohortPersonas = result.data ?? [];
      const error = result.error;

      if (error) {
        throw new Error(`Failed to fetch cohort personas: ${error.message}`);
      }

      const cohortPersonasList = (
        Array.isArray(cohortPersonas) ? (cohortPersonas as unknown as Persona[]) : []
      ) as Persona[];
      const cleanedPersonas = cohortPersonasList.map((persona: Persona) => ({
        ...persona,
        details: {
          metadata: persona.details.metadata || persona.details,
          name: persona.details.name || `Persona ${persona.id.slice(0, 8)}`,
          username: persona.details.username,
        },
      }));

      return { cohort_personas: cleanedPersonas };
    } catch (error) {
      log.error('GRAPHQL', 'Error in cohorts resolver:', error);
      throw error;
    }
  },
};
