/**
 * Database client getter. Uses the local JSON store only (no Drizzle/SQLite).
 * Data lives under data by default (MASS_DATA_DIR to override).
 */

import { createJsonDatabaseClient } from 'core/src/storage/jsonStore';

import type { DatabaseClient } from 'core/src/database/types';

let dbInstance: DatabaseClient | null = null;

export const getDatabaseClient = (): DatabaseClient => {
  if (!dbInstance) {
    dbInstance = createJsonDatabaseClient();
  }
  return dbInstance;
};
