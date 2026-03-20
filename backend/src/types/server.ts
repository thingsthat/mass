/**
 * Types for the standalone HTTP server pipeline (middleware, router, handlers).
 * Distinct from backend/context Context which is used inside GraphQL and handlers.
 */

export type ServerContext = Record<string, unknown>;

export type Handler = (request: Request, context: ServerContext) => Promise<Response>;

export type Next = () => Promise<Response>;

export type Middleware = (
  request: Request,
  context: ServerContext,
  next: Next
) => Promise<Response>;

export type Route = {
  path: string;
  method?: string;
  modulePath: string;
};
