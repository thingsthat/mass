/**
 * Types for persona feedback system
 */
import type { ReportType } from 'core/src/reports/reports.types';

/** Options for debate-type reports. Omitted fields use defaults (20 rounds, 2 min cap). */
export type DebateOptions = {
  /** Max persona speaking turns (moderator messages not counted). Default 20. */
  max_rounds?: number;
  /** Stop after this many minutes; 0 = no time limit (only max_rounds applies). Default 2. */
  duration_minutes?: number;
};

export type ReportGenerateRequest = {
  prompt: string;
  persona_ids: string[];
  cohort_ids?: string[];
  report_type: ReportType; // Keep for backward compatibility
  report_types?: ReportType[]; // New field for multiple report types
  workspace_id: string;
  max_personas?: number;
  report_id?: string;
  /** Debate-only: max rounds and/or duration. Ignored for other report types. */
  debate_options?: DebateOptions;
  /** Either url (storage), data (base64), or path (resolved to base64). Resolved to base64 when calling LLMs. */
  files?: { url?: string; data?: string; path?: string; mimeType?: string; name?: string }[];
  /** File paths to ask opinion on; normalised into files and resolved to base64. */
  file_paths?: string[];
};

export type ReportGenerateResponse = {
  id: string;
  workspace_id: string;
  persona_id: string;
  response: ReportPersonaResponse;
  created_at: string;
  updated_at: string;
};

export type ReportPersonaResponse = {
  persona_id: string;
  persona_name: string;
  persona_age?: number;
  persona_occupation?: string;
  response: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  reasoning: string;
  emotional_tone: string;
  suggestions: string;
  confidence_rating: number;
  example_anecdote: string;
  priority_importance: number;
  clarifying_question: string;
  alternative_viewpoints: string;
  expected_actions: string;
  key_takeaway: string;
  timestamp: string;
  keywords: string[];
};
