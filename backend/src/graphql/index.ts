import { getDatabaseClient } from 'core/src/database/client';
import { log } from 'core/src/helpers/logger';
import { graphql } from 'graphql';

import { schema } from 'backend/src/graphql/schema';

import type { GraphQLRequest } from 'backend/src/graphql/graphql.types';
import type { ServerContext } from 'backend/src/types/server';

const jsonHeaders = { 'Content-Type': 'application/json' };

export default async (request: Request, _serverContext: ServerContext): Promise<Response> => {
  try {
    const bodyText = await request.text();
    const { query, variables = {} } = bodyText
      ? (JSON.parse(bodyText) as GraphQLRequest)
      : { query: '' };

    if (!query) {
      return new Response(JSON.stringify({ errors: [{ message: 'Query is required' }] }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const context = {
      request,
      db: getDatabaseClient(),
    };

    // Execute the GraphQL query
    const result = await graphql({
      schema,
      source: query,
      variableValues: variables,
      contextValue: context,
    });

    // Handle GraphQL errors
    if (result.errors) {
      log.error('GRAPHQL', 'GraphQL errors:', result.errors);
      return new Response(
        JSON.stringify({ errors: result.errors.map(e => ({ message: e.message })) }),
        {
          status: 400,
          headers: jsonHeaders,
        }
      );
    }

    // Return the successful response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (error) {
    log.error('GRAPHQL', 'Server error:', error);
    return new Response(JSON.stringify({ errors: [{ message: 'Server error' }] }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
};
