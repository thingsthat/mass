import { post } from 'frontend/src/api/apiClient';

import type { ReportGenerateRequest } from 'core/src/reports/reportResponses.types';

/**
 * Generates a report
 */
export const generateReport = async (requestData: ReportGenerateRequest): Promise<Response> => {
  return await post<ReportGenerateRequest & { module: 'generate-report' }, Response>(
    '/module-function',
    {
      module: 'generate-report',
      ...requestData,
    }
  );
};
