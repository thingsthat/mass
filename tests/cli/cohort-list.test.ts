import { runCohortList } from 'cli/src/commands/cohort/list';
import { log, LogCategory } from 'core/src/helpers/logger';
import { createMockDb } from 'tests/helpers/mockDb';

import type { MockDb } from 'tests/helpers/mockDb';

let mockDbInstance: MockDb;

jest.mock('core/src/database/client', () => ({
  getDatabaseClient: () => mockDbInstance.client,
}));

describe('runCohortList', () => {
  beforeEach(() => {
    mockDbInstance = createMockDb();
  });

  test('logs cohort rows when db returns data', async () => {
    mockDbInstance.addSelectResult([
      {
        id: 'cohort-1',
        name: 'Test Cohort',
        description: 'A test cohort',
        data: { persona_ids: ['p1', 'p2'] },
      },
    ] as unknown as Record<string, unknown>[]);

    const logSpy = jest.spyOn(log, 'info').mockImplementation(() => {});

    await runCohortList();

    expect(logSpy).toHaveBeenCalledWith(
      LogCategory.MASS,
      expect.stringContaining('cohort-1')
    );
    expect(logSpy).toHaveBeenCalledWith(
      LogCategory.MASS,
      expect.stringContaining('Test Cohort')
    );
    expect(logSpy).toHaveBeenCalledWith(
      LogCategory.MASS,
      expect.stringContaining('(personas: 2)')
    );
    logSpy.mockRestore();
  });

  test('logs "No cohorts." when db returns empty list', async () => {
    mockDbInstance.addSelectResult([]);

    const logSpy = jest.spyOn(log, 'info').mockImplementation(() => {});

    await runCohortList();

    expect(logSpy).toHaveBeenCalledWith(LogCategory.MASS, 'No cohorts.');
    logSpy.mockRestore();
  });

  test('throws when db returns error', async () => {
    mockDbInstance.addResult({ data: null, error: { message: 'DB error' } });

    await expect(runCohortList()).rejects.toThrow('DB error');
  });
});
