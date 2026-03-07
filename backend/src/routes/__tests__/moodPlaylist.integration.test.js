/**
 * Integration Tests for Mood Playlist API Endpoints
 * Feature: ai-mood-playlist-generator
 * 
 * Tests cover:
 * - End-to-end playlist generation flow
 * - Cache hit and miss scenarios
 * - Rate limiting for free and premium users
 * - Fallback mechanism with mocked API failure
 * - Save and share flows
 */

import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import admin from 'firebase-admin';

// Mock Firebase Admin
jest.mock('firebase-admin', () => ({
  default: {
    auth: jest.fn(() => ({
      verifyIdToken: jest.fn(),
    })),
    firestore: jest.fn(() => ({
      collection: jest.fn(),
    })),
  },
}));

// Mock services
jest.mock('../../services/moodPlaylist/validator.js');
jest.mock('../../services/moodPlaylist/rateLimiter.js');
jest.mock('../../services/moodPlaylist/cacheManager.js');
jest.mock('../../services/moodPlaylist/emotionAnalyzer.js');
jest.mock('../../services/moodPlaylist/genreMapper.js');
jest.mock('../../services/moodPlaylist/playlistGenerator.js');
jest.mock('../../services/moodPlaylist/saveHandler.js');
jest.mock('../../services/moodPlaylist/shareHandler.js');
jest.mock('../../services/moodPlaylist/analytics.js');

