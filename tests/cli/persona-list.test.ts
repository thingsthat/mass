import { runPersonaList } from 'cli/src/commands/persona/list';
import { log, LogCategory } from 'core/src/helpers/logger';
import { createMockDb } from 'tests/helpers/mockDb';

import type { MockDb } from 'tests/helpers/mockDb';

let mockDbInstance: MockDb;

jest.mock('core/src/database/client', () => ({
  getDatabaseClient: () => mockDbInstance.client,
}));

describe('runPersonaList', () => {
  beforeEach(() => {
    mockDbInstance = createMockDb();
  });

  test('logs persona rows when db returns data', async () => {
    mockDbInstance.addSelectResult([
      {
        id: 'persona-1',
        name: 'Alice',
        metadata: {},
      },
    ] as unknown as Record<string, unknown>[]);

    const logSpy = jest.spyOn(log, 'info').mockImplementation(() => {});

    await runPersonaList({});

    expect(logSpy).toHaveBeenCalledWith(
      LogCategory.MASS,
      expect.stringContaining('persona-1')
    );
    expect(logSpy).toHaveBeenCalledWith(
      LogCategory.MASS,
      expect.stringContaining('Alice')
    );
    logSpy.mockRestore();
  });

  test('logs "No personas." when db returns empty list', async () => {
    mockDbInstance.addSelectResult([]);

    const logSpy = jest.spyOn(log, 'info').mockImplementation(() => {});

    await runPersonaList({});

    expect(logSpy).toHaveBeenCalledWith(LogCategory.MASS, 'No personas.');
    logSpy.mockRestore();
  });

  test('throws when db returns error', async () => {
    mockDbInstance.addResult({ data: null, error: { message: 'DB error' } });

    await expect(runPersonaList({})).rejects.toThrow('DB error');
  });

  test('when cohortId is set, fetches cohort then personas and logs them', async () => {
    mockDbInstance.addSingleResult({
      data: { persona_ids: ['persona-1'] },
    } as unknown as Record<string, unknown>);
    mockDbInstance.addSingleResult({
      id: 'persona-1',
      name: 'Bob',
      metadata: {},
    } as unknown as Record<string, unknown>);

    const logSpy = jest.spyOn(log, 'info').mockImplementation(() => {});

    await runPersonaList({ cohortId: 'cohort-1' });

    expect(logSpy).toHaveBeenCalledWith(
      LogCategory.MASS,
      expect.stringContaining('persona-1')
    );
    expect(logSpy).toHaveBeenCalledWith(
      LogCategory.MASS,
      expect.stringContaining('Bob')
    );
    logSpy.mockRestore();
  });
});
