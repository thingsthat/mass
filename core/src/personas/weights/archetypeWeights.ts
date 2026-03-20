// Persona archetype system for controlling variety levels
export type PersonaArchetype = 'standard' | 'quirky' | 'unique' | 'eccentric';

// Distribution of persona types
export const ARCHETYPE_DISTRIBUTION = [
  { value: 'standard' as PersonaArchetype, weight: 0.8 }, // 80% normal people
  { value: 'quirky' as PersonaArchetype, weight: 0.1 }, // 10% interesting people
  { value: 'unique' as PersonaArchetype, weight: 0.09 }, // 9% memorable people
  { value: 'eccentric' as PersonaArchetype, weight: 0.01 }, // 1% truly unusual people
];

// How each archetype affects trait selection
export const ARCHETYPE_MODIFIERS = {
  standard: {
    personality_quirks_count: { min: 0, max: 1 },
    unusual_hobbies_count: { min: 0, max: 1 },
    unique_skills_count: { min: 0, max: 1 },
    background_stories_count: { min: 1, max: 2 },
    communication_style_intensity: 0.3, // Subtle
    contradiction_likelihood: 0.1, // Rare contradictions
    unusual_combination_multiplier: 0.2,
  },
  quirky: {
    personality_quirks_count: { min: 1, max: 2 },
    unusual_hobbies_count: { min: 1, max: 2 },
    unique_skills_count: { min: 0, max: 2 },
    background_stories_count: { min: 1, max: 3 },
    communication_style_intensity: 0.6, // Noticeable
    contradiction_likelihood: 0.3, // Some interesting contrasts
    unusual_combination_multiplier: 0.5,
  },
  unique: {
    personality_quirks_count: { min: 2, max: 3 },
    unusual_hobbies_count: { min: 1, max: 3 },
    unique_skills_count: { min: 1, max: 2 },
    background_stories_count: { min: 2, max: 4 },
    communication_style_intensity: 0.8, // Distinctive
    contradiction_likelihood: 0.5, // Multiple interesting contrasts
    unusual_combination_multiplier: 1.0,
  },
  eccentric: {
    personality_quirks_count: { min: 3, max: 5 },
    unusual_hobbies_count: { min: 2, max: 4 },
    unique_skills_count: { min: 1, max: 3 },
    background_stories_count: { min: 2, max: 5 },
    communication_style_intensity: 1.0, // Very distinctive
    contradiction_likelihood: 0.8, // Many fascinating contrasts
    unusual_combination_multiplier: 2.0,
  },
};

// Trait category weights by archetype
export const TRAIT_CATEGORY_WEIGHTS = {
  standard: {
    common_traits: 3.0,
    interesting_traits: 1.0,
    unusual_traits: 0.2,
    eccentric_traits: 0.1,
  },
  quirky: {
    common_traits: 2.0,
    interesting_traits: 2.5,
    unusual_traits: 1.0,
    eccentric_traits: 0.3,
  },
  unique: {
    common_traits: 1.0,
    interesting_traits: 2.0,
    unusual_traits: 2.5,
    eccentric_traits: 1.0,
  },
  eccentric: {
    common_traits: 0.5,
    interesting_traits: 1.0,
    unusual_traits: 2.0,
    eccentric_traits: 3.0,
  },
};

// Age-based archetype modifiers (some ages are more likely to be eccentric)
export const AGE_ARCHETYPE_MODIFIERS = {
  '18-25': {
    standard: 1.2, // Young people often more conventional
    quirky: 1.0,
    unique: 0.8,
    eccentric: 0.6,
  },
  '26-35': {
    standard: 1.0,
    quirky: 1.2, // Peak age for interesting life choices
    unique: 1.1,
    eccentric: 0.8,
  },
  '36-45': {
    standard: 1.0,
    quirky: 1.0,
    unique: 1.2, // Established enough to be unique
    eccentric: 1.0,
  },
  '46-55': {
    standard: 1.0,
    quirky: 0.9,
    unique: 1.1,
    eccentric: 1.3, // Midlife can bring eccentricity
  },
  '56-65': {
    standard: 1.1,
    quirky: 0.8,
    unique: 1.0,
    eccentric: 1.5, // Retirement age freedom
  },
  '66-75': {
    standard: 1.2,
    quirky: 0.7,
    unique: 0.9,
    eccentric: 2.0, // Elderly eccentrics are memorable
  },
};

// Education-based archetype modifiers
export const EDUCATION_ARCHETYPE_MODIFIERS = {
  'No formal education': {
    standard: 1.3,
    quirky: 0.8,
    unique: 1.2, // Life experience creates uniqueness
    eccentric: 1.0,
  },
  'High school diploma or equivalent': {
    standard: 1.2,
    quirky: 1.0,
    unique: 0.9,
    eccentric: 0.8,
  },
  "Bachelor's degree": {
    standard: 1.0,
    quirky: 1.1,
    unique: 1.0,
    eccentric: 0.9,
  },
  "Master's degree": {
    standard: 0.9,
    quirky: 1.1,
    unique: 1.2,
    eccentric: 1.0,
  },
  'Doctorate (PhD or equivalent)': {
    standard: 0.7,
    quirky: 1.0,
    unique: 1.5,
    eccentric: 1.8, // PhD holders can be quite eccentric
  },
  'Professional degree (e.g., JD, MD)': {
    standard: 1.1,
    quirky: 0.9,
    unique: 1.2,
    eccentric: 1.3,
  },
};

// Job industry archetype modifiers
export const JOB_ARCHETYPE_MODIFIERS = {
  Technology: {
    standard: 0.8,
    quirky: 1.3,
    unique: 1.2,
    eccentric: 1.1,
  },
  'Arts & Design': {
    standard: 0.6,
    quirky: 1.5,
    unique: 1.8,
    eccentric: 2.0,
  },
  'Science & Research': {
    standard: 0.7,
    quirky: 1.2,
    unique: 1.5,
    eccentric: 1.8,
  },
  Government: {
    standard: 1.5,
    quirky: 0.7,
    unique: 0.8,
    eccentric: 0.5,
  },
  Healthcare: {
    standard: 1.2,
    quirky: 0.9,
    unique: 1.1,
    eccentric: 0.8,
  },
  Education: {
    standard: 1.1,
    quirky: 1.2,
    unique: 1.0,
    eccentric: 1.3,
  },
  'Media & Entertainment': {
    standard: 0.7,
    quirky: 1.4,
    unique: 1.6,
    eccentric: 1.8,
  },
  Finance: {
    standard: 1.3,
    quirky: 0.8,
    unique: 0.9,
    eccentric: 0.6,
  },
};
