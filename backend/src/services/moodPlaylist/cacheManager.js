/**
 * Cache Manager Service
 * Manages playlist caching to reduce API costs and improve response times
 * Feature: ai-mood-playlist-generator
 */

import admin from '../../config/firebase.js';

const db = admin.firestore();
const CACHE_COLLECTION = 'mood_playlist_cache';
const CACHE_TTL_HOURS = parseInt(process.env.MOOD_PLAYLIST_CACHE_TTL_HOURS || '24', 10);

/**
 * Normalizes mood text for consistent cache key generation
 * 
 * @param {string} moodText - Raw mood text input
 * @returns {string} Normalized mood text (lowercase, trimmed, collapsed whitespace)
 * 
 * Requirements: 8.4
 */
function normalizeCacheKey(moodText) {
  if (!moodText || typeof moodText !== 'string') {
    return '';
  }

  return moodText
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' '); // Collapse multiple spaces to single space
}

/**
 * Retrieves a cached playlist for the given mood text
 * 
 * @param {string} moodText - The mood text to look up
 * @returns {Promise<Object|null>} Cached playlist object or null if not found/expired
 * 
 * Requirements: 8.1, 8.2, 8.4, 8.5
 */
async function getCachedPlaylist(moodText) {
  try {
    const normalizedKey = normalizeCacheKey(moodText);
    
    if (!normalizedKey) {
      return null;
    }

    // Query cache collection by normalized mood text
    const snapshot = await db.collection(CACHE_COLLECTION)
      .where('moodText', '==', normalizedKey)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const cacheDoc = snapshot.docs[0];
    const cacheData = cacheDoc.data();

    // Check if cache entry has expired
    const now = admin.firestore.Timestamp.now();
    if (cacheData.expiresAt && cacheData.expiresAt.toMillis() < now.toMillis()) {
      // Cache expired, delete it asynchronously
      cacheDoc.ref.delete().catch(err => {
        console.error('Error deleting expired cache entry:', err);
      });
      return null;
    }

    // Return the cached playlist
    return cacheData.playlist;
  } catch (error) {
    // Log error details internally (Requirement 13.1)
    console.error('[CacheManager] Error retrieving cached playlist:', {
      error: error.message,
      stack: error.stack,
      moodText,
      timestamp: new Date().toISOString()
    });
    
    // Return null on error to allow fallback to generation
    // Don't expose technical details to users (Requirement 13.5)
    return null;
  }
}

/**
 * Stores a generated playlist in the cache
 * 
 * @param {string} moodText - The mood text used to generate the playlist
 * @param {Object} playlist - The generated playlist object
 * @param {string} emotion - The detected emotion label
 * @returns {Promise<void>}
 * 
 * Requirements: 8.1, 8.3, 8.4
 */
async function setCachedPlaylist(moodText, playlist, emotion) {
  try {
    const normalizedKey = normalizeCacheKey(moodText);
    
    if (!normalizedKey || !playlist || !emotion) {
      console.warn('Invalid cache parameters, skipping cache storage');
      return;
    }

    const now = admin.firestore.Timestamp.now();
    const expiresAt = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + (CACHE_TTL_HOURS * 60 * 60 * 1000)
    );

    const cacheEntry = {
      moodText: normalizedKey,
      emotion,
      playlist: {
        _id: playlist._id,
        name: playlist.name,
        emotion: playlist.emotion,
        songs: playlist.songs,
        songCount: playlist.songCount,
        generatedAt: playlist.generatedAt || now
      },
      createdAt: now,
      expiresAt
    };

    // Store in cache collection
    // Use normalized mood text as document ID for easy lookup
    await db.collection(CACHE_COLLECTION).add(cacheEntry);

    console.log(`Cached playlist for mood: "${normalizedKey}" (expires in ${CACHE_TTL_HOURS}h)`);
  } catch (error) {
    // Log error details internally (Requirement 13.1)
    console.error('[CacheManager] Error storing playlist in cache:', {
      error: error.message,
      stack: error.stack,
      moodText,
      emotion,
      timestamp: new Date().toISOString()
    });
    
    // Don't throw error - caching failure shouldn't break the response
    // Don't expose technical details to users (Requirement 13.5)
  }
}

/**
 * Clears expired cache entries (for maintenance/cleanup jobs)
 * 
 * @returns {Promise<number>} Number of entries deleted
 */
async function clearExpiredCache() {
  try {
    const now = admin.firestore.Timestamp.now();
    
    const snapshot = await db.collection(CACHE_COLLECTION)
      .where('expiresAt', '<', now)
      .get();

    if (snapshot.empty) {
      return 0;
    }

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    
    console.log(`Cleared ${snapshot.size} expired cache entries`);
    return snapshot.size;
  } catch (error) {
    // Log error details internally
    console.error('[CacheManager] Error clearing expired cache:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    return 0;
  }
}

export {
  getCachedPlaylist,
  setCachedPlaylist,
  clearExpiredCache,
  normalizeCacheKey
};
