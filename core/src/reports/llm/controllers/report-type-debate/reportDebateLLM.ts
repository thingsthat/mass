import { v4 as uuidv4 } from 'uuid';

import { log } from 'core/src/helpers/logger';
import { LLMRouter } from 'core/src/llm/router';
import { systemPromptPersonaContext } from 'core/src/personas/llm/systemprompt/systemPromptsPersonaContext';
import { debateReportSchema } from 'core/src/reports/llm/controllers/report-type-debate/schemaReportDebate';
import {
  systemPromptDebateModerator,
  systemPromptDebateOrchestrator,
  systemPromptDebateParticipant,
  systemPromptDebateReport,
} from 'core/src/reports/llm/controllers/report-type-debate/systemPromptsReportTypeDebate';

import type { ProviderId } from 'core/src/llm/config';
import type { Persona } from 'core/src/personas/persona.types';
import type { ReportDebate } from 'core/src/reports/reports.types';

const PROVIDER: ProviderId = 'google';
const MODEL = 'gemini-3-flash-preview';

/**
 * Debate configuration defaults (overridden by options when provided)
 */
const DEFAULT_MAX_TURNS = 20;
const DEFAULT_DURATION_MINUTES = 2;
const MODERATOR_ID = 'moderator';

export type DebateReportOptions = {
  maxRounds?: number;
  durationMinutes?: number;
};

/**
 * Debate message type
 */
type DebateMessage = {
  timestamp: string;
  author_id: string;
  text: string;
};

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate a moderator question or follow-up for the debate
 */
async function generateModeratorMessage(
  prompt: string,
  debateHistory: DebateMessage[],
  files?: { data: string; mimeType: string; name?: string }[]
): Promise<string> {
  const systemPrompt = systemPromptDebateModerator();

  const recentMessages = debateHistory.slice(-5); // Get last 5 messages for context
  const conversationContext =
    recentMessages.length > 0
      ? `Recent discussion:\n${recentMessages.map(m => `${m.author_id === MODERATOR_ID ? 'Moderator' : 'Participant'}: ${m.text}`).join('\n')}`
      : 'This is the start of the debate.';

  const userPrompt = `Original topic: "${prompt}"

${conversationContext}

Generate a thoughtful question or follow-up to keep the debate engaging. If this is the start, ask an opening question. If the debate is ongoing, respond to recent points or ask for clarification.`;

  const response = await LLMRouter.generate(PROVIDER, {
    messages: [
      { id: uuidv4(), role: 'user', content: userPrompt, timestamp: new Date().toISOString() },
    ],
    systemMessage: {
      id: uuidv4(),
      role: 'system',
      content: systemPrompt,
      timestamp: new Date().toISOString(),
    },
    files,
    temperature: 0.8,
  });

  return response.text.trim();
}

async function selectNextSpeaker(
  personas: Persona[],
  debateHistory: DebateMessage[]
): Promise<{ personaId: string; isResponseToQuestion: boolean }> {
  const systemPrompt = systemPromptDebateOrchestrator();

  const recentMessages = debateHistory.slice(-3);
  const participantSummary = personas
    .map(
      p =>
        `${p.id}: ${p.details.name} (${p.details.metadata?.age}, ${p.details.metadata?.job_title})`
    )
    .join('\n');

  const conversationContext =
    recentMessages.length > 0
      ? `Recent messages:\n${recentMessages.map(m => `${m.author_id}: ${m.text}`).join('\n')}`
      : 'No recent messages.';

  const userPrompt = `Participants:
${participantSummary}

${conversationContext}

Who should speak next? Respond in this exact format:
PERSONA_ID: [persona_id]
RESPONDING_TO_QUESTION: [true/false]`;

  const response = await LLMRouter.generate(PROVIDER, {
    messages: [
      { id: uuidv4(), role: 'user', content: userPrompt, timestamp: new Date().toISOString() },
    ],
    systemMessage: {
      id: uuidv4(),
      role: 'system',
      content: systemPrompt,
      timestamp: new Date().toISOString(),
    },
    temperature: 0.7,
  });

  const lines = response.text.trim().split('\n');
  const personaLine = lines.find(line => line.startsWith('PERSONA_ID:'));
  const responseLine = lines.find(line => line.startsWith('RESPONDING_TO_QUESTION:'));

  if (!personaLine || !responseLine) {
    const randomPersona = personas[Math.floor(Math.random() * personas.length)];
    return { personaId: randomPersona.id, isResponseToQuestion: true };
  }

  const personaId = personaLine.split(':')[1].trim();
  const isResponseToQuestion = responseLine.split(':')[1].trim().toLowerCase() === 'true';
  return { personaId, isResponseToQuestion };
}

/**
 * Generate a persona's response in the debate context
 */
async function generateDebateReportPersonaResponse(
  persona: Persona,
  originalPrompt: string,
  debateHistory: DebateMessage[],
  isResponseToQuestion: boolean,
  files?: { data: string; mimeType: string; name?: string }[]
): Promise<string> {
  const personaContent = systemPromptPersonaContext(persona, false);

  const systemPrompt = systemPromptDebateParticipant(personaContent, isResponseToQuestion);

  const recentMessages = debateHistory.slice(-5);
  const conversationContext =
    recentMessages.length > 0
      ? `Recent discussion:\n${recentMessages.map(m => `${m.author_id === MODERATOR_ID ? 'Moderator' : m.author_id}: ${m.text}`).join('\n')}`
      : 'This is the start of the debate.';

  const userPrompt = `Debate topic: "${originalPrompt}"

${conversationContext}

${
  isResponseToQuestion
    ? 'The moderator just asked a question. Respond to it naturally.'
    : 'Someone just made a comment. React to what they said - you can agree, disagree, build on their point, or offer a different perspective.'
}

Respond naturally as this person would in conversation (2-3 sentences). Don't start with formulaic phrases.`;

  const response = await LLMRouter.generate(PROVIDER, {
    messages: [
      { id: uuidv4(), role: 'user', content: userPrompt, timestamp: new Date().toISOString() },
    ],
    systemMessage: {
      id: uuidv4(),
      role: 'system',
      content: systemPrompt,
      timestamp: new Date().toISOString(),
    },
    temperature: 0.8,
    files,
  });

  return response.text.trim();
}

