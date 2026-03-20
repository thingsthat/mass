/**
 * Integration test: real JSON store under a temp dir, then run cohorts resolver.
 * MASS_DATA_DIR is set in beforeAll so the store writes to a temp directory.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { CohortsResolver } from 'backend/src/graphql/personas/queries/cohorts';
import { createJsonDatabaseClient } from 'core/src/storage/jsonStore';

import type { Context } from 'backend/src/context';

describe('CohortsResolver with real JSON store', () => {
  let tempDir: string;
  let originalDataDir: string | undefined;

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'mass-test-'));
    originalDataDir = process.env.MASS_DATA_DIR;
    process.env.MASS_DATA_DIR = tempDir;
  });

  afterAll(() => {
    process.env.MASS_DATA_DIR = originalDataDir;
    try {
      rmSync(tempDir, { recursive: true });
    } catch {
      // ignore cleanup errors
    }
  });

  test('returns cohort inserted via JSON store', async () => {
    const db = createJsonDatabaseClient();
    const cohortId = 'integration-cohort-1';
    const { error: insertError } = await db
      .from('cohorts')
      .insert({
        id: cohortId,
        name: 'Integration Cohort',
        description: 'Created in test',
        data: { status: 'completed', persona_ids: [] },
      })
      .select('id')
      .single();

    expect(insertError).toBeNull();

    const context: Context = {
      request: new Request('http://test'),
      db,
    };
    const result = await CohortsResolver.resolve!(null, {}, context);

    expect(result.cohorts).toHaveLength(1);
    expect(result.cohorts[0].id).toBe(cohortId);
    expect(result.cohorts[0].name).toBe('Integration Cohort');
    expect(result.total).toBe(1);
  });
});
