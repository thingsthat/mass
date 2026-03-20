/**
 * Persona runtime state. Stored in personas/<id>/<id>_state.json.
 * Overwritten on each update.
 */

export type PersonaRuntimeState = {
  personaId: string;
  currentGoals?: string[];
  currentBeliefs?: string[];
  currentMood?: string;
  activeConstraints?: string[];
  openCommitments?: string[];
  recentExposures?: string[];
  stanceByTopic?: Record<string, string>;
  updatedAt: string;
};