/**
 * Generate final debate summary and analysis
 */
async function generateDebateSummary(
  prompt: string,
  debateHistory: DebateMessage[],
  personas: Persona[]
): Promise<ReportDebate> {
  const responseFormat = debateReportSchema;

  const systemPrompt = systemPromptDebateReport();

  const debateTranscript = debateHistory
    .map(
      m => `${m.timestamp} - ${m.author_id === MODERATOR_ID ? 'Moderator' : m.author_id}: ${m.text}`
    )
    .join('\n');

  const personaInfo = personas
    .map(
      p => `${p.id}: ${p.details.name} (${p.details.metadata.age}, ${p.details.metadata.job_title})`
    )
    .join('\n');

  const userPrompt = `Original debate topic: "${prompt}"

Participants:
${personaInfo}

Complete debate transcript:
${debateTranscript}

Please analyze this debate and generate a comprehensive debate report.`;

  const response = await LLMRouter.generate<ReportDebate>(PROVIDER, {
    messages: [
      { id: uuidv4(), role: 'user', content: userPrompt, timestamp: new Date().toISOString() },
    ],
    systemMessage: {
      id: uuidv4(),
      role: 'system',
      content: systemPrompt,
      timestamp: new Date().toISOString(),
    },
    responseFormat,
    model: MODEL,
  });

  if (!response.data) {
    throw new Error('Expected structured response but got none');
  }

  const parsedResponse = response.data;

  // Ensure the debate history is included
  parsedResponse.debate = debateHistory;

  // Create personas array from the personas that participated
  parsedResponse.personas = personas.map(persona => ({
    id: persona.id,
    value: {
      name: persona.details.name as string,
      age: persona.details.metadata.age as number,
      occupation: persona.details.metadata.job_title as string,
      text: `Representative quote from ${persona.details.name}`, // This will be overridden by LLM if provided
    },
  }));

  return parsedResponse;
}

/**
 * Generate a comprehensive debate report with live debate simulation
 */
export async function generateDebateReport(
  prompt: string,
  personas: Persona[],
  files?: { data: string; mimeType: string; name?: string }[],
  options?: DebateReportOptions
): Promise<{ report: ReportDebate; debateHistory: DebateMessage[] }> {
  const maxRounds = options?.maxRounds ?? DEFAULT_MAX_TURNS;
  const durationMinutes = options?.durationMinutes ?? DEFAULT_DURATION_MINUTES;
  const durationMs = durationMinutes > 0 ? durationMinutes * 60 * 1000 : Number.POSITIVE_INFINITY;

  const debateHistory: DebateMessage[] = [];
  const startTime = Date.now();
  let turnCount = 0;

  try {
    // Start with moderator opening question
    const openingQuestion = await generateModeratorMessage(prompt, debateHistory, files);
    const moderatorMessage: DebateMessage = {
      timestamp: new Date().toISOString(),
      author_id: MODERATOR_ID,
      text: openingQuestion,
    };
    debateHistory.push(moderatorMessage);
    log.info('REPORTS', 'Moderator:', openingQuestion);

    // Main debate loop: stop when time or round limit reached
    while (Date.now() - startTime < durationMs && turnCount < maxRounds) {
      turnCount++;

      const { personaId, isResponseToQuestion } = await selectNextSpeaker(personas, debateHistory);
      const selectedPersona = personas.find(p => p.id === personaId);

      if (!selectedPersona) {
        continue;
      }

      // Generate persona response
      const personaResponseDebate = await generateDebateReportPersonaResponse(
        selectedPersona,
        prompt,
        debateHistory,
        isResponseToQuestion,
        files
      );

      const personaMessage: DebateMessage = {
        timestamp: new Date().toISOString(),
        author_id: personaId,
        text: personaResponseDebate,
      };
      debateHistory.push(personaMessage);
      log.info(
        'REPORTS',
        `Round ${turnCount}: ${selectedPersona.details.name}:`,
        personaResponseDebate
      );

      // Occasionally add moderator follow-ups (every 3-4 turns)
      if (turnCount % 3 === 0 && turnCount < maxRounds - 2) {
        const followUp = await generateModeratorMessage(prompt, debateHistory);
        const moderatorFollowUp: DebateMessage = {
          timestamp: new Date().toISOString(),
          author_id: MODERATOR_ID,
          text: followUp,
        };
        debateHistory.push(moderatorFollowUp);
        log.info('REPORTS', 'Moderator:', followUp);
      }

      // Small delay to prevent overwhelming the API
      await sleep(1000);
    }

    // Ensure debate doesn't end on a moderator message
    if (
      debateHistory.length > 0 &&
      debateHistory[debateHistory.length - 1].author_id === MODERATOR_ID
    ) {
      debateHistory.pop();
    }

    // Generate final summary and analysis
    const report = await generateDebateSummary(prompt, debateHistory, personas);

    return { report, debateHistory };
  } catch (error) {
    log.error('REPORTS', 'Error during debate simulation:', error);
    throw new Error(
      `Failed to generate debate report: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
