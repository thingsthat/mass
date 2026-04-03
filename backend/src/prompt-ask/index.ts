/**
 * Prompt ask handler. Accepts POST with workflow ask payload. Resolves workspace
 * persona/cohort membership, generates one reply per target persona, and
 * returns structured multi-speaker content { content: SpeakerReply[], followup }.
 */

import { getDatabaseClient } from 'core/src/database/client';
import { log } from 'core/src/helpers/logger';
import { getPersonasByIds } from 'core/src/personas/controllers/personas';
import {
  extractPartialContentFromStreamingJson,
  parsePersonaResponse,
  sanitiseSinglePersonaContent,
} from 'core/src/personas/llm/controllers/persona-chat/parsePersonaResponse';
import { generatePersonaChatStream } from 'core/src/personas/llm/controllers/persona-chat/personaChatLLM';
import { getWorkspaceById } from 'core/src/workspace/controllers/workspaces';
import { expandPersonaIds } from 'core/src/workspace/expandPersonaIds';

import type { Handler, ServerContext } from 'backend/src/types/server';
import type { Message, SpeakerReply } from 'core/src/workspace/conversation.types';

type PromptAskRequestBody = {
  prompt: string;
  workspace_id: string;
  /** If provided, overrides workspace conversation and uses only this persona (single-speaker). */
  persona_id?: string;
  /** If provided (with or without cohort_ids), overrides workspace and uses only these personas. Intersected with workspace membership. */
  persona_ids?: string[];
  /** If provided (with or without persona_ids), overrides workspace and uses only these cohorts. Intersected with workspace membership. */
  cohort_ids?: string[];
  userMessageId: string;
  answerMessageId: string;
  userContext?: Record<string, unknown>;
  files?: Array<{ url?: string; data?: string; mimeType: string; name?: string }>;
  provider?: string;
  model?: string;
};

