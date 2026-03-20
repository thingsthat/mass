import { createSchemaDefinition, type SchemaDefinition } from 'core/src/llm/schemas/schema';
import { z } from 'zod';

const optionSchemaZod = z.object({
  id: z
    .string()
    .describe(
      'Unique identifier for the option. MUST use format "q1_o1", "q1_o2", "q1_o3" with underscores (NOT "q1o1" or "q1-o1").'
    ),
  text: z.string().describe('The text of the option.'),
});

const questionSchemaZod = z.object({
  id: z.string().describe('Unique identifier for the question (e.g., "q1", "q2").'),
  question_text: z.string().describe('The full text of the question.'),
  options: z.array(optionSchemaZod).describe('Array of answer options for this question.'),
  selection_type: z
    .enum(['single', 'multiple', 'optional'])
    .describe(
      'How many options can be selected: "single" (select one), "multiple" (select multiple), or "optional" (question can be skipped).'
    ),
  required: z
    .boolean()
    .describe('Whether answering this question is required (true) or optional (false).'),
});

export const questionnaireExtractionSchemaZod = z
  .object({
    questions: z
      .array(questionSchemaZod)
      .describe(
        'Array of questions extracted from the user prompt. Each question should have clear options and selection type.'
      ),
  })
  .describe(
    'Extract questionnaire structure from user prompt, identifying questions, options, and selection types.'
  );

export const questionnaireExtractionSchema: SchemaDefinition = createSchemaDefinition(
  questionnaireExtractionSchemaZod,
  {
    name: 'questionnaire_extraction',
    strict: true,
  }
);
