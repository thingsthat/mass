import { GraphQLObjectType } from 'graphql';

import type { Context } from 'backend/src/context';

// GraphQL request body type
export type GraphQLRequest = {
  query: string;
  variables?: Record<string, any>;
};

export type GraphResolver = {
  type: GraphQLObjectType;
  args: Record<string, any>;
  resolve: (root: any, args: any, context: Context, info?: any) => any;
};
