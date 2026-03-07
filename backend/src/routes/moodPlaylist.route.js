/**
 * Mood Playlist API Routes
 * Feature: ai-mood-playlist-generator
 * 
 * Endpoints:
 * - POST /api/playlists/mood-generate - Generate mood-based playlist
 * - POST /api/playlists/mood-save - Save generated playlist to user library
 * - POST /api/playlists/:id/share - Create shareable link for playlist
 * - GET /api/playlists/share/:shareId - Access shared playlist (public, no auth)
 * 
 * Requirements: 1.5, 2.6, 6.4, 8.5, 9.1, 9.3, 9.5, 10.1, 10.3, 10.4, 10.5, 13.1, 13.2, 13.3, 13.5, 14.1, 14.2
 */

import express from 'express';
import { validateMoodInput } from '../services/moodPlaylist/validator.js';
import { checkRateLimit } from '../services/moodPlaylist/rateLimiter.js';
import { getCachedPlaylist, setCachedPlaylist } from '../services/moodPlaylist/cacheManager.js';
import { analyzeEmotion } from '../services/moodPlaylist/emotionAnalyzer.js';
import { mapEmotionToGenres } from '../services/moodPlaylist/genreMapper.js';
import { generatePlaylist } from '../services/moodPlaylist/playlistGenerator.js';
import { savePlaylist, getUserPlaylists, deletePlaylist, finalizeToLibrary } from '../services/moodPlaylist/saveHandler.js';
import { createShareLink, getSharedPlaylist, revokeShareLink } from '../services/moodPlaylist/shareHandler.js';
import {
  logMoodInputSubmitted,
  logEmotionDetected,
  logPlaylistGenerated,
  logRateLimitHit
} from '../services/moodPlaylist/analytics.js';
import { protectRoute } from '../middleware/auth.middleware.js';
import { firebaseAuth } from '../middleware/firebase-auth.middleware.js';
import metricsCollector from '../services/moodPlaylist/metricsCollector.js';

const router = express.Router();

/**
 * POST /api/playlists/mood-generate
 * Generate a mood-based playlist from natural language input
 * 
 * Authentication: Required
 * Rate Limiting: 3/day for free users, unlimited for premium
 * 
 * Requirements: 1.5, 2.6, 6.4, 8.5, 13.1, 13.2, 13.3, 13.5, 14.1, 14.2
 */
