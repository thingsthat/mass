import { LLMRouter } from 'core/src/llm/router';
import { Persona } from 'core/src/personas/persona.types';
import { ReportGenerateResponse } from 'core/src/reports/reportResponses.types';

import { reportFeedbackResponseJsonSchema } from './schemaReportResponseChat';
import { generateSystemMessageForReportResponseChat } from './systemPromptsReportResponseChat';

import type { ProviderId } from 'core/src/llm/config';
import type { Report } from 'core/src/reports/reports.types';
import type { Message } from 'core/src/workspace/conversation.types';

const PROVIDER: ProviderId = 'google';
const MODEL = 'gemini-3-flash-preview';

/**
 * Request payload for report chat
 */
export type ReportResponseChatRequest = {
  messages: Message[];
  report: Report;
  files?: {
    data: string; // base64 encoded file data
    mimeType: string; // file mime type (image/jpeg, image/png, etc.)
    name?: string; // optional filename
  }[];
  persona: Persona;
  reportResponse: ReportGenerateResponse;
};

/**
 * Generate a streaming response for report chat
 */
export const generateReportResponseChatStream = async (
  request: ReportResponseChatRequest
): Promise<ReadableStream> => {
  const { messages, files } = request;

  // Generate system message for report chat
  const systemMessage = generateSystemMessageForReportResponseChat(request);

  // Get response format schema
  const responseFormat = reportFeedbackResponseJsonSchema;

  // Use the LLM router with Gemini provider
  const stream = await LLMRouter.generateStream(PROVIDER, {
    messages,
    systemMessage,
    responseFormat,
    model: MODEL,
    files,
    stream: true,
  });

  return stream;
};
