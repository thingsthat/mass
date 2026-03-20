import { CohortsResolver } from 'backend/src/graphql/personas/queries/cohorts';
import { log } from 'core/src/helpers/logger';
import { createMockDb } from 'tests/helpers/mockDb';

import type { Context } from 'backend/src/context';

describe('CohortsResolver', () => {
  test('returns cohorts and total from db', async () => {
    const mockDb = createMockDb();
    const cohorts = [
      {
        id: 'cohort-1',
        name: 'Test Cohort',
        description: 'A test',
        data: { persona_ids: [] },
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      },
    ];
    mockDb.addSelectResult(cohorts as unknown as Record<string, unknown>[]);

    const context: Context = { request: new Request('http://test'), db: mockDb.client };
    const result = await CohortsResolver.resolve!(
      null,
      { limit: 10 },
      context
    );

    expect(result).toEqual({ cohorts, total: 1 });
  });

  test('returns empty list when no cohorts', async () => {
    const mockDb = createMockDb();
    mockDb.addSelectResult([]);

    const context: Context = { request: new Request('http://test'), db: mockDb.client };
    const result = await CohortsResolver.resolve!(null, {}, context);

    expect(result).toEqual({ cohorts: [], total: 0 });
  });

  test('throws when db returns error', async () => {
    const logSpy = jest.spyOn(log, 'error').mockImplementation(() => {});
    const mockDb = createMockDb();
    mockDb.addResult({ data: null, error: { message: 'DB failure' } });

    const context: Context = { request: new Request('http://test'), db: mockDb.client };

    await expect(
      CohortsResolver.resolve!(null, {}, context)
    ).rejects.toThrow('Failed to load cohorts: DB failure');
    logSpy.mockRestore();
  });
});
