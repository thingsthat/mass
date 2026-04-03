import { v4 as uuidv4 } from 'uuid';

import { log } from 'core/src/helpers/logger';
import { LLMRouter, clearProviderCache } from 'core/src/llm/router';
import { questionnaireExtractionSchema } from 'core/src/reports/llm/controllers/report-type-questionnaire/schemaQuestionnaireExtraction';
import { systemPromptQuestionnaireExtraction } from 'core/src/reports/llm/controllers/report-type-questionnaire/systemPromptsReportTypeQuestionnaire';

import type { ProviderId } from 'core/src/llm/config';
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

/**
 * Extract questionnaire structure from user prompt
 */
export async function extractQuestionnaireFromPrompt(
  prompt: string
): Promise<{ questions: QuestionnaireQuestion[] }> {
  clearProviderCache();
  const maxResponseSize = 50000; // 50KB max response
  const maxRetries = DEFAULT_MAX_RETRIES;

  const responseFormat = questionnaireExtractionSchema;
  const systemPrompt = systemPromptQuestionnaireExtraction();

  const userPrompt = `Extract the questionnaire structure from the following user prompt:

"${prompt}"

Identify all questions, their options, selection types, and whether they are required or optional.`;

  // Retry logic with exponential backoff
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Clean prompts to remove emojis and other symbols, but preserve punctuation
      const safeRegex = /[^a-zA-Z0-9\s.,!?'":;()-]/g;
      const cleanedSystemPrompt = systemPrompt.replace(safeRegex, '');
      const cleanedUserPrompt = userPrompt.replace(safeRegex, '');

      const response = await LLMRouter.generate<{ questions: QuestionnaireQuestion[] }>(PROVIDER, {
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
      if (!parsedResponse.questions || !Array.isArray(parsedResponse.questions)) {
        throw new Error('Questionnaire extraction missing required fields: questions array');
      }

      if (parsedResponse.questions.length === 0) {
        throw new Error('Questionnaire extraction returned no questions');
      }

      // Validate each question has required fields
      for (const question of parsedResponse.questions) {
        if (!question.id || !question.question_text || !question.options) {
          throw new Error('Question missing required fields: id, question_text, or options');
        }
        if (!Array.isArray(question.options) || question.options.length === 0) {
          throw new Error('Question must have at least one option');
        }
        for (const option of question.options) {
          if (!option.id || !option.text) {
            throw new Error('Option missing required fields: id or text');
          }
        }
      }

      return parsedResponse;
    } catch (error) {
      let errorMessage = error instanceof Error ? error.message : 'Unknown error';

      log.error(
        'REPORTS',
        `Questionnaire extraction - Attempt ${attempt + 1} failed:`,
        errorMessage
      );

      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        log.error('REPORTS', `Questionnaire extraction - All attempts failed`);
        throw new Error(
          `Failed to extract questionnaire after ${maxRetries + 1} attempts: ${errorMessage}`
        );
      }

      // Exponential backoff: wait before retrying
      const backoffTime = Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10 seconds
      await sleep(backoffTime);
    }
  }

  // This should never be reached, but TypeScript requires it
  throw new Error('Unexpected error in questionnaire extraction retry logic');
}
