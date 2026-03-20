/**
 * Mock DatabaseClient for CLI and backend tests. Configurable result queue;
 * each terminal call (then, single, insert().select().single(), update().eq().single(), delete().eq())
 * consumes the next result. Use addResult() to enqueue responses in the order they will be consumed.
 */

import type {
  DatabaseClient,
  DbResponse,
  DeleteBuilder,
  InsertBuilder,
  TableQueryBuilder,
  UpdateBuilder,
} from 'core/src/database/types';

const defaultError: DbResponse<Record<string, unknown>> = {
  data: null,
  error: { message: 'No mock result configured' },
};

export function createMockDb(): MockDb {
  const resultQueue: DbResponse<Record<string, unknown> | Record<string, unknown>[] | null>[] = [];

  const getNextResult = (): DbResponse<Record<string, unknown> | Record<string, unknown>[] | null> => {
    const next = resultQueue.shift();
    if (next !== undefined) {
      return next;
    }
    return defaultError;
  };

  const createBuilder = (): TableQueryBuilder => {
    const builder: TableQueryBuilder = {
      select: () => builder,
      eq: () => builder,
      in: () => builder,
      or: () => builder,
      not: () => builder,
      gte: () => builder,
      lte: () => builder,
      filter: () => builder,
      order: () => builder,
      limit: () => builder,
      range: () => builder,
      single: () => Promise.resolve(getNextResult() as DbResponse<Record<string, unknown>>),
      insert: (row: Record<string, unknown>) => {
        const insertBuilder: InsertBuilder = {
          select: () => insertBuilder,
          single: () =>
            Promise.resolve(getNextResult() as DbResponse<Record<string, unknown>>),
        };
        return insertBuilder;
      },
      update: (row: Record<string, unknown>) => {
        const runUpdate = () =>
          Promise.resolve(getNextResult() as DbResponse<Record<string, unknown>>);
        const updateBuilder: UpdateBuilder = {
          eq: () => updateBuilder,
          select: () => updateBuilder,
          single: () => runUpdate(),
          then: (
            onfulfilled?: (value: DbResponse<Record<string, unknown>>) => unknown,
            onrejected?: (reason: unknown) => unknown
          ): Promise<DbResponse<Record<string, unknown>>> =>
            runUpdate().then(onfulfilled, onrejected) as Promise<
              DbResponse<Record<string, unknown>>
            >,
        };
        return updateBuilder;
      },
      upsert: () =>
        Promise.resolve(getNextResult() as DbResponse<Record<string, unknown>>),
      delete: () =>
        ({
          eq: () =>
            Promise.resolve(
              getNextResult() as DbResponse<null>
            ),
        }) as DeleteBuilder,
      then: <TResult = unknown>(
        onfulfilled?: (value: DbResponse<Record<string, unknown>[]>) => TResult | PromiseLike<TResult>
      ): Promise<TResult> =>
        Promise.resolve(
          getNextResult() as DbResponse<Record<string, unknown>[]>
        ).then(onfulfilled) as Promise<TResult>,
    };
    return builder;
  };

  const client: DatabaseClient = {
    from: () => createBuilder(),
  };

  return {
    client,
    addResult: (response: DbResponse<Record<string, unknown> | Record<string, unknown>[] | null>) => {
      resultQueue.push(response);
    },
    addSelectResult: (data: Record<string, unknown>[] | null, error?: { message: string } | null) => {
      resultQueue.push({ data, error: error ?? null });
    },
    addSingleResult: (data: Record<string, unknown> | null, error?: { message: string } | null) => {
      resultQueue.push({ data, error: error ?? null });
    },
    addDeleteResult: (error?: { message: string } | null) => {
      resultQueue.push({ data: null, error: error ?? null });
    },
    clear: () => {
      resultQueue.length = 0;
    },
  };
}

export type MockDb = {
  client: DatabaseClient;
  addResult: (
    response: DbResponse<Record<string, unknown> | Record<string, unknown>[] | null>
  ) => void;
  addSelectResult: (
    data: Record<string, unknown>[] | null,
    error?: { message: string } | null
  ) => void;
  addSingleResult: (
    data: Record<string, unknown> | null,
    error?: { message: string } | null
  ) => void;
  addDeleteResult: (error?: { message: string } | null) => void;
  clear: () => void;
};
