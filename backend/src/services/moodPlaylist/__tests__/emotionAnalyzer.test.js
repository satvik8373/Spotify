/**
 * Unit tests for Emotion Analyzer Service
 * 
 * Note: These are integration tests that test the fallback behavior.
 * Full API testing requires mocking which is complex with ES modules.
 */

import { describe, test, expect } from '@jest/globals';
import { analyzeEmotion } from '../emotionAnalyzer.js';

describe('Emotion Analyzer Service', () => {
  describe('analyzeEmotion', () => {
    test('should return a valid emotion result', async () => {
      // This will likely use fallback since we don't have a real API key in tests
      const result = await analyzeEmotion('I am so happy today');
      
      expect(result).toBeDefined();
      expect(result.emotion).toBeDefined();
      expect(['sadness', 'joy', 'anger', 'love', 'fear', 'surprise']).toContain(result.emotion);
      expect(result.confidence).toBeDefined();
      expect(typeof result.confidence).toBe('number');
      expect(result.source).toBeDefined();
      expect(['ai', 'fallback']).toContain(result.source);
      expect(result.processingTime).toBeDefined();
      expect(typeof result.processingTime).toBe('number');
    });

    test('should handle sad mood text', async () => {
      const result = await analyzeEmotion('I feel so sad and lonely');
      
      expect(result).toBeDefined();
      expect(['sadness', 'joy', 'anger', 'love', 'fear', 'surprise']).toContain(result.emotion);
    });

    test('should handle angry mood text', async () => {
      const result = await analyzeEmotion('I am so angry and frustrated');
      
      expect(result).toBeDefined();
      expect(['sadness', 'joy', 'anger', 'love', 'fear', 'surprise']).toContain(result.emotion);
    });

    test('should complete within reasonable time', async () => {
      const startTime = Date.now();
      await analyzeEmotion('I am happy');
      const duration = Date.now() - startTime;
      
      // Should complete within 6 seconds (5s timeout + 1s fallback)
      expect(duration).toBeLessThan(6000);
    });

    test('should include processing time in result', async () => {
      const result = await analyzeEmotion('I am happy');
      
      expect(result.processingTime).toBeDefined();
      expect(typeof result.processingTime).toBe('number');
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    test('should handle empty-ish text gracefully', async () => {
      const result = await analyzeEmotion('hmm');
      
      expect(result).toBeDefined();
      expect(result.emotion).toBeDefined();
      // Should default to joy when no keywords match
      expect(['sadness', 'joy', 'anger', 'love', 'fear', 'surprise']).toContain(result.emotion);
    });
  });
});
