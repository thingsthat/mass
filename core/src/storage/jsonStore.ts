/**
 * File-based JSON store that implements the DatabaseClient interface.
 * Used by the CLI so all persona, cohort, workspace, and report data is stored
 * under data (or MASS_DATA_DIR).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  getDataRoot,
  getPersonasDir,
  getCohortsDir,
  getWorkspacesDir,
  getReportsDir,
  getReportResponsesDir,
  getTasksDir,
  getExecutionsDir,
  getUsersDir,
  getPersonaFile,
  getCohortFile,
  getWorkspaceFile,
  getReportFile,
  getTaskFile,
  getExecutionFile,
  getUserFile,
} from 'core/src/storage/paths';

import type {
  DatabaseClient,
  DbError,
  DbResponse,
  InsertBuilder,
  TableQueryBuilder,
  UpdateBuilder,
  DeleteBuilder,
} from 'core/src/database/types';

const TABLE_NAMES = [
  'workspaces',
  'reports',
  'report_responses',
  'personas',
  'cohorts',
  'tasks',
  'executions',
  'users',
] as const;

type TableName = (typeof TABLE_NAMES)[number];

function toDbError(error: unknown): DbError {
  if (error && typeof error === 'object' && 'message' in error) {
    return {
      message: String((error as { message: string }).message),
      code: 'code' in error ? String((error as { code: string }).code) : undefined,
    };
  }
  return { message: String(error) };
}

function safeJsonParse(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

function rowToObject(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = safeJsonParse(v);
  }
  return out;
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readJsonFile(filePath: string): Record<string, unknown> | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function readPersonaRow(root: string, id: string): Record<string, unknown> | null {
  const mainPath = getPersonaFile(root, id);
  const row = readJsonFile(mainPath);
  if (!row) {
    return null;
  }
  row.id = id;
  return row;
}

function writeJsonFile(filePath: string, data: Record<string, unknown>): void {
  const dir = path.dirname(filePath);
  ensureDir(dir);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function getTableDir(root: string, table: string): string {
  switch (table) {
    case 'workspaces':
      return getWorkspacesDir(root);
    case 'reports':
      return getReportsDir(root);
    case 'report_responses':
      return getReportResponsesDir(root);
    case 'personas':
      return getPersonasDir(root);
    case 'cohorts':
      return getCohortsDir(root);
    case 'tasks':
      return getTasksDir(root);
    case 'executions':
      return getExecutionsDir(root);
    case 'users':
      return getUsersDir(root);
    default:
      return path.join(root, `.${table}`);
  }
}

function getRowPath(root: string, table: string, id: string): string {
  switch (table) {
    case 'workspaces':
      return getWorkspaceFile(root, id);
    case 'reports':
      return getReportFile(root, id);
    case 'report_responses':
      return path.join(getReportResponsesDir(root), `${id}.json`);
    case 'personas':
      return getPersonaFile(root, id);
    case 'cohorts':
      return getCohortFile(root, id);
    case 'tasks':
      return getTaskFile(root, id);
    case 'executions':
      return getExecutionFile(root, id);
    case 'users':
      return getUserFile(root, id);
    default:
      return path.join(getTableDir(root, table), `${id}.json`);
  }
}

function listRows(root: string, table: string): Record<string, unknown>[] {
  const dir = getTableDir(root, table);
  if (!fs.existsSync(dir)) {
    return [];
  }
  const rows: Record<string, unknown>[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.isFile() && e.name.endsWith('.json')) {
      const id = e.name.replace(/\.json$/, '');
      const filePath = path.join(dir, e.name);
      const row = readJsonFile(filePath);
      if (row) {
        row.id = id;
        rows.push(rowToObject(row));
      }
    } else if (e.isDirectory() && table === 'personas') {
      const id = e.name;
      const filePath = getPersonaFile(root, id);
      if (fs.existsSync(filePath)) {
        const row = readPersonaRow(root, id);
        if (row) {
          rows.push(rowToObject(row));
        }
      }
    }
  }
  return rows;
}

type WhereClause = { column: string; op: string; value: unknown; orGroup?: boolean; not?: boolean };

function matches(row: Record<string, unknown>, where: WhereClause[]): boolean {
  const ands: WhereClause[] = [];
  const ors: WhereClause[] = [];
  for (const w of where) {
    if (w.orGroup) {
      ors.push(w);
    } else {
      ands.push(w);
    }
  }
  const getVal = (r: Record<string, unknown>, col: string): unknown => {
    const v = r[col];
    if (v !== undefined) {
      return v;
    }
    const jsonMatch = col.match(/^(.+)->>?(.+)$/);
    if (jsonMatch) {
      const [, colName, pathStr] = jsonMatch;
      const obj = r[colName] as Record<string, unknown> | undefined;
      if (obj && typeof obj === 'object') {
        const parts = (pathStr as string).trim().replace(/^\.?/, '').split('.');
        let cur: unknown = obj;
        for (const p of parts) {
          cur = (cur as Record<string, unknown>)?.[p];
        }
        return cur;
      }
    }
    return undefined;
  };
  const matchOne = (r: Record<string, unknown>, w: WhereClause): boolean => {
    const v = getVal(r, w.column);
    let ok = false;
    if (w.op === '=') {
      ok = v === w.value;
    } else if (w.op === 'in') {
      ok = Array.isArray(w.value) && (w.value as unknown[]).includes(v);
    } else if (w.op === '>=') {
      ok = typeof v === 'number' && typeof w.value === 'number' && v >= (w.value as number);
    } else if (w.op === '<=') {
      ok = typeof v === 'number' && typeof w.value === 'number' && v <= (w.value as number);
    } else if (w.op === 'cs') {
      ok = typeof v === 'string' && typeof w.value === 'string' && v.includes(w.value);
    }
    return w.not ? !ok : ok;
  };
  for (const w of ands) {
    if (!matchOne(row, w)) {
      return false;
    }
  }
  if (ors.length) {
    if (!ors.some(w => matchOne(row, w))) {
      return false;
    }
  }
  return true;
}

function sortRows(
  rows: Record<string, unknown>[],
  orderColumn: string | null,
  orderAsc: boolean
): void {
  if (!orderColumn) {
    return;
  }
  rows.sort((a, b) => {
    const av = a[orderColumn] as string | number | undefined;
    const bv = b[orderColumn] as string | number | undefined;
    if (av === undefined && bv === undefined) {
      return 0;
    }
    if (av === undefined) {
      return orderAsc ? 1 : -1;
    }
    if (bv === undefined) {
      return orderAsc ? -1 : 1;
    }
    if (typeof av === 'string' && typeof bv === 'string') {
      return orderAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    if (typeof av === 'number' && typeof bv === 'number') {
      return orderAsc ? av - bv : bv - av;
    }
    return 0;
  });
}

export function createJsonDatabaseClient(): DatabaseClient {
  const root = getDataRoot();

  return {
    from(tableName: string): TableQueryBuilder {
      if (!TABLE_NAMES.includes(tableName as TableName)) {
        const err = new Error(`Unknown table: ${tableName}`);
        const errResponse: DbResponse<Record<string, unknown>[]> = {
          data: null,
          error: toDbError(err),
        };
        const reject = () => Promise.resolve(errResponse);
        const stub: TableQueryBuilder = {
          select: () => stub,
          eq: () => stub,
          in: () => stub,
          or: () => stub,
          not: () => stub,
          gte: () => stub,
          lte: () => stub,
          filter: () => stub,
          order: () => stub,
          limit: () => stub,
          range: () => stub,
          single: () => reject() as unknown as Promise<DbResponse<Record<string, unknown>>>,
          insert: () =>
            ({ select: () => ({ single: () => reject() }) }) as unknown as InsertBuilder,
          update: () =>
            ({
              eq: () => ({
                select: () => ({ single: () => reject(), then: () => reject() }),
              }),
            }) as unknown as UpdateBuilder,
          upsert: () => reject() as unknown as Promise<DbResponse<Record<string, unknown>>>,
          delete: () => ({ eq: () => reject() }) as unknown as DeleteBuilder,
          then: (() => reject()) as TableQueryBuilder['then'],
        };
        return stub;
      }

      let countOnly = false;
      let headOnly = false;
      const whereClauses: WhereClause[] = [];
      let orderColumn: string | null = null;
      let orderAsc = true;
      let limitValue: number | null = null;
      let rangeFrom: number | null = null;
      let insertRow: Record<string, unknown> | null = null;
      let updateRow: Record<string, unknown> | null = null;
      let updateWhereColumn: string | null = null;
      let updateWhereValue: unknown = null;

      const builder: TableQueryBuilder = {
        select(columns?: string, options?: { count?: 'exact'; head?: boolean }) {
          if (options?.count === 'exact' && options?.head) {
            countOnly = true;
            headOnly = true;
          }
          return builder;
        },
        eq(column: string, value: unknown) {
          whereClauses.push({ column, op: '=', value });
          if (updateRow !== null && updateWhereColumn === null) {
            updateWhereColumn = column;
            updateWhereValue = value;
          }
          return builder;
        },
        not(column: string, op: string, value: unknown) {
          whereClauses.push({ column, op, value, not: true });
          return builder;
        },
        in(column: string, values: unknown[]) {
          whereClauses.push({ column, op: 'in', value: values });
          return builder;
        },
        or(conditions: string) {
          const parts = conditions.split(',');
          for (const part of parts) {
            const eqIndex = part.indexOf('.eq.');
            if (eqIndex !== -1) {
              const col = part.substring(0, eqIndex).trim();
              const val = part.substring(eqIndex + 4).trim();
              whereClauses.push({ column: col, op: '=', value: val, orGroup: true });
            }
          }
          return builder;
        },
        gte(column: string, value: unknown) {
          whereClauses.push({ column, op: '>=', value });
          return builder;
        },
        lte(column: string, value: unknown) {
          whereClauses.push({ column, op: '<=', value });
          return builder;
        },
        filter(column: string, op: string, value: string) {
          const jsonMatch = column.match(/^(.+)->(.+)$/);
          if (jsonMatch) {
            whereClauses.push({
              column: column.replace(/->/, '->>'),
              op: op === 'cs' ? 'cs' : op === 'in' ? 'in' : '=',
              value,
            });
          } else {
            whereClauses.push({ column, op, value });
          }
          return builder;
        },
        order(column: string, options?: { ascending?: boolean }) {
          orderColumn = column;
          orderAsc = options?.ascending !== false;
          return builder;
        },
        limit(n: number) {
          limitValue = n;
          return builder;
        },
        range(from: number, to: number) {
          rangeFrom = from;
          limitValue = to - from + 1;
          return builder;
        },
        single() {
          limitValue = 1;
          return executeQuery(true) as Promise<DbResponse<Record<string, unknown>>>;
        },
        insert(row: Record<string, unknown>) {
          insertRow = row;
          return {
            select() {
              return this;
            },
            single() {
              return executeInsert();
            },
          };
        },
        update(row: Record<string, unknown>) {
          updateRow = { ...row, updated_at: new Date().toISOString() };
          return {
            eq(column: string, value: unknown) {
              updateWhereColumn = column;
              updateWhereValue = value;
              return this;
            },
            select() {
              return this;
            },
            single() {
              return executeUpdate();
            },
            then(
              onfulfilled?: (value: DbResponse<Record<string, unknown>>) => unknown,
              onrejected?: (reason: unknown) => unknown
            ) {
              return executeUpdate().then(onfulfilled, onrejected) as Promise<
                DbResponse<Record<string, unknown>>
              >;
            },
          };
        },
        upsert(row: Record<string, unknown>, options?: { onConflict?: string }) {
          insertRow = row;
          return executeUpsert(options?.onConflict ?? 'id');
        },
        delete() {
          let delWhereCol: string | null = null;
          let delWhereVal: unknown = null;
          return {
            eq(column: string, value: unknown) {
              delWhereCol = column;
              delWhereVal = value;
              return executeDelete(delWhereCol, delWhereVal);
            },
          };
        },
        then<TResult = unknown>(
          onfulfilled?: (
            value: DbResponse<Record<string, unknown>[]>
          ) => TResult | PromiseLike<TResult>
        ): Promise<TResult> {
          return executeQuery(false).then(
            onfulfilled as (value: DbResponse<Record<string, unknown>[]>) => TResult
          ) as Promise<TResult>;
        },
      };

      async function executeQuery(
        single: boolean
      ): Promise<DbResponse<Record<string, unknown> | Record<string, unknown>[]>> {
        try {
          let rows = listRows(root, tableName);
          rows = rows.filter(r => matches(r, whereClauses));
          sortRows(rows, orderColumn, orderAsc);
          if (rangeFrom !== null) {
            rows = rows.slice(rangeFrom, rangeFrom + (limitValue ?? rows.length));
          } else if (limitValue !== null) {
            rows = rows.slice(0, limitValue);
          }

          if (countOnly && headOnly) {
            const count = rows.length;
            const result: DbResponse<Record<string, unknown>[]> & { count: number } = {
              data: null,
              error: null,
              count,
            };
            return result;
          }
          if (countOnly) {
            return {
              data: { count: rows.length } as unknown as Record<string, unknown>[],
              error: null,
            };
          }
          if (single) {
            const one = rows[0] ?? null;
            return {
              data: one as Record<string, unknown>,
              error: rows.length === 0 ? { message: 'No rows found', code: 'PGRST116' } : null,
            };
          }
          return { data: rows as Record<string, unknown>[], error: null };
        } catch (error) {
          return { data: null, error: toDbError(error) };
        }
      }

      async function executeInsert(): Promise<DbResponse<Record<string, unknown>>> {
        try {
          if (!insertRow) {
            return { data: null, error: toDbError(new Error('No insert row')) };
          }
          const id = (insertRow.id as string) ?? crypto.randomUUID();
          const row: Record<string, unknown> = {
            ...insertRow,
            id,
            created_at: insertRow.created_at ?? new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          const filtered = Object.fromEntries(
            Object.entries(row).filter(([, v]) => v !== undefined)
          ) as Record<string, unknown>;
          const filePath = getRowPath(root, tableName, id);
          ensureDir(path.dirname(filePath));
          const toWrite: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(filtered)) {
            toWrite[k] =
              typeof v === 'object' && v !== null && !Array.isArray(v)
                ? v
                : typeof v === 'string' && (v.startsWith('{') || v.startsWith('['))
                  ? JSON.parse(v as string)
                  : v;
          }
          writeJsonFile(filePath, toWrite);
          return { data: rowToObject(toWrite) as Record<string, unknown>, error: null };
        } catch (error) {
          return { data: null, error: toDbError(error) };
        }
      }

      async function executeUpdate(): Promise<DbResponse<Record<string, unknown>>> {
        try {
          if (!updateRow || updateWhereColumn === null) {
            return { data: null, error: { message: 'Update requires where clause' } };
          }
          const id = updateWhereValue as string;
          const filePath = getRowPath(root, tableName, id);
          const existing =
            tableName === 'personas' ? readPersonaRow(root, id) : readJsonFile(filePath);
          if (!existing) {
            return { data: null, error: { message: 'No rows found', code: 'PGRST116' } };
          }
          const resolvedId = (existing.id as string | undefined) ?? id;
          const updated = {
            ...existing,
            ...updateRow,
            id: resolvedId,
            created_at: existing.created_at,
          };
          delete (updated as Record<string, unknown>).id;
          writeJsonFile(filePath, updated as Record<string, unknown>);
          return {
            data: rowToObject({ ...updated, id: resolvedId }) as Record<string, unknown>,
            error: null,
          };
        } catch (error) {
          return { data: null, error: toDbError(error) };
        }
      }

      async function executeUpsert(
        conflictKey: string
      ): Promise<DbResponse<Record<string, unknown>>> {
        try {
          if (!insertRow) {
            return { data: null, error: toDbError(new Error('No insert row')) };
          }
          const id =
            (insertRow[conflictKey] as string) ?? (insertRow.id as string) ?? crypto.randomUUID();
          const row: Record<string, unknown> = {
            ...insertRow,
            [conflictKey]: insertRow[conflictKey] ?? id,
            id: insertRow.id ?? id,
            created_at: insertRow.created_at ?? new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          const filtered = Object.fromEntries(
            Object.entries(row).filter(([, v]) => v !== undefined)
          ) as Record<string, unknown>;
          const filePath = getRowPath(root, tableName, id);
          const existing = readJsonFile(filePath);
          const toWrite = existing
            ? { ...existing, ...filtered, id: existing.id ?? id, created_at: existing.created_at }
            : filtered;
          ensureDir(path.dirname(filePath));
          writeJsonFile(filePath, toWrite as Record<string, unknown>);
          return {
            data: rowToObject(toWrite as Record<string, unknown>) as Record<string, unknown>,
            error: null,
          };
        } catch (error) {
          return { data: null, error: toDbError(error) };
        }
      }

      async function executeDelete(
        whereColumn: string | null,
        whereValue: unknown
      ): Promise<DbResponse<null>> {
        try {
          if (whereColumn === null || whereValue === undefined) {
            return { data: null, error: { message: 'Delete requires where clause' } };
          }
          const id = whereValue as string;
          const filePath = getRowPath(root, tableName, id);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            if (tableName === 'personas') {
              const dir = path.dirname(filePath);
              if (fs.existsSync(dir)) {
                fs.rmdirSync(dir);
              }
            }
          }
          return { data: null, error: null };
        } catch (error) {
          return { data: null, error: toDbError(error) };
        }
      }

      return builder;
    },
  };
}
