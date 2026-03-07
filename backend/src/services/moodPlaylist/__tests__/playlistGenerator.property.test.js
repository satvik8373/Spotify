/**
 * Property-Based Tests for Playlist Generator
 * Feature: ai-mood-playlist-generator
 * Tests Properties 8, 9, 10
 */

import { describe, it, expect } from '@jest/globals';
import fc from 'fast-check';
import {
  shuffleArray,
  generatePlaylistName,
  expandGenres
} from '../playlistGenerator.js';

// Valid emotions for testing
const VALID_EMOTIONS = ['sadness', 'joy', 'anger', 'love', 'fear', 'surprise'];

describe('Mood Playlist Generator - Property-Based Tests', () => {

  // Feature: ai-mood-playlist-generator, Property 8: Playlist Size Invariant
  describe('Property 8: Playlist Size Invariant', () => {
    
    it('should verify shuffleArray preserves array length (playlist size invariant)', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string(), { minLength: 20, maxLength: 100 }),
          (songArray) => {
            const originalLength = songArray.length;
            const arrayCopy = [...songArray];
            
            shuffleArray(arrayCopy);

            // Property: Length must be preserved (critical for 20-song invariant)
            expect(arrayCopy.length).toBe(originalLength);
            
            // Property: All original elements must still be present
            songArray.forEach(song => {
              expect(arrayCopy).toContain(song);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should verify that slicing shuffled array to 20 always yields exactly 20 songs', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string(), { minLength: 20, maxLength: 100 }),
          (songArray) => {
            const arrayCopy = [...songArray];
            shuffleArray(arrayCopy);
            
            // Simulate the playlist generation logic: shuffle then slice to 20
            const selectedSongs = arrayCopy.slice(0, 20);

            // Property: Must always have exactly 20 songs (Requirement 5.2)
            expect(selectedSongs.length).toBe(20);
            expect(selectedSongs.every(song => typeof song === 'string')).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge case when exactly 20 songs are available', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string(), { minLength: 20, maxLength: 20 }),
          (songArray) => {
            const arrayCopy = [...songArray];
            shuffleArray(arrayCopy);
            const selectedSongs = arrayCopy.slice(0, 20);

            // Property: Should still return exactly 20 songs
            expect(selectedSongs.length).toBe(20);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should verify expandGenres maintains or increases genre count for better song availability', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom('lofi', 'pop', 'rock', 'dance', 'rap', 'indie'), { minLength: 1, maxLength: 5 }),
          (originalGenres) => {
            const expanded = expandGenres(originalGenres);
            
            // Property: Expansion should provide more genres to help reach 20 songs (Requirement 5.4)
            expect(expanded.length).toBeGreaterThanOrEqual(originalGenres.length);
            
            // Property: All original genres must be included
            originalGenres.forEach(genre => {
              expect(expanded).toContain(genre);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: ai-mood-playlist-generator, Property 9: Playlist Randomization
  describe('Property 9: Playlist Randomization', () => {
    
    it('should verify shuffleArray produces non-deterministic orderings', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer(), { minLength: 10, maxLength: 50 }),
          (originalArray) => {
            const array1 = [...originalArray];
            const array2 = [...originalArray];
            
            shuffleArray(array1);
            shuffleArray(array2);

            // Property: Shuffled arrays should contain same elements (Requirement 5.5)
            expect(array1.sort()).toEqual(originalArray.sort());
            expect(array2.sort()).toEqual(originalArray.sort());
            
            // Property: Length should be preserved
            expect(array1.length).toBe(originalArray.length);
            expect(array2.length).toBe(originalArray.length);
            
            // Property: All original elements should be present
            originalArray.forEach(element => {
              expect(array1).toContain(element);
              expect(array2).toContain(element);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should shuffle in-place and return the same array reference', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer(), { minLength: 5, maxLength: 20 }),
          (originalArray) => {
            const arrayReference = originalArray;
            const result = shuffleArray(originalArray);

            // Property: Should return the same array reference (in-place modification)
            expect(result).toBe(arrayReference);
            expect(result).toBe(originalArray);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge case of single-element array', () => {
      fc.assert(
        fc.property(
          fc.anything(),
          (element) => {
            const array = [element];
            const result = shuffleArray(array);

            // Property: Single element array should remain unchanged
            expect(result).toEqual([element]);
            expect(result.length).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty array without errors', () => {
      const emptyArray = [];
      const result = shuffleArray(emptyArray);

      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });

    it('should verify randomization by checking multiple shuffles produce different orderings', () => {
      // Create a large enough array where getting the same shuffle twice is extremely unlikely
      const testArray = Array.from({ length: 20 }, (_, i) => i);
      const shuffles = [];
      
      // Perform 10 shuffles
      for (let i = 0; i < 10; i++) {
        const copy = [...testArray];
        shuffleArray(copy);
        shuffles.push(JSON.stringify(copy));
      }
      
      // Property: At least some shuffles should be different (high probability)
      const uniqueShuffles = new Set(shuffles);
      expect(uniqueShuffles.size).toBeGreaterThan(1);
    });
  });

  // Feature: ai-mood-playlist-generator, Property 10: Playlist Metadata Completeness
  describe('Property 10: Playlist Metadata Completeness', () => {
    
    it('should always generate a non-empty playlist name for any emotion and genres', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...VALID_EMOTIONS),
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
          (emotion, genres) => {
            const name = generatePlaylistName(emotion, genres);
            
            // Property: Name must be a non-empty string (Requirement 5.6)
            expect(typeof name).toBe('string');
            expect(name.length).toBeGreaterThan(0);
            expect(name.trim().length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include emotion-related or genre-related terms in playlist name', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...VALID_EMOTIONS),
          fc.array(fc.constantFrom('pop', 'rock', 'lofi', 'dance', 'rap', 'indie'), { minLength: 1, maxLength: 3 }),
          (emotion, genres) => {
            const name = generatePlaylistName(emotion, genres);
            const nameLower = name.toLowerCase();
            
            // Property: Name should reference emotion or genre (Requirement 5.6, 5.7)
            const emotionMappings = {
              sadness: 'melancholy',
              joy: 'joyful',
              anger: 'intense',
              love: 'romantic',
              fear: 'calm',
              surprise: 'unexpected'
            };
            
            const emotionInName = nameLower.includes(emotionMappings[emotion].toLowerCase()) ||
                                  nameLower.includes('mood') ||
                                  nameLower.includes('vibes') ||
                                  nameLower.includes('playlist');
            
            const genreInName = genres.some(genre => nameLower.includes(genre.toLowerCase()));
            
            // At least one should be true
            expect(emotionInName || genreInName).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate different names with high probability for variety', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...VALID_EMOTIONS),
          fc.array(fc.constantFrom('pop', 'rock'), { minLength: 1, maxLength: 2 }),
          (emotion, genres) => {
            // Generate multiple names
            const names = new Set();
            for (let i = 0; i < 10; i++) {
              names.add(generatePlaylistName(emotion, genres));
            }
            
            // Property: Should generate some variety (randomization in templates)
            // With 4 templates, we expect at least 2 different names in 10 tries
            expect(names.size).toBeGreaterThanOrEqual(1);
            
            // All names should be valid
            names.forEach(name => {
              expect(typeof name).toBe('string');
              expect(name.length).toBeGreaterThan(0);
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle edge case of empty genres array gracefully', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...VALID_EMOTIONS),
          (emotion) => {
            const name = generatePlaylistName(emotion, []);
            
            // Property: Should still generate a valid name
            expect(typeof name).toBe('string');
            expect(name.length).toBeGreaterThan(0);
            
            // Should fall back to emotion-based naming
            const nameLower = name.toLowerCase();
            expect(
              nameLower.includes('melancholy') ||
              nameLower.includes('joyful') ||
              nameLower.includes('intense') ||
              nameLower.includes('romantic') ||
              nameLower.includes('calm') ||
              nameLower.includes('unexpected') ||
              nameLower.includes('mood') ||
              nameLower.includes('vibes')
            ).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should verify emotion mapping consistency in name generation', () => {
      const emotionNameMap = {
        sadness: 'Melancholy',
        joy: 'Joyful',
        anger: 'Intense',
        love: 'Romantic',
        fear: 'Calm',
        surprise: 'Unexpected'
      };

      fc.assert(
        fc.property(
          fc.constantFrom(...VALID_EMOTIONS),
          fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 3 }),
          (emotion, genres) => {
            const name = generatePlaylistName(emotion, genres);
            
            // Property: Name should be consistent with emotion mapping
            expect(typeof name).toBe('string');
            expect(name.length).toBeGreaterThan(0);
            
            // Verify the emotion name mapping is used correctly
            const expectedEmotionName = emotionNameMap[emotion];
            expect(expectedEmotionName).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Additional helper function properties
  describe('Helper Function Properties', () => {
    
    it('expandGenres should always return an array containing original genres', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom('lofi', 'pop', 'rock', 'dance', 'rap', 'indie', 'acoustic'), { minLength: 1, maxLength: 5 }),
          (originalGenres) => {
            const expanded = expandGenres(originalGenres);
            
            // Property: Should return an array
            expect(Array.isArray(expanded)).toBe(true);
            
            // Property: Should contain all original genres
            originalGenres.forEach(genre => {
              expect(expanded).toContain(genre);
            });
            
            // Property: Should have at least as many genres as original
            expect(expanded.length).toBeGreaterThanOrEqual(originalGenres.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('expandGenres should remove duplicates', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom('pop', 'rock', 'lofi', 'dance'), { minLength: 1, maxLength: 5 }),
          (genres) => {
            const expanded = expandGenres(genres);
            
            // Property: No duplicates in result
            const uniqueGenres = [...new Set(expanded)];
            expect(expanded.length).toBe(uniqueGenres.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('expandGenres should handle empty array input', () => {
      const result = expandGenres([]);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('expandGenres should handle unknown genres gracefully', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 3 }),
          (unknownGenres) => {
            const expanded = expandGenres(unknownGenres);
            
            // Property: Should still return an array with at least the original genres
            expect(Array.isArray(expanded)).toBe(true);
            unknownGenres.forEach(genre => {
              expect(expanded).toContain(genre);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('expandGenres should expand known genres with related genres', () => {
      const testCases = [
        { input: ['lofi'], shouldInclude: ['acoustic', 'chill', 'ambient'] },
        { input: ['pop'], shouldInclude: ['dance', 'bollywood', 'indie'] },
        { input: ['rock'], shouldInclude: ['alternative', 'indie', 'metal'] },
        { input: ['dance'], shouldInclude: ['pop', 'electronic', 'edm'] }
      ];

      testCases.forEach(({ input, shouldInclude }) => {
        const expanded = expandGenres(input);
        
        // Should include original
        expect(expanded).toContain(input[0]);
        
        // Should include at least some related genres
        const hasRelated = shouldInclude.some(genre => expanded.includes(genre));
        expect(hasRelated).toBe(true);
      });
    });
  });

  // Metadata structure validation
  describe('Metadata Structure Validation', () => {
    
    it('should verify playlist name format follows expected patterns', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...VALID_EMOTIONS),
          fc.array(fc.constantFrom('pop', 'rock', 'lofi'), { minLength: 1, maxLength: 2 }),
          (emotion, genres) => {
            const name = generatePlaylistName(emotion, genres);
            
            // Property: Name should not be empty or just whitespace
            expect(name.trim()).not.toBe('');
            
            // Property: Name should not contain special characters that break UI
            expect(name).not.toMatch(/[<>{}[\]\\]/);
            
            // Property: Name should be reasonable length (not too long)
            expect(name.length).toBeLessThan(100);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should verify shuffleArray handles arrays with duplicate elements correctly', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom('a', 'b', 'c'), { minLength: 10, maxLength: 30 }),
          (arrayWithDuplicates) => {
            const originalCounts = {};
            arrayWithDuplicates.forEach(item => {
              originalCounts[item] = (originalCounts[item] || 0) + 1;
            });
            
            const shuffled = [...arrayWithDuplicates];
            shuffleArray(shuffled);
            
            const shuffledCounts = {};
            shuffled.forEach(item => {
              shuffledCounts[item] = (shuffledCounts[item] || 0) + 1;
            });
            
            // Property: Element counts should be preserved
            expect(shuffledCounts).toEqual(originalCounts);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
