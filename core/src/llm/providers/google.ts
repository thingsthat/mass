import { GoogleGenAI, type Schema } from '@google/genai';
import { HarmBlockThreshold, HarmCategory } from '@google/genai';

import { log } from 'core/src/helpers/logger';
import { convertResponseFormatToGeminiSchema } from 'core/src/llm/helpers/schemaConvert';
import { validateRequest, applyDefaults } from 'core/src/llm/llm.types';

import type {
  LLMRequest,
  LLMResponse,
  ProviderConfig,
  ProviderFunction,
  FileGenerationRequest,
  FileGenerationResponse,
  ResponseFormat,
} from 'core/src/llm/llm.types';
import type { Message } from 'core/src/workspace/conversation.types';

/**
 * Google Gemini safety settings
 */
const GEMINI_SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
];

/**
 * Merge request safety overrides with defaults. Request wins when provided.
 */
const getSafetySettings = (request: LLMRequest): typeof GEMINI_SAFETY_SETTINGS => {
  if (request.safetySettings && request.safetySettings.length > 0) {
    return request.safetySettings as typeof GEMINI_SAFETY_SETTINGS;
  }
  return GEMINI_SAFETY_SETTINGS;
};

/**
 * Apply thinking/reasoning config when request.reasoning is true.
 * Gemini 2.5 uses thinkingBudget (tokens); Gemini 3 uses thinking_level.
 * Returns a partial config to merge; callers use Object.assign(config, getThinkingConfig(request)).
 */
const getThinkingConfig = (request: LLMRequest): Record<string, unknown> => {
  if (!request.reasoning) {
    return {};
  }
  const budget =
    request.reasoningEffort === 'high' ? 8192 : request.reasoningEffort === 'medium' ? 4096 : 2048;
  return { thinkingConfig: { thinkingBudget: budget } };
};

/**
 * Normalise assistant message content for history. If content is multi-speaker JSON,
 * convert to speaker-labelled plain text so the model does not see raw JSON and replicate it.
 * When contextPersonaId is set, only that persona's reply is included for assistant turns.
 */
const normaliseAssistantContentForHistory = (
  content: string,
  contextPersonaId?: string
): string => {
  const trimmed = (content ?? '').trim();
  if (!trimmed.startsWith('{')) {
    return trimmed;
  }
  try {
    const parsed = JSON.parse(trimmed) as {
      content?: Array<{ persona_id?: string; name?: string; content?: string }>;
    };
    const items = parsed?.content;
    if (!Array.isArray(items) || items.length === 0) {
      return trimmed;
    }
    const hasSpeakerShape = items.every(
      (item): item is { persona_id: string; name?: string; content: string } =>
        item != null &&
        typeof item === 'object' &&
        typeof (item as { persona_id?: string }).persona_id === 'string'
    );
    if (!hasSpeakerShape) {
      return trimmed;
    }
    const filtered = contextPersonaId
      ? items.filter(item => item.persona_id === contextPersonaId)
      : items;
    return filtered
      .map(item => {
        const name = item.name ?? 'Persona';
        const text = (item.content ?? '').trim();
        return text ? `${name}: ${text}` : '';
      })
      .filter(Boolean)
      .join('\n\n');
  } catch {
    return trimmed;
  }
};

/**
 * Process conversation history for Gemini format. Assistant messages that are
 * multi-speaker JSON are normalised to speaker-labelled plain text (or filtered
 * to contextPersonaId when set) so the model does not copy mixed-speaker structure.
 */
const processConversationHistory = (messages: Message[], contextPersonaId?: string): any[] => {
  const history: any[] = [];

  const firstUserIndex = messages.findIndex(m => m.role === 'user');

  if (firstUserIndex !== -1) {
    const cleanHistory = messages.slice(firstUserIndex);
    let lastRole = '';

    for (const message of cleanHistory) {
      const role = message.role === 'assistant' ? 'model' : 'user';
      const text =
        role === 'model'
          ? normaliseAssistantContentForHistory(message.content, contextPersonaId)
          : message.content;
      if (role !== lastRole) {
        history.push({
          role,
          parts: [{ text }],
        });
        lastRole = role;
      } else {
        const lastMessageInHistory = history[history.length - 1];
        if (lastMessageInHistory) {
          lastMessageInHistory.parts[0].text += `\n${text}`;
        }
      }
    }
  }

  return history;
};

export const getResponseSchema = (responseFormat: ResponseFormat): Schema => {
  // New format - convert Zod schema to Gemini format
  return convertResponseFormatToGeminiSchema(responseFormat) as Schema;
};

/**
 * Generate single-turn response (used for structured outputs)
 */
