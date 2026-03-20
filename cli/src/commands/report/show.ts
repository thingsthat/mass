import fs from 'node:fs';
import path from 'node:path';

import { getDatabaseClient } from 'core/src/database/client';
import { log, LogCategory } from 'core/src/helpers/logger';
import { writeReportHtml } from 'core/src/reports/report-html';

import { isInteractive, selectFromList } from 'cli/src/commands/prompts';

import type { ReportData, ReportResult } from 'core/src/reports/reports.types';

export type ReportShowOptions = {
  reportId?: string;
  outPath?: string;
};

export async function runReportShow(options: ReportShowOptions): Promise<void> {
  const db = getDatabaseClient();
  let reportId = options.reportId;
  if (reportId == null || reportId === '') {
    if (!isInteractive()) {
      throw new Error('Report ID required. Use: mass report show <report-id>');
    }
    const response = await db
      .from('reports')
      .select('id, workspace_id, status, report, created_at');
    if (response.error) {
      throw new Error(response.error.message);
    }
    const rows = (response.data ?? []) as {
      id: string;
      report?: { prompt?: string; report?: { title?: string } };
    }[];
    if (rows.length === 0) {
      log.info(LogCategory.MASS, 'No reports.');
      return;
    }
    const choices = rows.map(r => {
      const title = r.report?.report?.title ?? r.report?.prompt?.slice(0, 40) ?? r.id;
      return { value: r.id, name: `${String(title).slice(0, 50)} (${r.id})` };
    });
    reportId = await selectFromList(choices, 'Select report to show');
  }
  const { data: row, error } = await db.from('reports').select('*').eq('id', reportId).single();
  if (error || !row) {
    throw new Error(error?.message ?? `Report not found: ${reportId}`);
  }
  const reportData = (row as { report: ReportData }).report;
  const result = reportData.report as ReportResult;
  log.info(LogCategory.MASS, 'Title:', result.title ?? '');
  log.info(
    LogCategory.MASS,
    'Summary:',
    (result.summary ?? '').slice(0, 300) + ((result.summary ?? '').length > 300 ? '...' : '')
  );
  if (options.outPath) {
    const html = writeReportHtml(reportData, result);
    const dir = path.dirname(options.outPath);
    if (dir && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(options.outPath, html, 'utf-8');
    log.info(LogCategory.MASS, 'HTML written to', options.outPath);
    const jsonPath = path.join(
      path.dirname(options.outPath),
      path.basename(options.outPath, path.extname(options.outPath)) + '.json'
    );
    fs.writeFileSync(jsonPath, JSON.stringify({ id: row.id, ...reportData }, null, 2), 'utf-8');
    log.info(LogCategory.MASS, 'JSON written to', jsonPath);
  }
}
