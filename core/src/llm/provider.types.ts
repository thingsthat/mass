export type ModelModalities = {
  input: ('text' | 'image' | 'audio' | 'video' | 'pdf')[];
  output: ('text' | 'audio' | 'image')[];
};

type ModelCost = {
  input: number;
  output: number;
  cache_read?: number;
  cache_write?: number;
};

type ModelLimit = {
  context: number;
  output: number;
};

type ModelPricing = {
  prompt: string;
  completion: string;
  request: string;
  image: string;
  web_search: string;
  internal_reasoning: string;
  input_cache_read?: string;
  input_cache_write?: string;
};

export type Model = {
  id: string;
  name: string;
  shortName?: string;
  attachment: boolean;
  reasoning: boolean;
  temperature: boolean;
  tool_call: boolean;
  knowledge?: string;
  release_date: string;
  last_updated: string;
  modalities: ModelModalities;
  open_weights?: boolean;
  cost: ModelCost;
  limit: ModelLimit;
  enabled?: boolean;
  description?: string;
  hugging_face_id?: string;
  url?: string;
  pricing?: ModelPricing;
  supported_parameters?: string[];
};

import { llmProviders } from './models';

import type { ProviderCapabilities } from 'core/src/llm/llm.types';

export type Provider = {
  id: string;
  env: string[];
  name: string;
  apiEnv?: string[];
  api?: string;
  doc: string;
  models: Record<string, string | Omit<Model, 'id' | 'cost'>>;
  // Provider configuration
  defaultModel?: string;
  defaultImageModel?: string;
  timeout?: number;
  maxRetries?: number;
  // Provider-specific capability overrides (e.g., internet search)
  capabilityOverrides?: Partial<ProviderCapabilities>;
  options?: {
    baseURL?: string;
    apiKey?: string;
    headers?: Record<string, string>;
  };
};

export type ProvidersMap = Record<keyof typeof llmProviders, Provider>;
export type ModelMap = Record<string, Omit<Model, 'id' | 'cost'>>;
