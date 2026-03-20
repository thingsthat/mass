/**
 * Helpers for the standalone HTTP server: compose, path normalisation,
 * Node request/response conversion, and middleware factories.
 */

import http from 'node:http';

import { getCorsHeaders } from 'backend/src/helpers/cors';
import { ROUTES } from 'backend/src/routes';
import { log } from 'core/src/helpers/logger';

import type { Handler, Middleware, ServerContext } from 'backend/src/types/server';

export function compose(
  middlewares: Middleware[],
  finalHandler: Handler
): (request: Request, context: ServerContext) => Promise<Response> {
  return (request, context) => {
    let index = 0;
    const next = (): Promise<Response> => {
      if (index < middlewares.length) {
        const middleware = middlewares[index];
        index += 1;
        return middleware(request, context, next);
      }
      return finalHandler(request, context);
    };
    return next();
  };
}

export function normalisePath(pathname: string): string {
  const netlifyPrefix = '/.netlify/functions';
  return pathname.startsWith(netlifyPrefix)
    ? pathname.slice(netlifyPrefix.length) || '/'
    : pathname;
}

export function requestLogger(): Middleware {
  return async (request, _context, next) => {
    const pathname = new URL(request.url).pathname;
    log.info('SERVER', request.method, pathname);
    return next();
  };
}

export function serverErrorResponse(error: unknown): Response {
  return new Response(
    JSON.stringify({
      error: error instanceof Error ? error.message : 'Internal server error',
    }),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  );
}

export function errorBoundary(): Middleware {
  return async (_request, _context, next) => {
    try {
      return await next();
    } catch (error) {
      log.error('SERVER', 'Request error:', error);
      return serverErrorResponse(error);
    }
  };
}

export function notFoundHandler(): Handler {
  return async () =>
    new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
}

export function buildRequestUrl(req: http.IncomingMessage, port: number): URL {
  const host = req.headers.host ?? `localhost:${port}`;
  const protocol = req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  const path = req.url ?? '/';
  return new URL(path, `${protocol}://${host}`);
}

export function requestFromNode(req: http.IncomingMessage, body: Buffer, port: number): Request {
  const url = buildRequestUrl(req, port);
  return new Request(url, {
    method: req.method ?? 'GET',
    headers: req.headers as HeadersInit,
    body:
      req.method !== 'GET' && req.method !== 'HEAD' && body.length > 0
        ? new Uint8Array(body)
        : undefined,
  });
}

export async function collectBody(req: http.IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export function headersToObject(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

export async function sendResponse(res: http.ServerResponse, response: Response): Promise<void> {
  res.writeHead(response.status, headersToObject(response.headers));
  if (response.body) {
    const reader = response.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        res.write(Buffer.from(value));
      }
    } finally {
      reader.releaseLock();
    }
  }
  res.end();
}

export function sendError(res: http.ServerResponse, status: number, message: string): void {
  if (res.headersSent) {
    return;
  }
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: message }));
}

export function routeMiddleware(): Middleware {
  return async (request, context, next) => {
    const pathname = new URL(request.url).pathname;
    const normalised = normalisePath(pathname);
    const route = ROUTES.find(r => r.path === normalised);
    if (!route) {
      return next();
    }
    return route.handler(request, context);
  };
}

export function corsMiddleware(): Middleware {
  return async (request, _context, next) => {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: getCorsHeaders(request) });
    }
    return next();
  };
}

export function getRequestHandler(): (
  request: Request,
  context: ServerContext
) => Promise<Response> {
  const middlewares: Middleware[] = [
    requestLogger(),
    corsMiddleware(),
    errorBoundary(),
    routeMiddleware(),
  ];
  const requestHandler = compose(middlewares, notFoundHandler());
  return async (request, context) => {
    try {
      return await requestHandler(request, context);
    } catch (error) {
      log.error('SERVER', 'Unhandled error:', error);
      return serverErrorResponse(error);
    }
  };
}
