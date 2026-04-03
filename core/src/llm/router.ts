import { log } from 'core/src/helpers/logger';
import { getProviderConfig, type ProviderId } from 'core/src/llm/config';
import {
  type LLMRequest,
  type LLMResponse,
  type ProviderFunction,
  type FileGenerationRequest,
  type FileGenerationResponse,
} from 'core/src/llm/llm.types';
import { llmProviders } from 'core/src/llm/models';
import { createGoogleProvider } from 'core/src/llm/providers/google';

/**
 * Clean JSON response by removing markdown code blocks and fixing common issues
 */
const cleanJsonResponse = (text: string): string => {
  // Remove markdown code blocks
  let cleaned = text.trim();
  if (cleaned.startsWith('```json') || cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/gm, '').replace(/\n?```$/gm, '');
  }

  // Remove any leading/trailing whitespace
  cleaned = cleaned.trim();

  return cleaned;
};

/**
 * Helper function to parse JSON response when structured output is requested.
 * When responseFormat provides a Zod schema, validates the parsed JSON and applies defaults before assigning response.data.
 */
const parseStructuredResponse = <T>(
  response: LLMResponse,
  request: LLMRequest<T>
): LLMResponse<T> => {
  const hasStructuredOutput = !!request.responseFormat;
  if (!hasStructuredOutput || !response.text) {
    return response as LLMResponse<T>;
  }
  try {
    const cleanedText = cleanJsonResponse(response.text);
    const parsedData = JSON.parse(cleanedText) as unknown;
    let data: T;
    const zodSchema = request.responseFormat?.zodSchema;
    if (zodSchema) {
      const parsed = zodSchema.safeParse(parsedData);
      if (!parsed.success) {
        log.error('LLM', 'Structured response failed Zod validation:', parsed.error.flatten());
        log.error('LLM', 'Response text (first 500 chars):', response.text.substring(0, 500));
        throw new Error(`Structured response validation failed: ${parsed.error.message}`);
      }
      data = parsed.data as T;
    } else {
      data = parsedData as T;
    }
    return {
      ...response,
      data,
    };
  } catch (error) {
    log.error('LLM', 'Failed to parse structured response:', error);
    log.error('LLM', 'Response text (first 500 chars):', response.text.substring(0, 500));
    throw new Error(
      `Failed to parse JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

/**
 * Provider factory registry
 */
const PROVIDER_FACTORIES: Record<ProviderId, (config: any) => ProviderFunction> = {
  google: createGoogleProvider,
};

/**
 * Provider instance cache
 */
const providerCache = new Map<ProviderId, ProviderFunction>();

/**
 * Get or create provider instance
 */
const getProvider = (provider: ProviderId): ProviderFunction => {
  const cached = providerCache.get(provider);
  if (cached) {
    return cached;
  }

  const config = getProviderConfig(provider);
  const providerFactory = PROVIDER_FACTORIES[provider];

  if (!providerFactory) {
    throw new Error(`Provider implementation not found: ${provider}`);
  }

  const providerInstance = providerFactory(config);
  providerCache.set(provider, providerInstance);

  return providerInstance;
};

/**
 * Clear provider cache (useful for debugging)
 */
export const clearProviderCache = () => {
  providerCache.clear();
};

/**
 * Main LLM router
 */
export const LLMRouter = {
  /**
   * Generate content using specified provider
   */
  async generate<T = unknown>(
    provider: ProviderId,
    request: LLMRequest<T>
  ): Promise<LLMResponse<T>> {
    const providerInstance = getProvider(provider);
    const response = await providerInstance.generateContent(request);
    return parseStructuredResponse<T>(response, request);
  },

  /**
   * Generate streaming content using specified provider
   */
  async generateStream(provider: ProviderId, request: LLMRequest): Promise<ReadableStream> {
    const providerInstance = getProvider(provider);
    return await providerInstance.generateStream(request);
  },

  /**
   * Get provider capabilities
   */
  getCapabilities(provider: ProviderId) {
    const providerInstance = getProvider(provider);
    return providerInstance.getCapabilities();
  },

  /**
   * Check if provider supports a specific feature
   */
  supportsFeature(
    provider: ProviderId,
    feature:
      | 'images'
      | 'structuredOutput'
      | 'streaming'
      | 'fileGeneration'
      | 'imageGeneration'
      | 'internetSearch'
  ): boolean {
    const capabilities = this.getCapabilities(provider);

    switch (feature) {
      case 'images':
        return capabilities.supportsImages;
      case 'structuredOutput':
        return capabilities.supportsStructuredOutput;
      case 'streaming':
        return capabilities.supportsStreaming;
      case 'fileGeneration':
        return capabilities.supportsFileGeneration;
      case 'imageGeneration':
        return capabilities.supportsImageGeneration;
      case 'internetSearch':
        return capabilities.supportsInternetSearch;
      default:
        return false;
    }
  },

  /**
   * Get best provider for request requirements
   */
  getBestProvider<T = unknown>(
    request: LLMRequest<T>,
    preferredProviders: ProviderId[] = ['google']
  ): ProviderId {
    const requiresImages = request.files && request.files.length > 0;
    const requiresStructuredOutput = !!request.responseFormat;
    const requiresStreaming = !!request.stream;

    for (const provider of preferredProviders) {
      try {
        const capabilities = this.getCapabilities(provider);

        if (requiresImages && !capabilities.supportsImages) {
          continue;
        }
        if (requiresStructuredOutput && !capabilities.supportsStructuredOutput) {
          continue;
        }
        if (requiresStreaming && !capabilities.supportsStreaming) {
          continue;
        }

        return provider;
      } catch {
        // Provider not available, continue to next
        continue;
      }
    }

    // Fallback to any available provider
    const allProviders = Object.keys(llmProviders) as ProviderId[];
    for (const provider of allProviders) {
      try {
        const capabilities = this.getCapabilities(provider);

        if (requiresImages && !capabilities.supportsImages) {
          continue;
        }
        if (requiresStructuredOutput && !capabilities.supportsStructuredOutput) {
          continue;
        }
        if (requiresStreaming && !capabilities.supportsStreaming) {
          continue;
        }

        return provider;
      } catch {
        continue;
      }
    }

    throw new Error('No suitable provider found for request requirements');
  },

  /**
   * Generate with automatic provider selection
   */
  async generateAuto<T = unknown>(
    request: LLMRequest<T>,
    preferredProviders?: ProviderId[]
  ): Promise<LLMResponse<T>> {
    const provider = this.getBestProvider(request, preferredProviders);
    return await LLMRouter.generate<T>(provider, request);
  },

  /**
   * Generate stream with automatic provider selection
   */
  async generateStreamAuto(
    request: LLMRequest,
    preferredProviders?: ProviderId[]
  ): Promise<ReadableStream> {
    const provider = this.getBestProvider(request, preferredProviders);
    return await this.generateStream(provider, request);
  },

  /**
   * Generate file using specified provider
   */
  async generateFile(
    provider: ProviderId,
    request: FileGenerationRequest
  ): Promise<FileGenerationResponse> {
    const providerInstance = getProvider(provider);

    if (!providerInstance.generateFile) {
      throw new Error(`Provider ${provider} does not support file generation`);
    }

    return await providerInstance.generateFile(request);
  },

  /**
   * Generate file with automatic provider selection
   */
  async generateFileAuto(
    request: FileGenerationRequest,
    preferredProviders: ProviderId[] = ['google']
  ): Promise<FileGenerationResponse> {
    // Find first provider that supports file generation
    for (const provider of preferredProviders) {
      try {
        const capabilities = this.getCapabilities(provider);
        if (capabilities.supportsFileGeneration) {
          return await this.generateFile(provider, request);
        }
      } catch {
        continue;
      }
    }

    // Fallback to any available provider that supports file generation
    const allProviders = Object.keys(llmProviders) as ProviderId[];
    for (const provider of allProviders) {
      try {
        const capabilities = this.getCapabilities(provider);
        if (capabilities.supportsFileGeneration) {
          return await this.generateFile(provider, request);
        }
      } catch {
        continue;
      }
    }

    throw new Error('No provider found that supports file generation');
  },
};
