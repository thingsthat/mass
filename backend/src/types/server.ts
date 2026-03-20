/**
 * Types for HTTP route handlers (fetch-style Request in, Response out).
 * Distinct from backend/context Context which is used inside GraphQL resolvers.
 */

export type ServerContext = Record<string, unknown>;

export type Handler = (request: Request, context: ServerContext) => Promise<Response>;
