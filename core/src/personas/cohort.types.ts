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
} from './options/personaOptions';
import { RELIGIONS_OPTIONS } from './options/religions';

export type CohortData = {
  size?: number;
  status?: 'processing' | 'completed' | 'failed';
  persona_ids?: string[];
  metadata?: {
    locations?: string[];
  };
};

export type Cohort = {
  id: string;
  name: string;
  description: string;
  data?: CohortData;
  created_at?: Date;
  updated_at?: Date;
};

export type CohortSize = {
  id: CohortSizeKey;
  count: number;
  name: string;
  description: string;
};

export type CohortSizeKey = 'spotlight' | 'pulse' | 'mass';

// Cohort size options
export const COHORT_SIZES: Record<CohortSizeKey, CohortSize> = {
  spotlight: {
    id: 'spotlight',
    count: 10,
    name: 'Spotlight Group',
    description:
      'A select circle of AI personas for focused, intimate feedback, ideal for early-stage idea testing or personalized insights.',
  },
  pulse: {
    id: 'pulse',
    count: 25,
    name: 'Pulse Panel',
    description:
      'A lively mix of diverse personas giving you the heartbeat of common trends and reactions, perfect for campaign tweaks and quick validation.',
  },
  mass: {
    id: 'mass',
    count: 50,
    name: 'Mass Audience',
    description:
      'A mass of opinions from a broad spectrum of backgrounds, capture sweeping perspectives for product launches or market exploration.',
  },
};

/**
 * Weighted configuration for persona creation
 */
export type CohortWeightedConfig = {
  description: string;
  target_demographics: string;
  age_ranges: Array<{
    min_age: number;
    max_age: number;
    weight: number;
  }>;
  genders: Array<{
    value: (typeof GENDER_OPTIONS)[number];
    weight: number;
  }>;
  locations: Array<{
    value: (typeof LOCATION_OPTIONS)[number];
    weight: number;
  }>;
  ethnicities: Array<{
    value: (typeof ETHNICITY_OPTIONS)[number];
    weight: number;
  }>;
  languages: Array<{
    value: (typeof LANGUAGES_OPTIONS)[number];
    weight: number;
  }>;
  educations: Array<{
    value: (typeof EDUCATION_OPTIONS)[number];
    weight: number;
  }>;
  job_industries: Array<{
    value: (typeof JOB_INFORMATION_OPTIONS)[number];
    weight: number;
  }>;
  relationship_statuses: Array<{
    value: (typeof RELATIONSHIP_STATUS_OPTIONS)[number];
    weight: number;
  }>;
  political_leanings: Array<{
    value: (typeof POLITICAL_LEANING_OPTIONS)[number];
    weight: number;
  }>;
  religions: Array<{
    value: (typeof RELIGIONS_OPTIONS)[number];
    weight: number;
  }>;
  sexual_orientations: Array<{
    value: (typeof SEXUAL_ORIENTATION_OPTIONS)[number];
    weight: number;
  }>;
  reasoning: string;
  promptForPersonaCreation: string;
};