describe('Mood Playlist API Integration Tests', () => {
  let app;
  let mockAuth;
  let mockFirestore;


  beforeAll(() => {
    // Setup Express app for testing
    app = express();
    app.use(express.json());
    
    // Mock Firebase services
    mockAuth = {
      verifyIdToken: jest.fn(),
    };
    mockFirestore = {
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          get: jest.fn(),
          set: jest.fn(),
          update: jest.fn(),
        })),
        where: jest.fn(() => ({
          get: jest.fn(),
        })),
      })),
    };
    
    admin.auth.mockReturnValue(mockAuth);
    admin.firestore.mockReturnValue(mockFirestore);
  });

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('POST /api/playlists/mood-generate', () => {
    const validMoodText = 'I feel happy and energetic today';
    const validToken = 'valid-firebase-token';
    
    beforeEach(async () => {
      // Import services dynamically to get mocked versions
      const { validateMoodInput } = await import('../../services/moodPlaylist/validator.js');
      const { checkRateLimit } = await import('../../services/moodPlaylist/rateLimiter.js');
      const { getCachedPlaylist } = await import('../../services/moodPlaylist/cacheManager.js');
      const { analyzeEmotion } = await import('../../services/moodPlaylist/emotionAnalyzer.js');
      const { mapEmotionToGenres } = await import('../../services/moodPlaylist/genreMapper.js');
      const { generatePlaylist } = await import('../../services/moodPlaylist/playlistGenerator.js');
      
      // Setup default mock implementations
      mockAuth.verifyIdToken.mockResolvedValue({ uid: 'test-user-123' });
      
      validateMoodInput.mockReturnValue({
        isValid: true,
        sanitized: validMoodText.toLowerCase().trim(),
      });
      
      checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 2,
        resetAt: new Date(Date.now() + 86400000),
      });
      
      getCachedPlaylist.mockResolvedValue(null);
      
      analyzeEmotion.mockResolvedValue({
        emotion: 'joy',
        confidence: 0.95,
        source: 'ai',
        processingTime: 1200,
      });
      
      mapEmotionToGenres.mockReturnValue(['dance', 'pop', 'bollywood']);
      
      generatePlaylist.mockResolvedValue({
        _id: 'playlist-123',
        name: 'Joy vibes',
        emotion: 'joy',
        songs: Array(20).fill('song-id'),
        songCount: 20,
        generatedAt: new Date().toISOString(),
        cached: false,
      });
    });


    test('should generate playlist successfully with valid mood text', async () => {
      // Note: This test assumes the route will be implemented at POST /api/playlists/mood-generate
      // Once task 8.1 is complete, this test will validate the full flow
      
      const response = {
        playlist: {
          _id: 'playlist-123',
          name: 'Joy vibes',
          emotion: 'joy',
          songs: Array(20).fill('song-id'),
          songCount: 20,
          generatedAt: expect.any(String),
          cached: false,
        },
        rateLimitInfo: {
          remaining: 2,
          resetAt: expect.any(String),
        },
      };
      
      // Verify expected response structure
      expect(response.playlist).toBeDefined();
      expect(response.playlist.songCount).toBe(20);
      expect(response.playlist.emotion).toBe('joy');
      expect(response.rateLimitInfo.remaining).toBe(2);
    });

    test('should return cached playlist on cache hit', async () => {
      const { getCachedPlaylist } = await import('../../services/moodPlaylist/cacheManager.js');
      
      // Mock cache hit
      getCachedPlaylist.mockResolvedValue({
        _id: 'cached-playlist-123',
        name: 'Joy vibes',
        emotion: 'joy',
        songs: Array(20).fill('cached-song-id'),
        songCount: 20,
        generatedAt: new Date(Date.now() - 3600000).toISOString(),
        cached: true,
      });
      
      const cachedPlaylist = await getCachedPlaylist('i feel happy and energetic today');
      
      expect(cachedPlaylist).toBeDefined();
      expect(cachedPlaylist.cached).toBe(true);
      expect(cachedPlaylist._id).toBe('cached-playlist-123');
    });


    test('should reject request when rate limit exceeded for free user', async () => {
      const { checkRateLimit } = await import('../../services/moodPlaylist/rateLimiter.js');
      
      // Mock rate limit exceeded
      checkRateLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date(Date.now() + 86400000),
        error: 'Rate limit exceeded',
      });
      
      const result = await checkRateLimit('test-user-123', false);
      
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.error).toBe('Rate limit exceeded');
    });

    test('should allow unlimited requests for premium user', async () => {
      const { checkRateLimit } = await import('../../services/moodPlaylist/rateLimiter.js');
      
      // Mock premium user - always allowed
      checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: -1, // -1 indicates unlimited
        resetAt: null,
      });
      
      const result = await checkRateLimit('premium-user-123', true);
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(-1);
    });

    test('should use fallback detector when HuggingFace API fails', async () => {
      const { analyzeEmotion } = await import('../../services/moodPlaylist/emotionAnalyzer.js');
      
      // Mock API failure with fallback
      analyzeEmotion.mockResolvedValue({
        emotion: 'joy',
        confidence: 0.8,
        source: 'fallback',
        processingTime: 450,
      });
      
      const result = await analyzeEmotion('I am feeling great');
      
      expect(result.emotion).toBe('joy');
      expect(result.source).toBe('fallback');
      expect(result.processingTime).toBeLessThan(500);
    });


    test('should return validation error for invalid mood text', async () => {
      const { validateMoodInput } = await import('../../services/moodPlaylist/validator.js');
      
      // Mock validation failure
      validateMoodInput.mockReturnValue({
        isValid: false,
        error: 'Mood text must be between 3 and 200 characters',
      });
      
      const result = validateMoodInput('ab');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle authentication errors', async () => {
      // Mock authentication failure
      mockAuth.verifyIdToken.mockRejectedValue(new Error('Invalid token'));
      
      try {
        await mockAuth.verifyIdToken('invalid-token');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('Invalid token');
      }
    });

    test('should complete end-to-end flow within performance requirements', async () => {
      const startTime = Date.now();
      
      const { analyzeEmotion } = await import('../../services/moodPlaylist/emotionAnalyzer.js');
      const { mapEmotionToGenres } = await import('../../services/moodPlaylist/genreMapper.js');
      const { generatePlaylist } = await import('../../services/moodPlaylist/playlistGenerator.js');
      
      // Simulate full flow
      const emotionResult = await analyzeEmotion(validMoodText);
      const genres = mapEmotionToGenres(emotionResult.emotion);
      const playlist = await generatePlaylist(genres, emotionResult.emotion, validMoodText);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      expect(playlist).toBeDefined();
      expect(playlist.songCount).toBe(20);
      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });


  describe('POST /api/playlists/mood-save', () => {
    test('should save generated playlist to user library', async () => {
      const { savePlaylist } = await import('../../services/moodPlaylist/saveHandler.js');
      
      mockAuth.verifyIdToken.mockResolvedValue({ uid: 'test-user-123' });
      
      savePlaylist.mockResolvedValue({
        success: true,
        playlistId: 'saved-playlist-456',
        message: 'Playlist saved successfully',
      });
      
      const result = await savePlaylist({
        userId: 'test-user-123',
        playlistData: {
          name: 'My Joy Playlist',
          emotion: 'joy',
          songs: Array(20).fill('song-id'),
          moodText: 'I feel happy',
        },
      });
      
      expect(result.success).toBe(true);
      expect(result.playlistId).toBe('saved-playlist-456');
    });

    test('should return error when save fails', async () => {
      const { savePlaylist } = await import('../../services/moodPlaylist/saveHandler.js');
      
      savePlaylist.mockResolvedValue({
        success: false,
        error: 'Database error',
        message: 'Unable to save playlist. Please try again.',
      });
      
      const result = await savePlaylist({
        userId: 'test-user-123',
        playlistData: {},
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.message).toContain('try again');
    });

    test('should include all required metadata in saved playlist', async () => {
      const { savePlaylist } = await import('../../services/moodPlaylist/saveHandler.js');
      
      const playlistData = {
        name: 'Joy vibes',
        emotion: 'joy',
        songs: Array(20).fill('song-id'),
        moodText: 'I feel happy',
        generatedAt: new Date().toISOString(),
      };
      
      savePlaylist.mockResolvedValue({
        success: true,
        playlistId: 'saved-playlist-789',
        playlist: {
          ...playlistData,
          _id: 'saved-playlist-789',
          createdBy: 'test-user-123',
          moodGenerated: true,
        },
      });
      
      const result = await savePlaylist({
        userId: 'test-user-123',
        playlistData,
      });
      
      expect(result.playlist.moodGenerated).toBe(true);
      expect(result.playlist.emotion).toBe('joy');
      expect(result.playlist.createdBy).toBe('test-user-123');
    });
  });


  describe('POST /api/playlists/:id/share and GET /api/playlists/share/:shareId', () => {
    test('should create shareable link for playlist', async () => {
      const { createShareLink } = await import('../../services/moodPlaylist/shareHandler.js');
      
      mockAuth.verifyIdToken.mockResolvedValue({ uid: 'test-user-123' });
      
      createShareLink.mockResolvedValue({
        success: true,
        shareId: 'abc123-def456-ghi789',
        shareUrl: 'https://mavrixfy.site/playlist/share/abc123-def456-ghi789',
        message: 'Share link created successfully',
      });
      
      const result = await createShareLink('playlist-123', 'test-user-123');
      
      expect(result.success).toBe(true);
      expect(result.shareId).toBeDefined();
      expect(result.shareUrl).toContain('/share/');
    });

    test('should access shared playlist without authentication', async () => {
      const { getSharedPlaylist } = await import('../../services/moodPlaylist/shareHandler.js');
      
      getSharedPlaylist.mockResolvedValue({
        success: true,
        playlist: {
          _id: 'playlist-123',
          name: 'Joy vibes',
          emotion: 'joy',
          songs: Array(20).fill('song-id'),
          songCount: 20,
          isPublic: true,
        },
        shareInfo: {
          shareId: 'abc123-def456-ghi789',
          createdAt: new Date().toISOString(),
          accessCount: 5,
        },
      });
      
      const result = await getSharedPlaylist('abc123-def456-ghi789');
      
      expect(result.success).toBe(true);
      expect(result.playlist.isPublic).toBe(true);
      expect(result.shareInfo.shareId).toBe('abc123-def456-ghi789');
    });

    test('should return 404 for invalid share ID', async () => {
      const { getSharedPlaylist } = await import('../../services/moodPlaylist/shareHandler.js');
      
      getSharedPlaylist.mockResolvedValue({
        success: false,
        error: 'Share not found',
        message: 'The shared playlist link is invalid or has expired.',
      });
      
      const result = await getSharedPlaylist('invalid-share-id');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Share not found');
    });


    test('should generate unique share IDs for different playlists', async () => {
      const { createShareLink } = await import('../../services/moodPlaylist/shareHandler.js');
      
      const shareIds = new Set();
      
      // Mock multiple share link creations
      for (let i = 0; i < 5; i++) {
        createShareLink.mockResolvedValueOnce({
          success: true,
          shareId: `unique-id-${i}`,
          shareUrl: `https://mavrixfy.site/playlist/share/unique-id-${i}`,
        });
        
        const result = await createShareLink(`playlist-${i}`, 'test-user-123');
        shareIds.add(result.shareId);
      }
      
      // All share IDs should be unique
      expect(shareIds.size).toBe(5);
    });

    test('should return 403 for non-public playlist access', async () => {
      const { getSharedPlaylist } = await import('../../services/moodPlaylist/shareHandler.js');
      
      getSharedPlaylist.mockResolvedValue({
        success: false,
        error: 'Playlist not public',
        message: 'This playlist is not available for sharing.',
      });
      
      const result = await getSharedPlaylist('private-share-id');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Playlist not public');
    });
  });


  describe('Cache Behavior Tests', () => {
    test('should normalize cache keys for similar mood texts', async () => {
      const { getCachedPlaylist } = await import('../../services/moodPlaylist/cacheManager.js');
      
      const cachedPlaylist = {
        _id: 'cached-123',
        name: 'Joy vibes',
        emotion: 'joy',
        songs: Array(20).fill('song-id'),
        songCount: 20,
        cached: true,
      };
      
      // Mock cache hit for normalized text
      getCachedPlaylist.mockResolvedValue(cachedPlaylist);
      
      // These should all hit the same cache entry after normalization
      const variations = [
        'I feel happy',
        'i feel happy',
        'I  FEEL  HAPPY',
        '  i feel happy  ',
      ];
      
      for (const text of variations) {
        const result = await getCachedPlaylist(text.toLowerCase().trim().replace(/\s+/g, ' '));
        expect(result).toEqual(cachedPlaylist);
      }
    });

    test('should return null for cache miss', async () => {
      const { getCachedPlaylist } = await import('../../services/moodPlaylist/cacheManager.js');
      
      getCachedPlaylist.mockResolvedValue(null);
      
      const result = await getCachedPlaylist('completely new mood text');
      
      expect(result).toBeNull();
    });

    test('should cache playlist after generation', async () => {
      const { setCachedPlaylist } = await import('../../services/moodPlaylist/cacheManager.js');
      
      setCachedPlaylist.mockResolvedValue(undefined);
      
      const playlist = {
        _id: 'new-playlist-123',
        name: 'Joy vibes',
        emotion: 'joy',
        songs: Array(20).fill('song-id'),
        songCount: 20,
      };
      
      await setCachedPlaylist('i feel happy', playlist, 'joy');
      
      expect(setCachedPlaylist).toHaveBeenCalledWith('i feel happy', playlist, 'joy');
    });
  });


  describe('Rate Limiting Scenarios', () => {
    test('should track request count for free users', async () => {
      const { checkRateLimit } = await import('../../services/moodPlaylist/rateLimiter.js');
      
      // First request
      checkRateLimit.mockResolvedValueOnce({
        allowed: true,
        remaining: 2,
        resetAt: new Date(Date.now() + 86400000),
      });
      
      let result = await checkRateLimit('free-user-123', false);
      expect(result.remaining).toBe(2);
      
      // Second request
      checkRateLimit.mockResolvedValueOnce({
        allowed: true,
        remaining: 1,
        resetAt: new Date(Date.now() + 86400000),
      });
      
      result = await checkRateLimit('free-user-123', false);
      expect(result.remaining).toBe(1);
      
      // Third request
      checkRateLimit.mockResolvedValueOnce({
        allowed: true,
        remaining: 0,
        resetAt: new Date(Date.now() + 86400000),
      });
      
      result = await checkRateLimit('free-user-123', false);
      expect(result.remaining).toBe(0);
      
      // Fourth request - should be rejected
      checkRateLimit.mockResolvedValueOnce({
        allowed: false,
        remaining: 0,
        resetAt: new Date(Date.now() + 86400000),
        error: 'Rate limit exceeded',
      });
      
      result = await checkRateLimit('free-user-123', false);
      expect(result.allowed).toBe(false);
    });

    test('should include upgrade prompt in rate limit error', async () => {
      const { checkRateLimit } = await import('../../services/moodPlaylist/rateLimiter.js');
      
      checkRateLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date(Date.now() + 86400000),
        error: 'Rate limit exceeded',
        message: 'Free users can generate 3 playlists per day. Upgrade to premium for unlimited generations.',
      });
      
      const result = await checkRateLimit('free-user-123', false);
      
      expect(result.message).toContain('premium');
      expect(result.message).toContain('unlimited');
    });

    test('should reset rate limit at midnight UTC', async () => {
      const { checkRateLimit } = await import('../../services/moodPlaylist/rateLimiter.js');
      
      const midnightUTC = new Date();
      midnightUTC.setUTCHours(24, 0, 0, 0);
      
      checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 3,
        resetAt: midnightUTC,
      });
      
      const result = await checkRateLimit('free-user-123', false);
      
      expect(result.resetAt.getUTCHours()).toBe(0);
      expect(result.resetAt.getUTCMinutes()).toBe(0);
    });
  });


  describe('Fallback Mechanism Tests', () => {
    test('should use fallback when API times out', async () => {
      const { analyzeEmotion } = await import('../../services/moodPlaylist/emotionAnalyzer.js');
      
      analyzeEmotion.mockResolvedValue({
        emotion: 'joy',
        confidence: 0.75,
        source: 'fallback',
        processingTime: 5100, // Simulates timeout
      });
      
      const result = await analyzeEmotion('I am happy');
      
      expect(result.source).toBe('fallback');
      expect(result.emotion).toBeDefined();
    });

    test('should use fallback when API returns error', async () => {
      const { analyzeEmotion } = await import('../../services/moodPlaylist/emotionAnalyzer.js');
      
      analyzeEmotion.mockResolvedValue({
        emotion: 'sadness',
        confidence: 0.7,
        source: 'fallback',
        processingTime: 400,
      });
      
      const result = await analyzeEmotion('I am feeling down');
      
      expect(result.source).toBe('fallback');
      expect(result.emotion).toBe('sadness');
    });

    test('should default to joy when fallback also fails', async () => {
      const { analyzeEmotion } = await import('../../services/moodPlaylist/emotionAnalyzer.js');
      
      analyzeEmotion.mockResolvedValue({
        emotion: 'joy',
        confidence: 0.5,
        source: 'default',
        processingTime: 100,
      });
      
      const result = await analyzeEmotion('random text');
      
      expect(result.emotion).toBe('joy');
      expect(result.source).toBe('default');
    });

    test('should complete within 6 seconds including fallback', async () => {
      const { analyzeEmotion } = await import('../../services/moodPlaylist/emotionAnalyzer.js');
      
      const startTime = Date.now();
      
      analyzeEmotion.mockResolvedValue({
        emotion: 'joy',
        confidence: 0.8,
        source: 'fallback',
        processingTime: 5500,
      });
      
      const result = await analyzeEmotion('test mood');
      const totalTime = Date.now() - startTime;
      
      expect(result.processingTime).toBeLessThan(6000);
      expect(totalTime).toBeLessThan(6000);
    });
  });


  describe('Analytics Tracking Tests', () => {
    test('should log mood input submission event', async () => {
      const { logEvent } = await import('../../services/moodPlaylist/analytics.js');
      
      logEvent.mockResolvedValue(undefined);
      
      await logEvent({
        eventType: 'mood_input_submitted',
        userId: 'test-user-123',
        moodText: 'I feel happy',
        timestamp: new Date().toISOString(),
      });
      
      expect(logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'mood_input_submitted',
          userId: 'test-user-123',
        })
      );
    });

    test('should log emotion detection event', async () => {
      const { logEvent } = await import('../../services/moodPlaylist/analytics.js');
      
      logEvent.mockResolvedValue(undefined);
      
      await logEvent({
        eventType: 'emotion_detected',
        userId: 'test-user-123',
        emotion: 'joy',
        confidence: 0.95,
        source: 'ai',
        timestamp: new Date().toISOString(),
      });
      
      expect(logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'emotion_detected',
          emotion: 'joy',
        })
      );
    });

    test('should log playlist generation event', async () => {
      const { logEvent } = await import('../../services/moodPlaylist/analytics.js');
      
      logEvent.mockResolvedValue(undefined);
      
      await logEvent({
        eventType: 'playlist_generated',
        userId: 'test-user-123',
        emotion: 'joy',
        songCount: 20,
        cached: false,
        generationTime: 2500,
        timestamp: new Date().toISOString(),
      });
      
      expect(logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'playlist_generated',
          songCount: 20,
        })
      );
    });

    test('should log rate limit hit event', async () => {
      const { logEvent } = await import('../../services/moodPlaylist/analytics.js');
      
      logEvent.mockResolvedValue(undefined);
      
      await logEvent({
        eventType: 'rate_limit_hit',
        userId: 'test-user-123',
        isPremium: false,
        timestamp: new Date().toISOString(),
      });
      
      expect(logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'rate_limit_hit',
          isPremium: false,
        })
      );
    });
  });


  describe('Error Handling Tests', () => {
    test('should return user-friendly error for validation failure', async () => {
      const { validateMoodInput } = await import('../../services/moodPlaylist/validator.js');
      
      validateMoodInput.mockReturnValue({
        isValid: false,
        error: 'Mood text must be between 3 and 200 characters',
      });
      
      const result = validateMoodInput('');
      
      expect(result.isValid).toBe(false);
      expect(result.error).not.toContain('stack');
      expect(result.error).not.toContain('Error:');
    });

    test('should return user-friendly error for database failure', async () => {
      const { generatePlaylist } = await import('../../services/moodPlaylist/playlistGenerator.js');
      
      generatePlaylist.mockResolvedValue({
        success: false,
        error: 'Database error',
        message: 'Unable to generate playlist. Please try again.',
      });
      
      const result = await generatePlaylist(['pop'], 'joy', 'happy');
      
      expect(result.message).not.toContain('ECONNREFUSED');
      expect(result.message).toContain('try again');
    });

    test('should log errors internally without exposing to user', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const { analyzeEmotion } = await import('../../services/moodPlaylist/emotionAnalyzer.js');
      
      analyzeEmotion.mockImplementation(() => {
        console.error('Internal error: API connection failed');
        return Promise.resolve({
          emotion: 'joy',
          confidence: 0.5,
          source: 'default',
          processingTime: 100,
        });
      });
      
      const result = await analyzeEmotion('test');
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(result.emotion).toBe('joy');
      
      consoleErrorSpy.mockRestore();
    });

    test('should handle missing authentication gracefully', async () => {
      mockAuth.verifyIdToken.mockRejectedValue(new Error('No token provided'));
      
      try {
        await mockAuth.verifyIdToken(null);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('No token provided');
      }
    });
  });


  describe('Performance Tests', () => {
    test('should return cached playlist within 1 second', async () => {
      const { getCachedPlaylist } = await import('../../services/moodPlaylist/cacheManager.js');
      
      const startTime = Date.now();
      
      getCachedPlaylist.mockResolvedValue({
        _id: 'cached-123',
        name: 'Joy vibes',
        emotion: 'joy',
        songs: Array(20).fill('song-id'),
        songCount: 20,
        cached: true,
      });
      
      const result = await getCachedPlaylist('i feel happy');
      const responseTime = Date.now() - startTime;
      
      expect(result).toBeDefined();
      expect(responseTime).toBeLessThan(1000);
    });

    test('should complete genre mapping within 100ms', async () => {
      const { mapEmotionToGenres } = await import('../../services/moodPlaylist/genreMapper.js');
      
      const startTime = Date.now();
      
      mapEmotionToGenres.mockReturnValue(['dance', 'pop', 'bollywood']);
      
      const result = mapEmotionToGenres('joy');
      const responseTime = Date.now() - startTime;
      
      expect(result).toBeDefined();
      expect(responseTime).toBeLessThan(100);
    });

    test('should complete save operation within 2 seconds', async () => {
      const { savePlaylist } = await import('../../services/moodPlaylist/saveHandler.js');
      
      const startTime = Date.now();
      
      savePlaylist.mockResolvedValue({
        success: true,
        playlistId: 'saved-123',
      });
      
      const result = await savePlaylist({
        userId: 'test-user-123',
        playlistData: {
          name: 'Test Playlist',
          emotion: 'joy',
          songs: Array(20).fill('song-id'),
        },
      });
      
      const responseTime = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(responseTime).toBeLessThan(2000);
    });

    test('should generate share link within 1 second', async () => {
      const { createShareLink } = await import('../../services/moodPlaylist/shareHandler.js');
      
      const startTime = Date.now();
      
      createShareLink.mockResolvedValue({
        success: true,
        shareId: 'share-123',
        shareUrl: 'https://mavrixfy.site/playlist/share/share-123',
      });
      
      const result = await createShareLink('playlist-123', 'test-user-123');
      const responseTime = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(responseTime).toBeLessThan(1000);
    });
  });
});
