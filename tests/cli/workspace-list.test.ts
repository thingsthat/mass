import { runWorkspaceList } from 'cli/src/commands/workspace/list';
import { log, LogCategory } from 'core/src/helpers/logger';
import { createMockDb } from 'tests/helpers/mockDb';

import type { MockDb } from 'tests/helpers/mockDb';

let mockDbInstance: MockDb;

jest.mock('core/src/database/client', () => ({
  getDatabaseClient: () => mockDbInstance.client,
}));

describe('runWorkspaceList', () => {
  beforeEach(() => {
    mockDbInstance = createMockDb();
  });

  test('logs workspace rows when db returns data', async () => {
    mockDbInstance.addSelectResult([
      {
        id: 'ws-1',
        name: 'My Workspace',
        description: 'A workspace',
        created_at: '2025-01-01T00:00:00Z',
      },
    ] as unknown as Record<string, unknown>[]);

    const logSpy = jest.spyOn(log, 'info').mockImplementation(() => {});

    await runWorkspaceList();

    expect(logSpy).toHaveBeenCalledWith(
      LogCategory.MASS,
      expect.stringContaining('ws-1')
    );
    expect(logSpy).toHaveBeenCalledWith(
      LogCategory.MASS,
      expect.stringContaining('My Workspace')
    );
    logSpy.mockRestore();
  });

  test('logs "No workspaces." when db returns empty list', async () => {
    mockDbInstance.addSelectResult([]);

    const logSpy = jest.spyOn(log, 'info').mockImplementation(() => {});

    await runWorkspaceList();

    expect(logSpy).toHaveBeenCalledWith(LogCategory.MASS, 'No workspaces.');
    logSpy.mockRestore();
  });

  test('throws when db returns error', async () => {
    mockDbInstance.addResult({ data: null, error: { message: 'DB error' } });

    await expect(runWorkspaceList()).rejects.toThrow('DB error');
  });
});
