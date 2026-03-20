import { z } from 'zod';

import type { StructuredResponse } from 'core/src/workspace/conversation.types';

/**
 * Schema definition with Zod schema and metadata
 */
export type SchemaDefinition = {
  zodSchema: z.ZodTypeAny;
  name: string;
  strict: boolean;
};

/**
 * Helper to create SchemaDefinition from Zod schema
 */
export function createSchemaDefinition(
  zodSchema: z.ZodTypeAny,
  options: { name: string; strict: boolean }
): SchemaDefinition {
  return {
    zodSchema,
    name: options.name,
    strict: options.strict,
  };
}

export type ResponseFormatType =
  | 'content'
  | 'persona_chat'
  | 'persona_response'
  | 'feedback_report'
  | 'debate_report'
  | 'questionnaire_report'
  | 'ideas_report';

/**
 * Helper to create a structured text response matching the expected format
 */
export const createTextResponse = (message: string) => {
  const responseStructure: StructuredResponse = {
    content: [message],
  };

  return JSON.stringify(responseStructure);
};
