import { CohortsPersonasResolver } from 'backend/src/graphql/personas/queries/cohortPersonas';
import { createMockDb } from 'tests/helpers/mockDb';

import type { Context } from 'backend/src/context';

describe('CohortsPersonasResolver', () => {
  test('returns cohort_personas when cohort has persona ids', async () => {
    const mockDb = createMockDb();
    const cohortId = 'cohort-1';
    const personaIds = ['persona-1', 'persona-2'];
    mockDb.addSingleResult({
      data: { persona_ids: personaIds },
    } as unknown as Record<string, unknown>);

    const personas = [
      {
        id: 'persona-1',
        details: { name: 'Alice', metadata: {}, username: 'alice' },
        type: 'persona',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      },
      {
        id: 'persona-2',
        details: { name: 'Bob', metadata: {}, username: 'bob' },
        type: 'persona',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      },
    ];
    mockDb.addSelectResult(personas as unknown as Record<string, unknown>[]);

    const context: Context = { request: new Request('http://test'), db: mockDb.client };
    const result = await CohortsPersonasResolver.resolve!(
      null,
      { cohortId },
      context
    );

    expect(result.cohort_personas).toHaveLength(2);
    expect(result.cohort_personas[0].details.name).toBe('Alice');
    expect(result.cohort_personas[1].details.name).toBe('Bob');
  });

  test('returns empty cohort_personas when cohort has no persona ids', async () => {
    const mockDb = createMockDb();
    mockDb.addSingleResult({
      data: { persona_ids: [] },
    } as unknown as Record<string, unknown>);

    const context: Context = { request: new Request('http://test'), db: mockDb.client };
    const result = await CohortsPersonasResolver.resolve!(
      null,
      { cohortId: 'empty-cohort' },
      context
    );

    expect(result).toEqual({ cohort_personas: [] });
  });
});
