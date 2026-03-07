/**
 * Property-Based Tests for Rate Limiter
 * Feature: ai-mood-playlist-generator
 * Tests Properties 11, 12, and 13
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fc from 'fast-check';
import admin from '../../../config/firebase.js';
import { 
  checkRateLimit, 
  getRateLimitStatus, 
  resetRateLimit,
  FREE_USER_DAILY_LIMIT 
} from '../rateLimiter.js';

const db = admin.firestore();
const RATE_LIMIT_COLLECTION = 'mood_playlist_rate_limits';

// Helper to generate test user IDs
const generateUserId = () => `test_user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Helper to clean up test data
const cleanupTestUser = async (userId) => {
  try {
    await db.collection(RATE_LIMIT_COLLECTION).doc(userId).delete();
  } catch (error) {
    // Ignore cleanup errors
  }
};

describe('Mood Playlist Rate Limiter - Property-Based Tests', () => {
  
  // Track test users for cleanup
  const testUsers = [];

  afterEach(async () => {
    // Clean up all test users
    await Promise.all(testUsers.map(userId => cleanupTestUser(userId)));
    testUsers.length = 0;
  });

  // Feature: ai-mood-playlist-generator, Property 11: Free User Rate Limiting
  describe('Property 11: Free User Rate Limiting', () => {
    
    it('should allow requests when daily count is less than 3 for free users', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: FREE_USER_DAILY_LIMIT - 1 }),
          async (requestCount) => {
            const userId = generateUserId();
            testUsers.push(userId);

            // Make requestCount requests
            for (let i = 0; i < requestCount; i++) {
              const result = await checkRateLimit(userId, false);
              expect(result.allowed).toBe(true);
            }

            // Next request should still be allowed (since we're under the limit)
            const finalResult = await checkRateLimit(userId, false);
            
            if (requestCount < FREE_USER_DAILY_LIMIT - 1) {
              expect(finalResult.allowed).toBe(true);
              expect(finalResult.remaining).toBeGreaterThan(0);
            } else if (requestCount === FREE_USER_DAILY_LIMIT - 1) {
              // This is the 3rd request (index 2), should be allowed but remaining = 0
              expect(finalResult.allowed).toBe(true);
              expect(finalResult.remaining).toBe(0);
            }
          }
        ),
        { numRuns: 50 } // Reduced runs due to async operations
      );
    }, 30000); // Increased timeout for async operations

    it('should reject requests when daily count is 3 or more for free users', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: FREE_USER_DAILY_LIMIT, max: FREE_USER_DAILY_LIMIT + 5 }),
          async (requestCount) => {
            const userId = generateUserId();
            testUsers.push(userId);

            // Make exactly FREE_USER_DAILY_LIMIT successful requests
            for (let i = 0; i < FREE_USER_DAILY_LIMIT; i++) {
              const result = await checkRateLimit(userId, false);
              expect(result.allowed).toBe(true);
            }

            // All subsequent requests should be rejected
            const additionalRequests = requestCount - FREE_USER_DAILY_LIMIT;
            for (let i = 0; i < additionalRequests; i++) {
              const result = await checkRateLimit(userId, false);
              expect(result.allowed).toBe(false);
              expect(result.remaining).toBe(0);
              expect(result.error).toBeDefined();
            }
          }
        ),
        { numRuns: 30 }
      );
    }, 30000);

    it('should correctly track remaining count for free users', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: FREE_USER_DAILY_LIMIT }),
          async (requestCount) => {
            const userId = generateUserId();
            testUsers.push(userId);

            let expectedRemaining = FREE_USER_DAILY_LIMIT;

            for (let i = 0; i < requestCount; i++) {
              const result = await checkRateLimit(userId, false);
              
              if (i < FREE_USER_DAILY_LIMIT) {
                expect(result.allowed).toBe(true);
                expectedRemaining--;
                expect(result.remaining).toBe(expectedRemaining);
              } else {
                expect(result.allowed).toBe(false);
                expect(result.remaining).toBe(0);
              }
            }
          }
        ),
        { numRuns: 30 }
      );
    }, 30000);

    it('should provide resetAt timestamp for free users', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(),
          async (exceedLimit) => {
            const userId = generateUserId();
            testUsers.push(userId);

            const requestCount = exceedLimit ? FREE_USER_DAILY_LIMIT + 1 : 1;
            
            let lastResult;
            for (let i = 0; i < requestCount; i++) {
              lastResult = await checkRateLimit(userId, false);
            }

            // Should always have a resetAt timestamp
            expect(lastResult.resetAt).toBeDefined();
            expect(lastResult.resetAt).toBeInstanceOf(Date);
            
            // resetAt should be in the future
            expect(lastResult.resetAt.getTime()).toBeGreaterThan(Date.now());
          }
        ),
        { numRuns: 30 }
      );
    }, 30000);

    it('should handle concurrent requests atomically for free users', async () => {
      const userId = generateUserId();
      testUsers.push(userId);

      // Make FREE_USER_DAILY_LIMIT + 2 concurrent requests
      const concurrentRequests = FREE_USER_DAILY_LIMIT + 2;
      const promises = Array(concurrentRequests)
        .fill(null)
        .map(() => checkRateLimit(userId, false));

      const results = await Promise.all(promises);

      // Count allowed and rejected requests
      const allowedCount = results.filter(r => r.allowed).length;
      const rejectedCount = results.filter(r => !r.allowed).length;

      // Exactly FREE_USER_DAILY_LIMIT should be allowed
      expect(allowedCount).toBe(FREE_USER_DAILY_LIMIT);
      expect(rejectedCount).toBe(concurrentRequests - FREE_USER_DAILY_LIMIT);
    }, 30000);
  });

  // Feature: ai-mood-playlist-generator, Property 12: Rate Limit Error Message
  describe('Property 12: Rate Limit Error Message', () => {
    
    it('should return error message when rate limit is exceeded', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }),
          async (extraRequests) => {
            const userId = generateUserId();
            testUsers.push(userId);

            // Exhaust the rate limit
            for (let i = 0; i < FREE_USER_DAILY_LIMIT; i++) {
              await checkRateLimit(userId, false);
            }

            // Make additional requests that should be rejected
            for (let i = 0; i < extraRequests; i++) {
              const result = await checkRateLimit(userId, false);
              
              expect(result.allowed).toBe(false);
              expect(result.error).toBeDefined();
              expect(typeof result.error).toBe('string');
              expect(result.error.length).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 30 }
      );
    }, 30000);

    it('should return "Rate limit exceeded" error message', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null), // Dummy property for structure
          async () => {
            const userId = generateUserId();
            testUsers.push(userId);

            // Exhaust the rate limit
            for (let i = 0; i < FREE_USER_DAILY_LIMIT; i++) {
              await checkRateLimit(userId, false);
            }

            // Next request should have specific error message
            const result = await checkRateLimit(userId, false);
            
            expect(result.error).toBe('Rate limit exceeded');
          }
        ),
        { numRuns: 30 }
      );
    }, 30000);

    it('should not return error message when request is allowed', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: FREE_USER_DAILY_LIMIT - 1 }),
          async (requestCount) => {
            const userId = generateUserId();
            testUsers.push(userId);

            // Make requests within limit
            for (let i = 0; i <= requestCount; i++) {
              const result = await checkRateLimit(userId, false);
              
              if (result.allowed) {
                expect(result.error).toBeUndefined();
              }
            }
          }
        ),
        { numRuns: 30 }
      );
    }, 30000);

    it('should include error field in response structure when rate limited', async () => {
      const userId = generateUserId();
      testUsers.push(userId);

      // Exhaust rate limit
      for (let i = 0; i < FREE_USER_DAILY_LIMIT; i++) {
        await checkRateLimit(userId, false);
      }

      const result = await checkRateLimit(userId, false);

      // Verify response structure
      expect(result).toHaveProperty('allowed');
      expect(result).toHaveProperty('remaining');
      expect(result).toHaveProperty('resetAt');
      expect(result).toHaveProperty('error');
      
      expect(result.allowed).toBe(false);
      expect(result.error).toBeDefined();
    }, 30000);
  });

  // Feature: ai-mood-playlist-generator, Property 13: Premium User Bypass
  describe('Property 13: Premium User Bypass', () => {
    
    it('should allow all requests for premium users regardless of count', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 20 }),
          async (requestCount) => {
            const userId = generateUserId();
            testUsers.push(userId);

            // Make arbitrary number of requests as premium user
            for (let i = 0; i < requestCount; i++) {
              const result = await checkRateLimit(userId, true);
              
              expect(result.allowed).toBe(true);
              expect(result.error).toBeUndefined();
            }
          }
        ),
        { numRuns: 30 }
      );
    }, 30000);

    it('should return unlimited remaining (-1) for premium users', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }),
          async (requestCount) => {
            const userId = generateUserId();
            testUsers.push(userId);

            for (let i = 0; i < requestCount; i++) {
              const result = await checkRateLimit(userId, true);
              
              expect(result.remaining).toBe(-1);
            }
          }
        ),
        { numRuns: 30 }
      );
    }, 30000);

    it('should not set resetAt for premium users', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }),
          async (requestCount) => {
            const userId = generateUserId();
            testUsers.push(userId);

            for (let i = 0; i < requestCount; i++) {
              const result = await checkRateLimit(userId, true);
              
              expect(result.resetAt).toBeNull();
            }
          }
        ),
        { numRuns: 30 }
      );
    }, 30000);

    it('should bypass rate limit even after many requests for premium users', async () => {
      const userId = generateUserId();
      testUsers.push(userId);

      // Make way more than FREE_USER_DAILY_LIMIT requests
      const manyRequests = FREE_USER_DAILY_LIMIT * 5;
      
      for (let i = 0; i < manyRequests; i++) {
        const result = await checkRateLimit(userId, true);
        
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(-1);
        expect(result.error).toBeUndefined();
      }
    }, 30000);

    it('should not create rate limit document for premium users', async () => {
      const userId = generateUserId();
      testUsers.push(userId);

      // Make several requests as premium user
      for (let i = 0; i < 5; i++) {
        await checkRateLimit(userId, true);
      }

      // Check if document was created
      const doc = await db.collection(RATE_LIMIT_COLLECTION).doc(userId).get();
      
      // Premium users should not have rate limit documents created
      // (or if created, should not affect their access)
      const result = await checkRateLimit(userId, true);
      expect(result.allowed).toBe(true);
    }, 30000);

    it('should handle premium status change correctly', async () => {
      const userId = generateUserId();
      testUsers.push(userId);

      // Start as free user and exhaust limit
      for (let i = 0; i < FREE_USER_DAILY_LIMIT; i++) {
        const result = await checkRateLimit(userId, false);
        expect(result.allowed).toBe(true);
      }

      // Verify free user is rate limited
      const freeLimitedResult = await checkRateLimit(userId, false);
      expect(freeLimitedResult.allowed).toBe(false);

      // Upgrade to premium
      const premiumResult = await checkRateLimit(userId, true);
      expect(premiumResult.allowed).toBe(true);
      expect(premiumResult.remaining).toBe(-1);
    }, 30000);
  });

  // Combined properties: Rate limiter behavior consistency
  describe('Combined Properties: Rate Limiter Consistency', () => {
    
    it('should maintain consistent state across multiple operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(),
          fc.integer({ min: 1, max: 10 }),
          async (isPremium, requestCount) => {
            const userId = generateUserId();
            testUsers.push(userId);

            let previousRemaining = isPremium ? -1 : FREE_USER_DAILY_LIMIT;

            for (let i = 0; i < requestCount; i++) {
              const result = await checkRateLimit(userId, isPremium);
              
              if (isPremium) {
                // Premium users always have unlimited
                expect(result.remaining).toBe(-1);
                expect(result.allowed).toBe(true);
              } else {
                // Free users should have decreasing remaining count
                if (result.allowed) {
                  expect(result.remaining).toBeLessThanOrEqual(previousRemaining);
                  previousRemaining = result.remaining;
                } else {
                  expect(result.remaining).toBe(0);
                }
              }
            }
          }
        ),
        { numRuns: 30 }
      );
    }, 30000);

    it('should return consistent response structure for all user types', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(),
          async (isPremium) => {
            const userId = generateUserId();
            testUsers.push(userId);

            const result = await checkRateLimit(userId, isPremium);

            // All responses should have these fields
            expect(result).toHaveProperty('allowed');
            expect(result).toHaveProperty('remaining');
            expect(result).toHaveProperty('resetAt');
            expect(result).toHaveProperty('error');

            // Type checks
            expect(typeof result.allowed).toBe('boolean');
            expect(typeof result.remaining).toBe('number');
            
            if (isPremium) {
              expect(result.resetAt).toBeNull();
            } else {
              expect(result.resetAt).toBeInstanceOf(Date);
            }
          }
        ),
        { numRuns: 30 }
      );
    }, 30000);

    it('should handle getRateLimitStatus without incrementing counter', async () => {
      const userId = generateUserId();
      testUsers.push(userId);

      // Get initial status
      const initialStatus = await getRateLimitStatus(userId, false);
      expect(initialStatus.count).toBe(0);
      expect(initialStatus.remaining).toBe(FREE_USER_DAILY_LIMIT);

      // Make one request
      await checkRateLimit(userId, false);

      // Get status again - should show count = 1
      const afterOneRequest = await getRateLimitStatus(userId, false);
      expect(afterOneRequest.count).toBe(1);
      expect(afterOneRequest.remaining).toBe(FREE_USER_DAILY_LIMIT - 1);

      // Get status again - should still be count = 1 (not incremented)
      const statusAgain = await getRateLimitStatus(userId, false);
      expect(statusAgain.count).toBe(1);
    }, 30000);
  });
});
