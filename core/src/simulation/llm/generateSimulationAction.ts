import { LLMRouter } from 'core/src/llm/router';
import { systemPromptPersonaContext } from 'core/src/personas/llm/systemprompt/systemPromptsPersonaContext';
import {
  createSimulationActionResponseFormat,
  sanitiseSimulationEffects,
  type SimulationActionResult,
} from 'core/src/simulation/llm/schemaSimulationAction';
import { v4 as uuidv4 } from 'uuid';

import type { ProviderId } from 'core/src/llm/config';
import type { Persona } from 'core/src/personas/persona.types';
import type { Message } from 'core/src/workspace/conversation.types';

const PROVIDER: ProviderId = 'google';
const MODEL = 'gemini-3.1-flash-lite-preview';

const STANCE_SHIFT_MIN = -5;
const STANCE_SHIFT_MAX = 5;

function clampStanceShift(value: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0;
  }
  return Math.max(STANCE_SHIFT_MIN, Math.min(STANCE_SHIFT_MAX, Math.round(value)));
}

export type { SimulationActionResult };

function normaliseStanceShifts(
  data: SimulationActionResult,
  stanceKeys: string[]
): Record<string, number> {
  const keys = stanceKeys.length ? stanceKeys : ['default'];
  const out: Record<string, number> = {};
  for (const key of keys) {
    const value = data.stance_shifts[key];
    out[key] = clampStanceShift(typeof value === 'number' ? value : 0);
  }
  return out;
}

/**
 * Generate a short action or reaction for a persona in a simulation step.
 * Returns structured JSON (content, stance_shifts, world_deltas, effects) so the controller can update world state,
 * stances, and behavioural mechanisms. Uses past_memories so the persona can recall earlier positions and stay consistent.
 * stances: optional list of stance axes to track; when omitted or empty, a single "default" stance is used.
 */
export const generateSimulationAction = async (
  persona: Persona,
  step: number,
  worldVariables: Record<string, number | string | boolean>,
  recentMessages: Message[],
  coreIssue: string,
  memories: string[] = [],
  stances: string[] = ['default']
): Promise<SimulationActionResult> => {
  const personaContent = systemPromptPersonaContext(persona, false);
  const stanceKeys = stances.length ? stances : ['default'];
  const stanceList = stanceKeys.join(', ');
  const worldDeltaKeys = Object.keys(worldVariables);
  const responseFormat = createSimulationActionResponseFormat(stanceKeys, worldDeltaKeys);

  const systemPrompt = `<persona_context>
${personaContent}
</persona_context>

<role>
You are this person in a simulation. Each step you take one short action or reaction in response to the current situation and the core issue being debated.
</role>

      <rules>
<rule>Respond ONLY with a single JSON object, no other text. The object must have: "action", "content", "stance_shifts", "world_deltas", and may include an optional "effects" array.</rule>
<rule>"action": either "speak" or "silence". Use "silence" if you have nothing meaningful to add to the current debate; use "speak" if you want to say or do something in character.</rule>
<rule>When "action" is "silence", set "content" to "", "stance_shifts" to {}, and "world_deltas" to {}.</rule>
<rule>When "action" is "speak": "content" is 1-3 short sentences in character (what you say or do). Use British English; no emojis or em dashes.</rule>
<rule>"stance_shifts": object with keys for each tracked stance (${stanceList}). Each value is an integer from -5 to +5: how much your position on that dimension moved this step (negative = more opposed / lower, positive = more supportive / higher, 0 = unchanged). Only include keys for stances you are shifting; omit or set 0 for unchanged. Only relevant when speaking.</rule>
<rule>"world_deltas": object of variable names to number deltas, e.g. {"public_approval": -2, "polarisation_index": 1}. Only include variables you are influencing; use small integers (e.g. -3 to +3). Only relevant when speaking.</rule>
<rule>"effects": array of typed behavioural effects. For every non-zero stance_shift or world_delta you produce, include at least one corresponding effect entry explaining the mechanism. Use the exact variable names listed in each channel's vocabulary in the schema. "add" and "decay" require "delta" only. "set" requires "value" only. Never provide both. Omit "targetId" when targetType is "self" or "world". Include "targetId" when targetType is "persona" or "group".</rule>
<rule>Relationship effects (channel "relationship") must use targetType "persona" with targetId set to the other person's name or id, and variable must be one of: trust, influence, affinity, conflict. These represent how your view of that person changed this step.</rule>
<rule>Stay in character. React to the core issue, your past memories, and recent messages. Never start with meta phrases such as "As a nurse...", "As a parent...", or "I am a...". Speak only in character as the persona.</rule>
</rules>`;

  const variablesBlock =
    Object.keys(worldVariables).length > 0
      ? `Current world state:\n${Object.entries(worldVariables)
          .map(([key, value]) => `  ${key}: ${value}`)
          .join('\n')}`
      : 'No world variables set yet.';

  const pastMemoriesBlock =
    memories.length > 0
      ? `Your past memories (what you said or did earlier):\n${memories.map(m => `  - ${m}`).join('\n')}`
      : 'No past memories yet.';

  const recentBlock =
    recentMessages.length > 0
      ? `Recent actions in the simulation:\n${recentMessages
          .slice(-6)
          .map(m => {
            const who = m.persona_id ? `Persona ${m.persona_id}` : 'System';
            return `  ${who}: ${(m.content || '').slice(0, 120)}${(m.content || '').length > 120 ? '...' : ''}`;
          })
          .join('\n')}`
      : 'This is the start of the simulation.';

  const userPrompt = `Simulation step ${step}.

Core issue: ${coreIssue}

${variablesBlock}

${pastMemoriesBlock}

${recentBlock}`;

  const response = await LLMRouter.generate<SimulationActionResult>(PROVIDER, {
    model: MODEL,
    messages: [
      {
        id: uuidv4(),
        role: 'user',
        content: userPrompt,
        timestamp: new Date().toISOString(),
      },
    ],
    systemMessage: {
      id: uuidv4(),
      role: 'system',
      content: systemPrompt,
      timestamp: new Date().toISOString(),
    },
    temperature: 0.8,
    responseFormat,
  });

  const fallbackContent =
    (response.text || '').trim() ||
    `${persona.details?.name ?? 'Someone'} takes no visible action.`;
  const emptyShifts = Object.fromEntries(
    (stanceKeys.length ? stanceKeys : ['default']).map(key => [key, 0])
  );
  const defaultResult: SimulationActionResult = {
    action: 'speak',
    content: fallbackContent,
    stance_shifts: emptyShifts,
    world_deltas: {},
    effects: [],
  };

  if (!response.data) {
    return defaultResult;
  }

  const stance_shifts = normaliseStanceShifts(response.data, stanceKeys);
  const content = response.data.content?.trim() || fallbackContent;
  return {
    action: response.data.action,
    content,
    stance_shifts,
    world_deltas: response.data.world_deltas ?? {},
    effects: sanitiseSimulationEffects(response.data.effects),
  };
};
