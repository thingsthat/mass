import { postStream } from 'frontend/src/api/apiClient';
import { handleSSEResponse, type StructuredPayload } from 'frontend/src/api/sseHandler';

import type { MessageFile, Question } from 'core/src/workspace/conversation.types';

export type WorkflowAskRequest = {
  prompt: string;
  workspace_id: string;
  /** Optional: override workspace membership and ask only this persona. */
  persona_id?: string;
  /** Optional: override workspace membership and ask only these personas/cohorts. */
  persona_ids?: string[];
  cohort_ids?: string[];
  userMessageId: string;
  answerMessageId: string;
  userContext?: Record<string, unknown>;
  files?: MessageFile[];
  provider?: string;
  model?: string;
};

/**
 * Sends a question to the workflow API and processes the response.
 * Returns the final structured payload (content + followup) when the stream sends that format.
 */
export const fetchPromptAsk = async (
  userMessageId: string,
  answerMessageId: string,
  question: Question,
  workspaceId: string,
  onChunk: (text: string, messageData?: any) => Promise<void>
): Promise<StructuredPayload | null> => {
  const endpoint = '/prompt-ask';
  const body: WorkflowAskRequest = {
    userMessageId,
    answerMessageId,
    prompt: question.question,
    userContext: {},
    workspace_id: workspaceId,
    files: question.files,
    provider: question.provider,
    model: question.model,
  };
  if (question.personaId) {
    body.persona_id = question.personaId;
  }
  if (question.persona_ids?.length) {
    body.persona_ids = question.persona_ids;
  }
  if (question.cohort_ids?.length) {
    body.cohort_ids = question.cohort_ids;
  }
  const response = await postStream<WorkflowAskRequest>(endpoint, body);

  return handleSSEResponse(response, onChunk);
};
