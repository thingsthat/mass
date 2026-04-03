import { GraphQLString, GraphQLNonNull } from 'graphql';

import { GraphQLJSON, GraphQLUUID } from 'backend/src/graphql/types/common';
import { createTypeSafeObjectType } from 'backend/src/graphql/utils/typeSafeGraphQL';

import type { Cohort } from 'core/src/personas/cohort.types';

// Type-safe Cohort GraphQL type - ensures all fields from Cohort type are present
export const CohortType = createTypeSafeObjectType<Cohort>({
  name: 'Cohort',
  description: 'A cohort with personas and metadata',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLUUID) },
    name: { type: new GraphQLNonNull(GraphQLString) },
    description: { type: new GraphQLNonNull(GraphQLString) },
    data: { type: GraphQLJSON },
    created_at: { type: GraphQLString },
    updated_at: { type: GraphQLString },
  }),
});
