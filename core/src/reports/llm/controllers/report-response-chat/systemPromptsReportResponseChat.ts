import { getCurrentDateSystemPrompt } from 'core/src/llm/systemprompt/systemPromptHelper';
import { systemPromptPersonaContext } from 'core/src/personas/llm/systemprompt/systemPromptsPersonaContext';
import { Persona } from 'core/src/personas/persona.types';
import { ReportPersonaResponse } from 'core/src/reports/reportResponses.types';
import { v4 as uuidv4 } from 'uuid';

import { ReportResponseChatRequest } from './reportResponseChatLLM';

import type { Message } from 'core/src/workspace/conversation.types';

const generateResponseToReportSystemMessage = (
  prompt: string,
  response: ReportPersonaResponse
): string => {
  return `<role>
You are responding to your response below. Only answer the questions based on your response below and the topic: "${prompt}"
</role>

<your_response>
${response.response}
</your_response>

<response_requirements>
<rule>Intelligent and Insightful: Explain the 'why' behind your response.</rule>
<rule>Witty and professional: Keep things professional, but witty and conversational.</rule>
<rule>Analytical and Critical: You are to be critical of your response and provide a detailed feedback on your response.</rule>
<rule>Clear and Direct: Communicates simply and effectively, avoiding confusing jargon.</rule>
<rule>Maximum Length: Keep your response to a maximum of 200 words.</rule>
<rule>Stay Focused on your response: This conversation is about the specific response to the report prompt.</rule>
<forbidden>NEVER start your response with "Right, " or "Alright, "</forbidden>
</response_requirements>`;
};

const interactionPolicy = `<interaction_guidelines>
<rule>Follow Instructions: If the user asks a question, answer it. If they tell you to do something, do it without asking unnecessary questions.</rule>
<rule>Maintain Respect: Never be degrading, rude, or disrespectful. Do not do anything harmful to the user or say anything that could be considered harmful.</rule>
<rule>File Analysis: You can view and analyze images and other files that users upload. When files are provided, examine them carefully and incorporate your analysis into your response.</rule>
<rule>Context Awareness: Use the timing context to gauge the conversation's flow. Be authentically curious about their experiences during longer gaps without being formulaic. Let personality guide how you acknowledge time gaps.</rule>
<rule>Topics: Only refuse to discuss topics if it harms the user or the persona.</rule>
</interaction_guidelines>`;

const schemaStructuredContent = `<structured_content>
An array for the main response. It can contain strings for plain text, or component objects.
</structured_content>`;

/**
 * Generates detailed persona information for the system prompt
 */
const generatePersonaContext = (persona: Persona): string => {
  if (!persona) {
    return '';
  }
  return (
    '\n\n<persona_section>\nYou are this persona:\n\n' +
    systemPromptPersonaContext(persona, true) +
    '\n\n</persona_section>\n\n'
  );
};

/**
 * Generates a system message for the persona-based conversation with the report
 */
export const generateSystemMessageForReportResponseChat = (
  request: ReportResponseChatRequest
): Message => {
  const { report, persona, reportResponse } = request;

  let systemMessageContent = [
    generatePersonaContext(persona),
    getCurrentDateSystemPrompt(),
    generateResponseToReportSystemMessage(report.report.prompt, reportResponse.response),
    interactionPolicy,
    schemaStructuredContent,
  ]
    .join('\n\n')
    .trim();

  return {
    id: uuidv4(),
    role: 'system',
    content: systemMessageContent,
    timestamp: new Date().toISOString(),
  };
};
