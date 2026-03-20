import { WorkspacesResolver } from 'backend/src/graphql/workspace/queries/workspaces';
import { log } from 'core/src/helpers/logger';
import { createMockDb } from 'tests/helpers/mockDb';

import type { Context } from 'backend/src/context';

describe('WorkspacesResolver', () => {
  test('returns workspaces from db', async () => {
    const mockDb = createMockDb();
    const workspaces = [
      {
        id: 'ws-1',
        name: 'Workspace One',
        description: 'First workspace',
        conversation: { id: 'conv-1', messages: [], name: '', status: 'active', cohort_ids: [], persona_ids: [], persona_metadata: [], fork: null },
        workflow: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      },
    ];
    mockDb.addSelectResult(workspaces as unknown as Record<string, unknown>[]);

    const context: Context = { request: new Request('http://test'), db: mockDb.client };
    const result = await WorkspacesResolver.resolve!(null, {}, context);

    expect(result.workspaces).toHaveLength(1);
    expect(result.workspaces[0].id).toBe('ws-1');
    expect(result.workspaces[0].name).toBe('Workspace One');
    expect(result.workspaces[0].description).toBe('First workspace');
  });

  test('returns empty list when no workspaces', async () => {
    const mockDb = createMockDb();
    mockDb.addSelectResult([]);

    const context: Context = { request: new Request('http://test'), db: mockDb.client };
    const result = await WorkspacesResolver.resolve!(null, {}, context);

    expect(result).toEqual({ workspaces: [] });
  });

  test('throws when db returns error', async () => {
    const logSpy = jest.spyOn(log, 'error').mockImplementation(() => {});
    const mockDb = createMockDb();
    mockDb.addResult({ data: null, error: { message: 'DB error' } });

    const context: Context = { request: new Request('http://test'), db: mockDb.client };

    await expect(
      WorkspacesResolver.resolve!(null, {}, context)
    ).rejects.toThrow('Failed to load workspaces: DB error');
    logSpy.mockRestore();
  });
});
