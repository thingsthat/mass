import { log } from 'core/src/helpers/logger';
import { LLMRouter } from 'core/src/llm/router';
import { systemPromptPersonaContext } from 'core/src/personas/llm/systemprompt/systemPromptsPersonaContext';
import { questionnaireResponseSchema } from 'core/src/reports/llm/controllers/report-type-questionnaire/schemaQuestionnaireResponse';
import { systemPromptPersonaQuestionnaireResponse } from 'core/src/reports/llm/controllers/report-type-questionnaire/systemPromptsReportTypeQuestionnaire';
import { v4 as uuidv4 } from 'uuid';

import type { ProviderId } from 'core/src/llm/config';
import type { Persona } from 'core/src/personas/persona.types';
import type { QuestionnaireQuestion } from 'core/src/reports/reports.types';

/**
 * LLM configuration
 */
const PROVIDER: ProviderId = 'google';
const MODEL = 'gemini-3-flash-preview';

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

export type QuestionnairePersonaResponse = {
  responses: Array<{
    question_id: string;
    selected_option_ids: string[];
    reasoning?: string;
  }>;
};

/**
 * Get a persona's questionnaire responses
 */
export async function getPersonaQuestionnaireResponse(
  persona: Persona,
  questionnaire: { questions: QuestionnaireQuestion[] },
  files?: { data: string; mimeType: string; name?: string }[]
): Promise<QuestionnairePersonaResponse> {
  const maxResponseSize = 50000; // 50KB max response
  const maxRetries = DEFAULT_MAX_RETRIES;

  // Use the existing persona content if available, otherwise fall back to metadata
  const personaContent = systemPromptPersonaContext(persona, false);

  const systemPrompt = systemPromptPersonaQuestionnaireResponse(personaContent, questionnaire);

  const userPrompt = `Please complete the questionnaire below. Answer each question according to your personality, background, and values.`;

  // Create fallback response function
  const createFallbackResponse = (reason: string): QuestionnairePersonaResponse => ({
    responses: questionnaire.questions.map(q => ({
      question_id: q.id,
      selected_option_ids: q.required && q.options.length > 0 ? [q.options[0].id] : [],
      reasoning: `Unable to provide reasoning: ${reason}`,
    })),
  });

  // Retry logic with exponential backoff
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Clean prompts to remove emojis and other symbols, but preserve punctuation
      const safeRegex = /[^a-zA-Z0-9\s.,!?'":;()-]/g;
      const cleanedSystemPrompt = systemPrompt.replace(safeRegex, '');
      const cleanedUserPrompt = userPrompt.replace(safeRegex, '');

      const response = await LLMRouter.generate<QuestionnairePersonaResponse>(PROVIDER, {
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
        responseFormat: questionnaireResponseSchema,
        model: MODEL,
      });

      const text = response.text;

      // Validate response before processing
      validateResponse(text, maxResponseSize);

      if (!response.data) {
        throw new Error('Expected structured response but got none');
      }

      const parsedResponse = response.data;

      // Validate required fields
      if (!parsedResponse.responses || !Array.isArray(parsedResponse.responses)) {
        throw new Error('Questionnaire response missing required fields: responses array');
      }

      // Validate that all questions are answered
      const responseQuestionIds = new Set(parsedResponse.responses.map(r => r.question_id));

      // Check if all required questions are answered
      for (const question of questionnaire.questions) {
        if (question.required && !responseQuestionIds.has(question.id)) {
          throw new Error(`Required question ${question.id} was not answered`);
        }
      }

      // Validate option IDs are valid
      for (const responseItem of parsedResponse.responses) {
        const question = questionnaire.questions.find(q => q.id === responseItem.question_id);
        if (!question) {
          throw new Error(`Unknown question_id: ${responseItem.question_id}`);
        }

        // Validate selection type constraints
        if (question.selection_type === 'single' && responseItem.selected_option_ids.length > 1) {
          throw new Error(
            `Question ${question.id} is single-select but multiple options were selected`
          );
        }

        // Validate option IDs exist - also check for common format variations
        const validOptionIds = new Set(question.options.map(opt => opt.id));
        const validOptionIdsWithoutUnderscore = new Set(
          question.options.map(opt => opt.id.replace('_', ''))
        );

        for (const optionId of responseItem.selected_option_ids) {
          if (!validOptionIds.has(optionId)) {
            // Check if it's a format variation (missing underscore)
            if (validOptionIdsWithoutUnderscore.has(optionId)) {
              log.warn(
                'REPORTS',
                `Option ID format mismatch: received "${optionId}", expected format with underscore`
              );
              // Find the correct ID and replace it
              const correctId = question.options.find(
                opt => opt.id.replace('_', '') === optionId
              )?.id;
              if (correctId) {
                const index = responseItem.selected_option_ids.indexOf(optionId);
                responseItem.selected_option_ids[index] = correctId;
                continue;
              }
            }
            throw new Error(
              `Invalid option_id ${optionId} for question ${question.id}. Valid options: ${Array.from(validOptionIds).join(', ')}`
            );
          }
        }
      }

      return parsedResponse;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error(
        'REPORTS',
        `Persona ${persona.id} questionnaire - Attempt ${attempt + 1} failed:`,
        errorMessage
      );

      // If this is the last attempt, return fallback
      if (attempt === maxRetries) {
        log.error(
          'REPORTS',
          `Persona ${persona.id} questionnaire - All attempts failed, returning fallback response`
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
