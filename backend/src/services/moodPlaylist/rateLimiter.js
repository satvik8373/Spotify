/**
 * Rate Limiter Service for Mood Playlist Generator
 * Enforces generation limits based on user tier and access claims.
 */

import admin from '../../config/firebase.js';

const db = admin.firestore();
const RATE_LIMIT_COLLECTION = 'mood_playlist_rate_limits';
const FREE_USER_DAILY_LIMIT_RAW = Number.parseInt(process.env.MOOD_FREE_DAILY_LIMIT || '5', 10);
const DAILY_RESET_HOURS_RAW = Number.parseInt(process.env.MOOD_CREDIT_RESET_HOURS || '24', 10);
const FREE_USER_DAILY_LIMIT = Number.isFinite(FREE_USER_DAILY_LIMIT_RAW) && FREE_USER_DAILY_LIMIT_RAW > 0
  ? FREE_USER_DAILY_LIMIT_RAW
  : 5;
const DAILY_RESET_HOURS = Number.isFinite(DAILY_RESET_HOURS_RAW) && DAILY_RESET_HOURS_RAW > 0
  ? DAILY_RESET_HOURS_RAW
  : 24;

const buildLimitMessage = () =>
  `You've reached your daily limit of ${FREE_USER_DAILY_LIMIT} mood playlists. Try again after reset.`;

const getNextDailyResetAt = (fromDate) =>
  new Date(fromDate.getTime() + DAILY_RESET_HOURS * 60 * 60 * 1000);

const resolveUnlimitedAccess = async ({ userId, userEmail }) => {
  if (!userId) return false;

  try {
    const isUnlimitedFromData = (userData) => {
      if (!userData) return false;
      const credit = typeof userData.credit === 'string' ? userData.credit.toLowerCase() : '';
      const credits = typeof userData.credits === 'string' ? userData.credits.toLowerCase() : '';
      return credit === 'unlimited' || credits === 'unlimited';
    };

    // Preferred path: users/{uid}
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists && isUnlimitedFromData(userDoc.data())) {
      return true;
    }

    // Fallback path: users collection keyed by random doc IDs (lookup by email)
    if (userEmail) {
      const emailSnapshot = await db
        .collection('users')
        .where('email', '==', String(userEmail).toLowerCase())
        .limit(1)
        .get();

      if (!emailSnapshot.empty && isUnlimitedFromData(emailSnapshot.docs[0]?.data())) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('[RateLimiter] Failed to read user credit override:', {
      error: error.message,
      userId,
      timestamp: new Date().toISOString()
    });
    return false;
  }
};


const readUsageSnapshot = (data, now) => {
  const currentResetAt = data?.resetAt?.toDate ? data.resetAt.toDate() : null;
  const shouldReset = !currentResetAt || now >= currentResetAt;
  const count = shouldReset ? 0 : (data?.count || 0);
  const resetAt = shouldReset ? getNextDailyResetAt(now) : currentResetAt;
  return { count, resetAt };
};

/**
 * Check quota without consuming a credit.
 * Call `consumeRateLimit` only after successful generation.
 */
async function checkRateLimit(userId, isPremium = false, userContext = {}) {
  try {
    const unlimited = await resolveUnlimitedAccess({
      userId,
      userEmail: userContext.userEmail,
      isPremium
    });

    if (unlimited) {
      return {
        allowed: true,
        remaining: -1,
        resetAt: null,
        unlimited: true,
        error: undefined
      };
    }

    const now = new Date();
    const rateLimitRef = db.collection(RATE_LIMIT_COLLECTION).doc(userId);
    const doc = await rateLimitRef.get();
    const { count, resetAt } = readUsageSnapshot(doc.exists ? doc.data() : null, now);
    const remaining = Math.max(0, FREE_USER_DAILY_LIMIT - count);

    if (count >= FREE_USER_DAILY_LIMIT) {
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        unlimited: false,
        error: buildLimitMessage()
      };
    }

    return {
      allowed: true,
      remaining,
      resetAt,
      unlimited: false,
      error: undefined
    };
  } catch (error) {
    console.error('[RateLimiter] Error checking rate limit:', {
      error: error.message,
      stack: error.stack,
      userId,
      timestamp: new Date().toISOString()
    });

    // Fail open for resilience.
    return {
      allowed: true,
      remaining: FREE_USER_DAILY_LIMIT,
      resetAt: getNextDailyResetAt(new Date()),
      unlimited: false,
      error: undefined
    };
  }
}

/**
 * Consume one credit after a successful generation.
 * Failed/network/internal errors must not call this.
 */
async function consumeRateLimit(userId, isPremium = false, userContext = {}) {
  try {
    const unlimited = await resolveUnlimitedAccess({
      userId,
      userEmail: userContext.userEmail,
      isPremium
    });

    if (unlimited) {
      return {
        allowed: true,
        remaining: -1,
        resetAt: null,
        unlimited: true,
        error: undefined
      };
    }

    const now = new Date();
    const result = await db.runTransaction(async (transaction) => {
      const rateLimitRef = db.collection(RATE_LIMIT_COLLECTION).doc(userId);
      const doc = await transaction.get(rateLimitRef);
      const { count, resetAt } = readUsageSnapshot(doc.exists ? doc.data() : null, now);

      if (count >= FREE_USER_DAILY_LIMIT) {
        return {
          allowed: false,
          remaining: 0,
          resetAt,
          unlimited: false,
          error: buildLimitMessage()
        };
      }

      const newCount = count + 1;
      const remaining = Math.max(0, FREE_USER_DAILY_LIMIT - newCount);

      transaction.set(
        rateLimitRef,
        {
          userId,
          count: newCount,
          resetAt: admin.firestore.Timestamp.fromDate(resetAt),
          lastConsumedAt: admin.firestore.Timestamp.fromDate(now),
          isPremium: false
        },
        { merge: true }
      );

      return {
        allowed: true,
        remaining,
        resetAt,
        unlimited: false,
        error: undefined
      };
    });

    return result;
  } catch (error) {
    console.error('[RateLimiter] Error consuming rate limit credit:', {
      error: error.message,
      stack: error.stack,
      userId,
      timestamp: new Date().toISOString()
    });

    // Fail open so successful requests are not blocked by Firestore failures.
    return {
      allowed: true,
      remaining: FREE_USER_DAILY_LIMIT,
      resetAt: getNextDailyResetAt(new Date()),
      unlimited: false,
      error: undefined
    };
  }
}

async function getRateLimitStatus(userId, isPremium = false, userContext = {}) {
  const status = await checkRateLimit(userId, isPremium, userContext);

  if (status.unlimited) {
    return {
      count: 0,
      remaining: -1,
      resetAt: null
    };
  }

  return {
    count: Math.max(0, FREE_USER_DAILY_LIMIT - status.remaining),
    remaining: status.remaining,
    resetAt: status.resetAt
  };
}

async function resetRateLimit(userId) {
  try {
    const rateLimitRef = db.collection(RATE_LIMIT_COLLECTION).doc(userId);
    await rateLimitRef.delete();
  } catch (error) {
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
  consumeRateLimit,
  getRateLimitStatus,
  resetRateLimit,
  FREE_USER_DAILY_LIMIT,
  getNextDailyResetAt
};
