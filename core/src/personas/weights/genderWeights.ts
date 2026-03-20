import { WeightedOption } from 'core/src/personas/persona.types';

// Gender to pronouns mapping (simplified version of the complex mapping)
export const GENDER_TO_PRONOUNS_MAP: Record<string, WeightedOption<string>> = {
  woman: [
    { value: 'she/her', weight: 10 },
    { value: 'she/they', weight: 2 },
    { value: 'they/them', weight: 1 },
  ],
  man: [
    { value: 'he/him', weight: 10 },
    { value: 'he/they', weight: 2 },
    { value: 'they/them', weight: 1 },
  ],
  nonbinary: [
    { value: 'they/them', weight: 8 },
    { value: 'she/they', weight: 3 },
    { value: 'he/they', weight: 3 },
  ],
  // Default fallback for other genders
  default: [
    { value: 'they/them', weight: 5 },
    { value: 'she/her', weight: 2 },
    { value: 'he/him', weight: 2 },
  ],
};
