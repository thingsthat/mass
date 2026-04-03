import { v4 as uuidv4 } from 'uuid';

import { log } from 'core/src/helpers/logger';
import { LLMRouter, clearProviderCache } from 'core/src/llm/router';
import { questionnaireReportSchema } from 'core/src/reports/llm/controllers/report-type-questionnaire/schemaReportQuestionnaire';
import { systemPromptQuestionnaireReport } from 'core/src/reports/llm/controllers/report-type-questionnaire/systemPromptsReportTypeQuestionnaire';

import type { ProviderId } from 'core/src/llm/config';
import type { QuestionnairePersonaResponse } from 'core/src/reports/llm/controllers/report-type-questionnaire/questionnaireResponseLLM';
import type {
  QuestionnaireQuestion,
  QuestionnaireQuestionResult,
  ReportQuestionnaire,
} from 'core/src/reports/reports.types';

/**
 * LLM configuration
 */
const PROVIDER: ProviderId = 'google';
const MODEL = 'gemini-2.5-pro';

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
 * Aggregate questionnaire responses into results with counts and percentages
 */
function aggregateQuestionnaireResponses(
  questions: QuestionnaireQuestion[],
  personaResponses: QuestionnairePersonaResponse[]
): QuestionnaireQuestionResult[] {
  const results: QuestionnaireQuestionResult[] = [];

  for (const question of questions) {
    // Count selections for each option
    const optionCounts = new Map<string, number>();
    let totalResponses = 0;

    for (const personaResponse of personaResponses) {
      const response = personaResponse.responses.find(r => r.question_id === question.id);
      if (response) {
        totalResponses++;
        // For multiple-select, count all selections
        for (const optionId of response.selected_option_ids) {
          optionCounts.set(optionId, (optionCounts.get(optionId) || 0) + 1);
        }
      }
    }

    // Calculate percentages
    const optionResults = question.options.map(option => {
      const count = optionCounts.get(option.id) || 0;
      const percentage = totalResponses > 0 ? (count / totalResponses) * 100 : 0;

      return {
        option_id: option.id,
        option_text: option.text,
        count,
        percentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
      };
    });

    results.push({
      question_id: question.id,
      question_text: question.question_text,
      options: optionResults,
      total_responses: totalResponses,
      selection_type: question.selection_type,
      required: question.required,
    });
  }

  return results;
}

/**
 * Generate a comprehensive questionnaire report from aggregated responses
 */
export async function generateQuestionnaireReport(
  prompt: string,
  questionnaire: { questions: QuestionnaireQuestion[] },
  personaResponses: QuestionnairePersonaResponse[]
): Promise<ReportQuestionnaire> {
  // Clear provider cache to ensure fresh instance with current environment variables
  clearProviderCache();
  const maxResponseSize = 500000; // 500KB max response
  const maxRetries = DEFAULT_MAX_RETRIES;

  // Aggregate responses into results
  const questionResults = aggregateQuestionnaireResponses(
    questionnaire.questions,
    personaResponses
  );

  const responseFormat = questionnaireReportSchema;
  const systemPrompt = systemPromptQuestionnaireReport();

  // Build user prompt with questionnaire structure, aggregated results, and persona reasoning
  const questionsText = questionnaire.questions
    .map((q, idx) => {
      const result = questionResults.find(r => r.question_id === q.id);
      const optionsText = q.options
        .map(opt => {
          const optResult = result?.options.find(o => o.option_id === opt.id);
          return `  - ${opt.text} (${optResult?.count || 0} responses, ${optResult?.percentage || 0}%)`;
        })
        .join('\n');

      // Collect reasoning for this question by option
      const reasoningByOption = new Map<string, string[]>();
      for (const personaResponse of personaResponses) {
        const response = personaResponse.responses.find(r => r.question_id === q.id);
        if (response && response.reasoning) {
          for (const optionId of response.selected_option_ids) {
            let reasoningArray = reasoningByOption.get(optionId);
            if (!reasoningArray) {
              reasoningArray = [];
              reasoningByOption.set(optionId, reasoningArray);
            }
            reasoningArray.push(response.reasoning);
          }
        }
      }

      // Build reasoning text for each option
      let reasoningText = '';
      if (reasoningByOption.size > 0) {
        reasoningText = '\n\nReasoning from personas who selected each option:\n';
        for (const option of q.options) {
          const reasonings = reasoningByOption.get(option.id) || [];
          if (reasonings.length > 0) {
            reasoningText += `\n${option.text}:\n`;
            reasonings.forEach((reasoning, i) => {
              reasoningText += `  ${i + 1}. ${reasoning}\n`;
            });
          }
        }
      }

      return `Question ${idx + 1}: ${q.question_text}
Options:
${optionsText}
Total responses: ${result?.total_responses || 0}
Selection type: ${q.selection_type}
Required: ${q.required}${reasoningText}`;
    })
    .join('\n\n');

  const userPrompt = `Original prompt/question: "${prompt}"

Questionnaire Structure and Results:

${questionsText}

Please analyze these questionnaire results and generate a comprehensive report with insights, patterns, and an overall summary. In the detailed report section, include analysis of WHY personas chose certain options based on their reasoning, identifying patterns in motivations, values, and thought processes that led to their choices.`;

  // Retry logic with exponential backoff
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Clean prompts to remove emojis and other symbols, but preserve punctuation
      const safeRegex = /[^a-zA-Z0-9\s.,!?'":;()-]/g;
      const cleanedSystemPrompt = systemPrompt.replace(safeRegex, '');
      const cleanedUserPrompt = userPrompt.replace(safeRegex, '');

      const response = await LLMRouter.generate<ReportQuestionnaire>(PROVIDER, {
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

      // Validate required fields for report
      if (!parsedResponse.summary || !parsedResponse.question_results) {
        throw new Error(
          'Questionnaire report response missing required fields summary or question_results'
        );
      }

      // Replace question_results with our calculated ones to ensure accuracy
      parsedResponse.question_results = questionResults;
      parsedResponse.questionnaire_questions = questionnaire.questions;

      return parsedResponse;
    } catch (error) {
      let errorMessage = error instanceof Error ? error.message : 'Unknown error';

      log.error(
        'REPORTS',
        `Questionnaire report generation - Attempt ${attempt + 1} failed:`,
        errorMessage
      );

      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        log.error('REPORTS', 'Questionnaire report generation - All attempts failed');
        throw new Error(
          `Failed to generate questionnaire report after ${maxRetries + 1} attempts: ${errorMessage}`
        );
      }

      // Exponential backoff: wait before retrying
      const backoffTime = Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10 seconds
      await sleep(backoffTime);
    }
  }

  // This should never be reached, but TypeScript requires it
  throw new Error('Unexpected error in questionnaire report generation retry logic');
}
