import { Persona, PersonaMetadata, PersonaMetadataExtended } from 'core/src/personas/persona.types';

// Configuration for basic metadata fields
type MetadataFieldConfig<T> = {
  key: T;
  label: string;
  formatter?: (value: any) => string;
  includeInContext?: boolean; // Whether to include this field in the context output
};

// Helper to create metadata config that ensures all keys are covered
const createMetadataConfig = <T extends Record<string, any>>(config: {
  [K in keyof T]: MetadataFieldConfig<K>;
}): Array<MetadataFieldConfig<keyof T> & { key: keyof T }> => {
  return Object.values(config) as Array<MetadataFieldConfig<keyof T> & { key: keyof T }>;
};

// Helper to format arrays
const formatArray = (arr: string[]) => arr.join(', ');

// Configuration for ALL basic metadata fields - TypeScript will enforce completeness
const BASIC_METADATA_CONFIG = createMetadataConfig<PersonaMetadata>({
  name: { key: 'name', label: 'Name', includeInContext: false }, // Already shown as persona name
  age: { key: 'age', label: 'Age', includeInContext: true }, // Usually derived from other info
  gender: { key: 'gender', label: 'Gender', includeInContext: true }, // Usually in persona description
  pronouns: { key: 'pronouns', label: 'Pronouns', includeInContext: true },
  ethnicity: { key: 'ethnicity', label: 'Ethnicity', includeInContext: true }, // Usually in persona description
  accent: { key: 'accent', label: 'Accent', includeInContext: true },
  location: { key: 'location', label: 'Location', includeInContext: true }, // Usually in persona description
  languages: { key: 'languages', label: 'Languages', includeInContext: true },
  job_title: { key: 'job_title', label: 'Job Title', includeInContext: true }, // Usually in persona description
  job_industry: { key: 'job_industry', label: 'Job Industry', includeInContext: true },
  education: { key: 'education', label: 'Education', includeInContext: true },
  personality_traits: {
    key: 'personality_traits',
    label: 'Personality Traits',
    formatter: formatArray,
    includeInContext: true,
  },
  relationship_status: {
    key: 'relationship_status',
    label: 'Relationship Status',
    includeInContext: true,
  },
  birth_date: { key: 'birth_date', label: 'Birth Date', includeInContext: true },
  zodiac_sign: { key: 'zodiac_sign', label: 'Zodiac Sign', includeInContext: true },
  political_leaning: {
    key: 'political_leaning',
    label: 'Political Leaning',
    includeInContext: true,
  },
  religion: { key: 'religion', label: 'Religion', includeInContext: true },
  height_centimeters: { key: 'height_centimeters', label: 'Height (cm)', includeInContext: true },
  city_town: { key: 'city_town', label: 'Current City/Town', includeInContext: true },
  sexual_orientation: {
    key: 'sexual_orientation',
    label: 'Sexual Orientation',
    includeInContext: true,
  },
});

