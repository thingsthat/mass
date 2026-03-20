import { log } from 'core/src/helpers/logger';
import { LLMRouter, clearProviderCache } from 'core/src/llm/router';
import { systemPromptPersonaContext } from 'core/src/personas/llm/systemprompt/systemPromptsPersonaContext';
import { feedbackReportSchema } from 'core/src/reports/llm/controllers/report-type-feedback/schemaReportFeedback';
import {
  systemPromptPersonaResponse,
  systemPromptFeedbackReport,
} from 'core/src/reports/llm/controllers/report-type-feedback/systemPromptsReportTypeFeedback';
import { v4 as uuidv4 } from 'uuid';

import { personaResponseSchema } from './schemaReportFeedbackResponse';

import type { ProviderId } from 'core/src/llm/config';
import type { Persona } from 'core/src/personas/persona.types';
import type { ReportPersonaResponse } from 'core/src/reports/reportResponses.types';
import type { ReportFeedback } from 'core/src/reports/reports.types';

const PROVIDER: ProviderId = 'google';
const PERSONA_RESPONSE_MODEL = 'gemini-3-flash-preview';
const REPORT_GENERATION_MODEL = 'gemini-3-flash-preview';

/**
 * Default configuration values
 */
const DEFAULT_MAX_RETRIES = 2;

/**
 * Validate response size and JSON structure
 */
function validateResponse(text: string, maxSize: number): void {
  if (text.length > maxSize) {
    throw new Error(`Response too large: ${text.length} characters (max: ${maxSize})`);
  }

  // Check for obvious signs of looping or malformed content
  const repetitionThreshold = 0.5; // 30% repetition threshold
  const lines = text.split('\n');
  const uniqueLines = new Set(lines);
  const repetitionRatio = 1 - uniqueLines.size / lines.length;

  if (repetitionRatio > repetitionThreshold) {
    throw new Error(
      `Response appears to contain excessive repetition (${Math.round(repetitionRatio * 100)}%)`
    );
  }

  // Basic JSON validation
  try {
    JSON.parse(text);
  } catch (error) {
    throw new Error(
      `Invalid JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get a persona's response to a question or request for opinion with robust error handling
 */
export async function getPersonaResponseForReport(
  persona: Persona,
  prompt: string,
  files?: { data: string; mimeType: string; name?: string }[]
): Promise<ReportPersonaResponse> {
  const maxResponseSize = 200000; // 200KB max response
  const maxRetries = DEFAULT_MAX_RETRIES;

  // Use the existing persona content if available, otherwise fall back to metadata
  const personaContent = systemPromptPersonaContext(persona, false);

  const systemPrompt = systemPromptPersonaResponse(personaContent);

  const userPrompt = `What do you think about this: ${prompt}

Respond naturally as you would in conversation.`;

  // Create fallback response function
  const createFallbackResponse = (reason: string): ReportPersonaResponse => ({
    persona_id: persona.id,
    persona_name: (persona.details.name as string) || 'Anonymous',
    persona_age: persona.details.metadata.age as number,
    persona_occupation: (persona.details.metadata.job_title as string) || '',
    response: "I'd rather not get into this topic right now.",
    sentiment: 'neutral',
    reasoning: `I don't really want to share my thoughts on this. (${reason})`,
    emotional_tone: 'reserved',
    suggestions: 'Maybe we could talk about something else?',
    confidence_rating: 5,
    example_anecdote: 'I usually keep my opinions on some topics to myself.',
    priority_importance: 3,
    clarifying_question: "Is there something else you'd like to know about?",
    alternative_viewpoints: 'I know other people probably have strong feelings about this.',
    expected_actions: 'I would probably just stay quiet and listen to what others say.',
    key_takeaway: "Sometimes it's better to just not get involved in certain discussions.",
    timestamp: new Date().toISOString(),
    keywords: [],
  });

  // Retry logic with exponential backoff
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Clean prompts to remove emojis and other symbols, but preserve punctuation
      const safeRegex = /[^a-zA-Z0-9\s.,!?'":;()-]/g;
      const cleanedSystemPrompt = systemPrompt.replace(safeRegex, '');
      const cleanedUserPrompt = userPrompt.replace(safeRegex, '');

      const response = await LLMRouter.generate<ReportPersonaResponse>(PROVIDER, {
        messages: [
          {
            id: uuidv4(),
            role: 'user',
            content: cleanedUserPrompt,
            timestamp: new Date().toISOString(),
          },
        ],
        systemMessage: {
          id: uuidv4(),
          role: 'system',
          content: cleanedSystemPrompt,
          timestamp: new Date().toISOString(),
        },
        files,
        responseFormat: personaResponseSchema,
        model: PERSONA_RESPONSE_MODEL,
      });

      const text = response.text;

      // Validate response before processing
      validateResponse(text, maxResponseSize);

      if (!response.data) {
        throw new Error('Expected structured response but got none');
      }

      const parsedResponse = response.data;

      // Validate required fields
      if (!parsedResponse.response || !parsedResponse.sentiment) {
        throw new Error('Report Persona Response missing required fields response and sentiment');
      }

      return {
        persona_id: persona.id,
        persona_name: (persona.details.name as string) || 'Anonymous',
        persona_age: persona.details.metadata.age as number,
        persona_occupation: (persona.details.metadata.job_title as string) || '',
        response: parsedResponse.response,
        sentiment: parsedResponse.sentiment,
        reasoning: parsedResponse.reasoning || 'No reasoning provided',
        emotional_tone: parsedResponse.emotional_tone || 'neutral',
        suggestions: parsedResponse.suggestions || '',
        confidence_rating: parsedResponse.confidence_rating || 5,
        example_anecdote: parsedResponse.example_anecdote || '',
        priority_importance: parsedResponse.priority_importance || 5,
        clarifying_question: parsedResponse.clarifying_question || '',
        alternative_viewpoints: parsedResponse.alternative_viewpoints || '',
        expected_actions: parsedResponse.expected_actions || '',
        key_takeaway: parsedResponse.key_takeaway || '',
        timestamp: new Date().toISOString(),
        keywords: parsedResponse.keywords || [],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('REPORTS', `Persona ${persona.id} - Attempt ${attempt + 1} failed:`, {
        errorMessage,
        errorStack: error instanceof Error ? error.stack : undefined,
        model: PERSONA_RESPONSE_MODEL,
      });

      // If this is the last attempt, return fallback
      if (attempt === maxRetries) {
        log.error(
          'REPORTS',
          `Persona ${persona.id} - All attempts failed, returning fallback response`
        );
        return createFallbackResponse(`All ${maxRetries + 1} attempts failed: ${errorMessage}`);
      }

      // Exponential backoff: wait before retrying
      const backoffTime = Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10 seconds
      await sleep(backoffTime);
    }
  }

  // This should never be reached, but TypeScript requires it
  return createFallbackResponse('Unexpected error in retry logic');
}

