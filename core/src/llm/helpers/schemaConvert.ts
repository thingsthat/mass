import {
  isZodSchema,
  jsonSchemaToGeminiSchema,
  zodToJsonSchema,
  zodToOpenAISchema,
} from 'core/src/llm/helpers/zodConvert';

import type { ResponseFormat } from 'core/src/llm/llm.types';

/**
 * Extract Zod schema from ResponseFormat
 * Handles both new format (zodSchema directly on ResponseFormat) and legacy formats
 */
export function extractZodSchemaFromResponseFormat(responseFormat: ResponseFormat): any {
  // New format - zodSchema is directly on ResponseFormat
  if (responseFormat.zodSchema) {
    return responseFormat.zodSchema;
  }

  // Legacy format - check old nested structure
  if ((responseFormat as any).json_schema?.zodSchema) {
    return (responseFormat as any).json_schema.zodSchema;
  }

  // Legacy format - check if it's already a Zod schema
  if (isZodSchema(responseFormat)) {
    return responseFormat;
  }

  // Legacy format - extract schema directly
  if ((responseFormat as any).json_schema?.schema) {
    return (responseFormat as any).json_schema.schema;
  }

  // Fallback: assume it's already a schema
  return responseFormat;
}

/**
 * Convert ResponseFormat to Gemini Schema format (for Google).
 * This is the only path used for Gemini response_schema; the Google provider calls it
 * via getResponseSchema(). Pipeline: ResponseFormat → Zod → JSON Schema → Gemini Schema.
 * All Gemini-specific stripping (format, default, additionalProperties, etc.) is done
 * in jsonSchemaToGeminiSchema (zodConvert.ts).
 */
export function convertResponseFormatToGeminiSchema(responseFormat: ResponseFormat): any {
  const zodSchema = extractZodSchemaFromResponseFormat(responseFormat);
  const jsonSchema = zodToJsonSchema(zodSchema);
  const geminiSchema = jsonSchemaToGeminiSchema(jsonSchema);
  return geminiSchema;
}

/**
 * Convert ResponseFormat to standard JSON Schema format (for Grok/Perplexity)
 * Pipeline: ResponseFormat → Zod → JSON Schema
 */
export function convertResponseFormatToJsonSchema(responseFormat: ResponseFormat): any {
  const zodSchema = extractZodSchemaFromResponseFormat(responseFormat);
  return zodToJsonSchema(zodSchema);
}

/**
 * Convert ResponseFormat for OpenAI
 * Pipeline: ResponseFormat → Zod → JSON Schema → OpenAI Schema (with strict mode)
 */
export const convertResponseFormatForOpenAI = (
  responseFormat: ResponseFormat
): {
  name: string;
  strict: boolean;
  schema: any;
} => {
  const zodSchema = extractZodSchemaFromResponseFormat(responseFormat);
  const openAISchema = zodToOpenAISchema(zodSchema, responseFormat.strict);

  return {
    name: responseFormat.name,
    strict: responseFormat.strict,
    schema: openAISchema,
  };
};
