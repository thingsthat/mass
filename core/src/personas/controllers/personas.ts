import { getRandomSubset } from 'core/src/helpers/random';
import { Persona } from 'core/src/personas/persona.types';

import type { DatabaseClient } from 'core/src/database/types';

const MAX_PERSONAS_FOR_RANDOM = 2000;

export const getPersonaById = async (
  db: DatabaseClient,
  personaId: string
): Promise<Persona | null> => {
  const { data: persona } = await db.from('personas').select('*').eq('id', personaId).single();
  return (persona as Persona | null) || null;
};

export const getPersonasByIds = async (
  db: DatabaseClient,
  personaIds: string[]
): Promise<Persona[]> => {
  if (personaIds.length === 0) {
    return [];
  }
  const uniqueIds = Array.from(new Set(personaIds));
  const { data: personas, error } = await db.from('personas').select('*').in('id', uniqueIds);
  if (error) {
    throw new Error(`Failed to fetch personas: ${error.message}`);
  }
  return (personas as Persona[]) ?? [];
};

/**
 * Fetch up to count persona IDs chosen at random from the database.
 * Use when no cohort or explicit persona list is provided (e.g. CLI --persona-count).
 */
export const getRandomPersonaIds = async (db: DatabaseClient, count: number): Promise<string[]> => {
  if (count <= 0) {
    return [];
  }
  const { data: rows, error } = await db
    .from('personas')
    .select('id')
    .limit(MAX_PERSONAS_FOR_RANDOM);
  if (error) {
    throw new Error(`Failed to fetch personas: ${error.message}`);
  }
  const allIds = (rows ?? []) as { id: string }[];
  const ids = allIds.map(row => row.id);
  return getRandomSubset(ids, count);
};
