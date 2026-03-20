import {
  llmProviders,
  getModelInfo,
  modelModalitiesToCapabilities,
  providers,
} from 'core/src/llm/models';

import type { ProviderConfig, ProviderCapabilities } from 'core/src/llm/llm.types';

export type ProviderId = keyof typeof llmProviders;

/**
 * Get capabilities for a provider based on its default model
 */
const getProviderCapabilities = (providerId: ProviderId): ProviderCapabilities => {
  const providerDef = providers[providerId];

  if (!providerDef || !providerDef.defaultModel) {
    // Provider not found or no default model, use fallback
    return {
      supportsImages: false,
      supportsStructuredOutput: false,
      supportsStreaming: true,
      supportsFileGeneration: false,
      supportsImageGeneration: false,
      supportsInternetSearch: false,
      supportsToolCalls: false,
      maxTokens: 100000,
      supportedFileTypes: [],
    };
  }

  // Try to get capabilities from the default model
  let modelInfo = getModelInfo(providerDef.defaultModel);

  // If model not found and it's not in "provider/model" format, try with provider prefix
  if (!modelInfo && !providerDef.defaultModel.includes('/')) {
    modelInfo = getModelInfo(`${providerId}/${providerDef.defaultModel}`);
  }

  let capabilities: ProviderCapabilities;

  if (modelInfo) {
    capabilities = modelModalitiesToCapabilities(modelInfo.model);
  } else {
    // Fallback: try to find any model for this provider
    const providerModels = Object.entries(providerDef.models);
    if (providerModels.length > 0) {
      // Try first model
      const [, firstModelRef] = providerModels[0];
      const firstModel =
        typeof firstModelRef === 'string' ? getModelInfo(firstModelRef)?.model : firstModelRef;
      if (firstModel) {
        capabilities = modelModalitiesToCapabilities(firstModel);
      } else {
        // Ultimate fallback
        capabilities = {
          supportsImages: false,
          supportsStructuredOutput: false,
          supportsStreaming: true,
          supportsFileGeneration: false,
          supportsImageGeneration: false,
          supportsInternetSearch: false,
          supportsToolCalls: false,
          maxTokens: 100000,
          supportedFileTypes: [],
        };
      }
    } else {
      // No models found, use fallback
      capabilities = {
        supportsImages: false,
        supportsStructuredOutput: false,
        supportsStreaming: true,
        supportsFileGeneration: false,
        supportsImageGeneration: false,
        supportsInternetSearch: false,
        supportsToolCalls: false,
        maxTokens: 100000,
        supportedFileTypes: [],
      };
    }
  }

  // Apply provider-specific overrides from models.ts
  if (providerDef.capabilityOverrides) {
    capabilities = { ...capabilities, ...providerDef.capabilityOverrides };
  }

  return capabilities;
};

/**
 * Build base configuration for a provider (without API keys)
 */
const buildBaseConfig = (providerId: ProviderId): Omit<ProviderConfig, 'apiKey'> => {
  const providerDef = providers[providerId];

  if (!providerDef || !providerDef.defaultModel) {
    throw new Error(`Provider configuration not found for: ${providerId}`);
  }

  const capabilities = getProviderCapabilities(providerId);

  return {
    baseUrl: providerDef.api || providerDef.options?.baseURL,
    defaultModel: providerDef.defaultModel,
    defaultImageModel: providerDef.defaultImageModel,
    capabilities,
    timeout: providerDef.timeout,
    maxRetries: providerDef.maxRetries,
  };
};

/**
 * Get API key environment variable name for a provider
 */
export const getProviderApiKeyEnvVar = (providerId: ProviderId): string => {
  const providerDef = providers[providerId];
  if (!providerDef || !providerDef.env || providerDef.env.length === 0) {
    throw new Error(`No API key environment variable configured for provider: ${providerId}`);
  }
  // Use the first environment variable from the provider's env array
  return providerDef.env[0];
};

/**
 * Apply API keys to provider configuration
 */
const applyApiKeys = (
  config: Omit<ProviderConfig, 'apiKey'>,
  providerId: ProviderId
): ProviderConfig => {
  const envVar = getProviderApiKeyEnvVar(providerId);
  const apiKey = process.env[envVar];

  const result: ProviderConfig = {
    ...config,
    apiKey: apiKey || '',
  };
  return result;
};

/**
 * Get configuration for a specific provider with API keys applied at runtime
 */
export const getProviderConfig = (providerId: ProviderId): ProviderConfig => {
  const baseConfig = buildBaseConfig(providerId);

  // Apply API keys at runtime to avoid race conditions with dotenv
  const config = applyApiKeys(baseConfig, providerId);

  if (!config.apiKey) {
    const envVar = getProviderApiKeyEnvVar(providerId);
    throw new Error(
      `API key not configured for provider: ${providerId}. Please set ${envVar} environment variable.`
    );
  }

  return config;
};

/**
 * Check if a provider is available (has API key configured)
 */
export const isProviderAvailable = (providerId: ProviderId): boolean => {
  try {
    const envVar = getProviderApiKeyEnvVar(providerId);
    const apiKey = process.env[envVar];
    return !!apiKey;
  } catch {
    return false;
  }
};
