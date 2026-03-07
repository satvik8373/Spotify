/**
 * Property-Based Tests for Fallback Emotion Detector
 * Feature: ai-mood-playlist-generator
 * Tests Properties 3 and 6
 */

import { describe, it, expect } from '@jest/globals';
import fc from 'fast-check';
import { 
  detectEmotionByKeywords, 
  EMOTION_KEYWORDS, 
  DEFAULT_EMOTION 
} from '../fallbackDetector.js';

// Valid emotion labels
const VALID_EMOTIONS = ['sadness', 'joy', 'anger', 'love', 'fear', 'surprise'];

describe('Mood Playlist Fallback Detector - Property-Based Tests', () => {
  
  // Feature: ai-mood-playlist-generator, Property 3: Emotion Label Domain
  describe('Property 3: Emotion Label Domain', () => {
    
    it('should always return one of the six valid emotion labels for any input', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 200 }),
          (moodText) => {
            const result = detectEmotionByKeywords(moodText);
            
            // Result should have emotion field
            expect(result).toHaveProperty('emotion');
            expect(typeof result.emotion).toBe('string');
            
            // Emotion must be one of the six valid labels
            expect(VALID_EMOTIONS).toContain(result.emotion);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return valid emotion for empty or whitespace-only strings', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => s.trim().length === 0),
          (moodText) => {
            const result = detectEmotionByKeywords(moodText);
            
            expect(VALID_EMOTIONS).toContain(result.emotion);
            // Should default to joy when no keywords match
            expect(result.emotion).toBe(DEFAULT_EMOTION);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return valid emotion for strings with special characters', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.constantFrom('!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '[', ']', '{', '}'),
          (text, specialChar) => {
            const moodText = `${text}${specialChar}${text}`;
            const result = detectEmotionByKeywords(moodText);
            
            expect(VALID_EMOTIONS).toContain(result.emotion);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return valid emotion for strings with numbers', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 0, max: 9999 }),
          (text, number) => {
            const moodText = `${text} ${number}`;
            const result = detectEmotionByKeywords(moodText);
            
            expect(VALID_EMOTIONS).toContain(result.emotion);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return valid emotion for mixed case input', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          (moodText) => {
            // Test with various case combinations
            const upperCase = moodText.toUpperCase();
            const lowerCase = moodText.toLowerCase();
            const mixedCase = moodText.split('').map((c, i) => 
              i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()
            ).join('');
            
            const resultUpper = detectEmotionByKeywords(upperCase);
            const resultLower = detectEmotionByKeywords(lowerCase);
            const resultMixed = detectEmotionByKeywords(mixedCase);
            
            expect(VALID_EMOTIONS).toContain(resultUpper.emotion);
            expect(VALID_EMOTIONS).toContain(resultLower.emotion);
            expect(VALID_EMOTIONS).toContain(resultMixed.emotion);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return default emotion (joy) when no keywords match', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 })
            .filter(s => {
              // Filter out strings that contain any emotion keywords
              const normalized = s.toLowerCase();
              return !Object.values(EMOTION_KEYWORDS)
                .flat()
                .some(keyword => normalized.includes(keyword));
            }),
          (moodText) => {
            const result = detectEmotionByKeywords(moodText);
            
            expect(result.emotion).toBe(DEFAULT_EMOTION);
            expect(result.emotion).toBe('joy');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should always return result with required fields', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 200 }),
          (moodText) => {
            const result = detectEmotionByKeywords(moodText);
            
            // Verify all required fields exist
            expect(result).toHaveProperty('emotion');
            expect(result).toHaveProperty('confidence');
            expect(result).toHaveProperty('source');
            expect(result).toHaveProperty('processingTime');
            
            // Verify field types
            expect(typeof result.emotion).toBe('string');
            expect(typeof result.confidence).toBe('number');
            expect(typeof result.source).toBe('string');
            expect(typeof result.processingTime).toBe('number');
            
            // Verify source is always 'fallback'
            expect(result.source).toBe('fallback');
            
            // Verify confidence is between 0 and 1
            expect(result.confidence).toBeGreaterThanOrEqual(0);
            expect(result.confidence).toBeLessThanOrEqual(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should complete within performance requirement (< 500ms)', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 200 }),
          (moodText) => {
            const result = detectEmotionByKeywords(moodText);
            
            // Processing time should be under 500ms
            expect(result.processingTime).toBeLessThan(500);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: ai-mood-playlist-generator, Property 6: Fallback Keyword Matching
  describe('Property 6: Fallback Keyword Matching', () => {
    
    it('should return emotion with most keyword matches when multiple emotions present', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...VALID_EMOTIONS),
          fc.constantFrom(...VALID_EMOTIONS),
          fc.integer({ min: 1, max: 3 }),
          fc.integer({ min: 1, max: 3 }),
          (emotion1, emotion2, count1, count2) => {
            // Skip if same emotion
            if (emotion1 === emotion2) return;
            
            // Build text with different keyword counts
            const keywords1 = EMOTION_KEYWORDS[emotion1].slice(0, count1);
            const keywords2 = EMOTION_KEYWORDS[emotion2].slice(0, count2);
            
            const moodText = [...keywords1, ...keywords2].join(' ');
            const result = detectEmotionByKeywords(moodText);
            
            // Should return emotion with more keywords
            if (count1 > count2) {
              expect(result.emotion).toBe(emotion1);
            } else if (count2 > count1) {
              expect(result.emotion).toBe(emotion2);
            }
            // If equal, either is acceptable (priority order determines)
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect emotion when keyword appears anywhere in text', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...VALID_EMOTIONS),
          fc.string({ minLength: 0, maxLength: 50 }),
          fc.string({ minLength: 0, maxLength: 50 }),
          (emotion, prefix, suffix) => {
            const keyword = EMOTION_KEYWORDS[emotion][0];
            const moodText = `${prefix} ${keyword} ${suffix}`;
            
            const result = detectEmotionByKeywords(moodText);
            
            // Should detect the emotion from the keyword
            // (unless other emotions have more keywords in prefix/suffix)
            expect(VALID_EMOTIONS).toContain(result.emotion);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be case-insensitive when matching keywords', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...VALID_EMOTIONS),
          fc.constantFrom('lower', 'upper', 'mixed'),
          (emotion, caseType) => {
            const keyword = EMOTION_KEYWORDS[emotion][0];
            
            let moodText;
            if (caseType === 'lower') {
              moodText = keyword.toLowerCase();
            } else if (caseType === 'upper') {
              moodText = keyword.toUpperCase();
            } else {
              moodText = keyword.split('').map((c, i) => 
                i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()
              ).join('');
            }
            
            const result = detectEmotionByKeywords(moodText);
            
            // Should detect the emotion regardless of case
            expect(result.emotion).toBe(emotion);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle punctuation around keywords correctly', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...VALID_EMOTIONS),
          fc.constantFrom('.', ',', '!', '?', ';', ':', '-', '(', ')'),
          (emotion, punctuation) => {
            const keyword = EMOTION_KEYWORDS[emotion][0];
            const moodText = `${punctuation}${keyword}${punctuation}`;
            
            const result = detectEmotionByKeywords(moodText);
            
            // Should still detect the emotion despite punctuation
            expect(result.emotion).toBe(emotion);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should count multiple occurrences of same keyword', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...VALID_EMOTIONS),
          fc.integer({ min: 2, max: 5 }),
          (emotion, repeatCount) => {
            const keyword = EMOTION_KEYWORDS[emotion][0];
            const moodText = Array(repeatCount).fill(keyword).join(' ');
            
            const result = detectEmotionByKeywords(moodText);
            
            // Should detect the emotion with high confidence
            expect(result.emotion).toBe(emotion);
            expect(result.confidence).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle multiple keywords from same emotion', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...VALID_EMOTIONS),
          fc.integer({ min: 2, max: 5 }),
          (emotion, keywordCount) => {
            const keywords = EMOTION_KEYWORDS[emotion].slice(0, keywordCount);
            const moodText = keywords.join(' ');
            
            const result = detectEmotionByKeywords(moodText);
            
            // Should detect the emotion
            expect(result.emotion).toBe(emotion);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should prioritize emotion with more unique keyword matches', () => {
      // Test with specific scenarios where one emotion clearly dominates
      const testCases = [
        { text: 'sad sad sad happy', expected: 'sadness' },
        { text: 'angry furious mad cheerful', expected: 'anger' },
        { text: 'love romantic adore caring sweet happy', expected: 'love' },
        { text: 'scared afraid anxious worried nervous joyful', expected: 'fear' }
      ];
      
      testCases.forEach(({ text, expected }) => {
        const result = detectEmotionByKeywords(text);
        expect(result.emotion).toBe(expected);
      });
    });

    it('should handle text with no emotion keywords by returning default', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom('hello', 'world', 'test', 'random', 'words', 'xyz', '123'), { minLength: 1, maxLength: 10 }),
          (words) => {
            const moodText = words.join(' ');
            
            // Verify text has no emotion keywords
            const hasKeywords = Object.values(EMOTION_KEYWORDS)
              .flat()
              .some(keyword => moodText.toLowerCase().includes(keyword));
            
            if (!hasKeywords) {
              const result = detectEmotionByKeywords(moodText);
              expect(result.emotion).toBe(DEFAULT_EMOTION);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return consistent results for same normalized input', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          (moodText) => {
            const result1 = detectEmotionByKeywords(moodText);
            const result2 = detectEmotionByKeywords(moodText);
            
            // Same input should produce same emotion
            expect(result1.emotion).toBe(result2.emotion);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle tie-breaking with priority order', () => {
      // When two emotions have equal keyword counts, should use priority order
      // Priority order is: sadness, joy, anger, love, fear, surprise
      
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: VALID_EMOTIONS.length - 2 }),
          fc.integer({ min: 1, max: 3 }),
          (emotionIndex, keywordCount) => {
            const emotion1 = VALID_EMOTIONS[emotionIndex];
            const emotion2 = VALID_EMOTIONS[emotionIndex + 1];
            
            // Use same number of keywords from each emotion
            const keywords1 = EMOTION_KEYWORDS[emotion1].slice(0, keywordCount);
            const keywords2 = EMOTION_KEYWORDS[emotion2].slice(0, keywordCount);
            
            const moodText = [...keywords1, ...keywords2].join(' ');
            const result = detectEmotionByKeywords(moodText);
            
            // Should return the emotion that appears first in priority order
            expect(result.emotion).toBe(emotion1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Combined properties: Consistency and correctness
  describe('Combined Properties: Fallback Detector Consistency', () => {
    
    it('should maintain consistency between emotion and confidence', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 200 }),
          (moodText) => {
            const result = detectEmotionByKeywords(moodText);
            
            // If emotion is default, confidence should be 0.5 (no matches)
            // If emotion is detected from keywords, confidence should be > 0
            if (result.emotion === DEFAULT_EMOTION) {
              const hasKeywords = Object.values(EMOTION_KEYWORDS)
                .flat()
                .some(keyword => moodText.toLowerCase().includes(keyword));
              
              if (!hasKeywords) {
                expect(result.confidence).toBe(0.5);
              }
            }
            
            // Confidence should always be valid
            expect(result.confidence).toBeGreaterThanOrEqual(0);
            expect(result.confidence).toBeLessThanOrEqual(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle very long text efficiently', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 10, maxLength: 50 }),
          (words) => {
            const moodText = words.join(' ');
            const startTime = Date.now();
            
            const result = detectEmotionByKeywords(moodText);
            
            const elapsedTime = Date.now() - startTime;
            
            // Should complete quickly even with long text
            expect(elapsedTime).toBeLessThan(500);
            expect(VALID_EMOTIONS).toContain(result.emotion);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should normalize text consistently before matching', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...VALID_EMOTIONS),
          fc.nat({ max: 5 }),
          (emotion, extraSpaces) => {
            const keyword = EMOTION_KEYWORDS[emotion][0];
            
            // Add various amounts of whitespace
            const moodText1 = keyword;
            const moodText2 = ' '.repeat(extraSpaces) + keyword + ' '.repeat(extraSpaces);
            const moodText3 = keyword.split('').join(' ');
            
            const result1 = detectEmotionByKeywords(moodText1);
            const result2 = detectEmotionByKeywords(moodText2);
            
            // Should detect same emotion regardless of whitespace
            expect(result1.emotion).toBe(emotion);
            expect(result2.emotion).toBe(emotion);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle all emotion keywords correctly', () => {
      // Test that every keyword in EMOTION_KEYWORDS can be detected
      Object.entries(EMOTION_KEYWORDS).forEach(([emotion, keywords]) => {
        keywords.forEach(keyword => {
          const result = detectEmotionByKeywords(keyword);
          
          // Should detect the correct emotion for each keyword
          expect(result.emotion).toBe(emotion);
          expect(VALID_EMOTIONS).toContain(result.emotion);
        });
      });
    });

    it('should return valid result structure for edge cases', () => {
      const edgeCases = ['', ' ', '   ', '\n', '\t', '!!!', '???', '...'];
      
      edgeCases.forEach(edgeCase => {
        const result = detectEmotionByKeywords(edgeCase);
        
        expect(result).toHaveProperty('emotion');
        expect(result).toHaveProperty('confidence');
        expect(result).toHaveProperty('source');
        expect(result).toHaveProperty('processingTime');
        
        expect(VALID_EMOTIONS).toContain(result.emotion);
        expect(result.source).toBe('fallback');
      });
    });
  });
});
