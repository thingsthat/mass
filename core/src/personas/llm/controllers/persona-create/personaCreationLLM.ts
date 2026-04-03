import { v4 as uuidv4 } from 'uuid';

import { log } from 'core/src/helpers/logger';
import { type ProviderId } from 'core/src/llm/config';
import { LLMRouter } from 'core/src/llm/router';
import { personaSchema } from 'core/src/personas/llm/controllers/persona-create/schemaPersonaCreate';
import { personaCreation } from 'core/src/personas/llm/controllers/persona-create/systemPromptsPersonaCreation';
import { Persona, PersonaMetadata } from 'core/src/personas/persona.types';
import { PersonaArchetype } from 'core/src/personas/weights/archetypeWeights';

import type { CohortWeightedConfig } from 'core/src/personas/cohort.types';

/**
 * Type for the persona details returned from LLM
 */
export type PersonaDetails = {
  name: string;
  persona: string;
  metadata: PersonaMetadata;
};

/**
 * Form data for persona creation
 */
export type PersonaFormData = {
  ageRange: [number, number];
  genders: string[];
  pronouns: string[];
  locations: string[];
  ethnicities: string[];
  languages: string[];
  jobIndustries: string[];
  educations: string[];
  relationshipStatuses: string[];
  politicalLeanings: string[];
  religions: string[];
  personalityTraits: string[];
  promptForPersonaCreation: string;
  personalityQuirks: string[];
  communicationStyles: string[];
  archetype: PersonaArchetype;
};

/**
 * Create a single persona using AI generation
 */
