/**
 * Rate Limiter Service for Mood Playlist Generator
 * Enforces generation limits based on user tier
 * Requirements: 6.1, 6.2, 6.3, 6.5, 7.1, 7.2, 7.3
 */

import admin from '../../config/firebase.js';

const db = admin.firestore();
const RATE_LIMIT_COLLECTION = 'mood_playlist_rate_limits';
const FREE_USER_DAILY_LIMIT = 3;

/**
 * Checks if a user has exceeded their rate limit
 * @param {string} userId - The user's Firebase UID
 * @param {boolean} isPremium - Whether the user has premium subscription
 * @returns {Promise<{allowed: boolean, remaining: number, resetAt: Date, error?: string}>}
 */
async function checkRateLimit(userId, isPremium) {
  try {
    // Bypass rate limits in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('[RateLimiter] Development mode - bypassing rate limits');
      return {
        allowed: true,
        remaining: -1, // -1 indicates unlimited
        resetAt: null,
        error: undefined
      };
    }

    // Premium users bypass rate limits
    if (isPremium) {
      return {
        allowed: true,
        remaining: -1, // -1 indicates unlimited
        resetAt: null,
        error: undefined
      };
    }

    // Get current UTC date for midnight calculation
    const now = new Date();
    const midnightUTC = getNextMidnightUTC(now);

    // Use Firestore transaction for atomic read-modify-write
    const result = await db.runTransaction(async (transaction) => {
      const rateLimitRef = db.collection(RATE_LIMIT_COLLECTION).doc(userId);
      const doc = await transaction.get(rateLimitRef);

      let count = 0;
      let resetAt = midnightUTC;

      if (doc.exists) {
        const data = doc.data();
        const existingResetAt = data.resetAt?.toDate();

        // Check if we need to reset the counter (past midnight UTC)
        if (existingResetAt && now >= existingResetAt) {
          // Reset counter for new day
          count = 0;
          resetAt = getNextMidnightUTC(now);
        } else {
          // Use existing count and reset time
          count = data.count || 0;
          resetAt = existingResetAt || midnightUTC;
        }
      }

      // Check if user has exceeded limit
      if (count >= FREE_USER_DAILY_LIMIT) {
        console.warn('[RateLimiter] Rate limit exceeded for user:', {
          userId,
          count,
          limit: FREE_USER_DAILY_LIMIT,
          resetAt,
          timestamp: new Date().toISOString()
        });
        
        return {
          allowed: false,
          remaining: 0,
          resetAt,
          error: "You've reached your daily limit of 3 mood playlists. Upgrade to premium for unlimited generations!"
        };
      }

      // Increment counter
      const newCount = count + 1;
      const remaining = FREE_USER_DAILY_LIMIT - newCount;

      // Update or create rate limit document
      transaction.set(rateLimitRef, {
        userId,
        count: newCount,
        resetAt: admin.firestore.Timestamp.fromDate(resetAt),
        lastRequestAt: admin.firestore.Timestamp.fromDate(now),
        isPremium: false
      }, { merge: true });

      return {
        allowed: true,
        remaining,
        resetAt,
        error: undefined
      };
    });

    return result;
  } catch (error) {
    // Log error details internally for debugging
    console.error('[RateLimiter] Error checking rate limit:', {
      error: error.message,
      stack: error.stack,
      userId,
      isPremium,
      timestamp: new Date().toISOString()
    });
    
    // On error, fail open for better user experience
    // but log the error for monitoring
    return {
      allowed: true,
      remaining: FREE_USER_DAILY_LIMIT,
      resetAt: getNextMidnightUTC(new Date()),
      error: undefined // Don't expose internal error to user
    };
  }
}

/**
 * Gets the next midnight UTC timestamp
 * @param {Date} fromDate - The date to calculate from
 * @returns {Date} Next midnight UTC
 */
function getNextMidnightUTC(fromDate) {
  const midnight = new Date(fromDate);
  midnight.setUTCHours(24, 0, 0, 0); // Set to next midnight UTC
  return midnight;
}

/**
 * Gets the current rate limit status for a user without incrementing
 * @param {string} userId - The user's Firebase UID
 * @param {boolean} isPremium - Whether the user has premium subscription
 * @returns {Promise<{count: number, remaining: number, resetAt: Date}>}
 */
async function getRateLimitStatus(userId, isPremium) {
  try {
    // Premium users have unlimited
    if (isPremium) {
      return {
        count: 0,
        remaining: -1,
        resetAt: null
      };
    }

    const rateLimitRef = db.collection(RATE_LIMIT_COLLECTION).doc(userId);
    const doc = await rateLimitRef.get();

    if (!doc.exists) {
      return {
        count: 0,
        remaining: FREE_USER_DAILY_LIMIT,
        resetAt: getNextMidnightUTC(new Date())
      };
    }

    const data = doc.data();
    const now = new Date();
    const resetAt = data.resetAt?.toDate() || getNextMidnightUTC(now);

    // Check if counter should be reset
    if (now >= resetAt) {
      return {
        count: 0,
        remaining: FREE_USER_DAILY_LIMIT,
        resetAt: getNextMidnightUTC(now)
      };
    }

    const count = data.count || 0;
    const remaining = Math.max(0, FREE_USER_DAILY_LIMIT - count);

    return {
      count,
      remaining,
      resetAt
    };
  } catch (error) {
    // Log error details internally
    console.error('[RateLimiter] Error getting rate limit status:', {
      error: error.message,
      stack: error.stack,
      userId,
      isPremium,
      timestamp: new Date().toISOString()
    });
    
    return {
      count: 0,
      remaining: FREE_USER_DAILY_LIMIT,
      resetAt: getNextMidnightUTC(new Date())
    };
  }
}

/**
 * Resets rate limit for a user (admin function)
 * @param {string} userId - The user's Firebase UID
 * @returns {Promise<void>}
 */
async function resetRateLimit(userId) {
  try {
    const rateLimitRef = db.collection(RATE_LIMIT_COLLECTION).doc(userId);
    await rateLimitRef.delete();
  } catch (error) {
    // Log error details internally
    console.error('[RateLimiter] Error resetting rate limit:', {
      error: error.message,
      stack: error.stack,
      userId,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

export {
  checkRateLimit,
  getRateLimitStatus,
  resetRateLimit,
  FREE_USER_DAILY_LIMIT,
  getNextMidnightUTC
};
