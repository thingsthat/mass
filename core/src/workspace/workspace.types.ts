import type { Conversation } from 'core/src/workspace/conversation.types';
import type { SimulationWorkflow } from 'core/src/simulation/simulation.types';

export type Workspace = {
  id: string;
  name: string;
  conversation: Conversation;
  description: string;
  created_at?: string;
  updated_at?: string;
  report_overview?: string | null;
  workflow?: SimulationWorkflow | null;
};

export type WorkspaceConversationVariant = 'start' | 'report-conversation' | 'persona-conversation';
