import { GraphQLObjectType, GraphQLInputObjectType } from 'graphql';

import type {
  GraphQLFieldConfigMap,
  GraphQLInputFieldConfigMap,
  GraphQLOutputType,
  GraphQLInputType,
} from 'graphql';

/**
 * Utility type to ensure GraphQL field configs match TypeScript type keys
 */
type TypeSafeFieldConfig<T> = {
  [K in keyof Required<T>]: {
    type: GraphQLOutputType;
    description?: string;
    resolve?: (source: any, args: any, context: any, info: any) => any;
  };
};

/**
 * Utility type for input field configs
 */
type TypeSafeInputFieldConfig<T> = {
  [K in keyof Required<T>]: {
    type: GraphQLInputType;
    description?: string;
    defaultValue?: any;
  };
};

/**
 * Creates a type-safe GraphQL Object Type that ensures all fields from the TypeScript type are present
 */
export function createTypeSafeObjectType<T>(config: {
  name: string;
  description?: string;
  fields: () => TypeSafeFieldConfig<T>;
}): GraphQLObjectType {
  return new GraphQLObjectType({
    name: config.name,
    description: config.description,
    fields: config.fields as () => GraphQLFieldConfigMap<any, any>,
  });
}

/**
 * Creates a type-safe GraphQL Input Type that ensures all fields from the TypeScript type are present
 */
export function createTypeSafeInputType<T>(config: {
  name: string;
  description?: string;
  fields: () => TypeSafeInputFieldConfig<T>;
}): GraphQLInputObjectType {
  return new GraphQLInputObjectType({
    name: config.name,
    description: config.description,
    fields: config.fields as () => GraphQLInputFieldConfigMap,
  });
}

/**
 * Utility type to check if all required fields are present
 * This will cause a TypeScript error if any field is missing
 */
export type EnsureAllFields<T, U> = {
  [K in keyof Required<T>]: K extends keyof U ? U[K] : never;
} & {
  [K in keyof U]: K extends keyof T ? U[K] : never;
};
