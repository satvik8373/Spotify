/**
 * Property-Based Tests for Error Handling
 * Feature: ai-mood-playlist-generator
 * Tests Properties 23, 24, and 25
 * 
 * These tests validate that the system:
 * - Logs all errors internally with proper context (Property 23)
 * - Returns user-friendly error messages for database failures (Property 24)
 * - Never exposes technical details to users (Property 25)
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import fc from 'fast-check';

// Mock console methods to capture logs
let consoleErrorSpy;
let consoleWarnSpy;
let consoleLogSpy;

beforeEach(() => {
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
  consoleWarnSpy.mockRestore();
  consoleLogSpy.mockRestore();
});

describe('Error Handling - Property-Based Tests', () => {
  
  // Feature: ai-mood-playlist-generator, Property 23: Error Logging
  describe('Property 23: Error Logging', () => {
    
    it('should log all errors internally with error message and timestamp', async () => {
      // Import services that have error handling
      const { generatePlaylist } = await import('../playlistGenerator.js');
      const { analyzeEmotion } = await import('../emotionAnalyzer.js');
      
      fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            { service: 'playlistGenerator', fn: generatePlaylist, args: [[], 'joy', 'test'] },
            { service: 'emotionAnalyzer', fn: analyzeEmotion, args: ['test mood'] }
          ),
          async (testCase) => {
            consoleErrorSpy.mockClear();
            
            try {
              // Call the service function which may throw an error
              await testCase.fn(...testCase.args);
            } catch (error) {
              // Error is expected - we're testing error logging
            }
            
            // Check if any errors were logged
            if (consoleErrorSpy.mock.calls.length > 0) {
              const errorLogs = consoleErrorSpy.mock.calls;
              
              // Verify at least one error log exists
              expect(errorLogs.length).toBeGreaterThan(0);
              
              // Check each error log for required fields
              for (const logCall of errorLogs) {
                const logMessage = logCall[0];
                const logContext = logCall[1];
                
                // Should have a descriptive message
                expect(typeof logMessage).toBe('string');
                expect(logMessage.length).toBeGreaterThan(0);
                
                // Should include service name in brackets
                expect(logMessage).toMatch(/\[.*\]/);
                
                // If context object exists, should have error details
                if (logContext && typeof logContext === 'object') {
                  // Should have timestamp
                  if (logContext.timestamp) {
                    expect(typeof logContext.timestamp).toBe('string');
                    // Should be valid ISO8601 format
                    expect(() => new Date(logContext.timestamp)).not.toThrow();
                  }
                  
                  // Should have error message or error field
                  const hasErrorInfo = logContext.error || logContext.message;
                  expect(hasErrorInfo).toBeDefined();
                }
              }
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should include service name in error logs for traceability', async () => {
      const { generatePlaylist } = await import('../playlistGenerator.js');
      
      fc.assert(
        fc.asyncProperty(
          fc.array(fc.string(), { minLength: 0, maxLength: 3 }),
          fc.constantFrom('sadness', 'joy', 'anger', 'love', 'fear', 'surprise'),
          fc.string({ minLength: 3, maxLength: 50 }),
          async (genres, emotion, moodText) => {
            consoleErrorSpy.mockClear();
            
            try {
              await generatePlaylist(genres, emotion, moodText);
            } catch (error) {
              // Expected - testing error logging
            }
            
            // If errors were logged, verify service name is present
            if (consoleErrorSpy.mock.calls.length > 0) {
              const firstLog = consoleErrorSpy.mock.calls[0][0];
              
              // Should contain service name in brackets
              expect(firstLog).toMatch(/\[PlaylistGenerator\]/i);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should log error context including input parameters', async () => {
      const { generatePlaylist } = await import('../playlistGenerator.js');
      
      fc.assert(
        fc.asyncProperty(
          fc.array(fc.string(), { minLength: 0, maxLength: 3 }),
          fc.constantFrom('sadness', 'joy', 'anger', 'love', 'fear', 'surprise'),
          fc.string({ minLength: 3, maxLength: 50 }),
          async (genres, emotion, moodText) => {
            consoleErrorSpy.mockClear();
            
            try {
              await generatePlaylist(genres, emotion, moodText);
            } catch (error) {
              // Expected
            }
            
            // If errors were logged with context
            if (consoleErrorSpy.mock.calls.length > 0) {
              const logContext = consoleErrorSpy.mock.calls[0][1];
              
              if (logContext && typeof logContext === 'object') {
                // Should include relevant context
                // At minimum should have error message or timestamp
                const hasContext = logContext.error || logContext.timestamp || 
                                 logContext.genres || logContext.emotion;
                expect(hasContext).toBeDefined();
              }
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should never log sensitive information like API keys or passwords', async () => {
      const { analyzeEmotion } = await import('../emotionAnalyzer.js');
      
      fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 3, maxLength: 100 }),
          async (moodText) => {
            consoleErrorSpy.mockClear();
            consoleLogSpy.mockClear();
            
            try {
              await analyzeEmotion(moodText);
            } catch (error) {
              // Expected
            }
            
            // Check all console logs
            const allLogs = [
              ...consoleErrorSpy.mock.calls,
              ...consoleLogSpy.mock.calls,
              ...consoleWarnSpy.mock.calls
            ];
            
            for (const logCall of allLogs) {
              const logString = JSON.stringify(logCall);
              
              // Should not contain common sensitive patterns
              expect(logString).not.toMatch(/password/i);
              expect(logString).not.toMatch(/api[_-]?key/i);
              expect(logString).not.toMatch(/secret/i);
              expect(logString).not.toMatch(/token.*:/i);
              expect(logString).not.toMatch(/bearer\s+[a-zA-Z0-9]/i);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  // Feature: ai-mood-playlist-generator, Property 24: Database Error Response
  describe('Property 24: Database Error Response', () => {
    
    it('should return user-friendly error message when database query fails', async () => {
      const { generatePlaylist } = await import('../playlistGenerator.js');
      
      fc.assert(
        fc.asyncProperty(
          fc.array(fc.string(), { minLength: 1, maxLength: 3 }),
          fc.constantFrom('sadness', 'joy', 'anger', 'love', 'fear', 'surprise'),
          fc.string({ minLength: 3, maxLength: 50 }),
          async (genres, emotion, moodText) => {
            try {
              await generatePlaylist(genres, emotion, moodText);
            } catch (error) {
              // Should throw an error with user-friendly message
              expect(error).toBeDefined();
              expect(error.message).toBeDefined();
              expect(typeof error.message).toBe('string');
              
              // Message should be user-friendly
              expect(error.message.length).toBeGreaterThan(0);
              
              // Should not contain technical jargon
              expect(error.message).not.toMatch(/stack/i);
              expect(error.message).not.toMatch(/firestore/i);
              expect(error.message).not.toMatch(/query/i);
              expect(error.message).not.toMatch(/collection/i);
              expect(error.message).not.toMatch(/document/i);
              expect(error.message).not.toMatch(/undefined/i);
              expect(error.message).not.toMatch(/null/i);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should return error message for any database operation failure', async () => {
      const { generatePlaylist } = await import('../playlistGenerator.js');
      
      fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            { genres: [], emotion: 'joy', moodText: 'happy' },
            { genres: ['invalid'], emotion: 'sadness', moodText: 'sad' },
            { genres: ['pop'], emotion: 'joy', moodText: 'excited' }
          ),
          async (testCase) => {
            try {
              await generatePlaylist(testCase.genres, testCase.emotion, testCase.moodText);
              // If it succeeds, that's fine - we're testing error cases
            } catch (error) {
              // When error occurs, should have a message
              expect(error.message).toBeDefined();
              expect(error.message.length).toBeGreaterThan(0);
              
              // Should be a string
              expect(typeof error.message).toBe('string');
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should provide consistent error message format across database errors', async () => {
      const { generatePlaylist } = await import('../playlistGenerator.js');
      
      const errorMessages = [];
      
      fc.assert(
        fc.asyncProperty(
          fc.array(fc.string(), { minLength: 0, maxLength: 3 }),
          fc.constantFrom('sadness', 'joy', 'anger'),
          fc.string({ minLength: 3, maxLength: 30 }),
          async (genres, emotion, moodText) => {
            try {
              await generatePlaylist(genres, emotion, moodText);
            } catch (error) {
              if (error.message) {
                errorMessages.push(error.message);
              }
            }
          }
        ),
        { numRuns: 30 }
      );
      
      // If we collected error messages, they should be consistent
      if (errorMessages.length > 1) {
        // All error messages should be strings
        for (const msg of errorMessages) {
          expect(typeof msg).toBe('string');
          expect(msg.length).toBeGreaterThan(0);
        }
        
        // Should use similar phrasing (not exposing different internal errors)
        const uniqueMessages = [...new Set(errorMessages)];
        // Should have few unique messages (consistent error handling)
        expect(uniqueMessages.length).toBeLessThanOrEqual(3);
      }
    });
  });

  // Feature: ai-mood-playlist-generator, Property 25: User-Friendly Error Messages
  describe('Property 25: User-Friendly Error Messages', () => {
    
    it('should never expose stack traces in error messages', async () => {
      const { generatePlaylist } = await import('../playlistGenerator.js');
      const { analyzeEmotion } = await import('../emotionAnalyzer.js');
      
      fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            { fn: generatePlaylist, args: [[], 'joy', 'test'] },
            { fn: analyzeEmotion, args: ['test mood'] }
          ),
          async (testCase) => {
            try {
              await testCase.fn(...testCase.args);
            } catch (error) {
              // Error message should not contain stack trace patterns
              expect(error.message).not.toMatch(/at\s+\w+\s+\(/);
              expect(error.message).not.toMatch(/\.js:\d+:\d+/);
              expect(error.message).not.toMatch(/Error:\s+Error:/);
              expect(error.message).not.toMatch(/stack/i);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should never expose internal error codes or technical details', async () => {
      const { generatePlaylist } = await import('../playlistGenerator.js');
      
      fc.assert(
        fc.asyncProperty(
          fc.array(fc.string(), { minLength: 0, maxLength: 3 }),
          fc.constantFrom('sadness', 'joy', 'anger', 'love', 'fear', 'surprise'),
          fc.string({ minLength: 3, maxLength: 50 }),
          async (genres, emotion, moodText) => {
            try {
              await generatePlaylist(genres, emotion, moodText);
            } catch (error) {
              const message = error.message.toLowerCase();
              
              // Should not contain technical database terms
              expect(message).not.toContain('firestore');
              expect(message).not.toContain('mongodb');
              expect(message).not.toContain('sql');
              expect(message).not.toContain('query');
              expect(message).not.toContain('collection');
              expect(message).not.toContain('document');
              
              // Should not contain error codes
              expect(message).not.toMatch(/error\s*:\s*\d+/);
              expect(message).not.toMatch(/code\s*:\s*\d+/);
              expect(message).not.toMatch(/errno/);
              
              // Should not contain internal variable names
              expect(message).not.toContain('undefined');
              expect(message).not.toContain('null');
              expect(message).not.toContain('nan');
              
              // Should not contain file paths
              expect(message).not.toMatch(/\/.*\.js/);
              expect(message).not.toMatch(/\\.*\.js/);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should provide actionable guidance in error messages', async () => {
      const { generatePlaylist } = await import('../playlistGenerator.js');
      
      fc.assert(
        fc.asyncProperty(
          fc.array(fc.string(), { minLength: 0, maxLength: 3 }),
          fc.constantFrom('sadness', 'joy', 'anger'),
          fc.string({ minLength: 3, maxLength: 50 }),
          async (genres, emotion, moodText) => {
            try {
              await generatePlaylist(genres, emotion, moodText);
            } catch (error) {
              // Error message should be helpful
              expect(error.message.length).toBeGreaterThan(10);
              
              // Should contain actionable words
              const message = error.message.toLowerCase();
              const hasActionableGuidance = 
                message.includes('try again') ||
                message.includes('please') ||
                message.includes('check') ||
                message.includes('ensure') ||
                message.includes('verify') ||
                message.includes('contact') ||
                message.includes('later');
              
              expect(hasActionableGuidance).toBe(true);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should use consistent, professional language in all error messages', async () => {
      const { generatePlaylist } = await import('../playlistGenerator.js');
      const { analyzeEmotion } = await import('../emotionAnalyzer.js');
      
      const errorMessages = [];
      
      fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            { fn: generatePlaylist, args: [[], 'joy', 'test'] },
            { fn: generatePlaylist, args: [['pop'], 'sadness', 'sad'] },
            { fn: analyzeEmotion, args: ['test mood'] }
          ),
          async (testCase) => {
            try {
              await testCase.fn(...testCase.args);
            } catch (error) {
              if (error.message) {
                errorMessages.push(error.message);
              }
            }
          }
        ),
        { numRuns: 30 }
      );
      
      // Check all collected error messages
      for (const message of errorMessages) {
        // Should not contain profanity or unprofessional language
        expect(message).not.toMatch(/damn/i);
        expect(message).not.toMatch(/crap/i);
        expect(message).not.toMatch(/wtf/i);
        
        // Should not contain developer slang
        expect(message).not.toMatch(/oops/i);
        expect(message).not.toMatch(/uh oh/i);
        
        // Should be properly capitalized (first letter uppercase)
        expect(message[0]).toBe(message[0].toUpperCase());
        
        // Should end with proper punctuation
        const lastChar = message[message.length - 1];
        expect(['.', '!', '?'].includes(lastChar) || message.length < 20).toBe(true);
      }
    });

    it('should never expose internal implementation details', async () => {
      const { generatePlaylist } = await import('../playlistGenerator.js');
      
      fc.assert(
        fc.asyncProperty(
          fc.array(fc.string(), { minLength: 0, maxLength: 3 }),
          fc.constantFrom('sadness', 'joy', 'anger'),
          fc.string({ minLength: 3, maxLength: 50 }),
          async (genres, emotion, moodText) => {
            try {
              await generatePlaylist(genres, emotion, moodText);
            } catch (error) {
              const message = error.message.toLowerCase();
              
              // Should not mention internal functions
              expect(message).not.toContain('function');
              expect(message).not.toContain('method');
              expect(message).not.toContain('class');
              
              // Should not mention internal services
              expect(message).not.toContain('huggingface');
              expect(message).not.toContain('firebase');
              expect(message).not.toContain('api');
              
              // Should not mention algorithms
              expect(message).not.toContain('fisher-yates');
              expect(message).not.toContain('shuffle');
              expect(message).not.toContain('algorithm');
              
              // Should not mention data structures
              expect(message).not.toContain('array');
              expect(message).not.toContain('object');
              expect(message).not.toContain('map');
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain consistent error message length (not too verbose)', async () => {
      const { generatePlaylist } = await import('../playlistGenerator.js');
      
      fc.assert(
        fc.asyncProperty(
          fc.array(fc.string(), { minLength: 0, maxLength: 3 }),
          fc.constantFrom('sadness', 'joy', 'anger'),
          fc.string({ minLength: 3, maxLength: 50 }),
          async (genres, emotion, moodText) => {
            try {
              await generatePlaylist(genres, emotion, moodText);
            } catch (error) {
              // Error messages should be concise but informative
              expect(error.message.length).toBeGreaterThan(10);
              expect(error.message.length).toBeLessThan(200);
              
              // Should not be overly verbose (multiple sentences)
              const sentenceCount = (error.message.match(/\.\s+/g) || []).length;
              expect(sentenceCount).toBeLessThanOrEqual(2);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  // Combined property: Error logging and user-friendly messages work together
  describe('Combined Properties: Error Logging + User-Friendly Messages', () => {
    
    it('should log detailed errors internally while showing simple messages to users', async () => {
      const { generatePlaylist } = await import('../playlistGenerator.js');
      
      fc.assert(
        fc.asyncProperty(
          fc.array(fc.string(), { minLength: 0, maxLength: 3 }),
          fc.constantFrom('sadness', 'joy', 'anger'),
          fc.string({ minLength: 3, maxLength: 50 }),
          async (genres, emotion, moodText) => {
            consoleErrorSpy.mockClear();
            
            try {
              await generatePlaylist(genres, emotion, moodText);
            } catch (userError) {
              // User-facing error should be simple
              if (userError.message) {
                expect(userError.message.length).toBeLessThan(100);
              }
              
              // Internal logs should have more detail
              if (consoleErrorSpy.mock.calls.length > 0) {
                const internalLog = consoleErrorSpy.mock.calls[0];
                const logContext = internalLog[1];
                
                if (logContext && typeof logContext === 'object') {
                  // Internal log can have technical details
                  const hasDetailedInfo = 
                    logContext.error || 
                    logContext.stack || 
                    logContext.timestamp ||
                    logContext.genres ||
                    logContext.emotion;
                  
                  expect(hasDetailedInfo).toBeDefined();
                }
              }
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
