import { GraphQLInputObjectType, GraphQLInt, GraphQLScalarType, GraphQLString } from 'graphql';
import { Kind } from 'graphql/language';

// Custom JSON scalar type
export const GraphQLJSON = new GraphQLScalarType({
  name: 'JSON',
  description: 'The JSON scalar type represents JSON objects as JSON strings',
  serialize: value => value,
  parseValue: value => value,
  parseLiteral: ast => {
    switch (ast.kind) {
      case Kind.STRING:
        return JSON.parse(ast.value);
      case Kind.OBJECT:
        throw new Error('Not implemented: Parsing object values for JSONObject');
      default:
        return null;
    }
  },
});

export const StringFilterType = new GraphQLInputObjectType({
  name: 'StringFilter',
  fields: () => ({
    _eq: { type: GraphQLString },
    _neq: { type: GraphQLString },
  }),
});

export const IntFilterType = new GraphQLInputObjectType({
  name: 'IntFilter',
  fields: () => ({
    _eq: { type: GraphQLInt },
    _neq: { type: GraphQLInt },
  }),
});

export const GraphQLUUID = new GraphQLScalarType({
  name: 'UuidID',
  description: 'The UuidID scalar type represents a UUID',
  serialize: value => value,
  parseValue: value => value,
  parseLiteral: ast => {
    switch (ast.kind) {
      case Kind.STRING:
        return ast.value;
      default:
        return null;
    }
  },
});
