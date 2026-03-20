/**
 * CORS headers for backend handlers.
 * When credentials are needed, Allow-Origin must be a specific origin (not *)
 * and Allow-Credentials must be 'true'.
 */

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'true',
};

export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') || '*';
  const headers: Record<string, string> = {
    ...corsHeaders,
    'Access-Control-Allow-Origin': origin,
  };
  if (origin === '*') {
    delete headers['Access-Control-Allow-Credentials'];
  } else {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  return headers;
}

export function withCorsHeaders(request: Request, response: Response): Response {
  const headers = new Headers(response.headers);
  Object.entries(getCorsHeaders(request)).forEach(([key, value]) => headers.set(key, value));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
