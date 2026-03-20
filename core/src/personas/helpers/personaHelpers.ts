import { GENERATIONS } from 'core/src/personas/options/personaOptions';
import { PersonaItem } from 'core/src/personas/persona.types';

/**
 * Get generation name based on age
 * @param age - The age of the person
 * @returns The generation name (e.g., 'Gen Z', 'Millennials', etc.)
 */
// TODO: This should be based on the persona's birth date
export const getGeneration = (age: number): string => {
  const generation = GENERATIONS.find(gen => age >= gen.minAge && age <= gen.maxAge);
  return generation?.name || 'Unknown';
};

/**
 * Get persona image URL
 * @param personaId - The ID of the persona
 * @returns The URL for the persona's image
 */
export const getPersonaImage = (_personaId: string): string => {
  return '';
};

export const getPersonaImageUrl = (persona: PersonaItem): string | null => {
  if (persona.has_image) {
    return '';
  }
  return null;
};

/**
 * Get all available generations
 * @returns Array of generation objects with name, age range, and birth years
 */
export const getAllGenerations = () => {
  return GENERATIONS;
};

export const createUsernameFromName = (name: string): string => {
  // Random number between 1 and 3
  const randomApproach = Math.floor(Math.random() * 3) + 1;

  // Approach 1: Replace spaces and remove non-alphanumeric characters
  if (randomApproach === 1) {
    return name
      .toLowerCase()
      .replace(/ /g, '')
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 16);
  }

  // Approach 2: First letter is the first letter of the first name, and then the rest is last name
  if (randomApproach === 2) {
    const lastName = name.split(' ').pop()?.toLowerCase();
    const username = name[0] + (lastName ?? '');
    return username
      .toLowerCase()
      .replace(/ /g, '')
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 16);
  }

  // Approach 3: Replace spaces with underscores and remove non-alphanumeric characters
  return name
    .toLowerCase()
    .replace(/ /g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 16);
};

export const getPersonaAge = (birthDate: PersonaItem, withLabel: boolean = true): string => {
  const metadata = birthDate.metadata;
  if (!metadata?.birth_date && metadata?.age !== undefined) {
    if (withLabel) {
      return `${metadata.age} years old`;
    }
    return `${metadata.age}`;
  }
  const birthDateStr = metadata?.birth_date;
  if (birthDateStr === undefined) {
    return withLabel ? 'Unknown age' : '0';
  }
  const today = new Date();
  const birthDateObj = new Date(birthDateStr);
  const age = today.getFullYear() - birthDateObj.getFullYear();
  if (withLabel) {
    return `${age} years old`;
  }
  return `${age}`;
};
