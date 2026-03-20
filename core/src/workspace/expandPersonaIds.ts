/**
 * Resolves workspace persona_ids and cohort_ids into a flat, deduplicated list of persona IDs.
 * Used by chat (prompt-ask) and reports.
 */

import { log } from 'core/src/helpers/logger';

import type { DatabaseClient } from 'core/src/database/types';

export type ExpandPersonaIdsResult = {
  allPersonaIds: string[];
  maxPersonasFromCohorts: number;
  useRandomPersonas: boolean;
};

/**
 * Expands cohort_ids into persona_ids and returns a combined, deduplicated list.
 * Cohorts can be identified by id or by name (case-insensitive).
 */
export const expandPersonaIds = async (
  db: DatabaseClient,
  personaIds: string[],
  cohortIds: string[]
): Promise<ExpandPersonaIdsResult> => {
  const allPersonaIds = [...personaIds];
  let maxPersonasFromCohorts = 0;
  let useRandomPersonas = false;

  if (cohortIds?.length > 0) {
    for (const cohortIdentifier of cohortIds) {
      const { data: customCohorts, error: fetchError } = await db
        .from('cohorts')
        .select('id, name, data');

      let customCohortByName: Record<string, unknown> | null = null;
      let nameError: { message: string } | null = null;

      if (!fetchError && customCohorts && Array.isArray(customCohorts)) {
        const cohortIdLower = String(cohortIdentifier ?? '').toLowerCase();
        customCohortByName =
          (customCohorts as Record<string, unknown>[]).find(
            (c: Record<string, unknown>) =>
              String((c.name as string) ?? '').toLowerCase() === cohortIdLower
          ) ?? null;
        if (!customCohortByName) {
          nameError = { message: 'Cohort not found by name' };
        }
      } else {
        nameError = fetchError;
      }

      const cohortByNameData = customCohortByName as { data?: { persona_ids?: string[] } } | null;
      if (!nameError && cohortByNameData?.data?.persona_ids) {
        allPersonaIds.push(...cohortByNameData.data.persona_ids);
        maxPersonasFromCohorts = Math.max(
          maxPersonasFromCohorts,
          cohortByNameData.data.persona_ids.length
        );
      } else {
        const { data: customCohortById, error: idError } = await db
          .from('cohorts')
          .select('data')
          .eq('id', cohortIdentifier)
          .single();

        const cohortByIdData = customCohortById as { data?: { persona_ids?: string[] } } | null;
        if (!idError && cohortByIdData?.data?.persona_ids) {
          allPersonaIds.push(...cohortByIdData.data.persona_ids);
          maxPersonasFromCohorts = Math.max(
            maxPersonasFromCohorts,
            cohortByIdData.data.persona_ids.length
          );
        } else if (idError && nameError) {
          log.error(
            'WORKSPACE',
            `[expandPersonaIds] Failed to fetch cohort ${cohortIdentifier} (tried name and ID):`,
            nameError.message || (idError?.message ?? '')
          );
        }
      }
    }
  } else if (allPersonaIds.length === 0) {
    useRandomPersonas = true;
  }

  return { allPersonaIds, maxPersonasFromCohorts, useRandomPersonas };
};
