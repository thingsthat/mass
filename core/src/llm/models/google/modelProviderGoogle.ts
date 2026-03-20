import { googleModels } from 'core/src/llm/models/google/modelsGoogle';

import type { Provider } from 'core/src/llm/provider.types';

export const googleProviders: Provider = {
  id: 'google',
  env: ['GOOGLE_API_KEY'],
  apiEnv: ['GOOGLE_GENERATIVE_AI_API_BASE'],
  name: 'Google',
  doc: 'https://ai.google.dev/gemini-api/docs/models',
  defaultModel: 'gemini-3-flash-preview',
  defaultImageModel: 'gemini-2.5-flash-image-preview',
  timeout: 30000,
  maxRetries: 2,
  capabilityOverrides: {
    supportsInternetSearch: true, // Gemini supports Google Search grounding
  },
  models: {
    'gemini-2.5-flash': googleModels['gemini-2.5-flash'],
    'gemini-2.5-flash-lite': googleModels['gemini-2.5-flash-lite'],
    'gemini-2.5-flash-preview-09-2025': googleModels['gemini-2.5-flash-preview-09-2025'],
    'gemini-2.5-flash-lite-preview-06-17': googleModels['gemini-2.5-flash-lite-preview-06-17'],
    'gemini-2.5-pro': googleModels['gemini-2.5-pro'],
    'gemini-3-flash-preview': googleModels['gemini-3-flash-preview'],
    'gemini-3.1-pro-preview': googleModels['gemini-3.1-pro-preview'],
    'gemini-3.1-flash-lite-preview': googleModels['gemini-3.1-flash-lite-preview'],
    'gemini-3-pro-preview': googleModels['gemini-3-pro-preview'],
  },
};
