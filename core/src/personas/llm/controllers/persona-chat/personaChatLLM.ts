import { LLMRouter } from 'core/src/llm/router';
import { personaChatJsonSchema } from 'core/src/personas/llm/controllers/persona-chat/schemaPersonaChat';
import { generateSystemMessageForPersonaChat } from 'core/src/personas/llm/controllers/persona-chat/systemPromptsPersonaChat';

import type { ProviderId } from 'core/src/llm/config';
import type { Persona } from 'core/src/personas/persona.types';
import type { Conversation, Message } from 'core/src/workspace/conversation.types';

/**
 * LLM configuration
 */
const PROVIDER: ProviderId = 'google';
const MODEL = 'gemini-3-flash-preview';

/**
 * Request payload for persona chat
 */
export type PersonaChatRequest = {
  messages: Message[];
  persona: Persona;
  conversation?: Conversation | null;
  workspaceId?: string | null;
  files?: {
    data: string; // base64 encoded file data
    mimeType: string; // file mime type (image/jpeg, image/png, etc.)
    name?: string; // optional filename
  }[];
};

export const generatePersonaChatStream = async (
  request: PersonaChatRequest
): Promise<ReadableStream> => {
  const { messages, persona, files } = request;
  const systemMessage = generateSystemMessageForPersonaChat(messages, persona);

  // Get response format schema
  const responseFormat = {
    zodSchema: personaChatJsonSchema.zodSchema,
    name: personaChatJsonSchema.name,
    strict: personaChatJsonSchema.strict,
  };

  // Use the LLM router with Grok provider
  // Enable reasoning for reasoning-capable models
  const stream = await LLMRouter.generateStream(PROVIDER, {
    messages,
    systemMessage,
    responseFormat,
    files,
    model: MODEL,
    stream: true,
    reasoning: false,
    contextPersonaId: persona.id,
  });

  return stream;
};