const jsonResponse = (body: object, status: number): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const handler: Handler = async (request, _serverContext: ServerContext) => {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  let body: PromptAskRequestBody;
  try {
    const raw = await request.json();
    if (
      !raw ||
      typeof raw.prompt !== 'string' ||
      typeof raw.workspace_id !== 'string' ||
      typeof raw.userMessageId !== 'string' ||
      typeof raw.answerMessageId !== 'string' ||
      !raw.prompt.trim() ||
      !raw.workspace_id.trim() ||
      !raw.userMessageId.trim() ||
      !raw.answerMessageId.trim()
    ) {
      return jsonResponse(
        {
          error: 'Missing required fields: prompt, workspace_id, userMessageId, answerMessageId',
        },
        400
      );
    }
    body = raw as PromptAskRequestBody;
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const db = getDatabaseClient();

  let workspace: Awaited<ReturnType<typeof getWorkspaceById>>;
  try {
    workspace = await getWorkspaceById(db, body.workspace_id);
  } catch (err) {
    log.error('PROMPT_ASK', 'Failed to load workspace:', err);
    return jsonResponse({ error: 'Workspace not found' }, 404);
  }

  if (!workspace?.conversation) {
    return jsonResponse({ error: 'Workspace not found' }, 404);
  }

  const workspacePersonaIds = workspace.conversation.persona_ids ?? [];
  const workspaceCohortIds = workspace.conversation.cohort_ids ?? [];

  let targetPersonaIds: string[];
  if (body.persona_id) {
    targetPersonaIds = [body.persona_id];
  } else if ((body.persona_ids?.length ?? 0) > 0 || (body.cohort_ids?.length ?? 0) > 0) {
    const requestedPersonaIds = (body.persona_ids ?? []).filter(id =>
      workspacePersonaIds.includes(id)
    );
    const requestedCohortIds = (body.cohort_ids ?? []).filter(id =>
      workspaceCohortIds.includes(id)
    );
    const { allPersonaIds } = await expandPersonaIds(db, requestedPersonaIds, requestedCohortIds);
    targetPersonaIds = Array.from(new Set(allPersonaIds));
  } else {
    const { allPersonaIds } = await expandPersonaIds(db, workspacePersonaIds, workspaceCohortIds);
    targetPersonaIds = Array.from(new Set(allPersonaIds));
  }

  if (targetPersonaIds.length === 0) {
    return jsonResponse(
      {
        error:
          'No personas or cohorts attached to this workspace. Add personas or cohorts to the workspace first.',
      },
      400
    );
  }

  const personas = await getPersonasByIds(db, targetPersonaIds);
  if (personas.length === 0) {
    return jsonResponse({ error: 'No valid personas found for the given targets' }, 404);
  }

  const existingMessages: Message[] = Array.isArray(workspace.conversation.messages)
    ? workspace.conversation.messages.map((msg: Message) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        files: msg.files,
      }))
    : [];

  const userMessage: Message = {
    id: body.userMessageId,
    role: 'user',
    content: body.prompt,
    provider: body.provider,
    model: body.model,
  };
  const filesWithData = (body.files ?? []).filter(
    (f): f is { data: string; mimeType: string; name?: string } => !!f.data
  );
  if (filesWithData.length) {
    userMessage.files = filesWithData.map(f => ({
      data: f.data,
      mimeType: f.mimeType,
      name: f.name,
    }));
  }
  const messages: Message[] = [...existingMessages, userMessage];

  const outStream = new ReadableStream({
    start(controller) {
      (async () => {
        try {
          const encoder = new TextEncoder();
          let mergedFollowup: string[] | undefined;
          const liveContentArray: string[] = personas.map(() => '');

          const sendPayload = (followup: string[] | undefined = mergedFollowup) => {
            const content: SpeakerReply[] = personas.map((p, i) => ({
              persona_id: p.id,
              name: p.details?.name ?? p.id,
              content: liveContentArray[i] ?? '',
            }));
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content, followup: followup ?? [] })}\n\n`)
            );
          };

          sendPayload([]);

          for (let personaIndex = 0; personaIndex < personas.length; personaIndex++) {
            const persona = personas[personaIndex];
            const upstreamStream = await generatePersonaChatStream({
              messages,
              persona,
              files: filesWithData.length ? filesWithData : undefined,
            });
            const reader = upstreamStream.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let rawBuffer = '';

            while (true) {
              const { done, value } = await reader.read();
              if (value) {
                buffer += decoder.decode(value, { stream: true });
              }
              const lines = buffer.split('\n');
              buffer = buffer.endsWith('\n') ? '' : (lines.pop() ?? '');
              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed.startsWith('data:')) {
                  continue;
                }
                const dataContent = trimmed.slice(5).trim();
                if (!dataContent || dataContent === '[DONE]') {
                  continue;
                }
                try {
                  const parsed = JSON.parse(dataContent);
                  const choice = parsed?.choices?.[0];
                  if (choice?.delta?.content != null && typeof choice.delta.content === 'string') {
                    rawBuffer += choice.delta.content;
                    const rawPartial = extractPartialContentFromStreamingJson(rawBuffer);
                    const { content: partial } = sanitiseSinglePersonaContent(
                      rawPartial,
                      persona.details?.name ?? ''
                    );
                    if (partial !== liveContentArray[personaIndex]) {
                      liveContentArray[personaIndex] = partial;
                      sendPayload();
                    }
                  }
                } catch {
                  // ignore malformed lines
                }
              }
              if (done) {
                break;
              }
            }
            if (buffer) {
              const trimmed = buffer.trim();
              if (trimmed.startsWith('data:')) {
                const dataContent = trimmed.slice(5).trim();
                if (dataContent && dataContent !== '[DONE]') {
                  try {
                    const parsed = JSON.parse(dataContent);
                    const choice = parsed?.choices?.[0];
                    if (
                      choice?.delta?.content != null &&
                      typeof choice.delta.content === 'string'
                    ) {
                      rawBuffer += choice.delta.content;
                    }
                  } catch {
                    // ignore
                  }
                }
              }
            }

            const parsed = parsePersonaResponse(rawBuffer);
            const content = parsed?.content ?? (rawBuffer.trim() || '');
            const rawText = Array.isArray(content) ? content.join('\n\n') : String(content);
            const { content: text, hadOtherSpeakers } = sanitiseSinglePersonaContent(
              rawText,
              persona.details?.name ?? ''
            );
            if (hadOtherSpeakers) {
              log.warn('PROMPT_ASK', 'Stripped other-speaker content from persona response', {
                personaId: persona.id,
                personaName: persona.details?.name,
              });
            }
            liveContentArray[personaIndex] = text;
            if (parsed?.followup?.length) {
              mergedFollowup = parsed.followup;
            }
            sendPayload();
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          log.error('PROMPT_ASK', 'Persona chat stream error:', err);
          controller.error(err);
        }
      })();
    },
  });

  return new Response(outStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
};

export default handler;