// Configuration for ALL extended metadata fields - TypeScript will enforce completeness
const EXTENDED_METADATA_CONFIG = createMetadataConfig<PersonaMetadataExtended>({
  body_type: { key: 'body_type', label: 'Body Type', includeInContext: true },
  distinctive_features: {
    key: 'distinctive_features',
    label: 'Distinctive Features',
    formatter: formatArray,
    includeInContext: true,
  },
  disabilities: {
    key: 'disabilities',
    label: 'Disabilities',
    formatter: formatArray,
    includeInContext: true,
  },
  exercise_frequency: {
    key: 'exercise_frequency',
    label: 'Exercise Frequency',
    includeInContext: true,
  },
  diet_preferences: { key: 'diet_preferences', label: 'Diet Preferences', includeInContext: true },
  sleep_schedule: { key: 'sleep_schedule', label: 'Sleep Schedule', includeInContext: true },
  drugs_use: {
    key: 'drugs_use',
    label: 'Drugs Use',
    formatter: formatArray,
    includeInContext: true,
  },
  social_media_usage: {
    key: 'social_media_usage',
    label: 'Social Media Usage',
    includeInContext: true,
  },
  communication_style: {
    key: 'communication_style',
    label: 'Communication Style',
    includeInContext: true,
  },
  social_circle_size: {
    key: 'social_circle_size',
    label: 'Social Circle Size',
    includeInContext: true,
  },
  childhood_location: {
    key: 'childhood_location',
    label: 'Childhood Location',
    includeInContext: true,
  },
  family_structure: { key: 'family_structure', label: 'Family Structure', includeInContext: true },
  trauma_history: { key: 'trauma_history', label: 'Trauma History', includeInContext: true },
  myers_briggs_type: {
    key: 'myers_briggs_type',
    label: 'Myers Briggs Type',
    includeInContext: true,
  },
  emotional_intelligence: {
    key: 'emotional_intelligence',
    label: 'Emotional Intelligence',
    includeInContext: true,
  },
  environmental_consciousness: {
    key: 'environmental_consciousness',
    label: 'Environmental Consciousness',
    includeInContext: true,
  },
  tech_savviness: { key: 'tech_savviness', label: 'Tech Savviness', includeInContext: true },
  preferred_devices: {
    key: 'preferred_devices',
    label: 'Preferred Devices',
    formatter: formatArray,
    includeInContext: true,
  },
  news_consumption: { key: 'news_consumption', label: 'News Consumption', includeInContext: true },
  entertainment_preferences: {
    key: 'entertainment_preferences',
    label: 'Entertainment Preferences',
    formatter: formatArray,
    includeInContext: true,
  },
  attachment_style: { key: 'attachment_style', label: 'Attachment Style', includeInContext: true },
  parental_status: { key: 'parental_status', label: 'Parental Status', includeInContext: true },

  intimacy_comfort_level: {
    key: 'intimacy_comfort_level',
    label: 'Intimacy Comfort Level',
    includeInContext: true,
  },
  mental_health_status: {
    key: 'mental_health_status',
    label: 'Mental Health Status',
    includeInContext: true,
  },
  therapy_experience: {
    key: 'therapy_experience',
    label: 'Therapy Experience',
    includeInContext: true,
  },
  housing_situation: {
    key: 'housing_situation',
    label: 'Housing Situation',
    includeInContext: true,
  },
  transportation: {
    key: 'transportation',
    label: 'Transportation',
    formatter: formatArray,
    includeInContext: true,
  },
  travel_frequency: { key: 'travel_frequency', label: 'Travel Frequency', includeInContext: true },
  spending_habits: { key: 'spending_habits', label: 'Spending Habits', includeInContext: true },
});

export const systemPromptPersonaContext = (
  personaItem: Persona,
  includeExtendedMetadata: boolean = false
): string => {
  const parts: string[] = ['<persona_profile>', `<name>${personaItem.details.name}</name>`];

  const traitEntries: Array<{ label: string; value: string }> = [];

  if (personaItem.details.metadata) {
    const meta = personaItem.details.metadata;
    const fieldsToInclude = BASIC_METADATA_CONFIG.filter(
      config =>
        config.includeInContext && meta[config.key] !== undefined && meta[config.key] !== null
    );
    for (const config of fieldsToInclude) {
      const value = meta[config.key];
      const formattedValue = config.formatter ? config.formatter(value) : String(value);
      traitEntries.push({ label: config.label, value: formattedValue });
    }

    if (includeExtendedMetadata && personaItem.details.metadata_extended) {
      const extendedMeta = personaItem.details.metadata_extended;
      const extendedFieldsToInclude = EXTENDED_METADATA_CONFIG.filter(
        config =>
          config.includeInContext &&
          extendedMeta[config.key] !== undefined &&
          extendedMeta[config.key] !== null
      );
      for (const config of extendedFieldsToInclude) {
        const value = extendedMeta[config.key];
        const formattedValue = config.formatter ? config.formatter(value) : String(value);
        traitEntries.push({ label: config.label, value: formattedValue });
      }
    }
  }

  if (traitEntries.length > 0) {
    parts.push('<metadata>');
    for (const { label, value } of traitEntries) {
      parts.push(`<trait key="${label}">${value}</trait>`);
    }
    parts.push('</metadata>');
  }

  parts.push('</persona_profile>');
  return parts.join('\n');
};
