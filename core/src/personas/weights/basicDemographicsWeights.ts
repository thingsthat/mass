import {
  EDUCATION_OPTIONS,
  ETHNICITY_OPTIONS,
  GENDER_OPTIONS,
  JOB_INFORMATION_OPTIONS,
  LANGUAGES_OPTIONS,
  LOCATION_OPTIONS,
  POLITICAL_LEANING_OPTIONS,
  RELATIONSHIP_STATUS_OPTIONS,
  SEXUAL_ORIENTATION_OPTIONS,
} from 'core/src/personas/options/personaOptions';
import { RELIGIONS_OPTIONS } from 'core/src/personas/options/religions';

import type { CohortWeightedConfig } from 'core/src/personas/cohort.types';

// Utility type to create weighted options that MUST match the source const arrays
type CreateWeightedOptions<T extends readonly string[]> = Array<{
  value: T[number];
  weight: number;
}>;

// Utility function to help create weighted options with compile-time validation
// This requires ALL keys from the source array to be present in the weights object
// and prevents excess properties
const createWeightedOptions = <const T extends readonly string[]>(
  sourceArray: T,
  weights: Record<T[number], number>
): CreateWeightedOptions<T> => {
  // Type assertion to ensure exact match at compile time
  const exactWeights = weights as { [K in T[number]]: number } & {
    [K in keyof typeof weights]: K extends T[number] ? (typeof weights)[K] : never;
  };

  return sourceArray.map(value => ({
    value,
    weight: exactWeights[value],
  }));
};

// Age range options with weights for realistic distribution
export const AGE_RANGE_OPTIONS = [
  [18, 25],
  [26, 35],
  [36, 45],
  [46, 55],
  [56, 65],
  [66, 75],
] as const;

export type AgeRangeOption = (typeof AGE_RANGE_OPTIONS)[number];

const defaultWeightsAgeRanges = {
  '18-25': 3,
  '26-35': 4, // Peak demographic for many platforms
  '36-45': 3,
  '46-55': 2,
  '56-65': 1.5,
  '66-75': 1,
};

// Age range weights that can be influenced by other demographics
export const createAgeRangeWeights = (
  baseWeights: Record<string, number> = {}
): Array<{ value: AgeRangeOption; weight: number }> => {
  return AGE_RANGE_OPTIONS.map(([min, max]) => ({
    value: [min, max] as AgeRangeOption,
    weight: baseWeights[`${min}-${max}`] ?? defaultWeightsAgeRanges[`${min}-${max}`] ?? 1,
  }));
};

export const DEFAULT_AGE_WEIGHTS = createAgeRangeWeights();

