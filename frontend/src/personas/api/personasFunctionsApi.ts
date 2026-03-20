import { post } from 'frontend/src/api/apiClient';

import type {
  CreatePersonasRequest,
  CreatePersonasResponse,
} from 'core/src/personas/functions/types';

/**
 * Creates personas from a cohort prompt
 */
export const createPersonas = async (
  cohortId: string,
  cohortPrompt: string,
  count: number
): Promise<CreatePersonasResponse> => {
  const requestData: CreatePersonasRequest = {
    cohortId,
    cohortPrompt,
    count,
  };

  return await post<CreatePersonasRequest & { module: 'create-personas' }, CreatePersonasResponse>(
    '/module-function',
    {
      module: 'create-personas',
      ...requestData,
    }
  );
};
