/**
 * Property-Based Tests for Save Playlist Handler
 * Feature: ai-mood-playlist-generator
 * Tests Properties 16, 17, and 18
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fc from 'fast-check';
import admin from '../../../config/firebase.js';
import { savePlaylist, getUserPlaylists, deletePlaylist } from '../saveHandler.js';

const db = admin.firestore();
const PLAYLISTS_COLLECTION = 'playlists';

// Helper to generate test user IDs
const generateUserId = () => `test_user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Helper to generate test song IDs
const generateSongIds = (count) => {
  return Array.from({ length: count }, (_, i) => `song_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`);
};

// Helper to clean up test playlists
const cleanupTestPlaylist = async (playlistId) => {
  try {
    await db.collection(PLAYLISTS_COLLECTION).doc(playlistId).delete();
  } catch (error) {
    // Ignore cleanup errors
  }
};

// Valid emotion labels
const VALID_EMOTIONS = ['sadness', 'joy', 'anger', 'love', 'fear', 'surprise'];

// Arbitrary for playlist data
const playlistDataArbitrary = fc.record({
  name: fc.string({ minLength: 1, maxLength: 100 }),
  emotion: fc.constantFrom(...VALID_EMOTIONS),
  songs: fc.array(fc.string({ minLength: 10, maxLength: 50 }), { minLength: 1, maxLength: 30 }),
  moodText: fc.option(fc.string({ minLength: 3, maxLength: 200 }), { nil: undefined }),
  description: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: undefined }),
});

// Arbitrary for user info
const userInfoArbitrary = fc.record({
  fullName: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
  imageUrl: fc.option(fc.webUrl(), { nil: undefined }),
});

describe('Mood Playlist Save Handler - Property-Based Tests', () => {
  
  // Track test playlists for cleanup
  const testPlaylists = [];

  afterEach(async () => {
    // Clean up all test playlists
    await Promise.all(testPlaylists.map(playlistId => cleanupTestPlaylist(playlistId)));
    testPlaylists.length = 0;
  });

  // Feature: ai-mood-playlist-generator, Property 16: Saved Playlist Completeness
  describe('Property 16: Saved Playlist Completeness', () => {
    
    it('should store playlist name, emotion label, song list, and creation timestamp for any valid playlist', async () => {
      await fc.assert(
        fc.asyncProperty(
          playlistDataArbitrary,
          userInfoArbitrary,
          async (playlistData, userInfo) => {
            const userId = generateUserId();

            const result = await savePlaylist(userId, playlistData, userInfo);

            if (result.success) {
              testPlaylists.push(result.playlistId);

              // Verify all required fields are present in response
              expect(result.playlist).toBeDefined();
              expect(result.playlist.name).toBe(playlistData.name);
              expect(result.playlist.emotion).toBe(playlistData.emotion);
              expect(result.playlist.songs).toEqual(playlistData.songs);
              expect(result.playlist.createdAt).toBeDefined();
              expect(result.playlist.generatedAt).toBeDefined();

              // Verify data in Firestore
              const doc = await db.collection(PLAYLISTS_COLLECTION).doc(result.playlistId).get();
              expect(doc.exists).toBe(true);

              const savedData = doc.data();
              expect(savedData.name).toBe(playlistData.name);
              expect(savedData.emotion).toBe(playlistData.emotion);
              expect(savedData.songs).toEqual(playlistData.songs);
              expect(savedData.createdAt).toBeDefined();
              expect(savedData.generatedAt).toBeDefined();
              expect(savedData.moodGenerated).toBe(true);
            }
          }
        ),
        { numRuns: 50 }
      );
    }, 60000);

    it('should include moodText when provided', async () => {
      await fc.assert(
        fc.asyncProperty(
          playlistDataArbitrary.filter(p => p.moodText !== undefined),
          async (playlistData) => {
            const userId = generateUserId();

            const result = await savePlaylist(userId, playlistData);

            if (result.success) {
              testPlaylists.push(result.playlistId);

              expect(result.playlist.moodText).toBe(playlistData.moodText);

              // Verify in Firestore
              const doc = await db.collection(PLAYLISTS_COLLECTION).doc(result.playlistId).get();
              const savedData = doc.data();
              expect(savedData.moodText).toBe(playlistData.moodText);
            }
          }
        ),
        { numRuns: 30 }
      );
    }, 60000);

    it('should store user information in createdBy field', async () => {
      await fc.assert(
        fc.asyncProperty(
          playlistDataArbitrary,
          userInfoArbitrary,
          async (playlistData, userInfo) => {
            const userId = generateUserId();

            const result = await savePlaylist(userId, playlistData, userInfo);

            if (result.success) {
              testPlaylists.push(result.playlistId);

              // Verify createdBy field
              const doc = await db.collection(PLAYLISTS_COLLECTION).doc(result.playlistId).get();
              const savedData = doc.data();
              
              expect(savedData.createdBy).toBeDefined();
              expect(savedData.createdBy.uid).toBe(userId);
              
              if (userInfo.fullName) {
                expect(savedData.createdBy.fullName).toBe(userInfo.fullName);
              } else {
                expect(savedData.createdBy.fullName).toBe('Unknown User');
              }
              
              if (userInfo.imageUrl) {
                expect(savedData.createdBy.imageUrl).toBe(userInfo.imageUrl);
              }
            }
          }
        ),
        { numRuns: 30 }
      );
    }, 60000);

    it('should set moodGenerated flag to true for all saved playlists', async () => {
      await fc.assert(
        fc.asyncProperty(
          playlistDataArbitrary,
          async (playlistData) => {
            const userId = generateUserId();

            const result = await savePlaylist(userId, playlistData);

            if (result.success) {
              testPlaylists.push(result.playlistId);

              const doc = await db.collection(PLAYLISTS_COLLECTION).doc(result.playlistId).get();
              const savedData = doc.data();
              
              expect(savedData.moodGenerated).toBe(true);
            }
          }
        ),
        { numRuns: 30 }
      );
    }, 60000);

    it('should set isPublic to false by default', async () => {
      await fc.assert(
        fc.asyncProperty(
          playlistDataArbitrary,
          async (playlistData) => {
            const userId = generateUserId();

            const result = await savePlaylist(userId, playlistData);

            if (result.success) {
              testPlaylists.push(result.playlistId);

              const doc = await db.collection(PLAYLISTS_COLLECTION).doc(result.playlistId).get();
              const savedData = doc.data();
              
              expect(savedData.isPublic).toBe(false);
            }
          }
        ),
        { numRuns: 30 }
      );
    }, 60000);

    it('should preserve all songs in the playlist', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }),
            emotion: fc.constantFrom(...VALID_EMOTIONS),
            songs: fc.array(fc.string({ minLength: 10, maxLength: 50 }), { minLength: 1, maxLength: 20 }),
          }),
          async (playlistData) => {
            const userId = generateUserId();

            const result = await savePlaylist(userId, playlistData);

            if (result.success) {
              testPlaylists.push(result.playlistId);

              const doc = await db.collection(PLAYLISTS_COLLECTION).doc(result.playlistId).get();
              const savedData = doc.data();
              
              // Verify song count and order
              expect(savedData.songs.length).toBe(playlistData.songs.length);
              expect(savedData.songs).toEqual(playlistData.songs);
            }
          }
        ),
        { numRuns: 30 }
      );
    }, 60000);
  });

  // Feature: ai-mood-playlist-generator, Property 17: Save Confirmation
  describe('Property 17: Save Confirmation', () => {
    
    it('should return playlist ID for any successful save operation', async () => {
      await fc.assert(
        fc.asyncProperty(
          playlistDataArbitrary,
          async (playlistData) => {
            const userId = generateUserId();

            const result = await savePlaylist(userId, playlistData);

            if (result.success) {
              testPlaylists.push(result.playlistId);

              // Verify playlistId is returned
              expect(result.playlistId).toBeDefined();
              expect(typeof result.playlistId).toBe('string');
              expect(result.playlistId.length).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 50 }
      );
    }, 60000);

    it('should return success flag set to true for successful saves', async () => {
      await fc.assert(
        fc.asyncProperty(
          playlistDataArbitrary,
          async (playlistData) => {
            const userId = generateUserId();

            const result = await savePlaylist(userId, playlistData);

            if (result.playlistId) {
              testPlaylists.push(result.playlistId);
              
              expect(result.success).toBe(true);
            }
          }
        ),
        { numRuns: 30 }
      );
    }, 60000);

    it('should return confirmation message for successful saves', async () => {
      await fc.assert(
        fc.asyncProperty(
          playlistDataArbitrary,
          async (playlistData) => {
            const userId = generateUserId();

            const result = await savePlaylist(userId, playlistData);

            if (result.success) {
              testPlaylists.push(result.playlistId);

              expect(result.message).toBeDefined();
              expect(typeof result.message).toBe('string');
              expect(result.message.length).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 30 }
      );
    }, 60000);

    it('should return complete playlist object in confirmation', async () => {
      await fc.assert(
        fc.asyncProperty(
          playlistDataArbitrary,
          async (playlistData) => {
            const userId = generateUserId();

            const result = await savePlaylist(userId, playlistData);

            if (result.success) {
              testPlaylists.push(result.playlistId);

              // Verify playlist object is returned
              expect(result.playlist).toBeDefined();
              expect(result.playlist._id).toBe(result.playlistId);
              expect(result.playlist.name).toBe(playlistData.name);
              expect(result.playlist.emotion).toBe(playlistData.emotion);
              expect(result.playlist.songs).toEqual(playlistData.songs);
            }
          }
        ),
        { numRuns: 30 }
      );
    }, 60000);

    it('should generate unique playlist IDs for multiple saves', async () => {
      const userId = generateUserId();
      const playlistIds = new Set();

      await fc.assert(
        fc.asyncProperty(
          fc.array(playlistDataArbitrary, { minLength: 2, maxLength: 5 }),
          async (playlistDataArray) => {
            playlistIds.clear();

            for (const playlistData of playlistDataArray) {
              const result = await savePlaylist(userId, playlistData);

              if (result.success) {
                testPlaylists.push(result.playlistId);
                playlistIds.add(result.playlistId);
              }
            }

            // All playlist IDs should be unique
            expect(playlistIds.size).toBe(playlistDataArray.length);
          }
        ),
        { numRuns: 20 }
      );
    }, 60000);

    it('should return playlistId that can be used to retrieve the playlist', async () => {
      await fc.assert(
        fc.asyncProperty(
          playlistDataArbitrary,
          async (playlistData) => {
            const userId = generateUserId();

            const result = await savePlaylist(userId, playlistData);

            if (result.success) {
              testPlaylists.push(result.playlistId);

              // Try to retrieve the playlist using the returned ID
              const doc = await db.collection(PLAYLISTS_COLLECTION).doc(result.playlistId).get();
              expect(doc.exists).toBe(true);
            }
          }
        ),
        { numRuns: 30 }
      );
    }, 60000);
  });

  // Feature: ai-mood-playlist-generator, Property 18: Save Error Handling
  describe('Property 18: Save Error Handling', () => {
    
    it('should return descriptive error message when userId is missing', async () => {
      await fc.assert(
        fc.asyncProperty(
          playlistDataArbitrary,
          async (playlistData) => {
            const result = await savePlaylist('', playlistData);

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.message).toBeDefined();
            expect(typeof result.message).toBe('string');
            expect(result.message.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 30 }
      );
    }, 60000);

    it('should return descriptive error message when playlist name is missing', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            emotion: fc.constantFrom(...VALID_EMOTIONS),
            songs: fc.array(fc.string({ minLength: 10, maxLength: 50 }), { minLength: 1, maxLength: 20 }),
          }),
          async (playlistData) => {
            const userId = generateUserId();
            const result = await savePlaylist(userId, playlistData);

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.message).toBeDefined();
            expect(result.message).toContain('required');
          }
        ),
        { numRuns: 30 }
      );
    }, 60000);

    it('should return descriptive error message when emotion is missing', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }),
            songs: fc.array(fc.string({ minLength: 10, maxLength: 50 }), { minLength: 1, maxLength: 20 }),
          }),
          async (playlistData) => {
            const userId = generateUserId();
            const result = await savePlaylist(userId, playlistData);

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.message).toBeDefined();
            expect(result.message).toContain('required');
          }
        ),
        { numRuns: 30 }
      );
    }, 60000);

    it('should return descriptive error message when songs array is missing', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }),
            emotion: fc.constantFrom(...VALID_EMOTIONS),
          }),
          async (playlistData) => {
            const userId = generateUserId();
            const result = await savePlaylist(userId, playlistData);

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.message).toBeDefined();
            expect(result.message).toContain('required');
          }
        ),
        { numRuns: 30 }
      );
    }, 60000);

    it('should return descriptive error message when songs array is empty', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }),
            emotion: fc.constantFrom(...VALID_EMOTIONS),
            songs: fc.constant([]),
          }),
          async (playlistData) => {
            const userId = generateUserId();
            const result = await savePlaylist(userId, playlistData);

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.message).toBeDefined();
            expect(result.message).toContain('at least one song');
          }
        ),
        { numRuns: 30 }
      );
    }, 60000);

    it('should return descriptive error message when playlistData is null or undefined', async () => {
      const userId = generateUserId();

      const resultNull = await savePlaylist(userId, null);
      expect(resultNull.success).toBe(false);
      expect(resultNull.error).toBeDefined();
      expect(resultNull.message).toBeDefined();

      const resultUndefined = await savePlaylist(userId, undefined);
      expect(resultUndefined.success).toBe(false);
      expect(resultUndefined.error).toBeDefined();
      expect(resultUndefined.message).toBeDefined();
    }, 30000);

    it('should not return playlistId when save fails', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }),
            // Missing emotion and songs to trigger error
          }),
          async (invalidPlaylistData) => {
            const userId = generateUserId();
            const result = await savePlaylist(userId, invalidPlaylistData);

            if (!result.success) {
              expect(result.playlistId).toBeUndefined();
            }
          }
        ),
        { numRuns: 30 }
      );
    }, 60000);

    it('should always return success flag (true or false)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            playlistDataArbitrary,
            fc.record({
              name: fc.option(fc.string(), { nil: undefined }),
              emotion: fc.option(fc.constantFrom(...VALID_EMOTIONS), { nil: undefined }),
              songs: fc.option(fc.array(fc.string()), { nil: undefined }),
            })
          ),
          async (playlistData) => {
            const userId = fc.sample(fc.oneof(fc.string(), fc.constant('')), 1)[0];
            const result = await savePlaylist(userId, playlistData);

            expect(result).toHaveProperty('success');
            expect(typeof result.success).toBe('boolean');
          }
        ),
        { numRuns: 50 }
      );
    }, 60000);

    it('should return user-friendly error messages without technical details', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.option(fc.string(), { nil: undefined }),
            emotion: fc.option(fc.constantFrom(...VALID_EMOTIONS), { nil: undefined }),
            songs: fc.option(fc.array(fc.string()), { nil: undefined }),
          }),
          async (invalidPlaylistData) => {
            const userId = generateUserId();
            const result = await savePlaylist(userId, invalidPlaylistData);

            if (!result.success) {
              expect(result.message).toBeDefined();
              
              // Should not contain technical details
              expect(result.message).not.toMatch(/stack/i);
              expect(result.message).not.toMatch(/trace/i);
              expect(result.message).not.toMatch(/firestore/i);
              expect(result.message).not.toMatch(/exception/i);
              
              // Should be user-friendly
              expect(result.message.length).toBeGreaterThan(10);
              expect(result.message.length).toBeLessThan(200);
            }
          }
        ),
        { numRuns: 30 }
      );
    }, 60000);
  });

  // Combined properties: Save handler consistency
  describe('Combined Properties: Save Handler Consistency', () => {
    
    it('should maintain consistent response structure for success and failure', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            playlistDataArbitrary,
            fc.record({
              name: fc.option(fc.string(), { nil: undefined }),
              emotion: fc.option(fc.constantFrom(...VALID_EMOTIONS), { nil: undefined }),
              songs: fc.option(fc.array(fc.string()), { nil: undefined }),
            })
          ),
          async (playlistData) => {
            const userId = generateUserId();
            const result = await savePlaylist(userId, playlistData);

            // All responses should have success field
            expect(result).toHaveProperty('success');
            expect(typeof result.success).toBe('boolean');

            if (result.success) {
              // Success responses should have these fields
              expect(result).toHaveProperty('playlistId');
              expect(result).toHaveProperty('message');
              expect(result).toHaveProperty('playlist');
              
              testPlaylists.push(result.playlistId);
            } else {
              // Error responses should have these fields
              expect(result).toHaveProperty('error');
              expect(result).toHaveProperty('message');
              
              // Should not have playlistId
              expect(result.playlistId).toBeUndefined();
            }
          }
        ),
        { numRuns: 50 }
      );
    }, 60000);

    it('should handle multiple saves from same user correctly', async () => {
      const userId = generateUserId();

      await fc.assert(
        fc.asyncProperty(
          fc.array(playlistDataArbitrary, { minLength: 2, maxLength: 5 }),
          async (playlistDataArray) => {
            const savedIds = [];

            for (const playlistData of playlistDataArray) {
              const result = await savePlaylist(userId, playlistData);

              if (result.success) {
                savedIds.push(result.playlistId);
                testPlaylists.push(result.playlistId);
              }
            }

            // All saves should succeed
            expect(savedIds.length).toBe(playlistDataArray.length);

            // Verify all playlists belong to the same user
            const userPlaylists = await getUserPlaylists(userId);
            const userPlaylistIds = userPlaylists.map(p => p._id);

            for (const savedId of savedIds) {
              expect(userPlaylistIds).toContain(savedId);
            }
          }
        ),
        { numRuns: 20 }
      );
    }, 60000);
  });
});
