/**
 * Report start handler. Accepts POST with ReportGenerateRequest (without report_id).
 * Creates the report row and task, returns report_id immediately, and runs report
 * processing in the background so the client can show an inline placeholder and poll.
 */

import { log } from 'core/src/helpers/logger';
import { processsReport, startReportGeneration } from 'core/src/reports/functions/processReport';

import type { Handler } from 'backend/src/types/server';
import type { ReportGenerateRequest } from 'core/src/reports/reportResponses.types';

const jsonResponse = (body: object, status: number): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const handler: Handler = async (request, _context) => {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  let body: ReportGenerateRequest;
  try {
    const raw = await request.json();
    body = raw as ReportGenerateRequest;
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const { workspace_id, prompt } = body;
  if (!workspace_id || !prompt) {
    return jsonResponse({ error: 'workspace_id and prompt are required' }, 400);
  }

  if (body.report_id) {
    return jsonResponse(
      { error: 'report_id must not be set; it is created by this endpoint' },
      400
    );
  }

  try {
    const { report_id } = await startReportGeneration(body);
    processsReport({ ...body, report_id }).catch(err => {
      log.error('REPORT', 'Background report processing failed', {
        report_id,
        error: err instanceof Error ? err.message : String(err),
      });
    });
    return jsonResponse({ report_id }, 200);
  } catch (err) {
    log.error('REPORT', 'Failed to start report', err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : 'Failed to start report' },
      500
    );
  }
};

export default handler;
