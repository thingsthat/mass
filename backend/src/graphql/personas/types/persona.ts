import { GraphQLString, GraphQLNonNull } from 'graphql';

import { GraphQLJSON, GraphQLUUID } from 'backend/src/graphql/types/common';
import { createTypeSafeObjectType } from 'backend/src/graphql/utils/typeSafeGraphQL';

import type { Persona } from 'core/src/personas/persona.types';

// Type-safe Persona GraphQL type - ensures all fields from Persona type are present
export const PersonaType = createTypeSafeObjectType<Persona>({
  name: 'Persona',
  description: 'A persona with details and metadata',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLUUID) },
    created_at: { type: GraphQLString },
    updated_at: { type: GraphQLString },
    details: { type: GraphQLJSON },
    type: { type: GraphQLString },
    version: { type: GraphQLString },
  }),
});