const generateSingleTurn = async <T = unknown>(
  client: GoogleGenAI,
  request: LLMRequest<T>
): Promise<LLMResponse<T>> => {
  const config: any = {
    safetySettings: getSafetySettings(request),
    temperature: request.temperature,
    topP: request.topP,
    topK: request.topK,
  };

  if (request.systemMessage) {
    config.systemInstruction = request.systemMessage.content;
  }

  Object.assign(config, getThinkingConfig(request));

  // Google Maps grounding doesn't support JSON response format
  // So we only set JSON format if Maps is NOT enabled
  if (request.responseFormat && !request.mapsEnabled) {
    config.responseMimeType = 'application/json';
    config.responseSchema = getResponseSchema(request.responseFormat);
  }

  // Add Google Search grounding if search is enabled
  if (request.searchEnabled) {
    config.tools = [
      {
        google_search: {},
      },
    ];
  }

  // Add Google Maps grounding if maps is enabled
  if (request.mapsEnabled) {
    config.tools = config.tools || [];
    config.tools.push({
      googleMaps: {}, // Note: camelCase as per documentation
    });

    // Add location context if provided
    if (request.userLocation) {
      config.toolConfig = {
        // Note: camelCase as per documentation
        retrievalConfig: {
          // Note: camelCase as per documentation
          latLng: {
            // Note: camelCase as per documentation
            latitude: request.userLocation.latitude,
            longitude: request.userLocation.longitude,
          },
        },
      };
    }
  }

  const contents: any[] = [];
  const userMessage = request.messages[0];
  contents.push({ text: userMessage.content });

  // Add files to contents array
  if (request.files && request.files.length > 0) {
    for (const file of request.files) {
      // Google API expects base64 inline data; skip URL-only files (would need fetch elsewhere)
      if (!('data' in file) || !file.data) {
        continue;
      }

      // For text files, decode from base64 and add as text part
      // This is required for Gemini 3 Pro and other models to properly handle text attachments
      const isTextFile =
        file.mimeType?.startsWith('text/') ||
        file.mimeType === 'application/json' ||
        file.mimeType === 'application/xml' ||
        file.mimeType === 'text/plain';

      if (isTextFile) {
        try {
          const decodedText = Buffer.from(file.data, 'base64').toString('utf-8');
          contents.push({ text: decodedText });
        } catch (error) {
          log.warn(
            'LLM',
            'Google Provider failed to decode text file, falling back to inlineData:',
            error
          );
          // Fallback to inlineData if decoding fails
          contents.push({
            inlineData: {
              mimeType: file.mimeType,
              data: file.data,
            },
          });
        }
      } else {
        // For non-text files (images, audio, video, PDFs), use inlineData
        contents.push({
          inlineData: {
            mimeType: file.mimeType,
            data: file.data,
          },
        });
      }
    }
  }

  if (!request.model) {
    throw new Error('Model is required for Google generation');
  }

  // Check if this is an image generation model (Gemini 3 image models)
  const isImageGenerationModel = request.model?.includes('image');

  // Add image generation config for Gemini 3 image models
  if (isImageGenerationModel) {
    config.responseModalities = ['TEXT', 'IMAGE'];
    // Use imageConfig from request if provided, otherwise use defaults
    const requestImageConfig = (request as any).imageConfig;
    config.imageConfig = {
      aspectRatio: requestImageConfig?.aspectRatio || '1:1',
      imageSize: requestImageConfig?.imageSize || '1K',
      ...(requestImageConfig?.outputFormat && { outputFormat: requestImageConfig.outputFormat }),
    };
  }

  const response = await client.models.generateContent({
    model: request.model,
    config,
    contents,
  });

  const images: Array<{ base64: string; mimeType?: string }> = [];
  const parts = response.candidates?.[0]?.content?.parts;
  if (parts) {
    for (const part of parts) {
      if (part.inlineData?.data) {
        images.push({
          base64: part.inlineData.data,
          mimeType: part.inlineData.mimeType,
        });
      }
    }
  }

  return {
    text: response.text,
    model: request.model,
    finishReason: 'stop',
    ...(images.length > 0 && { images }),
  };
};

/**
 * Generate conversation response
 */
