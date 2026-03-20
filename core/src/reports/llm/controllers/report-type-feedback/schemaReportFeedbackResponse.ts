import { createSchemaDefinition, type SchemaDefinition } from 'core/src/llm/schemas/schema';
import { z } from 'zod';

export const personaResponseSchemaZod = z
  .object({
    response: z
      .string()
      .describe("The persona's main response to the question or their opinion on the topic."),
    sentiment: z
      .enum(['positive', 'neutral', 'negative'])
      .describe('The overall sentiment of the response.'),
    reasoning: z
      .string()
      .describe('Detailed explanation of the reasoning and motivation behind the opinion.'),
    emotional_tone: z
      .string()
      .describe(
        'The specific emotional tone or feelings expressed (e.g., excited, concerned, hopeful, frustrated).'
      ),
    suggestions: z
      .string()
      .describe('Any suggestions, improvements, or recommendations related to the topic.'),
    confidence_rating: z
      .number()
      .min(1)
      .max(10)
      .describe('How confident the persona is about their response (1-10 scale).'),
    example_anecdote: z
      .string()
      .describe('A personal example, story, or anecdote that illustrates their viewpoint.'),
    priority_importance: z
      .number()
      .min(1)
      .max(10)
      .describe('How important or high-priority this topic is to them (1-10 scale).'),
    clarifying_question: z
      .string()
      .describe('A question they would ask back for clarification or deeper engagement.'),
    alternative_viewpoints: z
      .string()
      .describe('Other perspectives or viewpoints they acknowledge or might consider.'),
    expected_actions: z
      .string()
      .describe('What actions or behaviors they would take or expect based on their opinion.'),
    key_takeaway: z
      .string()
      .describe('A concise summary or main takeaway that captures their core point.'),
    keywords: z
      .array(z.string().min(3).max(18))
      .min(2)
      .max(3)
      .describe(
        'A list of keywords that capture the main emotional, analytical, and significant points of the response. Must be a list of 2-3 keywords. Can be two words or single words.'
      ),
  })
  .describe('Comprehensive response format for persona answering questions or giving opinions.');

export const personaResponseSchema: SchemaDefinition = createSchemaDefinition(
  personaResponseSchemaZod,
  {
    name: 'persona_response',
    strict: true,
  }
);
