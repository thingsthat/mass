/**
 * File attachment: either a storage URL (persisted) or base64 data (legacy / request-only).
 * Only url form should be stored in conversation messages.
 */
import type { SimulationEffectsMeta } from 'core/src/simulation/simulation.types';

export type MessageFile =
  | { url: string; mimeType: string; name?: string }
  | { data: string; mimeType: string; name?: string };

export type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  isError?: boolean;
  isPending?: boolean;
  followup?: string[];
  title?: string;
  summary?: string;
  persona_id?: string;
  files?: MessageFile[];
  provider?: string; // Provider used for this message (stored on user messages)
  model?: string; // Model used for this message (stored on user messages)
  _metadata?: {
    isComplete?: boolean;
    totalLength?: number;
    simulationEffects?: SimulationEffectsMeta;
    intervention?: {
      title: string;
      description: string;
      status: 'pending' | 'applied';
      trigger_step?: number;
      applied_step?: number;
      effects: Record<string, unknown>;
      type: string;
    };
  };
};

/**
 * Relationship state between two personas (stored in conversation.persona_metadata[personaId].relationships[targetPersonaId]).
 */
export type PersonaRelationshipState = {
  trust: number;
  influence: number;
  affinity: number;
  conflict: number;
};

/**
 * Simulation-specific metadata for a persona (stored in conversation.persona_metadata[personaId]).
 * stance_scores: topic key -> 1-10 scale (e.g. strongly oppose to strongly support).
 * memories: summarised past actions/positions so the persona can recall them in later steps.
 */
export type PersonaSimulationMetadata = {
  relationships?: {
    [targetPersonaId: string]: PersonaRelationshipState;
  };
  stance?: string;
  stance_scores?: Record<string, number>;
  memories?: string[];
};

/**
 * Conversation status for managing the persona feedback workflow
 */
export type ConversationStatus = '1_step_ask' | '3_step_loading_report' | '4_step_report';

/**
 * Conversation representation
 *
 * The messages array has the following constraints:
 * - When limits are exceeded, oldest messages are removed first
 */
export type Conversation = {
  id?: string;
  name: string;
  messages: Message[];
  persona_ids?: string[];
  persona_metadata?: {
    [key: string]: Record<string, unknown>;
  };
  cohort_ids?: string[];
  status?: ConversationStatus; // Legacy status system - kept for backward compatibility

  memories?: {
    content: string;
    type: 'long_term' | 'short_term';
    timestamp: string;
  }[];

  fork?: {
    workspaceId: string;
    messageId: string;
    timestamp: string;
  };
};

export type StructuredContent = string | Array<string> | Array<any>;

/**
 * Single speaker in a multi-speaker chat response
 */
export type SpeakerReply = {
  persona_id: string;
  name?: string;
  content: string;
  cohort_id?: string;
};

/**
 * Multi-speaker response: content is an array of speaker replies.
 * For a single persona, content has one entry.
 */
export type MultiSpeakerContent = SpeakerReply[];

/**
 * Response format for structured content
 */
// TOOD: Consider moving this to the llm/schemas/schemaPersonaChat.ts file
export type StructuredResponse = {
  content: StructuredContent;
  status?: ConversationStatus;
  followup?: string[];
  title?: string;
  summary?: string;
  memories?: {
    content: string;
    type: 'long_term' | 'short_term';
    timestamp: string;
  }[];
};

/**
 * Structured response for prompt-ask when multiple personas/cohorts are targeted.
 * content is an array of speaker replies with persona_id and name.
 */
export type PromptAskStructuredResponse = {
  content: MultiSpeakerContent;
  followup?: string[];
};

export type Question = {
  question: string;
  personaId?: string;
  /** Optional per-message target: only these personas (must be in workspace membership). */
  persona_ids?: string[];
  /** Optional per-message target: only these cohorts (must be in workspace membership). */
  cohort_ids?: string[];
  files?: MessageFile[];
  provider?: string;
  model?: string;

  tasks?: string[];
  cohorts?: string[];
  sizes?: string[];
};

/**
 * Report types supported for inline workspace report messages.
 */
export type InlineReportType = 'feedback' | 'debate' | 'questionnaire';

/**
 * Status of an inline report message (loading, completed, or failed).
 */
export type InlineReportStatus = 'loading' | 'completed' | 'failed';

/**
 * Structured payload for an assistant message that displays an inline report.
 * Stored as JSON in message.content so the frontend can render a report block
 * and refresh by reportId until status is completed or failed.
 */
export type InlineReportMessagePayload = {
  type: 'report';
  reportId: string;
  reportType: InlineReportType;
  status: InlineReportStatus;
  error?: string;
};
