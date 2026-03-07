/**
 * Property-Based Tests for Analytics Logger
 * Feature: ai-mood-playlist-generator
 * Tests Property 22
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import fc from 'fast-check';
import admin from '../../../config/firebase.js';

// Spy on console.error to verify error handling
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

// Import analytics functions
import {
  logMoodInputSubmitted,
  logEmotionDetected,
  logPlaylistGenerated,
  logPlaylistPlayed,
  logPlaylistSaved,
  logRateLimitHit,
  logPremiumConversion,
} from '../analytics.js';

const db = admin.firestore();
const ANALYTICS_COLLECTION = 'mood_playlist_analytics';

describe('Mood Playlist Analytics Logger - Property-Based Tests', () => {
  
  beforeEach(() => {
    consoleErrorSpy.mockClear();
  });

  // Feature: ai-mood-playlist-generator, Property 22: Analytics Event Logging
  describe('Property 22: Analytics Event Logging', () => {
    
    it('should accept mood_input_submitted events with any valid userId and moodText', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }), // userId
          fc.string({ minLength: 3, maxLength: 200 }), // moodText
          (userId, moodText) => {
            // Should not throw
            expect(() => {
              logMoodInputSubmitted(userId, moodText);
            }).not.toThrow();
            
            // Should not log errors
            expect(consoleErrorSpy).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept emotion_detected events with any valid parameters', () => {
      const validEmotions = ['sadness', 'joy', 'anger', 'love', 'fear', 'surprise'];
      const validSources = ['ai', 'fallback', 'default'];
      
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }), // userId
          fc.constantFrom(...validEmotions), // emotion
          fc.double({ min: 0, max: 1 }), // confidence
          fc.constantFrom(...validSources), // source
          (userId, emotion, confidence, source) => {
            // Should not throw
            expect(() => {
              logEmotionDetected(userId, emotion, confidence, source);
            }).not.toThrow();
            
            // Should not log errors
            expect(consoleErrorSpy).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept playlist_generated events with any valid parameters', () => {
      const validEmotions = ['sadness', 'joy', 'anger', 'love', 'fear', 'surprise'];
      
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }), // userId
          fc.constantFrom(...validEmotions), // emotion
          fc.integer({ min: 1, max: 100 }), // songCount
          fc.boolean(), // cached
          fc.integer({ min: 0, max: 10000 }), // generationTime
          (userId, emotion, songCount, cached, generationTime) => {
            // Should not throw
            expect(() => {
              logPlaylistGenerated(userId, emotion, songCount, cached, generationTime);
            }).not.toThrow();
            
            // Should not log errors
            expect(consoleErrorSpy).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept playlist_played events with any valid parameters', () => {
      const validEmotions = ['sadness', 'joy', 'anger', 'love', 'fear', 'surprise'];
      
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }), // userId
          fc.string({ minLength: 1, maxLength: 100 }), // playlistId
          fc.constantFrom(...validEmotions), // emotion
          (userId, playlistId, emotion) => {
            // Should not throw
            expect(() => {
              logPlaylistPlayed(userId, playlistId, emotion);
            }).not.toThrow();
            
            // Should not log errors
            expect(consoleErrorSpy).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept playlist_saved events with any valid parameters', () => {
      const validEmotions = ['sadness', 'joy', 'anger', 'love', 'fear', 'surprise'];
      
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }), // userId
          fc.string({ minLength: 1, maxLength: 100 }), // playlistId
          fc.constantFrom(...validEmotions), // emotion
          (userId, playlistId, emotion) => {
            // Should not throw
            expect(() => {
              logPlaylistSaved(userId, playlistId, emotion);
            }).not.toThrow();
            
            // Should not log errors
            expect(consoleErrorSpy).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept rate_limit_hit events with any valid parameters', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }), // userId
          fc.boolean(), // isPremium
          (userId, isPremium) => {
            // Should not throw
            expect(() => {
              logRateLimitHit(userId, isPremium);
            }).not.toThrow();
            
            // Should not log errors
            expect(consoleErrorSpy).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept premium_conversion events with any valid parameters', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }), // userId
          fc.constantFrom('rate_limit', 'feature_discovery', 'marketing'), // conversionSource
          (userId, conversionSource) => {
            // Should not throw
            expect(() => {
              logPremiumConversion(userId, conversionSource);
            }).not.toThrow();
            
            // Should not log errors
            expect(consoleErrorSpy).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle all event types without throwing for any valid inputs', () => {
      const validEmotions = ['sadness', 'joy', 'anger', 'love', 'fear', 'surprise'];
      const validSources = ['ai', 'fallback', 'default'];
      
      const allLogFunctions = [
        { 
          fn: logMoodInputSubmitted, 
          argsGen: () => [
            fc.sample(fc.string({ minLength: 1, maxLength: 100 }), 1)[0],
            fc.sample(fc.string({ minLength: 3, maxLength: 200 }), 1)[0]
          ]
        },
        { 
          fn: logEmotionDetected, 
          argsGen: () => [
            fc.sample(fc.string({ minLength: 1, maxLength: 100 }), 1)[0],
            fc.sample(fc.constantFrom(...validEmotions), 1)[0],
            fc.sample(fc.double({ min: 0, max: 1 }), 1)[0],
            fc.sample(fc.constantFrom(...validSources), 1)[0]
          ]
        },
        { 
          fn: logPlaylistGenerated, 
          argsGen: () => [
            fc.sample(fc.string({ minLength: 1, maxLength: 100 }), 1)[0],
            fc.sample(fc.constantFrom(...validEmotions), 1)[0],
            fc.sample(fc.integer({ min: 1, max: 100 }), 1)[0],
            fc.sample(fc.boolean(), 1)[0],
            fc.sample(fc.integer({ min: 0, max: 10000 }), 1)[0]
          ]
        },
        { 
          fn: logPlaylistPlayed, 
          argsGen: () => [
            fc.sample(fc.string({ minLength: 1, maxLength: 100 }), 1)[0],
            fc.sample(fc.string({ minLength: 1, maxLength: 100 }), 1)[0],
            fc.sample(fc.constantFrom(...validEmotions), 1)[0]
          ]
        },
        { 
          fn: logPlaylistSaved, 
          argsGen: () => [
            fc.sample(fc.string({ minLength: 1, maxLength: 100 }), 1)[0],
            fc.sample(fc.string({ minLength: 1, maxLength: 100 }), 1)[0],
            fc.sample(fc.constantFrom(...validEmotions), 1)[0]
          ]
        },
        { 
          fn: logRateLimitHit, 
          argsGen: () => [
            fc.sample(fc.string({ minLength: 1, maxLength: 100 }), 1)[0],
            fc.sample(fc.boolean(), 1)[0]
          ]
        },
        { 
          fn: logPremiumConversion, 
          argsGen: () => [
            fc.sample(fc.string({ minLength: 1, maxLength: 100 }), 1)[0],
            fc.sample(fc.constantFrom('rate_limit', 'feature_discovery', 'marketing'), 1)[0]
          ]
        },
      ];
      
      fc.assert(
        fc.property(
          fc.constantFrom(...allLogFunctions),
          (logFunction) => {
            const args = logFunction.argsGen();
            
            // Should not throw
            expect(() => {
              logFunction.fn(...args);
            }).not.toThrow();
            
            // Should not log errors
            expect(consoleErrorSpy).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge case values without throwing', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 1000 }), // Very long or empty strings
          fc.double({ min: -1, max: 2 }), // Out of range confidence
          fc.integer({ min: -100, max: 1000 }), // Negative or very large counts
          (str, confidence, count) => {
            // Should not throw even with edge case values
            expect(() => {
              logMoodInputSubmitted(str, str);
              logEmotionDetected(str, 'joy', confidence, 'ai');
              logPlaylistGenerated(str, 'joy', count, true, count);
              logPlaylistPlayed(str, str, 'joy');
              logPlaylistSaved(str, str, 'joy');
              logRateLimitHit(str, true);
              logPremiumConversion(str, 'rate_limit');
            }).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be non-blocking (fire-and-forget) for all event types', () => {
      const validEmotions = ['sadness', 'joy', 'anger', 'love', 'fear', 'surprise'];
      
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.constantFrom(...validEmotions),
          (userId, emotion) => {
            const startTime = Date.now();
            
            // Call all logging functions
            logMoodInputSubmitted(userId, 'test mood');
            logEmotionDetected(userId, emotion, 0.95, 'ai');
            logPlaylistGenerated(userId, emotion, 20, false, 1500);
            logPlaylistPlayed(userId, 'playlist123', emotion);
            logPlaylistSaved(userId, 'playlist123', emotion);
            logRateLimitHit(userId, false);
            logPremiumConversion(userId, 'rate_limit');
            
            const endTime = Date.now();
            const executionTime = endTime - startTime;
            
            // Should complete very quickly (< 100ms) since it's fire-and-forget
            expect(executionTime).toBeLessThan(100);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle null or undefined parameters gracefully', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(null, undefined, '', 0, false, NaN),
          (invalidValue) => {
            // Should not throw even with invalid values
            expect(() => {
              logMoodInputSubmitted(invalidValue, invalidValue);
              logEmotionDetected(invalidValue, invalidValue, invalidValue, invalidValue);
              logPlaylistGenerated(invalidValue, invalidValue, invalidValue, invalidValue, invalidValue);
              logPlaylistPlayed(invalidValue, invalidValue, invalidValue);
              logPlaylistSaved(invalidValue, invalidValue, invalidValue);
              logRateLimitHit(invalidValue, invalidValue);
              logPremiumConversion(invalidValue, invalidValue);
            }).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

