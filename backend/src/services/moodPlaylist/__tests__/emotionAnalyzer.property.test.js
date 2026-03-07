/**
 * Property-Based Tests for Emotion Analyzer Service
 * Feature: ai-mood-playlist-generator
 * Tests Properties 4 and 5
 * 
 * Note: These tests focus on the fallback behavior since mocking the HuggingFace API
 * in ES modules is complex. Property 4 (Highest Confidence Selection) is tested
 * through unit tests with manual API response construction.
 */

import { describe, it, expect } from '@jest/globals';
import fc from 'fast-check';
import { analyzeEmotion } from '../emotionAnalyzer.js';

// Valid emotion labels
const VALID_EMOTIONS = ['sadness', 'joy', 'anger', 'love', 'fear', 'surprise'];

describe('Mood Playlist Emotion Analyzer - Property-Based Tests', () => {

  // Feature: ai-mood-playlist-generator, Property 5: API Failure Fallback
  describe('Property 5: API Failure Fallback', () => {
    
    it('should always return valid emotion label even when API fails or is unavailable', () => {
      fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 3, maxLength: 200 }).filter(s => s.trim().length >= 3),
          async (moodText) => {
            // Without a valid API key, the analyzer will use fallback
            const result = await analyzeEmotion(moodText);

            // Must always return one of the six valid emotions
            expect(VALID_EMOTIONS).toContain(result.emotion);
            expect(result.source).toBe('fallback');
            expect(result.confidence).toBeGreaterThanOrEqual(0);
            expect(result.confidence).toBeLessThanOrEqual(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should complete within time limit even when API fails', () => {
      fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 3, maxLength: 200 }).filter(s => s.trim().length >= 3),
          async (moodText) => {
            const startTime = Date.now();
            const result = await analyzeEmotion(moodText);
            const duration = Date.now() - startTime;

            // Should complete quickly with fallback (< 6 seconds total)
            expect(duration).toBeLessThan(6000);
            expect(result).toBeDefined();
            expect(VALID_EMOTIONS).toContain(result.emotion);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should always return valid result structure when using fallback', () => {
      fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 3, maxLength: 200 }).filter(s => s.trim().length >= 3),
          async (moodText) => {
            const result = await analyzeEmotion(moodText);

            // Verify result structure
            expect(result).toHaveProperty('emotion');
            expect(result).toHaveProperty('confidence');
            expect(result).toHaveProperty('source');
            expect(result).toHaveProperty('processingTime');

            // Verify types
            expect(typeof result.emotion).toBe('string');
            expect(typeof result.confidence).toBe('number');
            expect(typeof result.source).toBe('string');
            expect(typeof result.processingTime).toBe('number');

            // Verify values
            expect(VALID_EMOTIONS).toContain(result.emotion);
            expect(result.confidence).toBeGreaterThanOrEqual(0);
            expect(result.confidence).toBeLessThanOrEqual(1);
            expect(['ai', 'fallback']).toContain(result.source);
            expect(result.processingTime).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should never throw unhandled errors regardless of input', () => {
      fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 3, maxLength: 200 }).filter(s => s.trim().length >= 3),
          async (moodText) => {
            // Should not throw - must return valid result
            const result = await analyzeEmotion(moodText);
            expect(result).toBeDefined();
            expect(VALID_EMOTIONS).toContain(result.emotion);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge case inputs gracefully', () => {
      fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.string({ minLength: 3, maxLength: 3 }), // Minimum length
            fc.string({ minLength: 200, maxLength: 200 }), // Maximum length
            fc.constant('   '), // Whitespace
            fc.constant('!!!'), // Special characters
            fc.constant('123'), // Numbers
            fc.constant('xyz') // Random text
          ),
          async (moodText) => {
            const result = await analyzeEmotion(moodText);
            
            expect(result).toBeDefined();
            expect(VALID_EMOTIONS).toContain(result.emotion);
            expect(result.source).toBe('fallback');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Combined properties: End-to-end correctness
  describe('Combined Properties: Emotion Analyzer Correctness', () => {
    
    it('should always return exactly one valid emotion', () => {
      fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 3, maxLength: 200 }).filter(s => s.trim().length >= 3),
          async (moodText) => {
            const result = await analyzeEmotion(moodText);

            // Must return exactly one emotion
            expect(result.emotion).toBeDefined();
            expect(typeof result.emotion).toBe('string');
            expect(VALID_EMOTIONS).toContain(result.emotion);
            
            // Must not return multiple emotions or invalid values
            expect(Array.isArray(result.emotion)).toBe(false);
            expect(result.emotion).not.toBe('');
            expect(result.emotion).not.toBeNull();
            expect(result.emotion).not.toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should track processing time accurately', () => {
      fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 3, maxLength: 200 }).filter(s => s.trim().length >= 3),
          async (moodText) => {
            const result = await analyzeEmotion(moodText);

            // Processing time should be a valid non-negative number
            expect(result.processingTime).toBeGreaterThanOrEqual(0);
            expect(result.processingTime).toBeLessThan(6000); // Should complete within 6 seconds
            expect(Number.isFinite(result.processingTime)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should provide confidence score in valid range for all scenarios', () => {
      fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 3, maxLength: 200 }).filter(s => s.trim().length >= 3),
          async (moodText) => {
            const result = await analyzeEmotion(moodText);

            // Confidence must always be in [0, 1] range
            expect(result.confidence).toBeGreaterThanOrEqual(0);
            expect(result.confidence).toBeLessThanOrEqual(1);
            expect(Number.isFinite(result.confidence)).toBe(true);
            expect(Number.isNaN(result.confidence)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly identify source of emotion detection', () => {
      fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 3, maxLength: 200 }).filter(s => s.trim().length >= 3),
          async (moodText) => {
            const result = await analyzeEmotion(moodText);

            // Source must be one of the valid values
            expect(['ai', 'fallback']).toContain(result.source);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle mood text with emotion keywords correctly', () => {
      fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...VALID_EMOTIONS),
          fc.string({ minLength: 0, maxLength: 50 }),
          async (targetEmotion, extraText) => {
            // Create mood text with known emotion keyword
            const emotionKeywords = {
              sadness: 'sad',
              joy: 'happy',
              anger: 'angry',
              love: 'love',
              fear: 'scared',
              surprise: 'surprised'
            };
            
            const keyword = emotionKeywords[targetEmotion];
            const moodText = `I feel ${keyword} ${extraText}`.trim();
            
            if (moodText.length >= 3 && moodText.length <= 200) {
              const result = await analyzeEmotion(moodText);
              
              // Should detect the target emotion (when using fallback)
              if (result.source === 'fallback') {
                expect(result.emotion).toBe(targetEmotion);
              }
              
              // Should always return valid result
              expect(VALID_EMOTIONS).toContain(result.emotion);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be deterministic for same input', () => {
      fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 3, maxLength: 200 }).filter(s => s.trim().length >= 3),
          async (moodText) => {
            const result1 = await analyzeEmotion(moodText);
            const result2 = await analyzeEmotion(moodText);
            
            // Same input should produce same emotion (when using same detection method)
            if (result1.source === result2.source) {
              expect(result1.emotion).toBe(result2.emotion);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});



