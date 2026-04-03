import { log } from 'core/src/helpers/logger';
import { GraphQLInt, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLString } from 'graphql';

import { PersonaType } from 'backend/src/graphql/personas/types/persona';
import { GraphQLJSON } from 'backend/src/graphql/types/common';

import type { Context } from 'backend/src/context';
import type { GraphResolver } from 'backend/src/graphql/graphql.types';
import type { Persona } from 'core/src/personas/persona.types';

/**
 * GraphQL response types
 */
export type PersonasResponse = {
  personas: Persona[];
};

/**
 * GraphQL query to fetch all personas with optional metadata filters
 */
export const GET_PERSONAS = `
  query GetPersonas($limit: Int, $offset: Int, $sort: String, $order: String, $filters: JSON) {
    personas(limit: $limit, offset: $offset, sort: $sort, order: $order, filters: $filters) {
      personas {
        id
        details
        type
        created_at
        updated_at
      }
      total
    }
  }
`;

// Personas response type
const PersonasResponseType = new GraphQLObjectType({
  name: 'PersonasResponse',
  fields: () => ({
    personas: { type: new GraphQLNonNull(new GraphQLList(PersonaType)) },
    total: { type: GraphQLInt },
  }),
});

// Workspaces resolver with GraphQL type definition
export const PersonasResolver: GraphResolver = {
  type: PersonasResponseType,
  args: {
    limit: { type: GraphQLInt },
    offset: { type: GraphQLInt },
    sort: { type: GraphQLString },
    order: { type: GraphQLString },
    filters: { type: GraphQLJSON },
  },
  resolve: async (
    _root: any,
    args: {
      limit?: number;
      offset?: number;
      sort?: 'recent' | 'popular' | 'interesting';
      order?: 'asc' | 'desc';
      filters?: {
        gender?: string[];
        pronouns?: string[];
        ethnicity?: string[];
        location?: string[];
        languages?: string[];
        job_industry?: string[];
        education?: string[];
        personality_traits?: string[];
        relationship_status?: string[];
        political_leaning?: string[];
        religion?: string[];
        height?: { min: number; max: number } | null;
        time?: { min: number; max: number } | null;
      };
    },
    context: Context
  ) => {
    const { db } = context;

    try {
      let query = db
        .from('personas')
        .select('id, details, type, created_at, updated_at')
        .order('created_at', { ascending: args.order === 'asc' });

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
        throw new Error(`Failed to load personas: ${error.message}`);
      }

      const personas = (Array.isArray(data) ? (data as unknown as Persona[]) : []) as Persona[];
      const total = personas.length;

      const cleanedPersonas = personas.map((persona: Persona) => ({
        ...persona,
        details: {
          metadata: persona.details.metadata || persona.details,
          name: persona.details.name || `Persona ${persona.id.slice(0, 8)}`,
        },
      }));

      return { personas: cleanedPersonas, total };
    } catch (error) {
      log.error('GRAPHQL', 'Error in personas resolver:', error);
      throw error;
    }
  },
};
