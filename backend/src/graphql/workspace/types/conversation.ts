import { GraphQLString } from 'graphql';

import { GraphQLJSON } from 'backend/src/graphql/types/common';
import {
  createTypeSafeObjectType,
  createTypeSafeInputType,
} from 'backend/src/graphql/utils/typeSafeGraphQL';

import type { Conversation } from 'core/src/workspace/conversation.types';

// Type-safe Conversation GraphQL type - ensures all fields from Conversation type are present
export const ConversationType = createTypeSafeObjectType<Conversation>({
  name: 'Conversation',
  description: 'A conversation with messages and metadata',
  fields: () => ({
    id: { type: GraphQLString },
    name: { type: GraphQLString },
    messages: { type: GraphQLJSON },
    persona_ids: { type: GraphQLJSON },
    persona_metadata: { type: GraphQLJSON },
    cohort_ids: { type: GraphQLJSON },
    status: { type: GraphQLString },
    memories: { type: GraphQLJSON },
    fork: { type: GraphQLJSON },
  }),
});

// Type-safe Conversation input type for mutations
export const ConversationInputType = createTypeSafeInputType<Conversation>({
  name: 'ConversationInput',
  description: 'Input type for conversation mutations',
  fields: () => ({
    id: { type: GraphQLString },
    name: { type: GraphQLString },
    messages: { type: GraphQLJSON },
    persona_ids: { type: GraphQLJSON },
    persona_metadata: { type: GraphQLJSON },
    cohort_ids: { type: GraphQLJSON },
    status: { type: GraphQLString },
    memories: { type: GraphQLJSON },
    fork: { type: GraphQLJSON },
  }),
});
