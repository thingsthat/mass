import { createSchemaDefinition, type SchemaDefinition } from 'core/src/llm/schemas/schema';
import {
  EDUCATION_OPTIONS,
  ETHNICITY_OPTIONS,
  GENDER_OPTIONS,
  JOB_INFORMATION_OPTIONS,
  LANGUAGES_OPTIONS,
  LOCATION_OPTIONS,
  POLITICAL_LEANING_OPTIONS,
  PRONOUNS_OPTIONS,
  RELATIONSHIP_STATUS_OPTIONS,
  SEXUAL_ORIENTATION_OPTIONS,
  ZODIAC_SIGN_OPTIONS,
} from 'core/src/personas/options/personaOptions';
import { RELIGIONS_OPTIONS } from 'core/src/personas/options/religions';
import { z } from 'zod';

const metadataSchemaZod = z.object({
  age: z.number().describe('Age of the persona'),
  gender: z
    .enum([...GENDER_OPTIONS] as [string, ...string[]])
    .describe('Gender the persona identifies as'),
  pronouns: z
    .enum([...PRONOUNS_OPTIONS] as [string, ...string[]])
    .describe('Pronouns used by the persona'),
  ethnicity: z
    .enum([...ETHNICITY_OPTIONS] as [string, ...string[]])
    .describe('Ethnicity, how the persona identifies'),
  accent: z.string().describe('Accent'),
  location: z
    .enum([...LOCATION_OPTIONS] as [string, ...string[]])
    .describe('Current living location'),
  languages: z.enum([...LANGUAGES_OPTIONS] as [string, ...string[]]).describe('Languages spoken'),
  job_title: z.string().describe('Job title'),
  job_industry: z
    .enum([...JOB_INFORMATION_OPTIONS] as [string, ...string[]])
    .describe('Job industry'),
  education: z.enum([...EDUCATION_OPTIONS] as [string, ...string[]]).describe('Education level'),
  personality_traits: z
    .array(z.string().describe('Personality traits - use any realistic personality trait'))
    .describe('Array of 5-7 personality traits that form a coherent psychological profile'),
  relationship_status: z
    .enum([...RELATIONSHIP_STATUS_OPTIONS] as [string, ...string[]])
    .describe('Relationship status'),
  political_leaning: z
    .enum([...POLITICAL_LEANING_OPTIONS] as [string, ...string[]])
    .describe('Political leaning'),
  birth_date: z.string().describe('Birth date in YYYY-MM-DD format'),
  zodiac_sign: z.enum([...ZODIAC_SIGN_OPTIONS] as [string, ...string[]]).describe('Zodiac sign'),
  religion: z.enum(RELIGIONS_OPTIONS as [string, ...string[]]).describe('Religious affiliation'),
  height_centimeters: z
    .number()
    .min(140)
    .max(210)
    .describe('Height in centimeters (140-210 range for adults)'),
  city_town: z.string().describe('Specific city or town where the persona lives'),
  sexual_orientation: z
    .enum([...SEXUAL_ORIENTATION_OPTIONS] as [string, ...string[]])
    .describe('Sexual orientation'),
});

export const personaSchemaZod = z.object({
  name: z.string().describe('Name of the persona'),
  persona: z
    .string()
    .min(4000)
    .max(8000)
    .describe(
      'Persona profile in markdown format should be detailed and comprehensive, including a Communication Style section that describes how they naturally speak and express themselves based on their age, education, and background. The profile should be at least 4000 characters and no more than 8000 characters. Maximum length should be 8000 characters.'
    ),
  metadata: metadataSchemaZod,
});

export const personaSchema: SchemaDefinition = createSchemaDefinition(personaSchemaZod, {
  name: 'persona',
  strict: true,
});
