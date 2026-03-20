import { createSchemaDefinition, type SchemaDefinition } from 'core/src/llm/schemas/schema';
import { z } from 'zod';

const ideaItemSchemaZod = z.object({
  id: z.string(),
  idea: z.string(),
  persona_id: z.string(),
  persona_name: z.string(),
  persona_age: z.number(),
  persona_occupation: z.string(),
  reasoning: z.string(),
  appeal_score: z.number(),
});

const ideaCategorySchemaZod = z.object({
  category: z.string(),
  idea_ids: z
    .array(z.string())
    .describe('Array of idea IDs from the ideas array that belong to this category.'),
  percentage: z.number(),
});

const confidenceSummarySchemaZod = z.object({
  confidence_patterns: z.string().describe('One sentence about appeal score patterns.'),
  confidence_insights: z.string().describe('One sentence about what appeal scores reveal.'),
});

export const ideasReportSchemaZod = z
  .object({
    title: z
      .string()
      .describe('The title of the report, must be simple and concise and neutral to the results.'),
    summary: z
      .string()
      .describe('A comprehensive summary of the ideas generated and overall patterns.'),
    positive_percentage: z
      .number()
      .describe(
        'Percentage of ideas that are positive/highly appealing (based on appeal scores 8-10).'
      ),
    neutral_percentage: z
      .number()
      .describe('Percentage of ideas that are moderately appealing (based on appeal scores 5-7).'),
    negative_percentage: z
      .number()
      .describe('Percentage of ideas that are less appealing (based on appeal scores 1-4).'),
    verdict_summary: z
      .string()
      .describe(
        'A brief, punchy summary of the overall quality and appeal of the generated ideas.'
      ),
    verdict_best_quote: z
      .string()
      .describe('The most compelling or representative idea from all generated ideas.'),
    ideas: z
      .array(ideaItemSchemaZod)
      .optional()
      .describe(
        'Optional: You may omit this field entirely. If included, it should match the input ideas exactly, but it is not required.'
      ),
    idea_categories: z
      .array(ideaCategorySchemaZod)
      .optional()
      .describe(
        'Optional: Only include if clear themes emerge. Reference ideas by their ID from the ideas array, do not duplicate idea content. Format: { category: string, idea_ids: string[], percentage: number }'
      ),
    top_ideas: z
      .array(z.string())
      .optional()
      .describe(
        'Optional: Only include top 5-10 ideas. Reference by ID from ideas array, do not duplicate content. Format: string[] of idea IDs.'
      ),
    detailed: z
      .string()
      .describe(
        'Brief analysis paragraph (2-3 sentences) summarizing key patterns and insights. Keep it concise.'
      ),
    confidence_summary: confidenceSummarySchemaZod.describe(
      'Brief summary of appeal score patterns.'
    ),
  })
  .describe('Response format for analyzing generated ideas and creating a comprehensive report.');

export const ideasReportSchema: SchemaDefinition = createSchemaDefinition(ideasReportSchemaZod, {
  name: 'ideas_report',
  strict: true,
});
