import { DeleteCohortResolver } from 'backend/src/graphql/personas/mutations/deleteCohort';
import { log } from 'core/src/helpers/logger';
import { createMockDb } from 'tests/helpers/mockDb';

import type { Context } from 'backend/src/context';

describe('DeleteCohortResolver', () => {
  test('returns success when delete succeeds', async () => {
    const mockDb = createMockDb();
    mockDb.addDeleteResult();

    const context: Context = { request: new Request('http://test'), db: mockDb.client };
    const result = await DeleteCohortResolver.resolve!(
      null,
      { cohortId: 'cohort-1' },
      context
    );

    expect(result).toEqual({ success: true });
  });

  test('throws when delete returns error', async () => {
    const logSpy = jest.spyOn(log, 'error').mockImplementation(() => {});
    const mockDb = createMockDb();
    mockDb.addDeleteResult({ message: 'Delete failed' });

    const context: Context = { request: new Request('http://test'), db: mockDb.client };

    await expect(
      DeleteCohortResolver.resolve!(null, { cohortId: 'cohort-1' }, context)
    ).rejects.toThrow('Failed to delete cohort: Delete failed');
    logSpy.mockRestore();
  });
});
