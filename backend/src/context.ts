/**
 * Backend request context. No auth or Supabase; db is core/database (local JSON store).
 */

import type { DatabaseClient } from 'core/src/database/types';

export type Context = {
  request: Request;
  db: DatabaseClient;
  requestId?: string;
};
