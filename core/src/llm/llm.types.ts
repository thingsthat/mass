import type { Message } from 'core/src/workspace/conversation.types';
import type { z } from 'zod';

/**
 * File input for multimodal requests
 */
export type FileInput = {
  data: string; // base64 encoded file data
  mimeType: string; // file mime type (image/jpeg, image/png, etc.)
  name?: string; // optional filename
  url?: string; // original URL if the attachment came from a URL
};

/**
 * Tool definition for function calling
 */
export type ToolDefinition = {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
};

/**
 * Tool call from the model
 */
export type ToolCall = {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
};

/**
 * Tool call result to send back to the model
 */
export type ToolCallResult = {
  tool_call_id: string;
  name: string;
  content: string; // Result content (can be JSON stringified)
};

/**
 * Response format for structured output
 * Accepts SchemaDefinition which includes Zod schema, name, and strict flag
 * Providers will convert the Zod schema to their specific format
 */
export type ResponseFormat = {
  zodSchema: z.ZodTypeAny;
  name: string;
  strict: boolean;
};

/**
 * Tool handler function type
 */
export type ToolHandler = (toolCall: ToolCall) => Promise<ToolCallResult> | ToolCallResult;

/**
 * Tools configuration for LLM requests
 */
export type ToolsConfig = {
  tools: ToolDefinition[];
  toolHandlers: Record<string, ToolHandler>; // Map of tool name to handler function
};

/**
 * Standard LLM request interface
 */
export type LLMRequest<_T = unknown> = {
  messages: Message[];
  systemMessage?: Message;
  model?: string;
  responseFormat?: ResponseFormat;
  files?: FileInput[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  stream?: boolean;
  reasoning?: boolean; // Enable reasoning / thinking for models that support it
  reasoningEffort?: 'low' | 'medium' | 'high'; // Perplexity: Control computational effort (low=fast, high=thorough)
  // Internet search parameters (for providers that support it)
  searchEnabled?: boolean;
  searchRecency?: 'hour' | 'day' | 'week' | 'month' | 'year';
  searchDomains?: string[];
  maxSearchResults?: number;
  returnCitations?: boolean;
  // Google Maps grounding parameters
  mapsEnabled?: boolean;
  userLocation?: {
    latitude: number;
    longitude: number;
  };
  // Tool calling support
  tools?: ToolsConfig;
  // Image generation config for Gemini 3 image models
  imageConfig?: {
    imageSize?: '1K' | '2K' | '4K';
    aspectRatio?: string;
    outputFormat?: string;
  };
  // Per-request safety setting overrides (e.g. HarmCategory + HarmBlockThreshold)
  safetySettings?: Array<{ category: string; threshold: string }>;
  /** When set, assistant history that is multi-speaker JSON is filtered to only this persona's prior replies. */
  contextPersonaId?: string;
};

/**
 * Standard LLM response interface
 */
export type LLMResponse<T = unknown> = {
  text: string;
  data?: T; // Parsed JSON data when T is specified and responseFormat is json_schema
  toolCalls?: ToolCall[]; // Tool calls made by the model
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  finishReason?: string;
  model?: string;
  // Citations for internet search results (Perplexity)
  citations?: Array<{
    url: string;
    title?: string;
    snippet?: string;
  }>;
  // Image data from multimodal responses (e.g., Gemini 3 image generation)
  images?: Array<{
    base64: string; // Base64 encoded image data
    mimeType?: string; // MIME type of the image
  }>;
};

/**
 * File generation request interface (images, videos, audio, etc.)
 */
export type FileGenerationRequest = {
  prompt: string;
  model?: string;
  // Generic parameters that can be used by any model
  [key: string]: any;
};

/**
 * File generation response interface
 */
export type FileGenerationResponse = {
  files: Array<{
    url?: string;
    base64?: string;
    data?: any; // For binary data or other formats
    mimeType?: string;
    filename?: string;
    revisedPrompt?: string;
  }>;
  model?: string;
};

/**
 * @deprecated Use FileGenerationRequest instead
 */
export type ImageGenerationRequest = FileGenerationRequest;

/**
 * Provider capabilities
 */
export type ProviderCapabilities = {
  supportsImages: boolean;
  supportsStructuredOutput: boolean;
  supportsStreaming: boolean;
  supportsFileGeneration: boolean; // Replaces supportsImageGeneration for generic file generation
  supportsImageGeneration: boolean; // Kept for backward compatibility
  supportsInternetSearch: boolean;
  supportsToolCalls: boolean; // Whether the provider supports tool/function calling
  maxTokens: number;
  supportedFileTypes: string[];
};

/**
 * Provider configuration
 */
export type ProviderConfig = {
  apiKey: string;
  baseUrl?: string;
  defaultModel: string;
  defaultImageModel?: string;
  capabilities: ProviderCapabilities;
  timeout?: number;
  maxRetries?: number;
};

/**
 * Provider function interface
 */
export type ProviderFunction = {
  generateContent: <T = unknown>(request: LLMRequest<T>) => Promise<LLMResponse<T>>;
  generateStream: (request: LLMRequest) => Promise<ReadableStream>;
  generateFile?: (request: FileGenerationRequest) => Promise<FileGenerationResponse>;
  getCapabilities: () => ProviderCapabilities;
};

/**
 * Validate request against provider capabilities
 */
export const validateRequest = <T = unknown>(
  request: LLMRequest<T>,
  capabilities: ProviderCapabilities,
  providerId: string
): void => {
  if (request.files && request.files.length > 0) {
    if (!capabilities.supportsImages) {
      throw new Error(`${providerId} provider does not support file uploads`);
    }

    // Check file types
    for (const file of request.files) {
      if (!capabilities.supportedFileTypes.includes(file.mimeType)) {
        throw new Error(`${providerId} provider does not support file type: ${file.mimeType}`);
      }
    }
  }

  if (request.responseFormat && !capabilities.supportsStructuredOutput) {
    throw new Error(`${providerId} provider does not support structured output`);
  }

  if (request.stream && !capabilities.supportsStreaming) {
    throw new Error(`${providerId} provider does not support streaming`);
  }
};

/**
 * Apply default configuration to request
 */
export const applyDefaults = <T = unknown>(
  request: LLMRequest<T>,
  config: ProviderConfig
): LLMRequest<T> => {
  return {
    model: config.defaultModel,
    temperature: 0.7,
    maxTokens: config.capabilities.maxTokens,
    ...request,
  };
};