// Basic demographic weights - the foundation
export const BASIC_DEMOGRAPHIC_WEIGHTS: CohortWeightedConfig = {
  description:
    'Basic demographic configuration providing a balanced foundation for persona creation',
  target_demographics:
    'General population with diverse representation across all demographic categories',
  age_ranges: AGE_RANGE_OPTIONS.map(([min_age, max_age]) => {
    return {
      min_age,
      max_age,
      weight: defaultWeightsAgeRanges[`${min_age}-${max_age}`] ?? 1,
    };
  }),
  genders: createWeightedOptions(GENDER_OPTIONS, {
    woman: 4,
    man: 4,
    nonbinary: 1,
    demigender: 0,
    bigender: 0,
    pangender: 0,
    genderfluid: 0,
    agender: 0,
    other: 0,
    'prefer not to say': 1,
  }),

  locations: createWeightedOptions(LOCATION_OPTIONS, {
    'United Kingdom': 1,
    'United States': 0,
    Canada: 0,
    Australia: 0,
    'New Zealand': 0,
    France: 0,
    India: 0,
    China: 0,
    Brazil: 0,
    Turkey: 0,
    Other: 0,
  }),

  // TODO: Map these to the locations so we have more authenticity based on the location
  ethnicities: createWeightedOptions(ETHNICITY_OPTIONS, {
    White: 4,
    Black: 2,
    Hispanic: 1.5,
    Latino: 1.5,
    'East Asian': 2,
    'South Asian': 2,
    'Southeast Asian': 2,
    'Middle Eastern': 2,
    'North African': 2,
    'Native American': 0,
    'Indigenous American': 0,
    'Pacific Islander': 0,
    'Native Hawaiian': 0,
    'Indigenous Australian': 0,
    'Torres Strait Islander': 0,
    'Sub-Saharan African': 0,
    Caribbean: 0,
    Mixed: 0,
    Multiracial: 0,
    Other: 1,
    'Prefer not to say': 0.5,
  }),

  // TODO: Map these to the locations so we have more authenticity based on the location
  languages: createWeightedOptions(LANGUAGES_OPTIONS, {
    English: 10,
    Spanish: 1,
    French: 2,
    German: 2,
    Italian: 1,
    Portuguese: 1,
    Arabic: 3,
  }),

  educations: createWeightedOptions(EDUCATION_OPTIONS, {
    'No formal education': 1,
    'Primary education': 1,
    'Secondary education': 1,
    'High school diploma or equivalent': 2,
    'Some college or university': 2,
    'Bachelor’s degree': 4,
    'Master’s degree': 3,
    'Professional degree (e.g., JD, MD)': 1.5,
    'Doctorate (PhD or equivalent)': 1,
    'Vocational or technical training': 2,
    'Associate degree': 1.5,
    'Currently enrolled': 1,
    'Prefer not to say': 0.5,
  }),

  job_industries: createWeightedOptions(JOB_INFORMATION_OPTIONS, {
    Technology: 4,
    Healthcare: 3,
    Education: 3,
    Finance: 3,
    Retail: 2,
    Manufacturing: 2,
    'Business Services': 2,
    Government: 2,
    Nonprofit: 2,
    'Media & Entertainment': 1.5,
    Hospitality: 1.5,
    Transportation: 1.5,
    Construction: 1.5,
    'Real Estate': 1.5,
    Agriculture: 1,
    'Energy & Utilities': 1,
    Telecommunications: 1,
    Engineering: 1,
    'Science & Research': 1,
    'Marketing & Advertising': 1,
    'Human Resources': 1,
    Legal: 1,
    'Arts & Design': 1,
    'Sports & Recreation': 0.5,
    Military: 0.5,
    Student: 1,
    Unemployed: 0.5,
    Retired: 0.5,
    Other: 2,
  }),

  relationship_statuses: createWeightedOptions(RELATIONSHIP_STATUS_OPTIONS, {
    single: 4,
    'in a relationship': 4,
    married: 3,
    engaged: 2,
    divorced: 1.5,
    separated: 1,
    widowed: 0.5,
    'open relationship': 1,
    polyamorous: 1,
    "it's complicated": 1.5,
    situationship: 1.5,
    'prefer not to say': 1,
  }),

  political_leanings: createWeightedOptions(POLITICAL_LEANING_OPTIONS, {
    Progressive: 3,
    Liberal: 3,
    'Moderate-Liberal': 2,
    Centrist: 2,
    'Moderate-Conservative': 2,
    Conservative: 2,
    Libertarian: 2,
    Green: 2,
    Socialist: 2,
    Independent: 2,
    Apolitical: 2,
    Populist: 2,
  }),
  religions: createWeightedOptions(RELIGIONS_OPTIONS, {
    Christian: 3,
    Muslim: 2,
    Jewish: 1,
    Hindu: 1.5,
    Buddhist: 1.5,
    Sikh: 0.5,
    Spiritual: 2,
    Atheist: 2,
    Agnostic: 2,
    Other: 1,
    'Prefer not to say': 1,
  }),
  sexual_orientations: createWeightedOptions(SEXUAL_ORIENTATION_OPTIONS, {
    heterosexual: 6,
    homosexual: 1.5,
    bisexual: 2,
    asexual: 1,
    pansexual: 1,
    demisexual: 0.5,
    queer: 1,
    questioning: 0.5,
    'prefer not to say': 1,
  }),
  reasoning:
    'This configuration provides a balanced representation of basic demographics, with weights reflecting general population distributions. Gender distribution favors binary identities while including non-binary representation. Age ranges peak at 26-35 years old, reflecting common platform demographics. Education weights favor higher education levels. Job industries emphasize technology, healthcare, and education sectors.',
  promptForPersonaCreation:
    'Create a diverse persona based on the provided demographic configuration, ensuring authentic representation of the selected traits.',
} as const;
