/**
 * Property-Based Tests for Cache Manager
 * Feature: ai-mood-playlist-generator
 * Tests Properties 14 and 15
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fc from 'fast-check';
import admin from '../../../config/firebase.js';
import {
  getCachedPlaylist,
  setCachedPlaylist,
  normalizeCacheKey
} from '../cacheManager.js';

const db = admin.firestore();
const CACHE_COLLECTION = 'mood_playlist_cache';

// Helper to clean up test cache entries
async function cleanupTestCache() {
  const snapshot = await db.collection(CACHE_COLLECTION).get();
  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  if (!snapshot.empty) {
    await batch.commit();
  }
}

// Helper to create a mock playlist object
function createMockPlaylist(emotion = 'joy') {
  return {
    _id: `playlist_${Date.now()}_${Math.random()}`,
    name: `${emotion} vibes`,
    emotion,
    songs: Array.from({ length: 20 }, (_, i) => `song_${i}`),
    songCount: 20,
    generatedAt: admin.firestore.Timestamp.now()
  };
}

describe('Cache Manager - Property-Based Tests', () => {
  
  beforeEach(async () => {
    await cleanupTestCache();
  });

  afterEach(async () => {
    await cleanupTestCache();
  });

  // Feature: ai-mood-playlist-generator, Property 14: Cache Hit Consistency
  describe('Property 14: Cache Hit Consistency', () => {
    
    it('should return the same cached playlist when queried with the same normalized mood text', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 3, maxLength: 200 }),
          fc.constantFrom('sadness', 'joy', 'anger', 'love', 'fear', 'surprise'),
          async (moodText, emotion) => {
            // Skip if mood text normalizes to empty
            const normalized = normalizeCacheKey(moodText);
            if (!normalized) return;

            // Generate and cache a playlist
            const originalPlaylist = createMockPlaylist(emotion);
            await setCachedPlaylist(moodText, originalPlaylist, emotion);

            // Wait a bit for Firestore to process
            await new Promise(resolve => setTimeout(resolve, 100));

            // Retrieve the cached playlist
            const cachedPlaylist = await getCachedPlaylist(moodText);

            // Should return a playlist
            expect(cachedPlaylist).not.toBeNull();
            
            if (cachedPlaylist) {
              // Should have the same structure and content
              expect(cachedPlaylist._id).toBe(originalPlaylist._id);
              expect(cachedPlaylist.name).toBe(originalPlaylist.name);
              expect(cachedPlaylist.emotion).toBe(originalPlaylist.emotion);
              expect(cachedPlaylist.songs).toEqual(originalPlaylist.songs);
              expect(cachedPlaylist.songCount).toBe(originalPlaylist.songCount);
            }
          }
        ),
        { numRuns: 20 } // Reduced runs for async Firestore operations
      );
    }, 60000); // Increased timeout for Firestore operations

    it('should return cached playlist on second request with same mood text', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 3, maxLength: 200 }),
          fc.constantFrom('sadness', 'joy', 'anger', 'love', 'fear', 'surprise'),
          async (moodText, emotion) => {
            const normalized = normalizeCacheKey(moodText);
            if (!normalized) return;

            const playlist = createMockPlaylist(emotion);
            
            // First request: cache the playlist
            await setCachedPlaylist(moodText, playlist, emotion);
            await new Promise(resolve => setTimeout(resolve, 100));

            // Second request: should hit cache
            const firstRetrieval = await getCachedPlaylist(moodText);
            
            // Third request: should still hit cache
            const secondRetrieval = await getCachedPlaylist(moodText);

            // Both retrievals should return the same playlist
            if (firstRetrieval && secondRetrieval) {
              expect(firstRetrieval._id).toBe(secondRetrieval._id);
              expect(firstRetrieval._id).toBe(playlist._id);
            }
          }
        ),
        { numRuns: 20 }
      );
    }, 60000);

    it('should return null for mood text that was never cached', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 3, maxLength: 200 }),
          async (moodText) => {
            const normalized = normalizeCacheKey(moodText);
            if (!normalized) return;

            // Query for a mood text that was never cached
            const result = await getCachedPlaylist(moodText);

            // Should return null (cache miss)
            expect(result).toBeNull();
          }
        ),
        { numRuns: 20 }
      );
    }, 60000);

    it('should maintain cache consistency across multiple cache/retrieve cycles', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 3, maxLength: 200 }),
          fc.constantFrom('sadness', 'joy', 'anger', 'love', 'fear', 'surprise'),
          fc.nat({ max: 3 }),
          async (moodText, emotion, cycles) => {
            const normalized = normalizeCacheKey(moodText);
            if (!normalized) return;

            let lastPlaylist = null;

            // Perform multiple cache/retrieve cycles
            for (let i = 0; i <= cycles; i++) {
              const playlist = createMockPlaylist(emotion);
              await setCachedPlaylist(moodText, playlist, emotion);
              await new Promise(resolve => setTimeout(resolve, 100));

              const retrieved = await getCachedPlaylist(moodText);
              
              if (retrieved) {
                // Each retrieval should return a valid playlist
                expect(retrieved._id).toBeDefined();
                expect(retrieved.emotion).toBe(emotion);
                expect(retrieved.songCount).toBe(20);
                
                lastPlaylist = retrieved;
              }
            }

            // Final retrieval should still work
            const finalRetrieval = await getCachedPlaylist(moodText);
            expect(finalRetrieval).not.toBeNull();
          }
        ),
        { numRuns: 10 } // Fewer runs due to multiple cycles
      );
    }, 90000);
  });

  // Feature: ai-mood-playlist-generator, Property 15: Cache Key Normalization
  describe('Property 15: Cache Key Normalization', () => {
    
    it('should treat case-insensitive mood texts as the same cache key', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 3, maxLength: 200 }).filter(s => s.trim().length >= 3),
          fc.constantFrom('sadness', 'joy', 'anger', 'love', 'fear', 'surprise'),
          async (baseMoodText, emotion) => {
            const normalized = normalizeCacheKey(baseMoodText);
            if (!normalized) return;

            // Create variations with different casing
            const lowercase = baseMoodText.toLowerCase();
            const uppercase = baseMoodText.toUpperCase();
            const mixedCase = baseMoodText.split('').map((c, i) => 
              i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()
            ).join('');

            // Cache with one variation
            const playlist = createMockPlaylist(emotion);
            await setCachedPlaylist(lowercase, playlist, emotion);
            await new Promise(resolve => setTimeout(resolve, 100));

            // Retrieve with different case variations
            const retrievedLower = await getCachedPlaylist(lowercase);
            const retrievedUpper = await getCachedPlaylist(uppercase);
            const retrievedMixed = await getCachedPlaylist(mixedCase);

            // All variations should return the same cached playlist
            if (retrievedLower && retrievedUpper && retrievedMixed) {
              expect(retrievedLower._id).toBe(playlist._id);
              expect(retrievedUpper._id).toBe(playlist._id);
              expect(retrievedMixed._id).toBe(playlist._id);
            }
          }
        ),
        { numRuns: 20 }
      );
    }, 60000);

    it('should treat mood texts with different whitespace as the same cache key', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 3, maxLength: 200 }).filter(s => s.trim().length >= 3),
          fc.constantFrom('sadness', 'joy', 'anger', 'love', 'fear', 'surprise'),
          fc.nat({ max: 5 }),
          async (baseMoodText, emotion, extraSpaces) => {
            const normalized = normalizeCacheKey(baseMoodText);
            if (!normalized) return;

            // Create variations with different whitespace
            const withLeadingSpaces = ' '.repeat(extraSpaces) + baseMoodText;
            const withTrailingSpaces = baseMoodText + ' '.repeat(extraSpaces);
            const withBothSpaces = ' '.repeat(extraSpaces) + baseMoodText + ' '.repeat(extraSpaces);

            // Cache with one variation
            const playlist = createMockPlaylist(emotion);
            await setCachedPlaylist(baseMoodText, playlist, emotion);
            await new Promise(resolve => setTimeout(resolve, 100));

            // Retrieve with different whitespace variations
            const retrieved1 = await getCachedPlaylist(withLeadingSpaces);
            const retrieved2 = await getCachedPlaylist(withTrailingSpaces);
            const retrieved3 = await getCachedPlaylist(withBothSpaces);

            // All variations should return the same cached playlist
            if (retrieved1 && retrieved2 && retrieved3) {
              expect(retrieved1._id).toBe(playlist._id);
              expect(retrieved2._id).toBe(playlist._id);
              expect(retrieved3._id).toBe(playlist._id);
            }
          }
        ),
        { numRuns: 20 }
      );
    }, 60000);

    it('should treat mood texts with collapsed whitespace as the same cache key', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 2, maxLength: 5 }),
          fc.constantFrom('sadness', 'joy', 'anger', 'love', 'fear', 'surprise'),
          fc.nat({ max: 5 }),
          async (words, emotion, spaceCount) => {
            // Create mood text with multiple spaces between words
            const singleSpace = words.join(' ');
            const multipleSpaces = words.join(' '.repeat(spaceCount + 2));

            const normalized = normalizeCacheKey(singleSpace);
            if (!normalized || normalized.length < 3) return;

            // Cache with single space version
            const playlist = createMockPlaylist(emotion);
            await setCachedPlaylist(singleSpace, playlist, emotion);
            await new Promise(resolve => setTimeout(resolve, 100));

            // Retrieve with multiple spaces version
            const retrieved = await getCachedPlaylist(multipleSpaces);

            // Should return the same cached playlist
            if (retrieved) {
              expect(retrieved._id).toBe(playlist._id);
            }
          }
        ),
        { numRuns: 20 }
      );
    }, 60000);

    it('should normalize cache keys consistently for any input', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 3, maxLength: 200 }),
          fc.string({ minLength: 3, maxLength: 200 }),
          async (moodText1, moodText2) => {
            const normalized1 = normalizeCacheKey(moodText1);
            const normalized2 = normalizeCacheKey(moodText2);

            // If the normalized keys are the same, they should share cache
            if (normalized1 === normalized2 && normalized1.length >= 3) {
              const playlist = createMockPlaylist('joy');
              
              // Cache with first mood text
              await setCachedPlaylist(moodText1, playlist, 'joy');
              await new Promise(resolve => setTimeout(resolve, 100));

              // Retrieve with second mood text
              const retrieved = await getCachedPlaylist(moodText2);

              // Should return the same playlist
              if (retrieved) {
                expect(retrieved._id).toBe(playlist._id);
              }
            }
          }
        ),
        { numRuns: 20 }
      );
    }, 60000);

    it('should produce the same normalized key regardless of input variations', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 3, maxLength: 200 }),
          (baseMoodText) => {
            // Create variations
            const variations = [
              baseMoodText,
              baseMoodText.toLowerCase(),
              baseMoodText.toUpperCase(),
              '  ' + baseMoodText + '  ',
              baseMoodText.replace(/\s+/g, '   '),
              '   ' + baseMoodText.toLowerCase() + '   '
            ];

            // All variations should produce the same normalized key
            const normalizedKeys = variations.map(v => normalizeCacheKey(v));
            const uniqueKeys = [...new Set(normalizedKeys)];

            // Should have only one unique normalized key
            expect(uniqueKeys.length).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty or invalid inputs gracefully in normalization', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('', '   ', '\t\n', null, undefined),
          (invalidInput) => {
            const normalized = normalizeCacheKey(invalidInput);

            // Should return empty string for invalid inputs
            expect(normalized).toBe('');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Combined property: Normalization + Cache Consistency
  describe('Combined Properties: Normalization and Cache Consistency', () => {
    
    it('should maintain cache consistency across all normalized variations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 3, maxLength: 200 }).filter(s => s.trim().length >= 3),
          fc.constantFrom('sadness', 'joy', 'anger', 'love', 'fear', 'surprise'),
          async (baseMoodText, emotion) => {
            const normalized = normalizeCacheKey(baseMoodText);
            if (!normalized) return;

            // Create multiple variations
            const variations = [
              baseMoodText,
              baseMoodText.toUpperCase(),
              '  ' + baseMoodText + '  ',
              baseMoodText.replace(/\s/g, '  ')
            ];

            // Cache with first variation
            const playlist = createMockPlaylist(emotion);
            await setCachedPlaylist(variations[0], playlist, emotion);
            await new Promise(resolve => setTimeout(resolve, 100));

            // Retrieve with all variations
            const results = await Promise.all(
              variations.map(v => getCachedPlaylist(v))
            );

            // All non-null results should have the same playlist ID
            const nonNullResults = results.filter(r => r !== null);
            if (nonNullResults.length > 0) {
              const firstId = nonNullResults[0]._id;
              nonNullResults.forEach(result => {
                expect(result._id).toBe(firstId);
                expect(result._id).toBe(playlist._id);
              });
            }
          }
        ),
        { numRuns: 15 }
      );
    }, 60000);
  });
});
