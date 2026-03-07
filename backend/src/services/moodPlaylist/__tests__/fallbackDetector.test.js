/**
 * Unit tests for Fallback Emotion Detector
 */

import { describe, test, expect } from '@jest/globals';
import { detectEmotionByKeywords, EMOTION_KEYWORDS, DEFAULT_EMOTION } from '../fallbackDetector.js';

describe('Fallback Emotion Detector', () => {
  describe('detectEmotionByKeywords', () => {
    test('should detect sadness from sad keywords', () => {
      const result = detectEmotionByKeywords('I feel so sad and lonely today');
      expect(result.emotion).toBe('sadness');
      expect(result.source).toBe('fallback');
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('should detect joy from happy keywords', () => {
      const result = detectEmotionByKeywords('I am so happy and excited');
      expect(result.emotion).toBe('joy');
      expect(result.source).toBe('fallback');
    });

    test('should detect anger from angry keywords', () => {
      const result = detectEmotionByKeywords('I am so angry and frustrated');
      expect(result.emotion).toBe('anger');
      expect(result.source).toBe('fallback');
    });

    test('should detect love from romantic keywords', () => {
      const result = detectEmotionByKeywords('I love this romantic feeling');
      expect(result.emotion).toBe('love');
      expect(result.source).toBe('fallback');
    });

    test('should detect fear from anxious keywords', () => {
      const result = detectEmotionByKeywords('I am scared and anxious');
      expect(result.emotion).toBe('fear');
      expect(result.source).toBe('fallback');
    });

    test('should detect surprise from surprised keywords', () => {
      const result = detectEmotionByKeywords('I am so surprised and amazed');
      expect(result.emotion).toBe('surprise');
      expect(result.source).toBe('fallback');
    });

    test('should return joy as default when no keywords match', () => {
      const result = detectEmotionByKeywords('The weather is nice');
      expect(result.emotion).toBe('joy');
      expect(result.source).toBe('fallback');
    });

    test('should handle case-insensitive matching', () => {
      const result = detectEmotionByKeywords('I am HAPPY and EXCITED');
      expect(result.emotion).toBe('joy');
    });

    test('should handle punctuation removal', () => {
      const result = detectEmotionByKeywords('I am sad, very sad!');
      expect(result.emotion).toBe('sadness');
    });

    test('should return emotion with most keyword matches', () => {
      const result = detectEmotionByKeywords('I am happy excited joyful and sad');
      expect(result.emotion).toBe('joy');
    });

    test('should complete within 500ms', () => {
      const startTime = Date.now();
      detectEmotionByKeywords('I feel happy and excited about life');
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(500);
    });

    test('should include processing time in result', () => {
      const result = detectEmotionByKeywords('I am happy');
      expect(result.processingTime).toBeDefined();
      expect(typeof result.processingTime).toBe('number');
    });
  });

  describe('EMOTION_KEYWORDS', () => {
    test('should have all 6 emotions defined', () => {
      expect(Object.keys(EMOTION_KEYWORDS)).toHaveLength(6);
      expect(EMOTION_KEYWORDS).toHaveProperty('sadness');
      expect(EMOTION_KEYWORDS).toHaveProperty('joy');
      expect(EMOTION_KEYWORDS).toHaveProperty('anger');
      expect(EMOTION_KEYWORDS).toHaveProperty('love');
      expect(EMOTION_KEYWORDS).toHaveProperty('fear');
      expect(EMOTION_KEYWORDS).toHaveProperty('surprise');
    });

    test('should have at least 5 keywords per emotion', () => {
      for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
        expect(keywords.length).toBeGreaterThanOrEqual(5);
      }
    });
  });

  describe('DEFAULT_EMOTION', () => {
    test('should be joy', () => {
      expect(DEFAULT_EMOTION).toBe('joy');
    });
  });
});
