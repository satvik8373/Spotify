/**
 * Property-Based Tests for Input Validator
 * Feature: ai-mood-playlist-generator
 * Tests Properties 1 and 2
 */

import { describe, it, expect } from '@jest/globals';
import fc from 'fast-check';
import { validateMoodInput, sanitizeInput, MIN_LENGTH, MAX_LENGTH } from '../validator.js';

describe('Mood Playlist Input Validator - Property-Based Tests', () => {
  
  // Feature: ai-mood-playlist-generator, Property 1: Input Length Validation
  describe('Property 1: Input Length Validation', () => {
    
    it('should accept strings with length between 3 and 200 characters (inclusive)', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: MIN_LENGTH, maxLength: MAX_LENGTH }),
          (moodText) => {
            const result = validateMoodInput(moodText);
            
            // If the trimmed text is within valid range, validation should succeed
            const trimmed = moodText.trim();
            if (trimmed.length >= MIN_LENGTH && trimmed.length <= MAX_LENGTH) {
              expect(result.isValid).toBe(true);
              expect(result.error).toBeUndefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject strings shorter than 3 characters', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: MIN_LENGTH - 1 }),
          (moodText) => {
            const result = validateMoodInput(moodText);
            
            // Empty or too short strings should be rejected
            expect(result.isValid).toBe(false);
            expect(result.error).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject strings longer than 200 characters', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: MAX_LENGTH + 1, maxLength: MAX_LENGTH + 100 }),
          (moodText) => {
            const result = validateMoodInput(moodText);
            
            expect(result.isValid).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error).toContain('must not exceed');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle whitespace-only strings as invalid', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => s.trim().length === 0),
          (moodText) => {
            const result = validateMoodInput(moodText);
            
            expect(result.isValid).toBe(false);
            expect(result.error).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate based on trimmed length, not original length', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: MIN_LENGTH, maxLength: MAX_LENGTH }),
          fc.nat({ max: 10 }),
          (validText, extraSpaces) => {
            // Add leading/trailing spaces
            const paddedText = ' '.repeat(extraSpaces) + validText + ' '.repeat(extraSpaces);
            const result = validateMoodInput(paddedText);
            
            const trimmed = validText.trim();
            if (trimmed.length >= MIN_LENGTH && trimmed.length <= MAX_LENGTH) {
              expect(result.isValid).toBe(true);
            } else {
              expect(result.isValid).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: ai-mood-playlist-generator, Property 2: Input Sanitization
  describe('Property 2: Input Sanitization', () => {
    
    it('should remove SQL injection patterns from any input', () => {
      const sqlKeywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 'UNION', 'EXEC'];
      
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.constantFrom(...sqlKeywords),
          fc.string({ minLength: 1, maxLength: 50 }),
          (prefix, sqlKeyword, suffix) => {
            const maliciousInput = `${prefix} ${sqlKeyword} ${suffix}`;
            const sanitized = sanitizeInput(maliciousInput);
            
            // SQL keywords should be removed or neutralized
            expect(sanitized.toUpperCase()).not.toContain(sqlKeyword.toUpperCase());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should remove dangerous special characters from any input', () => {
      const dangerousChars = ['<', '>', '{', '}', '[', ']', '\\'];
      
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.constantFrom(...dangerousChars),
          fc.string({ minLength: 1, maxLength: 50 }),
          (prefix, dangerChar, suffix) => {
            const maliciousInput = `${prefix}${dangerChar}${suffix}`;
            const sanitized = sanitizeInput(maliciousInput);
            
            // Dangerous characters should be removed
            expect(sanitized).not.toContain(dangerChar);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should remove SQL comment patterns (-- and /* */)', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.constantFrom('--', '/*', '*/'),
          fc.string({ minLength: 1, maxLength: 50 }),
          (prefix, commentPattern, suffix) => {
            const maliciousInput = `${prefix}${commentPattern}${suffix}`;
            const sanitized = sanitizeInput(maliciousInput);
            
            // Comment patterns should be removed
            expect(sanitized).not.toContain(commentPattern);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should normalize text to lowercase for any input', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          (input) => {
            const sanitized = sanitizeInput(input);
            
            // All alphabetic characters should be lowercase
            expect(sanitized).toBe(sanitized.toLowerCase());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should collapse multiple whitespace characters into single space', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.nat({ max: 10 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (prefix, spaceCount, suffix) => {
            const inputWithSpaces = `${prefix}${' '.repeat(spaceCount + 2)}${suffix}`;
            const sanitized = sanitizeInput(inputWithSpaces);
            
            // Should not contain multiple consecutive spaces
            expect(sanitized).not.toMatch(/\s{2,}/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve safe punctuation and basic text', () => {
      const safePunctuation = ['.', ',', '!', '?', "'", '"', '-', '_'];
      
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[a-zA-Z0-9\s]+$/.test(s)),
          fc.constantFrom(...safePunctuation),
          (safeText, punctuation) => {
            const input = `${safeText}${punctuation}`;
            const sanitized = sanitizeInput(input);
            
            // Sanitized text should still contain some content
            expect(sanitized.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle mixed malicious patterns in single input', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 30 }),
          (baseText) => {
            const maliciousInput = `${baseText} SELECT * FROM users; <script>alert('xss')</script> -- comment`;
            const sanitized = sanitizeInput(maliciousInput);
            
            // All dangerous patterns should be removed
            expect(sanitized).not.toContain('SELECT');
            expect(sanitized).not.toContain('<');
            expect(sanitized).not.toContain('>');
            expect(sanitized).not.toContain('--');
            expect(sanitized).not.toContain(';');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should always return a string (never null or undefined)', () => {
      fc.assert(
        fc.property(
          fc.string(),
          (input) => {
            const sanitized = sanitizeInput(input);
            
            expect(typeof sanitized).toBe('string');
            expect(sanitized).not.toBeNull();
            expect(sanitized).not.toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Combined property: Valid input should produce valid sanitized output
  describe('Combined Properties: Validation + Sanitization', () => {
    
    it('should produce sanitized output for valid inputs', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: MIN_LENGTH, maxLength: MAX_LENGTH }),
          (moodText) => {
            const result = validateMoodInput(moodText);
            
            if (result.isValid) {
              // Sanitized output should exist
              expect(result.sanitized).toBeDefined();
              expect(typeof result.sanitized).toBe('string');
              
              // Sanitized output should be within valid length
              expect(result.sanitized.length).toBeGreaterThanOrEqual(0);
              expect(result.sanitized.length).toBeLessThanOrEqual(MAX_LENGTH);
              
              // Should be lowercase
              expect(result.sanitized).toBe(result.sanitized.toLowerCase());
              
              // Should not have multiple consecutive spaces
              expect(result.sanitized).not.toMatch(/\s{2,}/);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject inputs that become too short after sanitization', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('SELECT', 'DROP', 'DELETE'),
          fc.string({ minLength: 0, maxLength: 2 }),
          (sqlKeyword, shortText) => {
            // Input that's long enough but becomes too short after sanitization
            const input = `${sqlKeyword} ${shortText}`;
            const result = validateMoodInput(input);
            
            // After removing SQL keywords, if remaining text is too short, should be invalid
            if (result.sanitized.trim().length < MIN_LENGTH) {
              expect(result.isValid).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