router.post('/mood-generate', protectRoute, async (req, res) => {
  const startTime = Date.now();
  let apiUsed = false;
  let apiFailed = false;
  let cached = false;
  let success = false;
  let errorType = null;
  let emotion = null;

  try {
    const { moodText } = req.body;
    const userId = req.auth.uid;
    const isPremium = req.auth.isPremium || false;

    // Step 1: Validate mood text input (Requirement 1.1, 1.2, 1.3, 1.4)
    const validation = validateMoodInput(moodText);

    if (!validation.isValid) {
      // Log validation error internally (Requirement 13.1)
      console.warn('[MoodPlaylistAPI] Validation failed:', {
        userId,
        error: validation.error,
        timestamp: new Date().toISOString()
      });

      errorType = 'validation';

      // Record metrics
      await metricsCollector.recordRequest({
        userId,
        success: false,
        responseTime: Date.now() - startTime,
        cached: false,
        apiUsed: false,
        apiFailed: false,
        errorType: 'validation'
      });

      // Return user-friendly error message (Requirement 13.3, 13.5)
      return res.status(400).json({
        error: 'Validation failed',
        message: validation.error || 'Please enter a mood description between 3 and 200 characters'
      });
    }

    const sanitizedMoodText = validation.sanitized;

    // Log mood input submission (Requirement 12.1)
    logMoodInputSubmitted(userId, sanitizedMoodText);

    // Step 2: Check rate limit (Requirement 6.1, 6.2, 6.3, 7.1, 7.2)
    const rateLimitResult = await checkRateLimit(userId, isPremium);

    if (!rateLimitResult.allowed) {
      // Log rate limit hit (Requirement 12.6)
      logRateLimitHit(userId, isPremium);

      errorType = 'rate_limit';

      // Record metrics
      await metricsCollector.recordRequest({
        userId,
        success: false,
        responseTime: Date.now() - startTime,
        cached: false,
        apiUsed: false,
        apiFailed: false,
        errorType: 'rate_limit'
      });

      // Return rate limit error with upgrade prompt (Requirement 6.4, 13.3)
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: rateLimitResult.error || "You've reached your daily limit of 3 mood playlists. Upgrade to premium for unlimited generations!",
        upgradeUrl: '/premium',
        resetAt: rateLimitResult.resetAt?.toISOString()
      });
    }

    // Force bypass cache temporarily to flush old images and HTML entities
    const bypassCache = true;

    // Step 3: Check cache (Requirement 8.1, 8.2, 8.4, 8.5)
    const cachedPlaylist = bypassCache ? null : await getCachedPlaylist(sanitizedMoodText);

    if (cachedPlaylist && !bypassCache) {
      console.log('[MoodPlaylistAPI] Cache hit for mood text');

      cached = true;
      success = true;
      emotion = cachedPlaylist.emotion;

      // Record metrics for cache hit
      await metricsCollector.recordRequest({
        userId,
        success: true,
        responseTime: Date.now() - startTime,
        cached: true,
        apiUsed: false,
        apiFailed: false,
        emotion: cachedPlaylist.emotion
      });

      // Return cached playlist (Requirement 8.5)
      return res.status(200).json({
        playlist: {
          ...cachedPlaylist,
          cached: true
        },
        rateLimitInfo: {
          remaining: rateLimitResult.remaining,
          resetAt: rateLimitResult.resetAt?.toISOString()
        }
      });
    }

    // Step 4: Analyze emotion (Requirement 2.1, 2.2, 2.3, 2.4, 2.5, 2.6)
    apiUsed = true;
    const emotionResult = await analyzeEmotion(sanitizedMoodText);

    // Track if API failed and fallback was used
    if (emotionResult.source === 'fallback' || emotionResult.source === 'default') {
      apiFailed = true;
    }

    emotion = emotionResult.emotion;

    // Log emotion detection (Requirement 12.2)
    logEmotionDetected(userId, emotionResult.emotion, emotionResult.confidence, emotionResult.source);

    // Log context detection
    if (emotionResult.context?.primary) {
      console.log(`[MoodPlaylistAPI] Context detected: ${emotionResult.context.primary}`);
    }

    // Step 5: Map emotion + context to search queries (Requirement 4.1, 4.8)
    const genres = mapEmotionToGenres(emotionResult.emotion, emotionResult.context?.primary || null);

    // Step 6: Generate playlist with context (Requirement 5.1–5.8)
    const playlist = await generatePlaylist(genres, emotionResult.emotion, sanitizedMoodText, emotionResult.context);

    // Step 7: Cache the generated playlist (Requirement 8.1, 8.3) - Skip in development
    if (process.env.NODE_ENV !== 'development') {
      await setCachedPlaylist(sanitizedMoodText, playlist, emotionResult.emotion);
    } else {
      console.log('[MoodPlaylistAPI] Development mode - skipping cache write');
    }

    const processingTime = Date.now() - startTime;

    // Log playlist generation (Requirement 12.3)
    logPlaylistGenerated(userId, emotionResult.emotion, playlist.songCount, false, processingTime);

    success = true;

    // Record metrics for successful generation
    await metricsCollector.recordRequest({
      userId,
      success: true,
      responseTime: processingTime,
      cached: false,
      apiUsed,
      apiFailed,
      emotion: emotionResult.emotion
    });

    // Step 8: Auto-save to history (non-blocking so it doesn't delay response)
    let savedPlaylistId = null;
    try {
      const userInfo = { fullName: req.auth.name || '', imageUrl: req.auth.picture || '' };
      const saveResult = await savePlaylist(userId, {
        name: playlist.name || `${emotionResult.emotion} Mood Playlist`,
        emotion: emotionResult.emotion,
        songs: playlist.songs,
        moodText: sanitizedMoodText,
        description: `Generated from: "${sanitizedMoodText}"`,
      }, userInfo);
      if (saveResult.success) {
        savedPlaylistId = saveResult.playlistId;
      }
    } catch (saveErr) {
      // Non-critical — log but don't fail the request
      console.warn('[MoodPlaylistAPI] Auto-save to history failed (non-critical):', saveErr.message);
    }

    // Step 9: Return playlist response (Requirement 1.5, 14.1, 14.2)
    return res.status(200).json({
      playlist: {
        ...playlist,
        _id: savedPlaylistId || playlist._id,
        cached: false
      },
      rateLimitInfo: {
        remaining: rateLimitResult.remaining,
        resetAt: rateLimitResult.resetAt?.toISOString()
      }
    });

  } catch (error) {
    // Log error details internally (Requirement 13.1)
    console.error('[MoodPlaylistAPI] Error generating mood playlist:', {
      error: error.message,
      stack: error.stack,
      userId: req.auth?.uid,
      timestamp: new Date().toISOString()
    });

    errorType = 'internal';

    // Record metrics for error
    await metricsCollector.recordRequest({
      userId: req.auth?.uid,
      success: false,
      responseTime: Date.now() - startTime,
      cached,
      apiUsed,
      apiFailed,
      errorType: 'internal',
      emotion
    });

    // Return user-friendly error message (Requirement 13.2, 13.3, 13.5)
    // Never expose technical details like stack traces
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Something went wrong. Please try again.'
    });
  }
});

