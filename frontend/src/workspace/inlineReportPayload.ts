import type {
  InlineReportMessagePayload,
  InlineReportStatus,
  InlineReportType,
} from 'core/src/workspace/conversation.types';

const INLINE_REPORT_TYPES: InlineReportType[] = ['feedback', 'debate', 'questionnaire'];
const INLINE_REPORT_STATUSES: InlineReportStatus[] = ['loading', 'completed', 'failed'];

/**
 * Parses message content and returns the payload if it is a valid inline report message.
 * Use this before multi-speaker chat parsing so report messages are not misread.
 */
export function parseInlineReportPayload(
  content: string | undefined
): InlineReportMessagePayload | null {
  const trimmed = (content ?? '').trim();
  if (!trimmed.startsWith('{')) {
    return null;
  }
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      (parsed as { type?: string }).type !== 'report'
    ) {
      return null;
    }
    const record = parsed as Record<string, unknown>;
    const reportId = record.reportId;
    const reportType = record.reportType;
    const status = record.status;
    if (
      typeof reportId !== 'string' ||
      !reportId ||
      !INLINE_REPORT_TYPES.includes(reportType as InlineReportType) ||
      !INLINE_REPORT_STATUSES.includes(status as InlineReportStatus)
    ) {
      return null;
    }
    const payload: InlineReportMessagePayload = {
      type: 'report',
      reportId,
      reportType: reportType as InlineReportType,
      status: status as InlineReportStatus,
    };
    if (typeof record.error === 'string') {
      payload.error = record.error;
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Serialises an inline report payload for storage in message.content.
 */
export function serialiseInlineReportPayload(payload: InlineReportMessagePayload): string {
  return JSON.stringify(payload);
}
