import { CohortWeightedConfig } from 'core/src/personas/cohort.types';
import { generateCohortConfig } from 'core/src/personas/llm/controllers/cohort/cohortConfigLLM';
import {
  createPersona,
  type PersonaFormData,
} from 'core/src/personas/llm/controllers/persona-create/personaCreationLLM';
import { PERSONALITY_TRAITS } from 'core/src/personas/options/personaOptions';
import { AgeRangeOption, WeightedOption } from 'core/src/personas/persona.types';
import { PersonaArchetype } from 'core/src/personas/weights/archetypeWeights';
import { GENDER_TO_PRONOUNS_MAP } from 'core/src/personas/weights/genderWeights';

import type { ProviderId } from 'core/src/llm/config';

// Re-export types for convenience
export type { CohortWeightedConfig } from 'core/src/personas/cohort.types';
export type { PersonaFormData } from 'core/src/personas/llm/controllers/persona-create/personaCreationLLM';

/**
 * Helper function for weighted random selection
 */
function weightedRandomSelect<T>(items: WeightedOption<T>, count: number): T[] {
  if (!items || items.length === 0) {
    return [];
  }

  // Filter out items with zero weight to ignore them completely
  const availableItems = [...items].filter(item => item.weight > 0);

  if (availableItems.length === 0) {
    return [];
  }

  const result: T[] = [];

  for (let i = 0; i < Math.min(count, availableItems.length); i++) {
    // Calculate total weight of remaining items
    const totalWeight = availableItems.reduce((sum, item) => sum + item.weight, 0);

    // Generate random number between 0 and totalWeight
    let random = Math.random() * totalWeight;

    // Find the selected item
    let selectedIndex = 0;
    for (let j = 0; j < availableItems.length; j++) {
      random -= availableItems[j].weight;
      if (random <= 0) {
        selectedIndex = j;
        break;
      }
    }

    // Add selected item to result and remove from available items
    result.push(availableItems[selectedIndex].value);
    availableItems.splice(selectedIndex, 1);
  }

  return result;
}

/**
 * Convert cohort config to form data for persona creation
 */
function cohortConfigToFormData(cohortConfig: CohortWeightedConfig): PersonaFormData {
  // Select age range based on cohort weights
  const ageRangeWeights = cohortConfig.age_ranges.map(range => ({
    value: [range.min_age, range.max_age] as AgeRangeOption,
    weight: range.weight,
  }));

  const selectedAgeRange = weightedRandomSelect(ageRangeWeights, 1)[0] || [25, 35];

  // Select genders based on weights
  const selectedGenders = weightedRandomSelect(
    cohortConfig.genders,
    Math.floor(Math.random() * 2) + 1 // 1 or 2 genders
  );

  // Select pronouns based on primary gender
  let selectedPronouns: string[] = ['they/them']; // default
  if (selectedGenders.length > 0) {
    const primaryGender = selectedGenders[0].toLowerCase();
    const pronounOptions = GENDER_TO_PRONOUNS_MAP[primaryGender] || GENDER_TO_PRONOUNS_MAP.default;
    selectedPronouns = weightedRandomSelect(
      pronounOptions,
      Math.floor(Math.random() * 2) + 1 // 1 or 2 pronouns
    );
  }

  // Select other demographics based on weights
  const selectedLocations = weightedRandomSelect(
    cohortConfig.locations,
    Math.floor(Math.random() * 2) + 1 // 1 or 2 locations
  );

  const selectedEthnicities = weightedRandomSelect(
    cohortConfig.ethnicities,
    Math.floor(Math.random() * 2) + 2 // 2 or 3 ethnicities
  );

  const selectedLanguages = weightedRandomSelect(
    cohortConfig.languages,
    Math.floor(Math.random() * 2) + 2 // 2 or 3 languages
  );

  const selectedEducations = weightedRandomSelect(
    cohortConfig.educations,
    Math.floor(Math.random() * 2) + 2 // 2 or 3 education levels
  );

  const selectedJobIndustries = weightedRandomSelect(
    cohortConfig.job_industries,
    Math.floor(Math.random() * 2) + 2 // 2 or 3 job industries
  );

  const selectedRelationshipStatuses = weightedRandomSelect(
    cohortConfig.relationship_statuses,
    Math.floor(Math.random() * 2) + 2 // 2 or 3 relationship statuses
  );

  const selectedPoliticalLeanings = weightedRandomSelect(
    cohortConfig.political_leanings,
    Math.floor(Math.random() * 2) + 1 // 1 or 2 political leanings
  );

  const selectedReligions = weightedRandomSelect(
    cohortConfig.religions,
    1 // 1 religion
  );

  // Get random personality traits (not weighted in cohort config)
  const shuffledTraits = [...PERSONALITY_TRAITS].sort(() => 0.5 - Math.random());
  const selectedPersonalityTraits = shuffledTraits.slice(0, Math.floor(Math.random() * 3) + 3); // 3-5 traits

  return {
    ageRange: selectedAgeRange as [number, number],
    genders: selectedGenders,
    pronouns: selectedPronouns,
    locations: selectedLocations,
    ethnicities: selectedEthnicities,
    languages: selectedLanguages,
    jobIndustries: selectedJobIndustries,
    educations: selectedEducations,
    relationshipStatuses: selectedRelationshipStatuses,
    politicalLeanings: selectedPoliticalLeanings,
    religions: selectedReligions,
    personalityTraits: selectedPersonalityTraits,
    promptForPersonaCreation: cohortConfig.promptForPersonaCreation,
    personalityQuirks: [],
    communicationStyles: [],
    archetype: 'standard' as PersonaArchetype,
  };
}

/**
 * Create a cohort configuration from a natural language prompt
 */
export async function createCohortConfig(prompt: string): Promise<CohortWeightedConfig> {
  return await generateCohortConfig(prompt);
}

/**
 * Create a single persona based on a cohort configuration
 */
export async function createPersonaFromCohort(
  cohortConfig: CohortWeightedConfig,
  existingNames: string[] = [],
  creatorId?: string,
  provider?: ProviderId
): Promise<any> {
  const formData = cohortConfigToFormData(cohortConfig);
  return await createPersona(formData, existingNames, creatorId, cohortConfig, provider);
}
