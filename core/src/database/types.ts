/**
 * Database layer types.
 * Response shape matches context.db used by resolvers.
 */

export type DbError = {
  message: string;
  code?: string;
  details?: string;
};

export type DbResponse<T> = {
  data: T | null;
  error: DbError | null;
};

export type DatabaseClient = {
  from: (table: string) => TableQueryBuilder;
};

export type TableQueryBuilder = {
  select: (columns?: string, options?: { count?: 'exact'; head?: boolean }) => TableQueryBuilder;
  eq: (column: string, value: unknown) => TableQueryBuilder;
  in: (column: string, values: unknown[]) => TableQueryBuilder;
  or: (conditions: string) => TableQueryBuilder;
  not: (column: string, op: string, value: unknown) => TableQueryBuilder;
  gte: (column: string, value: unknown) => TableQueryBuilder;
  lte: (column: string, value: unknown) => TableQueryBuilder;
  filter: (column: string, op: string, value: string) => TableQueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => TableQueryBuilder;
  limit: (n: number) => TableQueryBuilder;
  range: (from: number, to: number) => TableQueryBuilder;
  single: () => Promise<DbResponse<Record<string, unknown>>>;
  insert: (row: Record<string, unknown>) => InsertBuilder;
  update: (row: Record<string, unknown>) => UpdateBuilder;
  upsert: (
    row: Record<string, unknown>,
    options?: { onConflict?: string }
  ) => Promise<DbResponse<Record<string, unknown>>>;
  delete: () => DeleteBuilder;
  then: <TResult = unknown>(
    onfulfilled?: (value: DbResponse<Record<string, unknown>[]>) => TResult | PromiseLike<TResult>
  ) => Promise<TResult>;
};

export type InsertBuilder = {
  select: (columns: string) => InsertBuilder;
  single: () => Promise<DbResponse<Record<string, unknown>>>;
};

export type UpdateBuilder = {
  eq: (column: string, value: unknown) => UpdateBuilder;
  select: (columns?: string) => UpdateBuilder;
  single: () => Promise<DbResponse<Record<string, unknown>>>;
  then: (
    onfulfilled?: (value: DbResponse<Record<string, unknown>>) => unknown,
    onrejected?: (reason: unknown) => unknown
  ) => Promise<DbResponse<Record<string, unknown>>>;
};

export type DeleteBuilder = {
  eq: (column: string, value: unknown) => Promise<DbResponse<null>>;
};
