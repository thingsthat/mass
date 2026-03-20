import { GraphQLJSON } from 'backend/src/graphql/types/common';
import { log } from 'core/src/helpers/logger';
import {
  GraphQLBoolean,
  GraphQLInputObjectType,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql';
import { v4 as uuidv4 } from 'uuid';

import type { Context } from 'backend/src/context';
import type { GraphResolver } from 'backend/src/graphql/graphql.types';
import type { CohortData } from 'core/src/personas/cohort.types';

export type UpsertCohortResponse = {
  upsert_cohort: {
    id: string;
    success: boolean;
  };
};

export const UPSERT_COHORT = `
  mutation UpsertCohort($cohort: CohortInput!) {
    upsert_cohort(cohort: $cohort) {
      id
      success
    }
  }
`;

const CohortInputType = new GraphQLInputObjectType({
  name: 'CohortInput',
  fields: () => ({
    id: { type: GraphQLString },
    name: { type: GraphQLString },
    description: { type: GraphQLString },
    data: { type: GraphQLJSON },
  }),
});

const UpsertCohortResponseType = new GraphQLObjectType({
  name: 'UpsertCohortResponse',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLString) },
    success: { type: new GraphQLNonNull(GraphQLBoolean) },
  }),
});

export const UpsertCohortResolver: GraphResolver = {
  type: UpsertCohortResponseType,
  args: {
    cohort: { type: CohortInputType },
  },
  resolve: async (
    _root: unknown,
    { cohort }: { cohort: { id?: string; name?: string; description?: string; data?: CohortData } },
    context: Context
  ) => {
    const { db } = context;

    try {
      if (!cohort) {
        throw new Error('Cohort is required');
      }

      const now = new Date().toISOString();

      if (cohort.id) {
        const updateData: Record<string, unknown> = {
          updated_at: now,
        };
        if (cohort.name !== undefined) {
          updateData.name = cohort.name;
        }
        if (cohort.description !== undefined) {
          updateData.description = cohort.description;
        }
        if (cohort.data !== undefined) {
          updateData.data = cohort.data;
        }

        const { error } = await db.from('cohorts').update(updateData).eq('id', cohort.id);

        if (error) {
          throw new Error(`Failed to update cohort: ${error.message}`);
        }
        return { id: cohort.id, success: true };
      }

      const id = uuidv4();
      const { error } = await db
        .from('cohorts')
        .insert({
          id,
          name: cohort.name ?? '',
          description: cohort.description ?? '',
          data: cohort.data ?? {},
          created_at: now,
          updated_at: now,
        })
        .select('id')
        .single();

      if (error) {
        throw new Error(`Failed to create cohort: ${error.message}`);
      }
      return { id, success: true };
    } catch (err) {
      log.error('GRAPHQL', 'Error in upsertCohort resolver:', err);
      throw err;
    }
  },
};