/**
 * POST /api/playlists/mood-save
 * Save a generated mood playlist to user's library
 * 
 * Authentication: Required
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 13.3, 13.5
 */
router.post('/mood-save', protectRoute, async (req, res) => {
  try {
    const { playlistData } = req.body;
    const userId = req.auth.uid;
    const userInfo = {
      fullName: req.auth.fullName || req.auth.displayName || 'Unknown User',
      imageUrl: req.auth.imageUrl || req.auth.photoURL || ''
    };

    // Validate request body
    if (!playlistData) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Playlist data is required'
      });
    }

    // Save playlist (Requirement 9.1, 9.2, 9.3, 9.4)
    const result = await savePlaylist(userId, playlistData, userInfo);

    if (!result.success) {
      // Return descriptive error message (Requirement 9.5, 13.5)
      return res.status(500).json({
        error: result.error,
        message: result.message
      });
    }

    // Return success response (Requirement 9.3)
    return res.status(200).json({
      success: true,
      playlistId: result.playlistId,
      message: result.message,
      playlist: result.playlist
    });

  } catch (error) {
    // Log error details internally (Requirement 13.1)
    console.error('[MoodPlaylistAPI] Error saving playlist:', {
      error: error.message,
      stack: error.stack,
      userId: req.auth?.uid,
      timestamp: new Date().toISOString()
    });

    // Return user-friendly error message (Requirement 13.3, 13.5)
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Something went wrong. Please try again.'
    });
  }
});

/**
 * GET /api/playlists/mood-saved
 * Get all saved mood playlists for the authenticated user
 * 
 * Authentication: Required
 */
router.get('/mood-saved', protectRoute, async (req, res) => {
  try {
    const userId = req.auth.uid;
    const limit = parseInt(req.query.limit) || 50;

    const playlists = await getUserPlaylists(userId, limit);

    return res.status(200).json({
      success: true,
      playlists,
      count: playlists.length
    });

  } catch (error) {
    console.error('[MoodPlaylistAPI] Error fetching saved playlists:', {
      error: error.message,
      stack: error.stack,
      userId: req.auth?.uid,
      timestamp: new Date().toISOString()
    });

    return res.status(500).json({
      error: 'Internal server error',
      message: 'Something went wrong. Please try again.'
    });
  }
});

/**
 * DELETE /api/playlists/mood/:playlistId
 * Delete a saved mood playlist
 * 
 * Authentication: Required
 */
router.delete('/mood/:playlistId', protectRoute, async (req, res) => {
  try {
    const userId = req.auth.uid;
    const { playlistId } = req.params;

    const result = await deletePlaylist(userId, playlistId);

    if (!result.success) {
      return res.status(404).json({
        error: result.error,
        message: result.message
      });
    }

    return res.status(200).json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error('[MoodPlaylistAPI] Error deleting playlist:', {
      error: error.message,
      stack: error.stack,
      userId: req.auth?.uid,
      playlistId: req.params.playlistId,
      timestamp: new Date().toISOString()
    });

    return res.status(500).json({
      error: 'Internal server error',
      message: 'Something went wrong. Please try again.'
    });
  }
});

/**
 * POST /api/playlists/:id/share
 * Create a shareable link for a playlist
 * 
 * Authentication: Required
 * 
 * Requirements: 10.1, 10.2, 10.3, 13.3, 13.5
 */
