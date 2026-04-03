import fs from 'node:fs';
import path from 'node:path';

import { getDatabaseClient } from 'core/src/database/client';
import { log, LogCategory } from 'core/src/helpers/logger';
import { runReportForCli } from 'core/src/reports/functions/processReport';
import { writeReportHtml } from 'core/src/reports/report-html';
import { getInvokeCwd } from 'core/src/storage/paths';

import { input, isInteractive, selectFromList } from 'cli/src/commands/prompts';

import type { ReportGenerateRequest } from 'core/src/reports/reportResponses.types';
import type { ReportResult } from 'core/src/reports/reports.types';

const REPORT_TYPES = [
  { value: 'feedback', name: 'feedback' },
  { value: 'debate', name: 'debate' },
  { value: 'questionnaire', name: 'questionnaire' },
  { value: 'ideas', name: 'ideas' },
] as const;

type ReportOptions = {
  prompt?: string;
  cohortId?: string;
  personaIds?: string[];
  reportType?: 'feedback' | 'debate' | 'questionnaire' | 'ideas';
  outPath?: string;
  workspaceId?: string;
  /** File path to ask opinion on (resolved from cwd). */
  filePath?: string;
  /** For debate reports: max persona speaking turns. Omitted = default (20). */
  debateRounds?: number;
  /** For debate reports: stop after N minutes; 0 = no time limit. Omitted = default (2). */
  debateDurationMinutes?: number;
};

export async function runReport(options: ReportOptions): Promise<void> {
  const db = getDatabaseClient();
  let {
    prompt,
    cohortId,
    personaIds = [],
    reportType,
    outPath,
    workspaceId: existingWorkspaceId,
    filePath,
    debateRounds,
    debateDurationMinutes,
  } = options;

  if (isInteractive()) {
    if (prompt == null || prompt === '') {
      prompt = await input('Report prompt (what to ask the cohort)?', 'What do you think?');
    }
    if ((!cohortId || cohortId === '') && (!personaIds || personaIds.length === 0)) {
      const response = await db.from('cohorts').select('id, name, description');
      if (response.error) {
        throw new Error(response.error.message);
      }
      const rows = (response.data ?? []) as { id: string; name?: string }[];
      if (rows.length > 0) {
        const choices = rows.map(r => ({ value: r.id, name: `${r.name ?? r.id} (${r.id})` }));
        cohortId = await selectFromList(choices, 'Select cohort');
      }
    }
    if (reportType == null) {
      reportType = (await selectFromList(
        REPORT_TYPES as unknown as { value: string; name: string }[],
        'Report type?'
      )) as 'feedback' | 'debate' | 'questionnaire' | 'ideas';
    }
    if (outPath == null) {
      const pathInput = await input('Write HTML to path? (leave blank to skip)', '');
      outPath = pathInput.trim() || undefined;
    }
  }

  prompt = prompt?.trim() || 'What do you think?';
  reportType = reportType ?? 'feedback';
  if ((!cohortId || cohortId === '') && (!personaIds || personaIds.length === 0)) {
    throw new Error(
      'Provide --cohort <id> or --personas <ids> (or use interactive mode to select cohort).'
    );
  }

  let workspaceId = existingWorkspaceId;
  if (!workspaceId) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const { error } = await db
      .from('workspaces')
      .insert({
        id,
        name: 'CLI report',
        description: prompt.slice(0, 100),
        conversation: {
          messages: [
            { id: crypto.randomUUID(), role: 'user', content: prompt, timestamp: now },
            {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: JSON.stringify({ content: [{ type: 'report' }] }),
              timestamp: now,
            },
          ],
        },
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single();
    if (error) {
      throw new Error(`Failed to create workspace: ${error.message}`);
    }
    workspaceId = id;
  }

  const reportRequest: ReportGenerateRequest = {
    prompt,
    workspace_id: workspaceId,
    persona_ids: personaIds,
    cohort_ids: cohortId ? [cohortId] : undefined,
    report_type: reportType,
    file_paths: filePath ? [filePath] : undefined,
    debate_options:
      reportType === 'debate' &&
      (Number.isFinite(debateRounds) || Number.isFinite(debateDurationMinutes))
        ? {
            max_rounds: Number.isFinite(debateRounds) ? debateRounds : undefined,
            duration_minutes: Number.isFinite(debateDurationMinutes)
              ? debateDurationMinutes
              : undefined,
          }
        : undefined,
  };

  log.info(
    LogCategory.MASS,
    `Generating ${reportType} report${cohortId ? ' for cohort' : ''} (this may take several minutes)...`
  );
  const { reportId, reportData } = await runReportForCli(reportRequest);
  log.info(LogCategory.MASS, 'Report generated.');
  const result = reportData.report as ReportResult;

  if (outPath) {
    const html = writeReportHtml(reportData, result);
    const dir = path.dirname(outPath);
    if (dir && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outPath, html, 'utf-8');
    log.info(LogCategory.MASS, 'Report written to', outPath);
  }

  const jsonPath = outPath
    ? path.join(path.dirname(outPath), path.basename(outPath, path.extname(outPath)) + '.json')
    : path.join(getInvokeCwd(), `report-${reportId}.json`);
  const jsonDir = path.dirname(jsonPath);
  if (jsonDir && !fs.existsSync(jsonDir)) {
    fs.mkdirSync(jsonDir, { recursive: true });
  }
  fs.writeFileSync(jsonPath, JSON.stringify({ id: reportId, ...reportData }, null, 2), 'utf-8');
  log.info(LogCategory.MASS, 'Report JSON written to', jsonPath);
  log.info(LogCategory.MASS, 'Title:', result.title);
  log.info(
    LogCategory.MASS,
    'Summary:',
    result.summary.slice(0, 200) + (result.summary.length > 200 ? '...' : '')
  );
}
