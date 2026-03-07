/**
 * Property-Based Tests for Genre Mapper
 * Feature: ai-mood-playlist-generator
 * Tests Property 7
 */

import { describe, it, expect } from '@jest/globals';
import fc from 'fast-check';
import { mapEmotionToGenres, EMOTION_GENRE_MAP, VALID_EMOTIONS } from '../genreMapper.js';

describe('Mood Playlist Genre Mapper - Property-Based Tests', () => {
  
  // Feature: ai-mood-playlist-generator, Property 7: Genre Mapping Completeness
  describe('Property 7: Genre Mapping Completeness', () => {
    
    it('should return a non-empty array of genres for any valid emotion', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...VALID_EMOTIONS),
          (emotion) => {
            const genres = mapEmotionToGenres(emotion);
            
            // Should return an array
            expect(Array.isArray(genres)).toBe(true);
            
            // Array should not be empty
            expect(genres.length).toBeGreaterThan(0);
            
            // All elements should be strings
            genres.forEach(genre => {
              expect(typeof genre).toBe('string');
              expect(genre.length).toBeGreaterThan(0);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return genres for all six valid emotions', () => {
      // Test that every emotion in VALID_EMOTIONS has a mapping
      VALID_EMOTIONS.forEach(emotion => {
        const genres = mapEmotionToGenres(emotion);
        
        expect(Array.isArray(genres)).toBe(true);
        expect(genres.length).toBeGreaterThan(0);
      });
    });

    it('should handle case-insensitive emotion input', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...VALID_EMOTIONS),
          fc.constantFrom('upper', 'lower', 'mixed'),
          (emotion, caseType) => {
            let transformedEmotion;
            
            switch (caseType) {
              case 'upper':
                transformedEmotion = emotion.toUpperCase();
                break;
              case 'lower':
                transformedEmotion = emotion.toLowerCase();
                break;
              case 'mixed':
                // Mix case randomly
                transformedEmotion = emotion
                  .split('')
                  .map((char, i) => i % 2 === 0 ? char.toUpperCase() : char.toLowerCase())
                  .join('');
                break;
            }
            
            const genres = mapEmotionToGenres(transformedEmotion);
            
            // Should still return valid genres regardless of case
            expect(Array.isArray(genres)).toBe(true);
            expect(genres.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle emotion input with leading/trailing whitespace', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...VALID_EMOTIONS),
          fc.nat({ max: 5 }),
          fc.nat({ max: 5 }),
          (emotion, leadingSpaces, trailingSpaces) => {
            const paddedEmotion = ' '.repeat(leadingSpaces) + emotion + ' '.repeat(trailingSpaces);
            const genres = mapEmotionToGenres(paddedEmotion);
            
            // Should still return valid genres
            expect(Array.isArray(genres)).toBe(true);
            expect(genres.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should throw error for invalid emotion labels', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => !VALID_EMOTIONS.includes(s.toLowerCase().trim())),
          (invalidEmotion) => {
            // Skip empty strings as they're handled separately
            if (!invalidEmotion || invalidEmotion.trim().length === 0) {
              return;
            }
            
            expect(() => mapEmotionToGenres(invalidEmotion)).toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should throw error for empty or null emotion input', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('', '   ', null, undefined),
          (invalidInput) => {
            expect(() => mapEmotionToGenres(invalidInput)).toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return a new array instance (not the original)', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...VALID_EMOTIONS),
          (emotion) => {
            const genres1 = mapEmotionToGenres(emotion);
            const genres2 = mapEmotionToGenres(emotion);
            
            // Should return equal content
            expect(genres1).toEqual(genres2);
            
            // But different array instances (to prevent external modification)
            expect(genres1).not.toBe(genres2);
            
            // Modifying one should not affect the other
            genres1.push('test-genre');
            expect(genres1.length).not.toBe(genres2.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return consistent genres for the same emotion across multiple calls', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...VALID_EMOTIONS),
          fc.nat({ max: 10 }),
          (emotion, callCount) => {
            const results = [];
            
            // Call multiple times
            for (let i = 0; i < callCount + 1; i++) {
              results.push(mapEmotionToGenres(emotion));
            }
            
            // All results should be equal
            results.forEach(result => {
              expect(result).toEqual(results[0]);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return genres that match the expected mapping for each emotion', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...VALID_EMOTIONS),
          (emotion) => {
            const genres = mapEmotionToGenres(emotion);
            const expectedGenres = EMOTION_GENRE_MAP[emotion];
            
            // Should match the expected mapping
            expect(genres).toEqual(expectedGenres);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should complete execution quickly (performance requirement < 100ms)', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...VALID_EMOTIONS),
          (emotion) => {
            const startTime = performance.now();
            mapEmotionToGenres(emotion);
            const endTime = performance.now();
            
            const executionTime = endTime - startTime;
            
            // Should complete in less than 100ms (requirement 14.3)
            expect(executionTime).toBeLessThan(100);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return only string elements in the genre array', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...VALID_EMOTIONS),
          (emotion) => {
            const genres = mapEmotionToGenres(emotion);
            
            // Every element must be a non-empty string
            genres.forEach(genre => {
              expect(typeof genre).toBe('string');
              expect(genre).not.toBe('');
              expect(genre.trim().length).toBeGreaterThan(0);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Additional property: Mapping completeness verification
  describe('Mapping Completeness Verification', () => {
    
    it('should have mappings for all valid emotions in EMOTION_GENRE_MAP', () => {
      VALID_EMOTIONS.forEach(emotion => {
        expect(EMOTION_GENRE_MAP).toHaveProperty(emotion);
        expect(Array.isArray(EMOTION_GENRE_MAP[emotion])).toBe(true);
        expect(EMOTION_GENRE_MAP[emotion].length).toBeGreaterThan(0);
      });
    });

    it('should not have extra mappings beyond valid emotions', () => {
      const mappingKeys = Object.keys(EMOTION_GENRE_MAP);
      
      mappingKeys.forEach(key => {
        expect(VALID_EMOTIONS).toContain(key);
      });
    });

    it('should have exactly 6 emotion mappings', () => {
      expect(Object.keys(EMOTION_GENRE_MAP).length).toBe(6);
      expect(VALID_EMOTIONS.length).toBe(6);
    });
  });

  // Specific emotion mapping tests (validates requirements 4.2-4.7)
  describe('Specific Emotion Mappings', () => {
    
    it('should map sadness to lofi, sad hindi, and acoustic genres', () => {
      const genres = mapEmotionToGenres('sadness');
      expect(genres).toContain('lofi');
      expect(genres).toContain('sad hindi');
      expect(genres).toContain('acoustic');
    });

    it('should map joy to dance, pop, and bollywood genres', () => {
      const genres = mapEmotionToGenres('joy');
      expect(genres).toContain('dance');
      expect(genres).toContain('pop');
      expect(genres).toContain('bollywood');
    });

    it('should map anger to rap and rock genres', () => {
      const genres = mapEmotionToGenres('anger');
      expect(genres).toContain('rap');
      expect(genres).toContain('rock');
    });

    it('should map love to romantic and soft genres', () => {
      const genres = mapEmotionToGenres('love');
      expect(genres).toContain('romantic');
      expect(genres).toContain('soft');
    });

    it('should map fear to instrumental genre', () => {
      const genres = mapEmotionToGenres('fear');
      expect(genres).toContain('instrumental');
    });

    it('should map surprise to indie genre', () => {
      const genres = mapEmotionToGenres('surprise');
      expect(genres).toContain('indie');
    });
  });
});
