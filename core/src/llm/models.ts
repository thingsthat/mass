import { googleProviders } from 'core/src/llm/models/google/modelProviderGoogle';
import { googleModels } from 'core/src/llm/models/google/modelsGoogle';

import type { ProviderCapabilities } from 'core/src/llm/llm.types';
import type { Model, ModelMap, Provider, ProvidersMap } from 'core/src/llm/provider.types';

export const models: ModelMap = {
  ...googleModels,
};

/**
 * LLM Provider IDs - maps to provider definitions below
 */
export const llmProviders = {
  google: 'google',
} as const;

export const providers: ProvidersMap = {
  google: googleProviders,
};

export type ModelInfo = {
  provider: Provider;
  model: Omit<Model, 'id' | 'cost'>;
};

/**
 * Helper functions to integrate with the existing LLM provider system
 */

/**
 * Get model information by model ID
 */
export const getModelInfo = (modelId: string): ModelInfo | null => {
  // Check if modelId is in format "provider/model"
  const parts = modelId.split('/');
  let providerId: string;
  let modelKey: string;

  if (parts.length === 2) {
    [providerId, modelKey] = parts;
  } else {
    // Try to find model in any provider
    for (const [pid, provider] of Object.entries(providers)) {
      if (provider.models[modelId]) {
        providerId = pid;
        modelKey = modelId;
        break;
      }
    }
    if (!providerId || !modelKey) {
      return null;
    }
  }

  const provider = providers[providerId];
  if (!provider) {
    return null;
  }

  const modelRef = provider.models[modelKey];
  if (!modelRef) {
    return null;
  }

  // Handle string references (model aliases)
  if (typeof modelRef === 'string') {
    return getModelInfo(modelRef);
  }

  return {
    provider,
    model: modelRef,
  };
};

/**
 * Convert Model modalities to ProviderCapabilities
 */
export const modelModalitiesToCapabilities = (
  model: Omit<Model, 'id' | 'cost'>
): ProviderCapabilities => {
  const supportsImages = model.modalities.input.includes('image');
  const supportsAudio =
    model.modalities.input.includes('audio') || model.modalities.output.includes('audio');
  const supportsVideo = model.modalities.input.includes('video');
  const supportsPdf = model.modalities.input.includes('pdf');
  const supportsText = model.modalities.input.includes('text');

  return {
    supportsImages,
    supportsStructuredOutput: model.tool_call, // Tool calling often implies structured output
    supportsStreaming: true, // Most modern models support streaming
    supportsFileGeneration:
      model.modalities.output.includes('image') || model.modalities.output.includes('audio'),
    supportsImageGeneration: model.modalities.output.includes('image'),
    supportsInternetSearch: false, // This is provider-specific, not model-specific
    supportsToolCalls: model.tool_call || false, // Whether the model supports tool/function calling
    maxTokens: model.limit.context,
    supportedFileTypes: [
      ...(supportsImages ? ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] : []),
      ...(supportsAudio ? ['audio/mpeg', 'audio/wav', 'audio/mp3'] : []),
      ...(supportsVideo ? ['video/mp4', 'video/quicktime'] : []),
      ...(supportsPdf ? ['application/pdf'] : []),
      ...(supportsText
        ? [
            'text/plain',
            'text/markdown',
            'text/html',
            'text/css',
            'text/javascript',
            'text/csv',
            'application/json',
            'application/xml',
          ]
        : []),
    ],
  };
};

/**
 * Get all models for a specific provider
 */
export const getModelsForProvider = (
  providerId: string
): Array<{ id: string; model: Omit<Model, 'id' | 'cost'> }> => {
  const provider = providers[providerId];
  if (!provider) {
    return [];
  }

  return Object.entries(provider.models).map(
    ([id, modelRef]): { id: string; model: Omit<Model, 'id' | 'cost'> } => {
      if (typeof modelRef === 'string') {
        // Resolve alias
        const resolved = getModelInfo(modelRef);
        if (resolved?.model) {
          return {
            id,
            model: resolved.model,
          };
        }
        // Fallback: try to find in models directly
        if (modelRef in models) {
          const directModel = models[modelRef] as Omit<Model, 'id' | 'cost'>;
          return {
            id,
            model: directModel,
          };
        }
        // If still not found, throw error
        throw new Error(`Model not found: ${modelRef}`);
      }
      return { id, model: modelRef as Omit<Model, 'id' | 'cost'> };
    }
  );
};

/**
 * Find provider by model ID
 */
export const getProviderForModel = (modelId: string): Provider | null => {
  const modelInfo = getModelInfo(modelId);
  return modelInfo?.provider || null;
};