/**
 * Generate a comprehensive report from all persona responses with robust error handling
 */
export async function generateFeedbackReport(
  prompt: string,
  personaResponses: ReportPersonaResponse[]
): Promise<ReportFeedback> {
  // Clear provider cache to ensure fresh instance with current environment variables
  clearProviderCache();
  const maxResponseSize = 500000; // 500KB max response
  const maxRetries = DEFAULT_MAX_RETRIES;

  const responseFormat = feedbackReportSchema;
  const systemPrompt = systemPromptFeedbackReport();

  const userPrompt = `Original prompt/question: "${prompt}"

Persona responses:
${personaResponses.map(r => `${r.persona_id}: ${r.persona_name} (${r.persona_age}, ${r.persona_occupation}): "${r.response}" [Sentiment: ${r.sentiment}]`).join('\n')}

Please analyze these responses and generate a comprehensive feedback report.`;

  // Retry logic with exponential backoff
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Clean prompts to remove emojis and other symbols, but preserve punctuation
      const safeRegex = /[^a-zA-Z0-9\s.,!?'":;()-]/g;
      const cleanedSystemPrompt = systemPrompt.replace(safeRegex, '');
      const cleanedUserPrompt = userPrompt.replace(safeRegex, '');

      const response = await LLMRouter.generate<ReportFeedback>(PROVIDER, {
        messages: [
          {
            id: uuidv4(),
            role: 'user',
            content: cleanedUserPrompt,
            timestamp: new Date().toISOString(),
          },
        ],
        systemMessage: {
          id: uuidv4(),
          role: 'system',
          content: cleanedSystemPrompt,
          timestamp: new Date().toISOString(),
        },
        responseFormat,
        model: REPORT_GENERATION_MODEL,
      });

      const text = response.text;

      // Validate response before processing
      validateResponse(text, maxResponseSize);

      if (!response.data) {
        throw new Error('Expected structured response but got none');
      }

      const parsedResponse = response.data;

      // Validate required fields for report
      if (!parsedResponse.summary) {
        throw new Error('Report response missing required fields summary');
      }

      return parsedResponse;
    } catch (error) {
      let errorMessage = error instanceof Error ? error.message : 'Unknown error';

      log.error('REPORTS', `Report generation - Attempt ${attempt + 1} failed:`, errorMessage);

      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        log.error('REPORTS', 'Report generation - All attempts failed');
        throw new Error(
          `Failed to generate report after ${maxRetries + 1} attempts: ${errorMessage}`
        );
      }

      // Exponential backoff: wait before retrying
      const backoffTime = Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10 seconds
      await sleep(backoffTime);
    }
  }

  // This should never be reached, but TypeScript requires it
  throw new Error('Unexpected error in report generation retry logic');
}
