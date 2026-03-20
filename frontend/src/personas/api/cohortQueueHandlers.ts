import {
  DELETE_COHORT,
  type DeleteCohortResponse,
} from 'backend/src/graphql/personas/mutations/deleteCohort';
import {
  UPSERT_COHORT,
  type UpsertCohortResponse,
} from 'backend/src/graphql/personas/mutations/upsertCohort';
import { log } from 'core/src/helpers/logger';

import { executeGraphQL } from 'frontend/src/api/graphqlClient';

import type { CohortData } from 'core/src/personas/cohort.types';

type CohortUpsertPayload = {
  cohortId?: string;
  name?: string;
  description?: string;
  data?: Record<string, unknown>;
  acl?: Record<string, unknown>;
};

export const upsertCohortDirect = async (payload: CohortUpsertPayload): Promise<{ id: string }> => {
  const response = await executeGraphQL<UpsertCohortResponse>(
    UPSERT_COHORT,
    {
      cohort: {
        id: payload.cohortId,
        name: payload.name,
        description: payload.description,
        data: payload.data as CohortData | undefined,
      },
    },
    true
  );

  return { id: response.upsert_cohort.id };
};

export const deleteCohortDirect = async (cohortId: string): Promise<boolean> => {
  const response = await executeGraphQL<DeleteCohortResponse>(
    DELETE_COHORT,
    {
      cohortId,
    },
    true
  );

  if (!response.delete_cohort.success) {
    const errorMessage = 'Failed to delete cohort';
    log.error('PERSONA', '[cohortQueueHandlers]', 'Delete cohort failed:', errorMessage);
    throw new Error(errorMessage);
  }

  return response.delete_cohort.success;
};
