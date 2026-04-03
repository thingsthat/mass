/**
 * Message type for chat conversations
 */
export type SimulationEffect = {
  sourceType: 'message' | 'event' | 'memory' | 'selfAppraisal';
  targetType: 'self' | 'persona' | 'group' | 'world';
  targetId?: string;
  channel: 'relationship' | 'belief' | 'norm' | 'identity' | 'emotion' | 'appraisal' | 'world';
  variable: string;
  operator: 'add' | 'set' | 'decay';
  delta?: number;
  value?: number;
  because?: string;
  confidence?: number;
};

export type SimulationEffectsMeta = {
  step: number;
  actorId: string;
  stance_shifts?: Record<string, number>;
  world_deltas?: Record<string, number>;
  effects?: SimulationEffect[];
};

export type ScenarioEventType = 'news' | 'policy' | 'market' | 'product' | 'social' | 'incident';

export type ScenarioEvent = {
  id: string;
  type: ScenarioEventType;
  title: string;
  description: string;
  effects: Record<string, unknown>;
  /** When set, event is applied at this step (scheduled); otherwise applied on next step (immediate). */
  trigger_step?: number;
};

export type InterventionHistoryEntry = ScenarioEvent & {
  status: 'pending' | 'applied';
  injected_at: string;
  applied_at?: string;
  applied_step?: number;
};

export type SimulationWorkflowStatus = 'running' | 'paused' | 'completed';

export type VariableHistoryEntry = {
  step: number;
  variables: Record<string, number | string | boolean>;
};

/**
 * One actor's contribution to causal mechanism at a given step.
 * Persists the typed effects so the graph can read real causal records rather than inferring from deltas.
 */
export type CausalHistoryEntry = {
  step: number;
  actorId: string;
  /** 'persona' for LLM-generated actions; 'event' for applied scenario events or interventions. */
  actorType: 'persona' | 'event';
  effects: SimulationEffect[];
};

export type SimulationWorkflow = {
  type: 'simulation';
  current_step: number;
  max_steps: number;
  status: SimulationWorkflowStatus;
  variables: Record<string, number | string | boolean>;
  active_events: ScenarioEvent[];
  /** Events applied when current_step matches trigger_step. */
  scheduled_events?: ScenarioEvent[];
  /** Durable record of injected interventions (pending and applied) for display and debugging. */
  intervention_history?: InterventionHistoryEntry[];
  /** Core issue or topic for the scenario (e.g. policy under debate); passed to the LLM to anchor persona responses. */
  core_issue?: string;
  /** Stance axes to track (e.g. ["purchase_intent", "privacy_concern"]). Persona stance_scores use these as keys. */
  stances?: string[];
  /** Per-step variable snapshots for time-series display (step 0 through current). */
  variable_history?: VariableHistoryEntry[];
  /** Per-step typed behavioural effect records for causal graph consumption. */
  causal_history?: CausalHistoryEntry[];
};
