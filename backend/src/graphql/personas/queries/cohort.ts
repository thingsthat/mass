import { CohortType } from 'backend/src/graphql/personas/types/cohort';
import { log } from 'core/src/helpers/logger';
import { GraphQLNonNull, GraphQLObjectType, GraphQLString } from 'graphql';

import type { Context } from 'backend/src/context';
import type { GraphResolver } from 'backend/src/graphql/graphql.types';
import type { Cohort } from 'core/src/personas/cohort.types';

export type CohortResponse = {
  cohort: {
    cohort: Cohort;
  };
};

/**
 * GraphQL query to fetch a specific cohort or the most recent one
 */
export const GET_COHORT = `
  query GetCohort($cohortId: String) {
    cohort(cohortId: $cohortId) {
      cohort {
        id
        name
        description
        data
        created_at
        updated_at
      }
    }
  }
`;

// Query variables
export type CohortQueryVariables = {
  cohortId?: string;
};

// Cohort response type
export const CohortResponseType = new GraphQLObjectType({
  name: 'CohortResponse',
  fields: () => ({
    cohort: { type: new GraphQLNonNull(CohortType) },
  }),
});

export const CohortResolver: GraphResolver = {
  type: CohortResponseType,
  args: {
    cohortId: { type: GraphQLString },
  },
  resolve: async (_root: any, { cohortId }: CohortQueryVariables, context: Context) => {
    const { db } = context;

    try {
      let data: Record<string, unknown> | null = null;
      let error: { message: string; code?: string } | null = null;

      if (cohortId) {
        const result = await db
          .from('cohorts')
          .select('id, name, description, data, created_at, updated_at')
          .eq('id', cohortId)
          .single();
        data = result.data;
        error = result.error;
      } else {
        const result = await db
          .from('cohorts')
          .select('id, name, description, data, created_at, updated_at')
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();
        data = result.data;
        error = result.error;
      }

      // Handle no results case
      if (error && error.code === 'PGRST116') {
        throw new Error('Cohort not found');
      }

      if (error) {
        throw new Error(`Failed to load cohort: ${error.message}`);
      }

      if (!data) {
        throw new Error('Cohort not found');
      }

      const d = data as Record<string, unknown>;
      return {
        cohort: {
          id: String(d.id ?? ''),
          name: String(d.name ?? ''),
          description: String(d.description ?? ''),
          data: d.data ?? {},
          created_at: d.created_at ? new Date(String(d.created_at)) : new Date(),
          updated_at: d.updated_at ? new Date(String(d.updated_at)) : new Date(),
        },
      };
    } catch (error) {
      log.error('GRAPHQL', 'Error in cohort resolver:', error);
      throw error;
    }
  },
};
