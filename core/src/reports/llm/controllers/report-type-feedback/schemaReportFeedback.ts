import { z } from 'zod';

import { createSchemaDefinition, type SchemaDefinition } from 'core/src/llm/schemas/schema';

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

export const feedbackReportSchemaZod = z
  .object({
    title: z
      .string()
      .describe('The title of the report, must be simple and concise and neutral to the results.'),
    summary: z
      .string()
      .describe('A comprehensive summary of the overall feedback trends and patterns.'),
    positive_percentage: z.number().describe('Percentage of positive responses (0-100).'),
    neutral_percentage: z.number().describe('Percentage of neutral responses (0-100).'),
    negative_percentage: z.number().describe('Percentage of negative responses (0-100).'),
    verdict_summary: z.string().describe('A brief, punchy summary of the overall verdict.'),
    verdict_best_quote: z
      .string()
      .describe('The most compelling or representative quote from the responses.'),
    sentiment_groups: z
      .array(sentimentGroupSchemaZod)
      .describe('Groups of responses by sentiment with representative quotes.'),
    crowd_wall: z
      .array(crowdWallItemSchemaZod)
      .describe('Selected personas for the crowd wall display.'),
    detailed: z
      .string()
      .describe(
        'Detailed analysis of the feedback in markdown format this should be a comprehensive analysis of the feedback and the results, much more than just a summary.'
      ),
    confidence_summary: confidenceSummarySchemaZod.describe(
      'Narrative summary of confidence patterns with explanatory paragraphs.'
    ),
  })
  .describe(
    'Response format for analyzing persona feedback and generating a comprehensive report.'
  );

export const feedbackReportSchema: SchemaDefinition = createSchemaDefinition(
  feedbackReportSchemaZod,
  {
    name: 'feedback_report',
    strict: true,
  }
);
