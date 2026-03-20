import { GET_COHORT, type CohortResponse } from 'backend/src/graphql/personas/queries/cohort';
import {
  CohortsPersonasResponse,
  GET_COHORT_PERSONAS,
} from 'backend/src/graphql/personas/queries/cohortPersonas';
import { GET_COHORTS, type CohortsResponse } from 'backend/src/graphql/personas/queries/cohorts';
import { log } from 'core/src/helpers/logger';

import { executeGraphQL } from 'frontend/src/api/graphqlClient';
import {
  deleteCohortDirect,
  upsertCohortDirect,
} from 'frontend/src/personas/api/cohortQueueHandlers';
import { useCohortsStore } from 'frontend/src/personas/store/cohorts';

import type { Cohort, CohortData } from 'core/src/personas/cohort.types';
import type { Persona } from 'core/src/personas/persona.types';

export const loadCachedCohorts = async (): Promise<Cohort[]> => {
  const cohortsStore = useCohortsStore();
  return cohortsStore.cohorts;
};

/**
 * Loads all cohorts from the server - returns cached data immediately, fetches fresh data in background
 */
export const loadCohorts = async (): Promise<Cohort[]> => {
  const cohortsStore = useCohortsStore();

  // No cached data, make request and wait for it
  try {
    const response = await executeGraphQL<{ cohorts: CohortsResponse }>(GET_COHORTS, {}, true);

    // Transform the GraphQL data to our application model
    const freshCohorts =
      response.cohorts.cohorts?.map(cohort => {
        return {
          ...cohort,
          name: cohort.name || '',
          description: cohort.description || '',
          data: (cohort.data || {}) as CohortData,
          created_at: cohort.created_at ? new Date(cohort.created_at) : new Date(),
          updated_at: cohort.updated_at ? new Date(cohort.updated_at) : new Date(),
        };
      }) || [];

    // Update store with fresh data
    cohortsStore.setCohorts(freshCohorts);

    // Return fresh data
    return freshCohorts;
  } catch (error) {
    log.error('PERSONA', '[CohortsApi] Error loading cohorts:', error);
    return [];
  }
};

/**
 * Loads a specific cohort from the server using GraphQL
 * @param cohortId Optional ID of the cohort to load. If not provided, loads the most recent cohort.
 */
export const loadCohort = async (cohortId?: string): Promise<Cohort> => {
  const data = await executeGraphQL<CohortResponse>(GET_COHORT, { cohortId }, true);

  if (!data.cohort.cohort) {
    throw new Error('Cohort not found');
  }

  // Transform the GraphQL data back to our application model
  return {
    id: data.cohort.cohort.id || '',
    name: data.cohort.cohort.name || '',
    description: data.cohort.cohort.description || '',
    data: (data.cohort.cohort.data || {}) as CohortData,
    created_at: data.cohort.cohort.created_at
      ? new Date(data.cohort.cohort.created_at)
      : new Date(),
    updated_at: data.cohort.cohort.updated_at
      ? new Date(data.cohort.cohort.updated_at)
      : new Date(),
  };
};

/**
 * Saves a cohort to the server using GraphQL
 * @param cohort The cohort data to save
 * @param cohortId Optional ID of the cohort. If provided, updates that cohort; otherwise creates a new one.
 */
export const upsertCohort = async (
  cohort: Partial<Cohort>,
  cohortId?: string
): Promise<{ id: string }> => {
  return upsertCohortDirect({
    cohortId,
    name: cohort.name,
    description: cohort.description,
    data: cohort.data,
  });
};

/**
 * Deletes a cohort from the server using GraphQL
 * @param cohortId ID of the cohort to delete
 */
export const deleteCohort = async (cohortId: string): Promise<boolean> => {
  try {
    const response = await deleteCohortDirect(cohortId);

    if (response) {
      const cohortsStore = useCohortsStore();
      cohortsStore.removeCohort(cohortId);
    }

    return response;
  } catch (error) {
    log.error('PERSONA', '[CohortsApi] Error deleting cohort:', error);
    throw error;
  }
};

export const createCohort = async (input: Partial<Cohort>): Promise<{ id: string }> => {
  return upsertCohortDirect({
    name: input.name,
    description: input.description,
    data: input.data,
  });
};

export const getCohortPersonas = async (cohortId: string): Promise<Persona[]> => {
  const response = await executeGraphQL<CohortsPersonasResponse>(
    GET_COHORT_PERSONAS,
    { cohortId },
    true
  );
  return response.cohort_personas?.cohort_personas || [];
};
