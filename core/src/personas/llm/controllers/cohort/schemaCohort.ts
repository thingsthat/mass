import { createSchemaDefinition, type SchemaDefinition } from 'core/src/llm/schemas/schema';
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
import { z } from 'zod';

const ageRangeSchemaZod = z.object({
  min_age: z.number().min(18).max(75),
  max_age: z.number().min(18).max(75),
  weight: z.number().min(0).max(10),
});

const weightedOptionSchemaZod = <T extends readonly [string, ...string[]]>(enumValues: T) =>
  z.object({
    value: z.enum(enumValues),
    weight: z.number().min(0).max(10),
  });

export const cohortConfigSchemaZod = z.object({
  description: z.string().describe('A brief description of the target cohort'),
  target_demographics: z
    .string()
    .describe('Detailed explanation of the target demographic characteristics'),
  age_ranges: z.array(ageRangeSchemaZod).describe('Age ranges with weights for this cohort'),
  genders: z
    .array(weightedOptionSchemaZod([...GENDER_OPTIONS] as [string, ...string[]]))
    .describe('Gender options with weights'),
  locations: z
    .array(weightedOptionSchemaZod([...LOCATION_OPTIONS] as [string, ...string[]]))
    .describe('Location options with weights'),
  ethnicities: z
    .array(weightedOptionSchemaZod([...ETHNICITY_OPTIONS] as [string, ...string[]]))
    .describe('Ethnicity options with weights'),
  languages: z
    .array(weightedOptionSchemaZod([...LANGUAGES_OPTIONS] as [string, ...string[]]))
    .describe('Language options with weights'),
  educations: z
    .array(weightedOptionSchemaZod([...EDUCATION_OPTIONS] as [string, ...string[]]))
    .describe('Education options with weights'),
  job_industries: z
    .array(weightedOptionSchemaZod([...JOB_INFORMATION_OPTIONS] as [string, ...string[]]))
    .describe('Job industry options with weights'),
  relationship_statuses: z
    .array(weightedOptionSchemaZod([...RELATIONSHIP_STATUS_OPTIONS] as [string, ...string[]]))
    .describe('Relationship status options with weights'),
  political_leanings: z
    .array(weightedOptionSchemaZod([...POLITICAL_LEANING_OPTIONS] as [string, ...string[]]))
    .describe('Political leaning options with weights'),
  religions: z
    .array(weightedOptionSchemaZod(RELIGIONS_OPTIONS as [string, ...string[]]))
    .describe('Religion options with weights'),
  sexual_orientations: z
    .array(weightedOptionSchemaZod([...SEXUAL_ORIENTATION_OPTIONS] as [string, ...string[]]))
    .describe('Sexual orientation options with weights'),
  reasoning: z.string().describe('Explanation of the weighting decisions made for this cohort'),
  promptForPersonaCreation: z
    .string()
    .describe('Prompt for persona creation that will go alongside the cohort configuration'),
});

export const cohortConfigSchema: SchemaDefinition = createSchemaDefinition(cohortConfigSchemaZod, {
  name: 'cohort_config',
  strict: true,
});
