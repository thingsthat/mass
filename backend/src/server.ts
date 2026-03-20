/**
 * Standalone HTTP server for the backend. Uses a middleware pipeline and route table
 * so the backend can run without Netlify, using core/database only.
 */

import 'core/src/env';

import http from 'node:http';

import { withCorsHeaders } from 'backend/src/helpers/cors';
import {
  collectBody,
  getRequestHandler,
  requestFromNode,
  sendResponse,
} from 'backend/src/helpers/server';
import { log } from 'core/src/helpers/logger';

const PORT = Number(process.env.PORT) || 3000;

const handleRequest = getRequestHandler();

const server = http.createServer(async (req, res) => {
  const body = await collectBody(req);
  const request = requestFromNode(req, body, PORT);
  const context = {};
  const response = await handleRequest(request, context);
  const responseWithCors = await withCorsHeaders(request, response);
  await sendResponse(res, responseWithCors);
});

function shutdown(signal: string): void {
  log.info('SERVER', `${signal} received, closing server`);
  server.close(() => process.exit(0));
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

server.listen(PORT, () => {
  log.info('SERVER', `Backend listening on http://localhost:${PORT}`);
});