export async function createPersona(
  personaConfig: PersonaFormData,
  existingNames: string[] = [],
  creatorId?: string,
  cohortConfig?: CohortWeightedConfig,
  provider: ProviderId = 'google'
): Promise<Partial<Persona>> {
  // Build guidance from form data
  const guidanceLines: string[] = [];

  if (personaConfig.genders && personaConfig.genders.length > 0) {
    guidanceLines.push(
      `- The persona's gender must be one of: ${personaConfig.genders.join(', ')}`
    );
  }
  if (personaConfig.pronouns && personaConfig.pronouns.length > 0) {
    guidanceLines.push(
      `- The persona's pronouns must be one of: ${personaConfig.pronouns.join(', ')}`
    );
  }
  if (personaConfig.locations && personaConfig.locations.length > 0) {
    guidanceLines.push(
      `- The persona's location must be in one of these: ${personaConfig.locations.join(', ')}`
    );
  }
  if (personaConfig.ethnicities && personaConfig.ethnicities.length > 0) {
    guidanceLines.push(
      `- The persona's ethnicity must be one of: ${personaConfig.ethnicities.join(', ')}`
    );
  }
  if (personaConfig.languages && personaConfig.languages.length > 0) {
    guidanceLines.push(
      `- The persona's languages must include one of: ${personaConfig.languages.join(', ')}`
    );
  }
  if (personaConfig.jobIndustries && personaConfig.jobIndustries.length > 0) {
    guidanceLines.push(
      `- The persona's job industry must be one of: ${personaConfig.jobIndustries.join(', ')}`
    );
  }
  if (personaConfig.educations && personaConfig.educations.length > 0) {
    guidanceLines.push(
      `- The persona's education level must be one of: ${personaConfig.educations.join(', ')}`
    );
  }
  if (personaConfig.relationshipStatuses && personaConfig.relationshipStatuses.length > 0) {
    guidanceLines.push(
      `- The persona's relationship status must be one of: ${personaConfig.relationshipStatuses.join(', ')}`
    );
  }
  if (personaConfig.personalityTraits && personaConfig.personalityTraits.length > 0) {
    guidanceLines.push(
      `- Consider these personality traits as suggestions: ${personaConfig.personalityTraits.join(', ')}
      - IMPORTANT: Only use traits that make psychological sense together. If any suggested traits would create contradictions or unrealistic combinations, ignore them and choose more coherent alternatives.
      - Prioritize creating a believable, internally consistent personality over using all suggested traits.`
    );
  }
  if (personaConfig.politicalLeanings && personaConfig.politicalLeanings.length > 0) {
    guidanceLines.push(
      `- The persona's political leaning must be one of: ${personaConfig.politicalLeanings.join(', ')}`
    );
  }
  if (personaConfig.religions && personaConfig.religions.length > 0) {
    guidanceLines.push(
      `- The persona's religion must be one of: ${personaConfig.religions.join(', ')}`
    );
  }
  if (personaConfig.personalityQuirks && personaConfig.personalityQuirks.length > 0) {
    guidanceLines.push(
      `- Consider incorporating these personality quirks: ${personaConfig.personalityQuirks.join(', ')}
      - Use these as inspiration for unique behavioral traits or mannerisms that make the persona distinctive.`
    );
  }
  if (personaConfig.communicationStyles && personaConfig.communicationStyles.length > 0) {
    guidanceLines.push(
      `- The persona should have one of these communication styles: ${personaConfig.communicationStyles.join(', ')}
      - This should influence how they express themselves and interact with others.`
    );
  }
  if (personaConfig.archetype) {
    guidanceLines.push(
      `- Base the overall persona on the "${personaConfig.archetype}" archetype
      - This should influence the persona's core personality, motivations, and behavioral patterns while maintaining uniqueness.`
    );
  }

  const guidance =
    guidanceLines.length > 0
      ? `Follow these specific guidelines for persona generation:\n${guidanceLines.join('\n')}`
      : 'Generate a persona with completely random characteristics based on the available options.';

  // Use age range from cohort config if available, otherwise from personaConfig
  let ageRange = personaConfig.ageRange || [20, 29];

  if (cohortConfig && cohortConfig.age_ranges && cohortConfig.age_ranges.length > 0) {
    // Select age range from cohort config based on weights
    const ageRangeWeights = cohortConfig.age_ranges.map(range => ({
      value: [range.min_age, range.max_age] as [number, number],
      weight: range.weight,
    }));

    // Simple weighted selection (you might want to import the proper function)
    const totalWeight = ageRangeWeights.reduce((sum, item) => sum + item.weight, 0);
    const random = Math.random() * totalWeight;
    let currentWeight = 0;

    for (const item of ageRangeWeights) {
      currentWeight += item.weight;
      if (random <= currentWeight) {
        ageRange = item.value;
        break;
      }
    }
  }

  // Add randomness elements to ensure variety
  const timestamp = Date.now();
  const randomSeed = Math.random().toString(36).substring(2, 15) + timestamp.toString(36);

  let ageRangeMin = ageRange[0];
  let ageRangeMax = ageRange[1];

  if (ageRangeMin < 18) {
    ageRangeMin = 18;
  }
  if (ageRangeMax > 75) {
    ageRangeMax = 99;
  }

  const existingNamesSection =
    existingNames.length > 0
      ? `\n**CRITICAL: DO NOT use any of these existing names (choose a completely different name):**\n${existingNames.join(', ')}\n`
      : '';

  const prompt = personaCreation(
    personaConfig,
    existingNames,
    cohortConfig,
    ageRangeMin,
    ageRangeMax,
    randomSeed,
    guidance,
    existingNamesSection
  );

  try {
    const response = await LLMRouter.generate<PersonaDetails>(provider, {
      messages: [
        { role: 'user', content: prompt, timestamp: new Date().toISOString(), id: uuidv4() },
      ],
      responseFormat: personaSchema,
      temperature: 1.0, // Maximum creativity
      topP: 0.95, // High diversity
      topK: 40, // Reasonable variety in token selection
    });

    if (!response.data) {
      throw new Error('Expected structured response but got none');
    }

    const personaDetails = response.data;

    const personaData: Partial<Persona> = {
      details: personaDetails,
      type: 'persona',
      created_at: new Date(),
      updated_at: new Date(),
      version: 1,
    };

    return personaData;
  } catch (error) {
    log.error('PERSONA', 'Error creating persona:', error);
    throw error;
  }
}
