import type { CohortWeightedConfig } from 'core/src/personas/cohort.types';
import type { PersonaFormData } from 'core/src/personas/llm/controllers/persona-create/personaCreationLLM';

/**
 * System prompts for persona creation functionality
 */

/**
 * Generates a comprehensive system prompt for creating detailed persona profiles
 */
export const personaCreation = (
  personaConfig: PersonaFormData,
  existingNames: string[],
  cohortConfig?: CohortWeightedConfig,
  ageRangeMin: number = 18,
  ageRangeMax: number = 75,
  randomSeed?: string,
  guidance?: string,
  existingNamesSection?: string
): string => {
  // Use provided parameters or fall back to generating them
  const finalRandomSeed =
    randomSeed || Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  const finalGuidance =
    guidance ||
    'Generate a persona with completely random characteristics based on the available options.';
  const finalExistingNamesSection =
    existingNamesSection ||
    (existingNames.length > 0
      ? `\n**CRITICAL: DO NOT use any of these existing names (choose a completely different name):**\n${existingNames.join(', ')}\n`
      : '');

  return `<task>
Create a UNIQUE and DIVERSE persona. Use this random seed for uniqueness: ${finalRandomSeed}
</task>

<critical>
This persona must be completely different from any previous personas. Vary the name, background, interests, and personality significantly.
${finalExistingNamesSection.trim()}
</critical>

<guidance>${finalGuidance}</guidance>

<prompt_for_persona_creation>${cohortConfig?.promptForPersonaCreation ?? 'Create a unique and realistic persona.'}</prompt_for_persona_creation>

<name_generation_requirements>
<rule>Choose names that match the persona's ethnicity, location, and cultural background</rule>
<rule>For UK demographics: Use common British names (e.g., Emma, Oliver, Sarah, James, etc.)</rule>
<rule>For specific ethnicities: Match names to cultural background (e.g., South Asian names for South Asian ethnicity)</rule>
<rule>Consider the persona's age - older personas should have names popular in their birth decade</rule>
<rule>Avoid overly unique or fantasy names - use realistic, culturally appropriate names</rule>
<rule>Make this persona distinctly different from typical profiles in personality, not just name</rule>
</name_generation_requirements>

<persona_structure>
First, generate the following basic demographic information randomly, unless guided otherwise:
- age (between ${ageRangeMin} and ${ageRangeMax})
- gender
- pronouns
- ethnicity
- accent
- location (specific city, country)
- languages
- job and industry (choose from realistic industries like Technology, Healthcare, Education, Finance, Legal, Government, Nonprofit, Retail, Hospitality, Construction, Manufacturing, Transportation, Media & Entertainment, Marketing & Advertising, Science & Research, Engineering, Real Estate, Arts & Design, Agriculture, Military, etc.)
- education
- relationship status
- political leaning
- birth date (in YYYY-MM-DD format, consistent with age)
- zodiac sign (MUST be calculated from the birth date using correct zodiac date ranges)
- sexual orientation

Next, create a comprehensive persona profile in MARKDOWN format with the following sections, incorporating the demographics you just generated. Generate a realistic name that matches their ethnicity, location, and age demographic.

<section>Basic Information (age, gender, pronouns, ethnicity, accent, location, languages, political leaning, birth date, zodiac sign)</section>
<section>Education and Occupation (degree, current role, career goals)</section>
<section>Personality Traits (5-7 key traits with brief explanations - ensure these form a coherent, psychologically realistic combination. Avoid contradictory traits unless they represent genuine human complexity like "confident but anxious" or "outgoing but needs alone time")</section>
<section>Communication Style (how they speak and express themselves - be specific about their natural language patterns, vocabulary level, formality, and conversational tendencies based on their age, education, and background)</section>
<section>Interests (6-8 specific interests, hobbies, or activities - be creative and specific)</section>
<section>Job title (e.g. Accountant, Teacher, etc.). Do not include a company name, and never include Google.</section>
<section>Background (family, upbringing, formative experiences - make this unique)</section>
<section>Philosophy and Values (5-6 core beliefs or values - be distinctive)</section>
<section>Hopes and Dreams (3-4 aspirations or goals - make these personal and unique)</section>
</persona_structure>

<critical_reminder>
Ensure this persona is completely different from others through unique combinations of traits, interests, and backgrounds. Use demographically appropriate names that match their ethnicity and location. Be highly specific and avoid generic descriptions.
</critical_reminder>

<communication_style_requirements>
<rule>Design a natural speaking style that matches the persona's age, education, and background</rule>
<rule>Gen Z (13-28): Casual, direct, uses modern slang appropriately, shorter sentences</rule>
<rule>Millennials (29-44): Mix of casual and professional, context-dependent</rule>
<rule>Gen X+ (45+): More formal but still conversational</rule>
<rule>Education level should influence vocabulary complexity and communication patterns</rule>
<rule>Job level should influence professional language use</rule>
<rule>Avoid creating personas who speak in overly philosophical, verbose, or pretentious ways unless it genuinely fits their background</rule>
<rule>The persona should sound like a real person having a casual conversation, not writing an academic paper</rule>
</communication_style_requirements>

<personality_trait_validation>
<rule>Choose from realistic personality traits like: analytical, creative, empathetic, ambitious, introverted, extroverted, confident, anxious, perfectionist, laid-back, stubborn, adaptable, dominant, submissive, assertive, passive, sarcastic, sincere, optimistic, cynical, etc.</rule>
<rule>Avoid direct contradictions (e.g. "extremely introverted" + "attention-seeking" + "outgoing")</rule>
<rule>Allow for human complexity (e.g. "confident in work" + "anxious in social situations" is realistic)</rule>
<rule>Consider how traits interact (e.g. "perfectionist" + "procrastinator" can coexist as "last-minute perfectionist")</rule>
<rule>If suggested traits don't work together, substitute with more compatible alternatives</rule>
<rule>Aim for exactly 5-7 traits that tell a coherent story about this person's psychology</rule>
<rule>Use specific, descriptive trait names rather than vague terms</rule>
</personality_trait_validation>

<zodiac_sign_calculation>
The zodiac sign MUST be correctly calculated from the birth date using these ranges:
- Aries: March 21 - April 19
- Taurus: April 20 - May 20  
- Gemini: May 21 - June 20
- Cancer: June 21 - July 22
- Leo: July 23 - August 22
- Virgo: August 23 - September 22
- Libra: September 23 - October 22
- Scorpio: October 23 - November 21
- Sagittarius: November 22 - December 21
- Capricorn: December 22 - January 19
- Aquarius: January 20 - February 18
- Pisces: February 19 - March 20
</zodiac_sign_calculation>

<task_instruction>
Make the persona realistic, nuanced, and internally consistent. Include specific details that bring the persona to life.
</task_instruction>`;
};
