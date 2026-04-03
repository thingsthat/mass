import { z } from 'zod';

import { createSchemaDefinition, type SchemaDefinition } from 'core/src/llm/schemas/schema';

import type { SimulationEffect } from 'core/src/simulation/simulation.types';

/**
 * Fixed mechanism vocabulary per channel.
 * Constrains the LLM to a normalised set of variable names rather than free-form labels.
 */
export const MECHANISM_VOCABULARY = {
  emotion: ['fear', 'anger', 'anxiety', 'calmness', 'hope', 'despair', 'disgust', 'frustration'],
  norm: ['compliance', 'cooperation', 'solidarity', 'defection', 'hoarding', 'reciprocity'],
  identity: ['in_group_solidarity', 'authority_legitimacy', 'civic_identity', 'out_group_threat'],
  appraisal: [
    'perceived_personal_risk',
    'perceived_efficacy',
    'perceived_threat',
    'response_cost',
    'outcome_uncertainty',
  ],
  relationship: ['trust', 'influence', 'affinity', 'conflict'],
} as const;

/**
 * Shared type for simulation action result. stance_shifts and world_deltas use explicit keys at request time but are represented as records in the API.
 */
export type SimulationActionResult = {
  action: 'speak' | 'silence';
  content: string;
  stance_shifts: Record<string, number>;
  world_deltas: Record<string, number>;
  /**
   * Optional typed behavioural effects describing how and where this action applied influence.
   * Kept alongside stance_shifts and world_deltas for backward compatibility.
   */
  effects?: SimulationEffect[];
};

const actionField = z
  .enum(['speak', 'silence'])
  .default('speak')
  .describe(
    'Either "speak" if you want to say or do something in character, or "silence" if you have nothing meaningful to add.'
  );

const contentField = z
  .string()
  .default('')
  .describe(
    'When action is "speak": 1-3 short sentences in character (what you say or do). British English; no emojis or em dashes. Do not start with meta phrases like "As a..." or "I am a...". When "silence": use "".'
  );

/**
 * Build a request-specific response format with explicit keys for stance_shifts and world_deltas so the model is constrained to the actual stance axes and world variables for this step.
 * Accepts mechanismVocabulary so the effects schema can reference the exact variable names valid for this run.
 */
