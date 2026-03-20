import { runReportList } from 'cli/src/commands/report/list';
import { log, LogCategory } from 'core/src/helpers/logger';
import { createMockDb } from 'tests/helpers/mockDb';

import type { MockDb } from 'tests/helpers/mockDb';

let mockDbInstance: MockDb;

jest.mock('core/src/database/client', () => ({
  getDatabaseClient: () => mockDbInstance.client,
}));

describe('runReportList', () => {
  beforeEach(() => {
    mockDbInstance = createMockDb();
  });

  test('logs report rows when db returns data', async () => {
    mockDbInstance.addSelectResult([
      {
        id: 'report-1',
        workspace_id: 'ws-1',
        status: 'completed',
        report: { report: { title: 'Test Report' } },
        created_at: '2025-01-01T00:00:00Z',
      },
    ] as unknown as Record<string, unknown>[]);

    const logSpy = jest.spyOn(log, 'info').mockImplementation(() => {});

    await runReportList({});

    expect(logSpy).toHaveBeenCalledWith(
      LogCategory.MASS,
      expect.stringContaining('report-1')
    );
    expect(logSpy).toHaveBeenCalledWith(
      LogCategory.MASS,
      expect.stringContaining('Test Report')
    );
    logSpy.mockRestore();
  });

  test('logs "No reports." when db returns empty list', async () => {
    mockDbInstance.addSelectResult([]);

    const logSpy = jest.spyOn(log, 'info').mockImplementation(() => {});

    await runReportList({});

    expect(logSpy).toHaveBeenCalledWith(LogCategory.MASS, 'No reports.');
    logSpy.mockRestore();
  });

  test('throws when db returns error', async () => {
    mockDbInstance.addResult({ data: null, error: { message: 'DB error' } });

    await expect(runReportList({})).rejects.toThrow('DB error');
  });
});
