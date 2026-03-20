/**
 * Request body for creating personas from a cohort prompt
 */
export type CreatePersonasRequest = {
  cohortId: string;
  cohortPrompt: string;
  count?: number;
  task_id?: string; // Optional task_id if task was already created by the regular function
};

/**
 * Response for persona creation
 */
export type CreatePersonasResponse = {
  success: boolean;
  created: number;
  requested: number;
  personas: Record<string, unknown>[];
  errors: string[];
  cohortConfig?: Record<string, unknown>;
  task_id?: string;
};
