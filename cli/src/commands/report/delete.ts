import { getDatabaseClient } from 'core/src/database/client';
import { log, LogCategory } from 'core/src/helpers/logger';

import { isInteractive, selectFromList } from 'cli/src/commands/prompts';

export async function runReportDelete(reportId?: string): Promise<void> {
  const db = getDatabaseClient();
  let id = reportId;
  if (id == null || id === '') {
    if (!isInteractive()) {
      throw new Error('Report ID required. Use: mass report delete <report-id>');
    }
    const response = await db
      .from('reports')
      .select('id, workspace_id, status, report, created_at');
    if (response.error) {
      throw new Error(response.error.message);
    }
    const rows = (response.data ?? []) as {
      id: string;
      workspace_id?: string;
      status?: string;
      report?: { prompt?: string; type?: string; report?: { title?: string } };
      created_at?: string;
    }[];
    if (rows.length === 0) {
      log.info(LogCategory.MASS, 'No reports.');
      return;
    }
    const choices = rows.map(r => {
      const title = r.report?.report?.title ?? r.report?.prompt?.slice(0, 40) ?? r.id;
      return { value: r.id, name: `${String(title).slice(0, 50)} (${r.id})` };
    });
    id = await selectFromList(choices, 'Select report to delete');
  }
  const { error } = await db.from('reports').delete().eq('id', id);
  if (error) {
    throw new Error(`Failed to delete report: ${error.message}`);
  }
  log.info(LogCategory.MASS, 'Deleted report:', id);
}