router.post('/:id/share', protectRoute, async (req, res) => {
  try {
    const { id: playlistId } = req.params;
    const userId = req.auth.uid;

    // Create share link (Requirement 10.1, 10.2, 10.3)
    const result = await createShareLink(playlistId, userId);

    if (!result.success) {
      return res.status(404).json({
        error: result.error,
        message: result.message
      });
    }

    // Return share link (Requirement 10.3)
    return res.status(200).json({
      success: true,
      shareId: result.shareId,
      shareUrl: result.shareUrl,
      message: result.message
    });

  } catch (error) {
    // Log error details internally (Requirement 13.1)
    console.error('[MoodPlaylistAPI] Error creating share link:', {
      error: error.message,
      stack: error.stack,
      userId: req.auth?.uid,
      playlistId: req.params.id,
      timestamp: new Date().toISOString()
    });

    // Return user-friendly error message (Requirement 13.3, 13.5)
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Something went wrong. Please try again.'
    });
  }
});

/**
 * GET /api/playlists/share/:shareId
 * Access a shared playlist via share ID
 * 
 * Authentication: NOT REQUIRED (public endpoint)
 * 
 * Requirements: 10.4, 10.5, 13.3, 13.5
 */
router.get('/share/:shareId', async (req, res) => {
  try {
    const { shareId } = req.params;

    // Get shared playlist (Requirement 10.4, 10.5)
    const result = await getSharedPlaylist(shareId);

    if (!result.success) {
      return res.status(404).json({
        error: result.error,
        message: result.message
      });
    }

    // Return playlist data (Requirement 10.4)
    return res.status(200).json({
      success: true,
      playlist: result.playlist,
      shareInfo: result.shareInfo
    });

  } catch (error) {
    // Log error details internally (Requirement 13.1)
    console.error('[MoodPlaylistAPI] Error accessing shared playlist:', {
      error: error.message,
      stack: error.stack,
      shareId: req.params.shareId,
      timestamp: new Date().toISOString()
    });

    // Return user-friendly error message (Requirement 13.3, 13.5)
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Unable to load the shared playlist. Please try again.'
    });
  }
});

/**
 * DELETE /api/playlists/share/:shareId
 * Revoke a share link
 * 
 * Authentication: Required
 */
router.delete('/share/:shareId', protectRoute, async (req, res) => {
  try {
    const { shareId } = req.params;
    const userId = req.auth.uid;

    const result = await revokeShareLink(shareId, userId);

    if (!result.success) {
      return res.status(403).json({
        error: result.error,
        message: result.message
      });
    }

    return res.status(200).json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error('[MoodPlaylistAPI] Error revoking share link:', {
      error: error.message,
      stack: error.stack,
      userId: req.auth?.uid,
      shareId: req.params.shareId,
      timestamp: new Date().toISOString()
    });

    return res.status(500).json({
      error: 'Internal server error',
      message: 'Something went wrong. Please try again.'
    });
  }
});

router.get('/mood-history', firebaseAuth, async (req, res) => {
  try {
    const userId = req.auth.uid;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await getUserPlaylists(userId, limit, page);

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('[MoodPlaylistAPI] Error fetching mood history:', error.message);
    return res.status(500).json({ error: 'Failed to fetch mood history', message: 'Please try again.' });
  }
});

/**
 * POST /api/playlists/mood-finalize
 * Converts a mood session into a permanent library playlist
 * Body: { playlistId } — the Firestore ID of the mood playlist to finalize
 */
router.post('/mood-finalize', firebaseAuth, async (req, res) => {
  try {
    const userId = req.auth.uid;
    const { playlistId } = req.body;

    if (!playlistId) {
      return res.status(400).json({ error: 'playlistId is required' });
    }

    const result = await finalizeToLibrary(userId, playlistId);

    if (!result.success) {
      return res.status(result.status || 400).json({ error: result.error, message: result.message });
    }

    return res.status(200).json({ success: true, playlist: result.playlist, message: result.message });
  } catch (error) {
    console.error('[MoodPlaylistAPI] Error finalizing playlist:', error.message);
    return res.status(500).json({ error: 'Failed to finalize playlist', message: 'Please try again.' });
  }
});

export default router;


