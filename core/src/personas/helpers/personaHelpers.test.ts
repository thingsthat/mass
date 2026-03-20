import {
  getGeneration,
  getPersonaImage,
  getAllGenerations,
} from 'core/src/personas/helpers/personaHelpers';

describe('personaHelpers.ts', () => {
  describe('getGeneration', () => {
    test('should return correct generation for Gen Z', () => {
      const result = getGeneration(20);
      expect(result).toBe('Generation Z');
    });

    test('should return correct generation for Millennials', () => {
      const result = getGeneration(30);
      expect(result).toBe('Millennial');
    });

    test('should return correct generation for Gen X', () => {
      const result = getGeneration(50);
      expect(result).toBe('Generation X');
    });

    test('should return correct generation for Baby Boomers', () => {
      const result = getGeneration(65);
      expect(result).toBe('Baby Boomer');
    });

    test('should return Unknown for age outside ranges', () => {
      const result = getGeneration(100);
      expect(result).toBe('Unknown');
    });

    test('should return Unknown for negative age', () => {
      const result = getGeneration(-5);
      expect(result).toBe('Unknown');
    });

    test('should handle edge cases at generation boundaries', () => {
      // Test exact boundary ages
      const genAlpha = getGeneration(12); // Generation Alpha max age
      const genZ = getGeneration(13); // Generation Z min age
      const millennial = getGeneration(29); // Millennials min age

      expect(genAlpha).toBe('Generation Alpha');
      expect(genZ).toBe('Generation Z');
      expect(millennial).toBe('Millennial');
    });
  });

  describe('getPersonaImage', () => {
    test('should return empty string (no asset storage)', () => {
      const result = getPersonaImage('test-persona-123');
      expect(result).toBe('');
    });

    test('should return empty string for any persona ID', () => {
      const result = getPersonaImage('f957f8d1-ac85-4606-b4f0-03021fe8f498');
      expect(result).toBe('');
    });

    test('should return empty string for empty persona ID', () => {
      const result = getPersonaImage('');
      expect(result).toBe('');
    });
  });

  describe('getAllGenerations', () => {
    test('should return array of generations', () => {
      const result = getAllGenerations();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    test('should have correct structure for each generation', () => {
      const result = getAllGenerations();

      result.forEach(generation => {
        expect(generation).toHaveProperty('name');
        expect(generation).toHaveProperty('minAge');
        expect(generation).toHaveProperty('maxAge');
        expect(typeof generation.name).toBe('string');
        expect(typeof generation.minAge).toBe('number');
        expect(typeof generation.maxAge).toBe('number');
      });
    });

    test('should have non-overlapping age ranges', () => {
      const result = getAllGenerations();

      // Sort by minAge to check for overlaps
      const sorted = result.sort((a, b) => a.minAge - b.minAge);

      for (let i = 0; i < sorted.length - 1; i++) {
        const current = sorted[i];
        const next = sorted[i + 1];

        expect(current.maxAge).toBeLessThanOrEqual(next.minAge);
      }
    });
  });
});