const generateConversation = async <T = unknown>(
  client: GoogleGenAI,
  request: LLMRequest<T>
): Promise<LLMResponse<T>> => {
  const config: any = {
    safetySettings: getSafetySettings(request),
    temperature: request.temperature,
    topP: request.topP,
    topK: request.topK,
  };

  if (request.systemMessage) {
    config.systemInstruction = request.systemMessage.content;
  }

  Object.assign(config, getThinkingConfig(request));

  // Google Maps grounding doesn't support JSON response format
  // So we only set JSON format if Maps is NOT enabled
  if (request.responseFormat && !request.mapsEnabled) {
    config.responseMimeType = 'application/json';
    config.responseSchema = getResponseSchema(request.responseFormat);
  }

  // Add Google Search grounding if search is enabled
  if (request.searchEnabled) {
    config.tools = [
      {
        google_search: {},
      },
    ];
  }

  // Add Google Maps grounding if maps is enabled
  if (request.mapsEnabled) {
    config.tools = config.tools || [];
    config.tools.push({
      googleMaps: {}, // Note: camelCase as per documentation
    });

    // Add location context if provided
    if (request.userLocation) {
      config.toolConfig = {
        // Note: camelCase as per documentation
        retrievalConfig: {
          // Note: camelCase as per documentation
          latLng: {
            // Note: camelCase as per documentation
            latitude: request.userLocation.latitude,
            longitude: request.userLocation.longitude,
          },
        },
      };
    }
  }

  // Process conversation history
  const history = processConversationHistory(
    request.messages.slice(0, -1),
    request.contextPersonaId
  );

  if (!request.model) {
    throw new Error('Model is required for Google conversation');
  }

  const chat = client.chats.create({
    model: request.model,
    config,
    history,
  });

  const lastMessage = request.messages[request.messages.length - 1];
  const messageParts: any[] = [{ text: lastMessage.content }];

  // Add files to the last message if present
  // Check both request.files and message.files (for embedded attachments)
  const filesToAdd = request.files || lastMessage.files || [];
  if (filesToAdd.length > 0) {
    for (const file of filesToAdd) {
      // Google API expects base64 inline data; skip URL-only files (would need fetch elsewhere)
      if (!('data' in file) || !file.data) {
        continue;
      }

      // For text files, decode from base64 and add as text part
      // This is required for Gemini 3 Pro and other models to properly handle text attachments
      const isTextFile =
        file.mimeType?.startsWith('text/') ||
        file.mimeType === 'application/json' ||
        file.mimeType === 'application/xml' ||
        file.mimeType === 'text/plain';

      if (isTextFile) {
        try {
          const decodedText = Buffer.from(file.data, 'base64').toString('utf-8');
          messageParts.push({ text: decodedText });
        } catch (error) {
          log.warn(
            'LLM',
            'Google Provider failed to decode text file, falling back to inlineData:',
            error
          );
          // Fallback to inlineData if decoding fails
          messageParts.push({
            inlineData: {
              data: file.data,
              mimeType: file.mimeType,
            },
          });
        }
      } else {
        // For non-text files (images, audio, video, PDFs), use inlineData
        messageParts.push({
          inlineData: {
            data: file.data,
            mimeType: file.mimeType,
          },
        });
      }
    }
  }

  const result = await chat.sendMessage({ message: messageParts });

  const images: Array<{ base64: string; mimeType?: string }> = [];
  const parts = result.candidates?.[0]?.content?.parts;
  if (parts) {
    for (const part of parts) {
      if (part.inlineData?.data) {
        images.push({
          base64: part.inlineData.data,
          mimeType: part.inlineData.mimeType,
        });
      }
    }
  }

  return {
    text: result.text,
    model: request.model,
    finishReason: 'stop',
    ...(images.length > 0 && { images }),
  };
};

/**
 * Generate conversation streaming response
 */
