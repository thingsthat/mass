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

export type UpsertPersonaResponse = {
  upsert_persona: {
    id: string;
    success: boolean;
  };
};

/**
 * GraphQL mutation to create or update a persona
 */
export const UPSERT_CREATION = `
  mutation UpsertPersona($persona: PersonaInput!) {
    upsert_persona(persona: $persona) {
      id
      success
    }
  }
`;

const PersonaInputType = new GraphQLInputObjectType({
  name: 'PersonaInput',
  fields: () => ({
    id: { type: GraphQLString },
    details: { type: new GraphQLNonNull(GraphQLJSON) },
  }),
});

const UpsertPersonaResponseType = new GraphQLObjectType({
  name: 'UpsertPersonaResponse',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLString) },
    success: { type: new GraphQLNonNull(GraphQLBoolean) },
  }),
});

export const UpsertPersonaResolver: GraphResolver = {
  type: UpsertPersonaResponseType,
  args: {
    persona: { type: PersonaInputType },
  },
  resolve: async (
    _root: unknown,
    { persona }: { persona: { id?: string; details: Record<string, unknown> } },
    context: Context
  ) => {
    const { db } = context;

    try {
      if (!persona?.details) {
        throw new Error('Persona details are required');
      }

      const now = new Date().toISOString();

      if (persona.id) {
        const { error } = await db
          .from('personas')
          .update({
            details: persona.details,
            updated_at: now,
          })
          .eq('id', persona.id);

        if (error) {
          throw new Error(`Failed to update persona: ${error.message}`);
        }
        return { id: persona.id, success: true };
      }

      const id = uuidv4();
      const { error } = await db
        .from('personas')
        .insert({
          id,
          details: persona.details,
          type: 'custom',
          created_at: now,
          updated_at: now,
        })
        .select('id')
        .single();

      if (error) {
        throw new Error(`Failed to create persona: ${error.message}`);
      }
      return { id, success: true };
    } catch (err) {
      log.error('GRAPHQL', 'Error in upsertPersona resolver:', err);
      throw err;
    }
  },
};
