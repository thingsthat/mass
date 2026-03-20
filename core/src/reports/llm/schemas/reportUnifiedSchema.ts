import { createSchemaDefinition, type SchemaDefinition } from 'core/src/llm/schemas/schema';
import { z } from 'zod';

const confidenceSummarySchemaZod = z.object({
  confidence_patterns: z
    .string()
    .describe(
      'Paragraph explaining what the confidence levels reveal and why certain patterns emerged.'
    ),
  confidence_insights: z
    .string()
    .describe(
      'Paragraph explaining the significance of confidence variations and what they mean for the topic.'
    ),
});

const quoteSchemaZod = z.object({
  text: z.string().describe('The quote text only.'),
  author_name: z.string().describe('Persona name.'),
  author_age: z.number().describe('Persona age.'),
  author_occupation: z.string().describe('Persona occupation.'),
  author_id: z.string().describe('The persona uuid.'),
});

const sentimentGroupSchemaZod = z.object({
  type: z
    .string()
    .describe('Name of the sentiment group (e.g., "The Enthusiasts", "The Skeptics").'),
  percentage: z.number().describe('Percentage of this group (0-100).'),
  icon: z.string().describe('Emoji icon representing this group.'),
  color: z
    .enum(['green', 'gray', 'red'])
    .describe('Color theme for this group (green, gray, red).'),
  quotes: z.array(quoteSchemaZod).describe('Representative quotes from this group.'),
});

const crowdWallItemSchemaZod = z.object({
  author_id: z.string().describe("The persona's uuid."),
  author_name: z.string().describe('Persona name.'),
  author_age: z.number().describe('Persona age.'),
  author_occupation: z.string().describe('Persona occupation.'),
  text: z.string().describe('Their representative quote.'),
});

const personaValueSchemaZod = z.object({
  name: z.string().describe('Persona name.'),
  age: z.number().describe('Persona age.'),
  occupation: z.string().describe('Persona occupation.'),
  text: z.string().describe('Representative quote from this persona.'),
});

const personaSchemaZod = z.object({
  id: z.string().describe('Persona identifier.'),
  value: personaValueSchemaZod,
});

const debateMessageSchemaZod = z.object({
  timestamp: z.string().describe('ISO timestamp of when this message was sent.'),
  author_id: z.string().describe('ID of the persona or moderator who sent this message.'),
  text: z.string().describe('The message content.'),
});

const questionnaireOptionSchemaZod = z.object({
  id: z.string().describe('Unique identifier for the option.'),
  text: z.string().describe('The text of the option.'),
});

const questionnaireQuestionSchemaZod = z.object({
  id: z.string().describe('Unique identifier for the question.'),
  question_text: z.string().describe('The full text of the question.'),
  options: z
    .array(questionnaireOptionSchemaZod)
    .describe('Array of answer options for this question.'),
  selection_type: z
    .enum(['single', 'multiple', 'optional'])
    .describe('Selection type: "single", "multiple", or "optional".'),
  required: z.boolean().describe('Whether answering this question is required.'),
});

const questionResultOptionSchemaZod = z.object({
  option_id: z.string().describe('The ID of the option.'),
  option_text: z.string().describe('The text of the option.'),
  count: z.number().describe('Number of personas who selected this option.'),
  percentage: z
    .number()
    .describe('Percentage of total responses that selected this option (0-100).'),
});

const questionResultSchemaZod = z.object({
  question_id: z.string().describe('The ID of the question.'),
  question_text: z.string().describe('The text of the question.'),
  options: z
    .array(questionResultOptionSchemaZod)
    .describe('Results for each option with counts and percentages.'),
  total_responses: z.number().describe('Total number of personas who answered this question.'),
  selection_type: z
    .enum(['single', 'multiple', 'optional'])
    .describe('Selection type: "single", "multiple", or "optional".'),
  required: z.boolean().describe('Whether answering this question was required.'),
});

export const reportUnifiedJsonSchemaZod = z
  .object({
    title: z
      .string()
      .describe(
        'The title of the unified report, must be simple and concise and neutral to the results.'
      ),
    summary: z
      .string()
      .describe(
        'A comprehensive summary combining insights from both feedback and debate analysis.'
      ),
    positive_percentage: z.number().describe('Percentage of positive responses (0-100).'),
    neutral_percentage: z.number().describe('Percentage of neutral responses (0-100).'),
    negative_percentage: z.number().describe('Percentage of negative responses (0-100).'),
    verdict_summary: z
      .string()
      .describe(
        'A brief, punchy summary of the overall verdict combining both individual and group insights.'
      ),
    verdict_best_quote: z
      .string()
      .describe('The most compelling or representative quote from either feedback or debate.'),
    detailed: z
      .string()
      .describe(
        'Detailed unified analysis in markdown format combining feedback and debate insights.'
      ),
    confidence_summary: confidenceSummarySchemaZod.describe(
      'Narrative summary of confidence patterns with explanatory paragraphs.'
    ),
    sentiment_groups: z
      .array(sentimentGroupSchemaZod)
      .optional()
      .describe(
        'Groups of responses by sentiment with representative quotes (when feedback analysis is included).'
      ),
    crowd_wall: z
      .array(crowdWallItemSchemaZod)
      .optional()
      .describe(
        'Selected personas for the crowd wall display (when feedback analysis is included).'
      ),
    personas: z
      .array(personaSchemaZod)
      .optional()
      .describe(
        'Information about personas who participated in the debate (when debate analysis is included).'
      ),
    debate: z
      .array(debateMessageSchemaZod)
      .optional()
      .describe('The chronological debate conversation (when debate analysis is included).'),
    report_types: z
      .array(z.enum(['feedback', 'debate']))
      .optional()
      .describe('Array of report types that were generated for this unified report.'),
    questionnaire_questions: z
      .array(questionnaireQuestionSchemaZod)
      .optional()
      .describe(
        'The original questionnaire structure with questions and options (when questionnaire analysis is included).'
      ),
    question_results: z
      .array(questionResultSchemaZod)
      .optional()
      .describe(
        'Aggregated results for each question with counts and percentages (when questionnaire analysis is included).'
      ),
    overall_summary: z
      .string()
      .optional()
      .describe(
        'Overall summary providing insights across all questions, highlighting key patterns and trends (when questionnaire analysis is included).'
      ),
  })
  .describe(
    'Response format for generating unified reports that combine feedback and debate analysis.'
  );

export const reportUnifiedJsonSchema: SchemaDefinition = createSchemaDefinition(
  reportUnifiedJsonSchemaZod,
  {
    name: 'unified_report',
    strict: true,
  }
);
