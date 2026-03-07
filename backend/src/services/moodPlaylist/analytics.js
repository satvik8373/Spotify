import admin from '../../config/firebase.js';

/**
 * Analytics Logger Service for AI Mood Playlist Generator
 * 
 * Provides fire-and-forget async event logging to Firestore.
 * All functions are non-blocking and errors are logged but don't throw.
 * 
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7
 */

const db = admin.firestore();
const ANALYTICS_COLLECTION = 'mood_playlist_analytics';

/**
 * Base function for logging analytics events
 * Fire-and-forget: doesn't block, errors are logged but not thrown
 * 
 * @param {Object} eventData - Event data to log
 * @returns {Promise<void>}
 */
const logEvent = async (eventData) => {
  try {
    const event = {
      ...eventData,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    // Fire-and-forget: don't await
    db.collection(ANALYTICS_COLLECTION).add(event).catch((error) => {
      console.error('Analytics logging error:', error);
    });
  } catch (error) {
    console.error('Analytics event preparation error:', error);
  }
};

/**
 * Log mood input submission event
 * Requirement: 12.1
 * 
 * @param {string} userId - User ID
 * @param {string} moodText - Mood text submitted
 */
export const logMoodInputSubmitted = (userId, moodText) => {
  logEvent({
    eventType: 'mood_input_submitted',
    userId,
    moodText,
  });
};

/**
 * Log emotion detection event
 * Requirement: 12.2
 * 
 * @param {string} userId - User ID
 * @param {string} emotion - Detected emotion label
 * @param {number} confidence - Confidence score (0-1)
 * @param {string} source - Detection source: 'ai', 'fallback', or 'default'
 */
export const logEmotionDetected = (userId, emotion, confidence, source) => {
  logEvent({
    eventType: 'emotion_detected',
    userId,
    emotion,
    confidence,
    source,
  });
};

/**
 * Log playlist generation event
 * Requirement: 12.3
 * 
 * @param {string} userId - User ID
 * @param {string} emotion - Emotion label
 * @param {number} songCount - Number of songs in playlist
 * @param {boolean} cached - Whether result was from cache
 * @param {number} generationTime - Time taken in milliseconds
 */
export const logPlaylistGenerated = (userId, emotion, songCount, cached, generationTime) => {
  logEvent({
    eventType: 'playlist_generated',
    userId,
    emotion,
    songCount,
    cached,
    generationTime,
  });
};

/**
 * Log playlist play event
 * Requirement: 12.4
 * 
 * @param {string} userId - User ID
 * @param {string} playlistId - Playlist ID
 * @param {string} emotion - Emotion label
 */
export const logPlaylistPlayed = (userId, playlistId, emotion) => {
  logEvent({
    eventType: 'playlist_played',
    userId,
    playlistId,
    emotion,
  });
};

/**
 * Log playlist save event
 * Requirement: 12.5
 * 
 * @param {string} userId - User ID
 * @param {string} playlistId - Playlist ID
 * @param {string} emotion - Emotion label
 */
export const logPlaylistSaved = (userId, playlistId, emotion) => {
  logEvent({
    eventType: 'playlist_saved',
    userId,
    playlistId,
    emotion,
  });
};

/**
 * Log rate limit hit event
 * Requirement: 12.6
 * 
 * @param {string} userId - User ID
 * @param {boolean} isPremium - Whether user is premium
 */
export const logRateLimitHit = (userId, isPremium) => {
  logEvent({
    eventType: 'rate_limit_hit',
    userId,
    isPremium,
  });
};

/**
 * Log premium conversion event
 * Requirement: 12.7
 * 
 * @param {string} userId - User ID
 * @param {string} conversionSource - Source of conversion (e.g., 'rate_limit')
 */
export const logPremiumConversion = (userId, conversionSource) => {
  logEvent({
    eventType: 'premium_conversion',
    userId,
    conversionSource,
  });
};