export const createSimulationActionResponseFormat = (
  stanceKeys: string[],
  worldDeltaKeys: string[]
): SchemaDefinition => {
  const stanceKeyList = stanceKeys.length ? stanceKeys : ['default'];
  const stanceShiftsShape: Record<string, z.ZodTypeAny> = Object.fromEntries(
    stanceKeyList.map(key => [
      key,
      z
        .number()
        .default(0)
        .describe(
          `Integer -5 to +5: how much your position on "${key}" moved this step (negative = more opposed, positive = more supportive, 0 = unchanged).`
        ),
    ])
  );
  const stanceShiftsSchema = z
    .object(stanceShiftsShape)
    .describe(
      'Stance shifts for this step. Each key is a tracked stance; set 0 for unchanged. Only relevant when speaking.'
    );

  const worldDeltasShape: Record<string, z.ZodTypeAny> = Object.fromEntries(
    worldDeltaKeys.map(key => [
      key,
      z
        .number()
        .default(0)
        .describe(
          `Delta to apply to world variable "${key}". Use small integers (e.g. -3 to +3). Only relevant when speaking.`
        ),
    ])
  );
  const worldDeltasSchema = z
    .object(worldDeltasShape)
    .describe(
      'World variable deltas for this step. Only include variables you are influencing. Only relevant when speaking.'
    );

  const beliefVariables = stanceKeyList.join(', ');
  const worldVariables = worldDeltaKeys.join(', ');
  const emotionVars = MECHANISM_VOCABULARY.emotion.join(', ');
  const normVars = MECHANISM_VOCABULARY.norm.join(', ');
  const identityVars = MECHANISM_VOCABULARY.identity.join(', ');
  const appraisalVars = MECHANISM_VOCABULARY.appraisal.join(', ');
  const relationshipVars = MECHANISM_VOCABULARY.relationship.join(', ');

  const effectsSchema = z
    .array(
      z.object({
        sourceType: z
          .enum(['message', 'event', 'memory', 'selfAppraisal'])
          .default('message')
          .describe('What produced this effect. For persona utterances use "message".'),
        targetType: z
          .enum(['self', 'persona', 'group', 'world'])
          .default('self')
          .describe(
            'Who this effect applies to. Use "self" for internal states, "persona" for a specific other person (requires targetId), "group" for a collective, "world" for world variables.'
          ),
        targetId: z
          .string()
          .optional()
          .describe(
            'Required when targetType is "persona" or "group". Must be the target persona id or group name. Omit entirely when targetType is "self" or "world".'
          ),
        channel: z
          .enum(['relationship', 'belief', 'norm', 'identity', 'emotion', 'appraisal', 'world'])
          .describe(
            'Behavioural channel this effect works through. "belief" maps to stance axes. "world" maps to world variables. All other channels use the fixed vocabulary below.'
          ),
        variable: z.string().describe(
          `Variable name for this effect. Use the correct vocabulary for each channel:
- belief: one of [${beliefVariables}]
- world: one of [${worldVariables}]
- emotion: one of [${emotionVars}]
- norm: one of [${normVars}]
- identity: one of [${identityVars}]
- appraisal: one of [${appraisalVars}]
- relationship: one of [${relationshipVars}]`
        ),
        operator: z
          .enum(['add', 'set', 'decay'])
          .default('add')
          .describe(
            'How this effect changes the variable. "add": provide delta (small integer, required). "set": provide value (absolute, required). "decay": provide delta (magnitude of decay toward neutral, required). Never provide both delta and value.'
          ),
        delta: z
          .number()
          .optional()
          .describe(
            'Required when operator is "add" or "decay". Small integer, e.g. -3 to +3. Omit when operator is "set".'
          ),
        value: z
          .number()
          .optional()
          .describe(
            'Required when operator is "set". Absolute target value. Omit when operator is "add" or "decay".'
          ),
        because: z
          .string()
          .optional()
          .describe('One short clause explaining why this effect occurred.'),
      })
    )
    .optional()
    .describe(
      'List of typed behavioural effects that describe the mechanism of this action. Each stance or world change should have a corresponding mechanism effect. Use the exact vocabulary specified in each variable description.'
    );

  const schema = z
    .object({
      action: actionField,
      content: contentField,
      stance_shifts: stanceShiftsSchema,
      world_deltas: worldDeltasSchema,
      effects: effectsSchema,
    })
    .describe('Structured action or reaction for one simulation step.');

  return createSchemaDefinition(schema, {
    name: 'simulation_action',
    strict: true,
  });
};

/**
 * Post-parse sanitiser.
 * Strips semantically inconsistent fields that the model sometimes emits (e.g. `value` on an "add" operator,
 * or `targetId` on a "self" target) without rejecting the whole result.
 */
export const sanitiseSimulationEffects = (
  effects: SimulationEffect[] | undefined
): SimulationEffect[] => {
  if (!effects || effects.length === 0) {
    return [];
  }
  return effects.map(effect => {
    const sanitised = { ...effect };

    if (sanitised.operator === 'add' || sanitised.operator === 'decay') {
      delete sanitised.value;
      if (typeof sanitised.delta !== 'number' || Number.isNaN(sanitised.delta)) {
        sanitised.delta = 0;
      }
    } else if (sanitised.operator === 'set') {
      delete sanitised.delta;
      if (typeof sanitised.value !== 'number' || Number.isNaN(sanitised.value)) {
        sanitised.value = 0;
      }
    }

    if (sanitised.targetType === 'self' || sanitised.targetType === 'world') {
      delete sanitised.targetId;
    }

    return sanitised;
  });
};
