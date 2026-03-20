import {
  GET_REPORT_BY_ID,
  GET_WORKSPACE_REPORTS,
  type ReportsResponse,
} from 'backend/src/graphql/reports/queries/reports';

import { post } from 'frontend/src/api/apiClient';
import { executeGraphQL } from 'frontend/src/api/graphqlClient';
import { generateReport } from 'frontend/src/reports/reportsFunctionsApi';

import type { ReportGenerateRequest } from 'core/src/reports/reportResponses.types';
import type { Report } from 'core/src/reports/reports.types';

export const fetchWorkspaceReport = async (workspaceId: string, requireAuth: boolean = true) => {
  const result = await executeGraphQL<ReportsResponse>(
    GET_WORKSPACE_REPORTS,
    { workspaceId: workspaceId },
    requireAuth,
    0,
    undefined,
    undefined,
    requireAuth ? undefined : { encryptResponse: true }
  );

  return result.reports.reports;
};

/**
 * Fetches a single report by id for inline display. Returns null if not found.
 */
export const fetchReportById = async (
  reportId: string,
  requireAuth: boolean = true
): Promise<Report | null> => {
  const result = await executeGraphQL<ReportsResponse>(
    GET_REPORT_BY_ID,
    { reportId },
    requireAuth,
    0,
    undefined,
    undefined,
    requireAuth ? undefined : { encryptResponse: true }
  );

  const reports = result.reports.reports;
  return reports.length > 0 ? (reports[0] as Report) : null;
};

/**
 * Starts report generation: creates the report row and returns report_id immediately.
 * Report processing runs in the background; use fetchReportById to poll for completion.
 */
export const startReportGeneration = async (
  requestData: Omit<ReportGenerateRequest, 'report_id'>
): Promise<{ report_id: string }> => {
  const result = await post<Omit<ReportGenerateRequest, 'report_id'>, { report_id: string }>(
    '/report-start',
    requestData
  );
  return result;
};

/**
 * Starts a background persona feedback request and returns a streaming response
 */
export const fetchReportFeedback = async (
  requestData: ReportGenerateRequest
): Promise<Response> => {
  return await generateReport(requestData);
};
