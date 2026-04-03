import { z } from 'zod';

import { createSchemaDefinition, type SchemaDefinition } from 'core/src/llm/schemas/schema';

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

export const questionnaireReportSchemaZod = z
  .object({
    title: z
      .string()
      .describe('The title of the report, must be simple and concise and neutral to the results.'),
    summary: z
      .string()
      .describe('A comprehensive summary of the overall questionnaire results and trends.'),
    positive_percentage: z.number().describe('Percentage of positive responses (0-100).'),
    neutral_percentage: z.number().describe('Percentage of neutral responses (0-100).'),
    negative_percentage: z.number().describe('Percentage of negative responses (0-100).'),
    verdict_summary: z
      .string()
      .describe('A brief, punchy summary of the overall verdict from the questionnaire.'),
    verdict_best_quote: z
      .string()
      .describe('The most compelling or representative quote from the responses.'),
    detailed: z
      .string()
      .describe(
        'Detailed analysis of the questionnaire results in markdown format. This should be a comprehensive analysis of the responses and the results.'
      ),
    confidence_summary: confidenceSummarySchemaZod.describe(
      'Narrative summary of confidence patterns with explanatory paragraphs.'
    ),
    questionnaire_questions: z
      .array(questionnaireQuestionSchemaZod)
      .describe('The original questionnaire structure with questions and options.'),
    question_results: z
      .array(questionResultSchemaZod)
      .describe('Aggregated results for each question with counts and percentages.'),
    overall_summary: z
      .string()
      .describe(
        'Overall summary providing insights across all questions, highlighting key patterns and trends.'
      ),
  })
  .describe(
    'Response format for analyzing questionnaire responses and generating a comprehensive report.'
  );

export const questionnaireReportSchema: SchemaDefinition = createSchemaDefinition(
  questionnaireReportSchemaZod,
  {
    name: 'questionnaire_report',
    strict: true,
  }
);
