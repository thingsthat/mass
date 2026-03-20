/**
 * Unified report generation that combines feedback and debate analysis
 */

import { log } from 'core/src/helpers/logger';
import { LLMRouter } from 'core/src/llm/router';
import { reportUnifiedJsonSchema } from 'core/src/reports/llm/schemas/reportUnifiedSchema';
import { v4 as uuidv4 } from 'uuid';

import { systemPromptUnifiedReport } from './systemPromptsReportUnified';

import type { ProviderId } from 'core/src/llm/config';
import type { ReportPersonaResponse } from 'core/src/reports/reportResponses.types';
import type { ReportResult, ReportType } from 'core/src/reports/reports.types';

const MAX_RETRIES = 2;
const MAX_RESPONSE_SIZE = 500000; // 500KB
const MODEL = 'gemini-2.5-pro';
const PROVIDER: ProviderId = 'google';

/**
 * Validate LLM response size and content
 */
function validateResponse(text: string, maxSize: number): void {
  if (text.length > maxSize) {
    throw new Error(`Response too large: ${text.length} characters (max: ${maxSize})`);
  }
}

/**
 * Generate a unified report that combines feedback analysis and debate discussion
 */
export async function generateUnifiedReport(
  prompt: string,
  reportTypes: ReportType[],
  personaResponses?: ReportPersonaResponse[],
  debateHistory?: Array<{ timestamp: string; author_id: string; text: string }>,
  personas?: Array<{
    id: string;
    value: { name: string; age: number; occupation: string; text: string };
  }>,
  questionnaire?: { questions: any[] } | null,
  questionnaireResponses?: any[] | null,
  ideas?: any[] | null
): Promise<ReportResult> {
  const systemPrompt = systemPromptUnifiedReport(reportTypes);
  const responseFormat = reportUnifiedJsonSchema;

  const hasFeedback = reportTypes.includes('feedback');
  const hasDebate = reportTypes.includes('debate');
  const hasQuestionnaire = reportTypes.includes('questionnaire');
  const hasIdeas = reportTypes.includes('ideas');

  // Prepare the data for analysis
  let analysisData = `Original Question/Topic: ${prompt}\n\n`;

  // Add feedback data if available
  if (personaResponses && personaResponses.length > 0) {
    analysisData += `=== INDIVIDUAL FEEDBACK RESPONSES ===\n`;
    analysisData += `IMPORTANT: When referencing these personas in your report, use their EXACT persona_id as the author_id.\n\n`;
    personaResponses.forEach((response, index) => {
      analysisData += `Response ${index + 1}:\n`;
      analysisData += `Persona ID: ${response.persona_id} (MUST use this exact ID as author_id)\n`;
      analysisData += `Persona: ${response.persona_name} (Age: ${response.persona_age}, Occupation: ${response.persona_occupation})\n`;
      analysisData += `Response: ${response.response}\n`;
      analysisData += `Sentiment: ${response.sentiment}\n`;
      analysisData += `Reasoning: ${response.reasoning}\n`;
      analysisData += `Emotional Tone: ${response.emotional_tone}\n`;
      analysisData += `Confidence: ${response.confidence_rating}/10\n`;
      analysisData += `Priority Importance: ${response.priority_importance}/10\n`;
      analysisData += `Suggestions: ${response.suggestions}\n`;
      analysisData += `Example/Anecdote: ${response.example_anecdote}\n`;
      analysisData += `Key Takeaway: ${response.key_takeaway}\n`;
      analysisData += `Keywords: ${response.keywords.join(', ')}\n\n`;
    });
  }

  // Add debate data if available
  if (debateHistory && debateHistory.length > 0 && personas) {
    analysisData += `=== DEBATE DISCUSSION ===\n`;
    analysisData += `IMPORTANT: When referencing debate participants in your report, use their EXACT persona ID as the author_id.\n\n`;
    analysisData += `Participants:\n`;
    personas.forEach(persona => {
      analysisData += `- ID: ${persona.id} | ${persona.value.name} (Age: ${persona.value.age}, Occupation: ${persona.value.occupation})\n`;
    });
    analysisData += `\nDebate Conversation:\n`;
    debateHistory.forEach((message, index) => {
      const speakerName =
        message.author_id === 'moderator'
          ? 'Moderator'
          : personas.find(p => p.id === message.author_id)?.value.name || message.author_id;
      const speakerInfo =
        message.author_id === 'moderator'
          ? 'Moderator'
          : `${speakerName} (ID: ${message.author_id})`;
      analysisData += `${index + 1}. ${speakerInfo}: ${message.text}\n`;
    });
    analysisData += '\n';
  }

  // Add questionnaire data if available
  if (questionnaire && questionnaireResponses && questionnaireResponses.length > 0) {
    analysisData += `=== QUESTIONNAIRE RESULTS ===\n\n`;
    analysisData += `Questionnaire Structure:\n`;
    questionnaire.questions.forEach((q, idx) => {
      analysisData += `Question ${idx + 1} (ID: ${q.id}): ${q.question_text}\n`;
      analysisData += `  Selection type: ${q.selection_type}\n`;
      analysisData += `  Required: ${q.required}\n`;
      analysisData += `  Options:\n`;
      q.options.forEach((opt, optIdx) => {
        analysisData += `    ${optIdx + 1}. ${opt.text} (ID: ${opt.id})\n`;
      });
      analysisData += '\n';
    });

    // Aggregate questionnaire responses for summary
    analysisData += `Response Summary:\n`;
    questionnaire.questions.forEach((q, idx) => {
      const responsesForQuestion = questionnaireResponses.filter(r =>
        r.responses.some((resp: any) => resp.question_id === q.id)
      );
      analysisData += `Question ${idx + 1}: ${responsesForQuestion.length} responses\n`;
    });
    analysisData += '\n';
  }

  // Add ideas data if available
  if (ideas && ideas.length > 0) {
    analysisData += `=== GENERATED IDEAS ===\n`;
    analysisData += `IMPORTANT: When referencing these personas in your report, use their EXACT persona_id as the author_id.\n\n`;
    ideas.forEach((idea, index) => {
      analysisData += `Idea ${index + 1}:\n`;
      analysisData += `Persona ID: ${idea.persona_id} (MUST use this exact ID as author_id)\n`;
      analysisData += `Persona: ${idea.persona_name} (Age: ${idea.persona_age}, Occupation: ${idea.persona_occupation})\n`;
      analysisData += `Idea: ${idea.idea}\n`;
      analysisData += `Reasoning: ${idea.reasoning}\n`;
      analysisData += `Appeal Score: ${idea.appeal_score}/10\n\n`;
    });
  }

  let promptInstructions = 'Please analyze this data and generate a comprehensive unified report';
  const typeCount = [hasFeedback, hasDebate, hasQuestionnaire, hasIdeas].filter(Boolean).length;

  if (typeCount > 1) {
    const types: string[] = [];
    if (hasFeedback) {
      types.push('individual feedback responses');
    }
    if (hasDebate) {
      types.push('debate discussion');
    }
    if (hasQuestionnaire) {
      types.push('questionnaire results');
    }
    if (hasIdeas) {
      types.push('generated ideas');
    }
    promptInstructions += ` that combines insights from ${types.join(', ')}.`;
  } else {
    if (hasFeedback) {
      promptInstructions += ' based on the individual feedback responses.';
    } else if (hasDebate) {
      promptInstructions += ' based on the debate discussion.';
    } else if (hasQuestionnaire) {
      promptInstructions += ' based on the questionnaire results.';
    } else if (hasIdeas) {
      promptInstructions += ' based on the generated ideas.';
    }
  }

  const userPrompt = `${analysisData}

${promptInstructions}`;

  // Retry logic with exponential backoff
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Clean prompts to remove emojis and other symbols, but preserve punctuation
      const safeRegex = /[^a-zA-Z0-9\s.,!?'":;()-]/g;
      const cleanedSystemPrompt = systemPrompt.replace(safeRegex, '');
      const cleanedUserPrompt = userPrompt.replace(safeRegex, '');

      const response = await LLMRouter.generate<ReportResult>(PROVIDER, {
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
      validateResponse(text, MAX_RESPONSE_SIZE);

      if (!response.data) {
        throw new Error('Expected structured response but got none');
      }

      const parsedResponse = response.data;

      // Validate required fields for unified report
      if (!parsedResponse.summary || !parsedResponse.title) {
        throw new Error('Unified report response missing required fields (title, summary)');
      }

      // Add the report types to the response
      parsedResponse.report_types = reportTypes;

      return parsedResponse;
    } catch (error) {
      let errorMessage = error instanceof Error ? error.message : 'Unknown error';

      log.error(
        'REPORTS',
        `Unified report generation attempt ${attempt + 1} failed:`,
        errorMessage
      );

      if (attempt === MAX_RETRIES) {
        log.error('REPORTS', 'All unified report generation attempts failed');
        throw new Error(
          `Failed to generate unified report after ${MAX_RETRIES + 1} attempts: ${errorMessage}`
        );
      }

      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('Unified report generation failed - should not reach here');
}
