import { getDatabaseClient } from 'core/src/database/client';
import { log, LogCategory } from 'core/src/helpers/logger';

export type ReportListOptions = {
  workspaceId?: string;
};

export async function runReportList(options: ReportListOptions): Promise<void> {
  const db = getDatabaseClient();
  let query = db.from('reports').select('id, workspace_id, status, report, created_at');
  if (options.workspaceId) {
    query = query.eq('workspace_id', options.workspaceId);
  }
  const response = await query;
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
  for (const r of rows) {
    const title = r.report?.report?.title ?? r.report?.prompt?.slice(0, 40) ?? r.id;
    log.info(
      LogCategory.MASS,
      `${r.id}\t${r.workspace_id ?? ''}\t${r.status ?? ''}\t${String(title).slice(0, 50)}\t${r.created_at ?? ''}`
    );
  }
}
