/**
 * Standalone HTTP server for the backend. Uses Hono so the backend can run
 * without Netlify, using core/database only.
 */

import 'core/src/env';

import { serve } from '@hono/node-server';
import { Hono } from 'hono';

import { getCorsHeaders, withCorsHeaders } from 'backend/src/helpers/cors';
import { ROUTES } from 'backend/src/routes';
import { log } from 'core/src/helpers/logger';

import type { Context } from 'hono';
import type { Handler } from 'backend/src/types/server';

const PORT = Number(process.env.PORT) || 3000;

const runHandler = (handler: Handler) => async (context: Context) =>
  withCorsHeaders(context.req.raw, await handler(context.req.raw, {}));

const app = new Hono();

app.use('*', async (context, next) => {
  const pathname = new URL(context.req.url).pathname;
  log.info('SERVER', context.req.method, pathname);
  await next();
});

app.use('*', async (context, next) => {
  if (context.req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(context.req.raw),
    });
  }
  await next();
});

for (const route of ROUTES) {
  app.all(route.path, runHandler(route.handler));
  app.all(`/.netlify/functions${route.path}`, runHandler(route.handler));
}

app.notFound(context =>
  withCorsHeaders(
    context.req.raw,
    new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  )
);

app.onError((error, context) => {
  log.error('SERVER', 'Unhandled error:', error);
  return withCorsHeaders(
    context.req.raw,
    new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  );
});

const server = serve(
  {
    fetch: app.fetch,
    port: PORT,
  },
  info => {
    log.info('SERVER', `Backend listening on http://localhost:${info.port}`);
  }
);

function shutdown(signal: string): void {
  log.info('SERVER', `${signal} received, closing server`);
  server.close(() => process.exit(0));
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
