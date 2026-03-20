import { createSchemaDefinition, type SchemaDefinition } from 'core/src/llm/schemas/schema';
import { z } from 'zod';

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

const confidenceSummarySchemaZod = z.object({
  confidence_patterns: z
    .string()
    .describe(
      'Paragraph explaining what the confidence levels during the debate reveal and why certain patterns emerged.'
    ),
  confidence_insights: z
    .string()
    .describe(
      'Paragraph explaining the significance of confidence variations during the debate and what they mean for the topic.'
    ),
});

export const debateReportSchemaZod = z
  .object({
    title: z
      .string()
      .describe(
        'The title of the debate report, must be simple and concise and neutral to the results.'
      ),
    summary: z
      .string()
      .describe('A comprehensive summary of the debate discussion and key points raised.'),
    positive_percentage: z
      .number()
      .describe('Percentage of positive/supportive responses (0-100).'),
    neutral_percentage: z.number().describe('Percentage of neutral responses (0-100).'),
    negative_percentage: z.number().describe('Percentage of negative/opposing responses (0-100).'),
    verdict_summary: z.string().describe('A brief, punchy summary of the overall debate outcome.'),
    verdict_best_quote: z
      .string()
      .describe('The most compelling or impactful quote from the debate.'),
    personas: z
      .array(personaSchemaZod)
      .describe('Information about personas who participated in the debate.'),
    debate: z.array(debateMessageSchemaZod).describe('The chronological debate conversation.'),
    detailed: z
      .string()
      .describe(
        'Detailed analysis of the debate in markdown format this should be a comprehensive analysis of the debate and the results, much more than just a summary. '
      ),
    confidence_summary: confidenceSummarySchemaZod.describe(
      'Narrative summary of confidence patterns in the debate with explanatory paragraphs.'
    ),
  })
  .describe(
    'Response format for analyzing debate responses and generating a comprehensive debate report.'
  );

export const debateReportSchema: SchemaDefinition = createSchemaDefinition(debateReportSchemaZod, {
  name: 'debate_report',
  strict: true,
});
