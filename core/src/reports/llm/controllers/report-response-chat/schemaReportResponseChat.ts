import { createSchemaDefinition, type SchemaDefinition } from 'core/src/llm/schemas/schema';
import { schemaComponentContentZod } from 'core/src/reports/llm/schemas/schemaComponentContent';
import { schemaComponentFollowupZod } from 'core/src/reports/llm/schemas/schemaComponentFollowup';
import { z } from 'zod';

const reportFeedbackResponseJsonSchemaZod = z
  .object({
    content: schemaComponentContentZod,
    followup: schemaComponentFollowupZod.optional(),
  })
  .describe('Response format for the structured content answer.');

export const reportFeedbackResponseJsonSchema: SchemaDefinition = createSchemaDefinition(
  reportFeedbackResponseJsonSchemaZod,
  {
    name: 'content_response',
    strict: true,
  }
);
