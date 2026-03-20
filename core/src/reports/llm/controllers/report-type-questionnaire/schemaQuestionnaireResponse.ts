import { createSchemaDefinition, type SchemaDefinition } from 'core/src/llm/schemas/schema';
import { z } from 'zod';

const responseItemSchemaZod = z.object({
  question_id: z.string().describe('The ID of the question being answered.'),
  selected_option_ids: z
    .array(z.string())
    .describe(
      'Array of option IDs selected by the persona. MUST use the exact option IDs from the questionnaire (e.g., ["q1_o1", "q1_o2"]), NOT numeric values (NOT ["1", "2"]). For single-select, contains one ID. For multiple-select, can contain multiple IDs. For optional questions, can be empty array if skipped.'
    ),
  reasoning: z
    .string()
    .optional()
    .describe(
      'Brief explanation of why the persona chose these options, reflecting their personality, background, values, and experiences. This should be natural and authentic to the persona.'
    ),
});

export const questionnaireResponseSchemaZod = z
  .object({
    responses: z
      .array(responseItemSchemaZod)
      .describe(
        'Array of responses, one per question. Each response contains the question ID and selected option IDs.'
      ),
  })
  .describe(
    'Structured response format for persona answering questionnaire questions. Responses must match the questionnaire structure provided.'
  );

export const questionnaireResponseSchema: SchemaDefinition = createSchemaDefinition(
  questionnaireResponseSchemaZod,
  {
    name: 'questionnaire_persona_response',
    strict: true,
  }
);
