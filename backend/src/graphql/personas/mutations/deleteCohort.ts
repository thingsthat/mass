import { log } from 'core/src/helpers/logger';
import { GraphQLBoolean, GraphQLNonNull, GraphQLObjectType, GraphQLString } from 'graphql';

import type { Context } from 'backend/src/context';
import type { GraphResolver } from 'backend/src/graphql/graphql.types';

export type DeleteCohortResponse = {
  delete_cohort: {
    success: boolean;
  };
};

export const DELETE_COHORT = `
  mutation DeleteCohort($cohortId: String!) {
    delete_cohort(cohortId: $cohortId) {
      success
    }
  }
`;

const DeleteCohortResponseType = new GraphQLObjectType({
  name: 'DeleteCohortResponse',
  fields: () => ({
    success: { type: new GraphQLNonNull(GraphQLBoolean) },
  }),
});

export const DeleteCohortResolver: GraphResolver = {
  type: DeleteCohortResponseType,
  args: {
    cohortId: { type: new GraphQLNonNull(GraphQLString) },
  },
  resolve: async (_root: unknown, { cohortId }: { cohortId: string }, context: Context) => {
    const { db } = context;
    try {
      const { error } = await db.from('cohorts').delete().eq('id', cohortId);
      if (error) {
        throw new Error(`Failed to delete cohort: ${error.message}`);
      }
      return { success: true };
    } catch (err) {
      log.error('GRAPHQL', 'Error in deleteCohort resolver:', err);
      throw err;
    }
  },
};