const generateConversationStream = async (
  client: GoogleGenAI,
  request: LLMRequest
): Promise<ReadableStream> => {
  const config: any = {
    safetySettings: getSafetySettings(request),
    temperature: request.temperature,
    topP: request.topP,
    topK: request.topK,
  };

  if (request.systemMessage) {
    config.systemInstruction = request.systemMessage.content;
  }

  Object.assign(config, getThinkingConfig(request));

  // Add structured output if needed
  if (request.responseFormat) {
    config.responseMimeType = 'application/json';
    config.responseSchema = getResponseSchema(request.responseFormat);
  }

  // Process conversation history
  const history = processConversationHistory(
    request.messages.slice(0, -1),
    request.contextPersonaId
  );

  if (!request.model) {
    throw new Error('Model is required for Google streaming');
  }

  const chat = client.chats.create({
    model: request.model,
    config,
    history,
  });

  const lastMessage = request.messages[request.messages.length - 1];
  const messageParts: any[] = [{ text: lastMessage.content }];

  // Add files to the last message if present
  // Check both request.files and message.files (for embedded attachments)
  const filesToAdd = request.files || lastMessage.files || [];
  if (filesToAdd.length > 0) {
    for (const file of filesToAdd) {
      // Google API expects base64 inline data; skip URL-only files (would need fetch elsewhere)
      if (!('data' in file) || !file.data) {
        continue;
      }

      // For text files, decode from base64 and add as text part
      // This is required for Gemini 3 Pro and other models to properly handle text attachments
      const isTextFile =
        file.mimeType?.startsWith('text/') ||
        file.mimeType === 'application/json' ||
        file.mimeType === 'application/xml' ||
        file.mimeType === 'text/plain';

      if (isTextFile) {
        try {
          const decodedText = Buffer.from(file.data, 'base64').toString('utf-8');
          messageParts.push({ text: decodedText });
        } catch (error) {
          log.warn(
            'LLM',
            'Google Provider failed to decode text file, falling back to inlineData:',
            error
          );
          // Fallback to inlineData if decoding fails
          messageParts.push({
            inlineData: {
              data: file.data,
              mimeType: file.mimeType,
            },
          });
        }
      } else {
        // For non-text files (images, audio, video, PDFs), use inlineData
        messageParts.push({
          inlineData: {
            data: file.data,
            mimeType: file.mimeType,
          },
        });
      }
    }
  }

  const streamResult = await chat.sendMessageStream({ message: messageParts });

  // Convert Gemini stream to standard ReadableStream
  return new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      try {
        for await (const chunk of streamResult) {
          // Handle text content
          if (chunk.text) {
            const streamChunk = {
              id: 'chatcmpl-google',
              object: 'chat.completion.chunk',
              created: Date.now(),
              model: request.model,
              choices: [
                {
                  index: 0,
                  delta: { content: chunk.text },
                  finish_reason: null,
                },
              ],
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(streamChunk)}\n\n`));
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        log.error('LLM', 'Google Stream error:', error);
        controller.error(error);
      }
    },
  });
};

/**
 * Generate file using Google (images)
 */
const generateFile = async (
  client: GoogleGenAI,
  config: ProviderConfig,
  request: FileGenerationRequest
): Promise<FileGenerationResponse> => {
  const model = request.model || config.defaultImageModel;

  if (!model) {
    throw new Error('Image model is required for Google file generation');
  }

  try {
    const response = await client.models.generateContent({
      model,
      config: {
        safetySettings: GEMINI_SAFETY_SETTINGS,
      },
      contents: [{ text: request.prompt }],
    });

    //writeJsonFile('google_response.json', response);

    // Extract image data from Google response
    const imageParts = response.candidates?.[0]?.content?.parts;
    if (!imageParts || imageParts.length === 0) {
      throw new Error('No file generated in response');
    }

    // Find the image part - it could be in inlineData
    const imagePart = imageParts.find(part => part.inlineData?.data);
    if (!imagePart || !imagePart.inlineData?.data) {
      throw new Error('No file data found in response');
    }

    // Extract any text description from the response
    const textPart = imageParts.find(part => part.text);
    const revisedPrompt = textPart?.text || request.prompt;

    return {
      files: [
        {
          base64: imagePart.inlineData.data,
          mimeType: imagePart.inlineData.mimeType || 'image/png',
          revisedPrompt: revisedPrompt,
        },
      ],
      model,
    };
  } catch (error) {
    log.error('LLM', 'Google file generation error:', error);
    throw new Error(
      `Google file generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

/**
 * Create Google provider function
 */
export const createGoogleProvider = (config: ProviderConfig): ProviderFunction => {
  const client = new GoogleGenAI({ apiKey: config.apiKey });

  return {
    generateContent: async <T = unknown>(request: LLMRequest<T>): Promise<LLMResponse<T>> => {
      validateRequest(request, config.capabilities, 'google');
      const processedRequest = applyDefaults(request, config);

      try {
        // For single-turn requests (like cohort config, persona creation)
        if (processedRequest.messages.length === 1 && processedRequest.systemMessage) {
          return await generateSingleTurn<T>(client, processedRequest);
        }

        // For multi-turn conversations
        return await generateConversation<T>(client, processedRequest);
      } catch (error) {
        log.error('LLM', 'Google generation error:', error);
        throw new Error(
          `Google generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    },

    generateStream: async (request: LLMRequest): Promise<ReadableStream> => {
      validateRequest(request, config.capabilities, 'google');
      const processedRequest = applyDefaults(request, config);

      try {
        return await generateConversationStream(client, processedRequest);
      } catch (error) {
        log.error('LLM', 'Google streaming error:', error);
        throw new Error(
          `Google streaming failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    },

    generateFile: async (request: FileGenerationRequest): Promise<FileGenerationResponse> => {
      if (!config.capabilities.supportsFileGeneration) {
        throw new Error('Google provider does not support file generation');
      }

      try {
        return await generateFile(client, config, request);
      } catch (error) {
        log.error('LLM', 'Google file generation error:', error);
        throw error;
      }
    },

    getCapabilities: () => config.capabilities,
  };
};
