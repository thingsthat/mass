import { log } from 'core/src/helpers/logger';

import type { SpeakerReply } from 'core/src/workspace/conversation.types';

export type StructuredPayload = {
  content: string | SpeakerReply[];
  followup?: string[];
};

/**
 * Process one SSE event payload (possibly from multiple "data:" lines concatenated).
 */
const processEventPayload = async (
  dataContent: string,
  onChunk: (text: string, messageData?: any) => Promise<void>
): Promise<StructuredPayload | undefined> => {
  if (!dataContent || dataContent === '[DONE]') {
    return undefined;
  }
  try {
    const parsedData = JSON.parse(dataContent);
    if (parsedData && typeof parsedData.content !== 'undefined') {
      const isMultiSpeaker =
        Array.isArray(parsedData.content) &&
        parsedData.content.length > 0 &&
        typeof parsedData.content[0] === 'object' &&
        parsedData.content[0] !== null &&
        'persona_id' in (parsedData.content[0] as object);
      const contentForPayload = isMultiSpeaker
        ? (parsedData.content as SpeakerReply[])
        : Array.isArray(parsedData.content)
          ? (parsedData.content as string[]).join('\n\n')
          : typeof parsedData.content === 'string'
            ? parsedData.content
            : '';
      const payload: StructuredPayload = {
        content: contentForPayload,
        followup: Array.isArray(parsedData.followup) ? parsedData.followup : undefined,
      };
      await onChunk(JSON.stringify(parsedData), parsedData);
      return payload;
    }
    if (Array.isArray(parsedData.choices)) {
      for (const choice of parsedData.choices) {
        if (choice.delta && typeof choice.delta.content === 'string') {
          await onChunk(choice.delta.content);
        } else if (typeof choice.content === 'string') {
          try {
            const messageData = JSON.parse(choice.content);
            if (messageData && typeof messageData === 'object') {
              const content = messageData.content;
              const contentForChunk = Array.isArray(content)
                ? content.join('\n\n')
                : (content ?? '');
              await onChunk(contentForChunk, messageData);
            } else {
              await onChunk(choice.content);
            }
          } catch {
            await onChunk(choice.content);
          }
        }
      }
    }
  } catch (error) {
    log.error('API', 'Failed to parse JSON content:', dataContent, error);
  }
};

/**
 * Extract the combined data payload from one SSE event (one or more "data:" lines).
 * SSE events are separated by blank lines; multiple data lines are concatenated with \n.
 */
const extractDataFromEventBlock = (block: string): string | null => {
  const lines = block.split('\n');
  const dataParts: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('data:')) {
      const value = trimmed.slice(5).trim();
      dataParts.push(value);
    }
  }
  if (dataParts.length === 0) {
    return null;
  }
  return dataParts.join('\n');
};

type ProcessBufferResult = { incomplete: string; lastPayload: StructuredPayload | undefined };

/**
 * Process the buffer using SSE event boundaries (blank-line-delimited).
 * Complete events are processed; the trailing incomplete fragment is returned.
 */
const processBuffer = async (
  buffer: string,
  onChunk: (text: string, messageData?: any) => Promise<void>
): Promise<ProcessBufferResult> => {
  const eventBlocks = buffer.split(/\n\n/);
  const incomplete = !buffer.endsWith('\n\n') ? (eventBlocks.pop() ?? '') : '';

  let lastPayload: StructuredPayload | undefined;

  for (const block of eventBlocks) {
    const dataContent = extractDataFromEventBlock(block);
    if (dataContent !== null) {
      const updated = await processEventPayload(dataContent, onChunk);
      if (updated !== undefined) {
        lastPayload = updated;
      }
    }
  }

  const trimmed = incomplete.trim();
  if (
    trimmed.startsWith('data:') &&
    !trimmed.includes('\n\n') &&
    (trimmed === 'data: [DONE]' || trimmed.length > 10)
  ) {
    const dataContent = trimmed.startsWith('data:') ? trimmed.slice(5).trim() : trimmed;
    if (dataContent && dataContent !== '[DONE]') {
      try {
        JSON.parse(dataContent);
        const updated = await processEventPayload(dataContent, onChunk);
        if (updated !== undefined) {
          lastPayload = updated;
        }
        return { incomplete: '', lastPayload };
      } catch {
        // Keep as incomplete
      }
    }
  }

  return { incomplete, lastPayload };
};

/**
 * Handles server-sent events (SSE) from a streaming endpoint.
 * Returns the last structured payload (content + followup) when the stream sends that format.
 */
export const handleSSEResponse = async (
  response: Response,
  onChunk: (text: string, messageData?: any) => Promise<void>
): Promise<StructuredPayload | null> => {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Reader not available');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let lastStructuredPayload: StructuredPayload | null = null;

  // Stream processing loop: always append and process current read, then check done
  while (true) {
    const { done, value } = await reader.read();

    if (value) {
      buffer += decoder.decode(value, { stream: true });
    }
    const result = await processBuffer(buffer, onChunk);
    buffer = result.incomplete;
    if (result.lastPayload !== undefined) {
      lastStructuredPayload = result.lastPayload;
    }

    if (done) {
      break;
    }
  }

  return lastStructuredPayload;
};
