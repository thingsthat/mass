import { CohortType } from 'backend/src/graphql/personas/types/cohort';
import { GraphQLJSON } from 'backend/src/graphql/types/common';
import { log } from 'core/src/helpers/logger';
import { GraphQLInt, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLString } from 'graphql';

import type { Context } from 'backend/src/context';
import type { GraphResolver } from 'backend/src/graphql/graphql.types';
import type { Cohort } from 'core/src/personas/cohort.types';

/**
 * GraphQL response types
 */
export type CohortsResponse = {
  cohorts: Cohort[];
};

/**
 * GraphQL query to fetch all cohorts with optional metadata filters
 */
export const GET_COHORTS = `
  query GetCohorts($limit: Int, $offset: Int, $sort: String, $order: String, $filters: JSON) {
    cohorts(limit: $limit, offset: $offset, sort: $sort, order: $order, filters: $filters) {
      cohorts {
        id
        name
        description
        data
        created_at
        updated_at
      }
      total
    }
  }
`;

// Cohorts response type
export const CohortsResponseType = new GraphQLObjectType({
  name: 'CohortsResponse',
  fields: () => ({
    cohorts: { type: new GraphQLNonNull(new GraphQLList(CohortType)) },
    total: { type: GraphQLInt },
  }),
});

// Cohorts resolver with GraphQL type definition
export const CohortsResolver: GraphResolver = {
  type: CohortsResponseType,
  args: {
    limit: { type: GraphQLInt },
    offset: { type: GraphQLInt },
    sort: { type: GraphQLString },
    order: { type: GraphQLString },
    filters: { type: GraphQLJSON },
    status: { type: GraphQLString },
  },
  resolve: async (
    _root: any,
    args: {
      limit?: number;
      offset?: number;
      sort?: 'recent' | 'name';
      order?: 'asc' | 'desc';
      filters?: {
        locations?: string[];
        persona_ids?: string[];
      };
      status?: 'processing' | 'completed' | 'failed';
    },
    context: Context
  ) => {
    const { db } = context;

    try {
      let query = db
        .from('cohorts')
        .select('id, name, description, data, created_at, updated_at')
        .order(args.sort === 'name' ? 'name' : 'created_at', {
          ascending: args.order === 'asc',
        });

      if (args.offset !== undefined && args.offset > 0) {
        const limit = args.limit ?? 50;
        query = query.range(args.offset, args.offset + limit - 1);
      } else if (args.limit && args.limit > 0) {
        query = query.limit(args.limit);
      }

      const result = await query;
      const data = result.data ?? [];
      const error = result.error;

      if (error) {
        log.error('GRAPHQL', 'Cohorts query error:', error);
        throw new Error(`Failed to load cohorts: ${error.message}`);
      }

      const cohorts = (Array.isArray(data) ? data : []).map((cohort: Record<string, unknown>) => {
        let processedData: Record<string, unknown> = {};
        try {
          if (cohort.data) {
            processedData =
              typeof cohort.data === 'string'
                ? (JSON.parse(cohort.data as string) as Record<string, unknown>)
                : (cohort.data as Record<string, unknown>);
          }
        } catch (err) {
          log.error('GRAPHQL', `Invalid JSON data for cohort ${cohort.id}:`, err);
        }
        return { ...cohort, data: processedData };
      });

      const total = cohorts.length;
      return { cohorts, total };
    } catch (error) {
      log.error('GRAPHQL', 'Error in cohorts resolver:', error);
      throw error;
    }
  },
};
