import type { ReportPersonaResponse } from 'core/src/reports/reportResponses.types';

// Report types
export type ReportType = 'feedback' | 'debate' | 'questionnaire' | 'ideas';

export const REPORT_TYPES = ['feedback', 'debate', 'questionnaire', 'ideas'] as const;

export type ReportStatus = 'completed' | 'failed' | 'loading';

/**
 * Report type that matches the database/GraphQL structure
 */
export type Report = {
  id: string;
  workspace_id: string;
  report: ReportData;
  created_at: string;
  updated_at: string;
  status: ReportStatus;
};

export type ReportData = {
  id?: string;
  prompt: string;
  type: string;
  cohorts?: string[];
  persona_ids?: string[];
  persona_responses?: ReportPersonaResponse[];
  report: ReportResult;
  responses_complete?: number;
  responses_total?: number;
  started_at?: number;
  completed_at?: number;
  processing_time?: number;
  error?: string;
  keywords?: string[];
};

// Unified report result type that combines all fields from feedback and debate
export type ReportResult = {
  title: string;
  summary: string;
  verdict_summary: string;
  verdict_best_quote: string;
  positive_percentage: number;
  neutral_percentage: number;
  negative_percentage: number;
  detailed: string;
  confidence_summary: {
    confidence_patterns: string;
    confidence_insights: string;
  };

  // Feedback-specific fields (optional for backward compatibility)
  sentiment_groups?: {
    type: string;
    percentage: number;
    icon: string;
    color: string;
    quotes: Array<{
      text: string;
      author_name: string;
      author_age: number;
      author_occupation: string;
      author_id: string;
    }>;
  }[];
  crowd_wall?: {
    author_name: string;
    author_age: number;
    author_occupation: string;
    author_id: string;
    text: string;
  }[];

  // Debate-specific fields (optional for backward compatibility)
  personas?: Array<{
    id: string;
    value: { name: string; age: number; occupation: string; text: string };
  }>;
  debate?: Array<{
    timestamp: string;
    author_id: string;
    text: string;
  }>;

  // Multi-report type support
  report_types?: ReportType[];

  // Questionnaire-specific fields (optional for backward compatibility)
  questionnaire_questions?: QuestionnaireQuestion[];
  question_results?: QuestionnaireQuestionResult[];
  overall_summary?: string;
};

// Keep legacy types for backward compatibility
export type ReportDebate = ReportResult & {
  personas: Array<{
    id: string;
    value: { name: string; age: number; occupation: string; text: string };
  }>;
  debate: Array<{
    timestamp: string;
    author_id: string;
    text: string;
  }>;
};

export type ReportFeedback = ReportResult & {
  sentiment_groups: {
    type: string;
    percentage: number;
    icon: string;
    color: string;
    quotes: Array<{
      text: string;
      author_name: string;
      author_age: number;
      author_occupation: string;
      author_id: string;
    }>;
  }[];
  crowd_wall: {
    author_name: string;
    author_age: number;
    author_occupation: string;
    author_id: string;
    text: string;
  }[];
};

export type QuestionnaireSelectionType = 'single' | 'multiple' | 'optional';

export type QuestionnaireOption = {
  id: string;
  text: string;
};

export type QuestionnaireQuestion = {
  id: string;
  question_text: string;
  options: QuestionnaireOption[];
  selection_type: QuestionnaireSelectionType;
  required: boolean;
};

export type QuestionnaireOptionResult = {
  option_id: string;
  option_text: string;
  count: number;
  percentage: number;
};

export type QuestionnaireQuestionResult = {
  question_id: string;
  question_text: string;
  options: QuestionnaireOptionResult[];
  total_responses: number;
  selection_type: QuestionnaireSelectionType;
  required: boolean;
};

export type ReportQuestionnaire = ReportResult & {
  questionnaire_questions: QuestionnaireQuestion[];
  question_results: QuestionnaireQuestionResult[];
  overall_summary: string;
};

export type IdeaItem = {
  id: string;
  idea: string;
  persona_id: string;
  persona_name: string;
  persona_age: number;
  persona_occupation: string;
  reasoning: string;
  appeal_score: number; // 1-10 how appealing this idea is to this persona
};

export type ReportIdeas = ReportResult & {
  ideas: IdeaItem[];
  idea_categories?: Array<{
    category: string;
    ideas: IdeaItem[]; // Expanded from idea_ids in backend
    percentage: number;
  }>;
  top_ideas?: IdeaItem[]; // Expanded from IDs in backend
};

export type ExecuteReportValue = {
  report_type: string;
  prompt: string;
  cohorts_id: string;
  size: string;
};
