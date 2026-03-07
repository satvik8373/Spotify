/**
 * Type definitions for AI Mood Playlist Generator feature
 * 
 * These JSDoc type definitions provide type safety and IDE autocomplete
 * for the mood playlist feature components.
 */

/**
 * Valid emotion labels returned by the emotion analyzer
 * @typedef {'sadness' | 'joy' | 'anger' | 'love' | 'fear' | 'surprise'} EmotionLabel
 */

/**
 * Source of emotion detection
 * @typedef {'ai' | 'fallback' | 'default'} EmotionSource
 */

/**
 * Result from emotion analysis
 * @typedef {Object} EmotionResult
 * @property {EmotionLabel} emotion - Detected emotion label
 * @property {number} confidence - Confidence score (0-1)
 * @property {EmotionSource} source - Source of detection
 * @property {number} processingTime - Time taken in milliseconds
 */

/**
 * Input validation result
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Whether input is valid
 * @property {string} sanitized - Sanitized input text
 * @property {string} [error] - Error message if invalid
 */

/**
 * Rate limit check result
 * @typedef {Object} RateLimitResult
 * @property {boolean} allowed - Whether request is allowed
 * @property {number} remaining - Remaining generations for the day
 * @property {Date} resetAt - When the limit resets
 * @property {string} [error] - Error message if rate limited
 */

/**
 * Mood playlist cache document
 * @typedef {Object} MoodPlaylistCache
 * @property {string} moodText - Normalized mood text (cache key)
 * @property {EmotionLabel} emotion - Detected emotion
 * @property {Object} playlist - Cached playlist object
 * @property {string} playlist._id - Playlist ID
 * @property {string} playlist.name - Playlist name
 * @property {EmotionLabel} playlist.emotion - Emotion label
 * @property {string[]} playlist.songs - Array of song IDs
 * @property {number} playlist.songCount - Number of songs (should be 20)
 * @property {FirebaseFirestore.Timestamp} playlist.generatedAt - Generation timestamp
 * @property {FirebaseFirestore.Timestamp} createdAt - Cache creation time
 * @property {FirebaseFirestore.Timestamp} expiresAt - Cache expiration time (24 hours)
 */

/**
 * Rate limit document
 * @typedef {Object} RateLimitDocument
 * @property {string} userId - User ID
 * @property {number} count - Number of generations today
 * @property {FirebaseFirestore.Timestamp} resetAt - Midnight UTC reset time
 * @property {FirebaseFirestore.Timestamp} lastRequestAt - Last request timestamp
 * @property {boolean} isPremium - Whether user is premium
 */

/**
 * Analytics event types
 * @typedef {'mood_input_submitted' | 'emotion_detected' | 'playlist_generated' | 'playlist_played' | 'playlist_saved' | 'rate_limit_hit' | 'premium_conversion'} AnalyticsEventType
 */

/**
 * Analytics event document
 * @typedef {Object} AnalyticsEvent
 * @property {AnalyticsEventType} eventType - Type of event
 * @property {string} userId - User ID
 * @property {string} [moodText] - Mood text input
 * @property {EmotionLabel} [emotion] - Detected emotion
 * @property {number} [confidence] - Confidence score
 * @property {EmotionSource} [source] - Detection source
 * @property {boolean} [cached] - Whether result was cached
 * @property {number} [generationTime] - Generation time in ms
 * @property {string} [playlistId] - Playlist ID
 * @property {number} [songCount] - Number of songs
 * @property {boolean} [isPremium] - Premium status
 * @property {string} [conversionSource] - Conversion source
 * @property {FirebaseFirestore.Timestamp} timestamp - Event timestamp
 */

/**
 * Playlist share document
 * @typedef {Object} PlaylistShare
 * @property {string} shareId - Unique share ID (UUID)
 * @property {string} playlistId - Referenced playlist ID
 * @property {string} createdBy - User ID who created the share
 * @property {FirebaseFirestore.Timestamp} createdAt - Share creation time
 * @property {number} accessCount - Number of times accessed
 * @property {FirebaseFirestore.Timestamp} [lastAccessedAt] - Last access time
 */

/**
 * Mood-generated playlist (extends base playlist)
 * @typedef {Object} MoodGeneratedPlaylist
 * @property {string} _id - Playlist ID
 * @property {string} name - Playlist name
 * @property {string} description - Playlist description
 * @property {boolean} isPublic - Whether playlist is public
 * @property {string[]} songs - Array of song IDs
 * @property {Object} createdBy - Creator info
 * @property {FirebaseFirestore.Timestamp} createdAt - Creation time
 * @property {boolean} moodGenerated - Always true for mood playlists
 * @property {EmotionLabel} emotion - Detected emotion
 * @property {string} moodText - Original mood input
 * @property {FirebaseFirestore.Timestamp} generatedAt - Generation time
 */

/**
 * API response for mood playlist generation
 * @typedef {Object} MoodPlaylistResponse
 * @property {Object} playlist - Generated playlist
 * @property {string} playlist._id - Playlist ID
 * @property {string} playlist.name - Playlist name
 * @property {EmotionLabel} playlist.emotion - Detected emotion
 * @property {string[]} playlist.songs - Array of song IDs
 * @property {number} playlist.songCount - Number of songs
 * @property {string} playlist.generatedAt - ISO timestamp
 * @property {boolean} playlist.cached - Whether from cache
 * @property {Object} rateLimitInfo - Rate limit information
 * @property {number} rateLimitInfo.remaining - Remaining generations
 * @property {string} rateLimitInfo.resetAt - ISO timestamp of reset
 */

/**
 * Genre mapping for emotions
 * @typedef {Object.<EmotionLabel, string[]>} GenreMapping
 */

export {};
