# Implementation Plan: AI Mood → Auto Playlist Generator

## Overview


The implementation follows a bottom-up approach: database setup → core services → API endpoints → frontend components → testing → integration.

## Tasks

- [x] 1. Database schema setup and migrations
  - [x] 1.1 Create Firestore collections and indexes
    - Create `mood_playlist_cache` collection with indexes on `moodText` (unique) and `expiresAt`
    - Create `mood_playlist_rate_limits` collection with index on `userId`
    - Create `mood_playlist_analytics` collection with composite index on `userId + eventType + timestamp`
    - Create `playlist_shares` collection with indexes on `shareId` and `playlistId`
    - Add composite index on `songs` collection for `genre + moodTags`
    - _Requirements: 8.1, 8.4, 9.2, 10.1, 12.1-12.7_
  
  - [x] 1.2 Add moodTags field to songs collection
    - Write migration script to add empty `moodTags` array field to existing song documents
    - Update song schema type definitions to include `moodTags: string[]`
    - _Requirements: 5.3_
  
  - [x] 1.3 Extend playlist schema for mood-generated playlists
    - Add optional fields to playlist schema: `moodGenerated`, `emotion`, `moodText`, `generatedAt`
    - Update TypeScript interfaces for playlist model
    - _Requirements: 5.6, 5.7, 9.2_

- [x] 2. Implement core validation and rate limiting services
  - [x] 2.1 Create input validator service
    - Implement `validateMoodInput()` function with length validation (3-200 chars)
    - Add input sanitization for SQL injection patterns and special characters
    - Add text normalization (lowercase, trim, collapse whitespace)
    - Create `backend/src/services/moodPlaylist/validator.js`
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [x] 2.2 Write property test for input validator
    - **Property 1: Input Length Validation**
    - **Property 2: Input Sanitization**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
  
  - [x] 2.3 Create rate limiter service
    - Implement `checkRateLimit()` function with Firestore transaction for atomic increment
    - Add free user limit check (3 per day)
    - Add premium user bypass logic
    - Add midnight UTC reset logic
    - Create `backend/src/services/moodPlaylist/rateLimiter.js`
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 7.1, 7.2, 7.3_
  
  - [x] 2.4 Write property tests for rate limiter
    - **Property 11: Free User Rate Limiting**
    - **Property 12: Rate Limit Error Message**
    - **Property 13: Premium User Bypass**
    - **Validates: Requirements 6.2, 6.3, 6.4, 7.1, 7.2**

- [x] 3. Implement emotion detection services
  - [x] 3.1 Create HuggingFace API client
    - Implement axios client with 5-second timeout
    - Add authentication header with `HUGGINGFACE_API_KEY`
    - Add request/response logging
    - Create `backend/src/services/moodPlaylist/huggingfaceClient.js`
    - _Requirements: 2.1, 2.5_
  
  - [x] 3.2 Create fallback emotion detector
    - Implement keyword-to-emotion mapping dictionary for all 6 emotions
    - Implement `detectEmotionByKeywords()` function with keyword counting algorithm
    - Add case-insensitive matching and punctuation removal
    - Add default "joy" return when no keywords match
    - Create `backend/src/services/moodPlaylist/fallbackDetector.js`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 3.3 Write property tests for fallback detector
    - **Property 3: Emotion Label Domain**
    - **Property 6: Fallback Keyword Matching**
    - **Validates: Requirements 2.3, 3.3, 3.4, 13.4**
  
  - [x] 3.4 Create emotion analyzer service
    - Implement `analyzeEmotion()` function that calls HuggingFace API
    - Add highest confidence score extraction logic
    - Add timeout handling (5s) with fallback invocation
    - Add API error handling with fallback invocation
    - Add performance tracking (processingTime)
    - Create `backend/src/services/moodPlaylist/emotionAnalyzer.js`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  
  - [x] 3.5 Write property tests for emotion analyzer
    - **Property 4: Highest Confidence Selection**
    - **Property 5: API Failure Fallback**
    - **Validates: Requirements 2.2, 2.4, 2.5**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement genre mapping and playlist generation
  - [x] 5.1 Create genre mapper service
    - Implement emotion-to-genre mapping table for all 6 emotions
    - Implement `mapEmotionToGenres()` function with in-memory lookup
    - Create `backend/src/services/moodPlaylist/genreMapper.js`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_
  
  - [x] 5.2 Write property test for genre mapper
    - **Property 7: Genre Mapping Completeness**
    - **Validates: Requirements 4.1, 4.8**
  
  - [x] 5.3 Create cache manager service
    - Implement `getCachedPlaylist()` function with Firestore query on normalized mood text
    - Implement `setCachedPlaylist()` function with 24-hour TTL
    - Add cache key normalization logic
    - Create `backend/src/services/moodPlaylist/cacheManager.js`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [x] 5.4 Write property tests for cache manager
    - **Property 14: Cache Hit Consistency**
    - **Property 15: Cache Key Normalization**
    - **Validates: Requirements 8.2, 8.4**
  
  - [x] 5.5 Create playlist generator service
    - Implement Firestore query for songs by genre with moodTags prioritization
    - Implement Fisher-Yates shuffle algorithm for randomization
    - Implement 20-song selection logic
    - Add genre expansion logic when < 20 songs found
    - Add playlist name generation based on emotion/genre
    - Add fallback to trending playlist when no songs match
    - Create `backend/src/services/moodPlaylist/playlistGenerator.js`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 14.1_
  
  - [x] 5.6 Write property tests for playlist generator
    - **Property 8: Playlist Size Invariant**
    - **Property 9: Playlist Randomization**
    - **Property 10: Playlist Metadata Completeness**
    - **Validates: Requirements 5.2, 5.5, 5.6, 5.7, 5.8**

- [x] 6. Implement analytics and save/share handlers
  - [x] 6.1 Create analytics logger service
    - Implement async event logging functions for all 7 event types
    - Add fire-and-forget async writes to `mood_playlist_analytics` collection
    - Add event metadata structure for each event type
    - Create `backend/src/services/moodPlaylist/analytics.js`
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_
  
  - [-] 6.2 Write property test for analytics logger
    - **Property 22: Analytics Event Logging**
    - **Validates: Requirements 12.1-12.7**
  
  - [x] 6.3 Create save playlist handler
    - Implement playlist copy logic to user's library
    - Add user association with Firebase UID
    - Add playlist metadata storage (name, emotion, songs, timestamp)
    - Add confirmation response with playlist ID
    - Create `backend/src/services/moodPlaylist/saveHandler.js`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 14.4_
  
  - [-] 6.4 Write property tests for save handler
    - **Property 16: Saved Playlist Completeness**
    - **Property 17: Save Confirmation**
    - **Property 18: Save Error Handling**
    - **Validates: Requirements 9.2, 9.3, 9.5**
  
  - [x] 6.5 Create share playlist handler
    - Implement UUID generation for share IDs
    - Add public playlist entry creation with `isPublic: true`
    - Add share mapping storage in `playlist_shares` collection
    - Implement share link access endpoint (no auth required)
    - Create `backend/src/services/moodPlaylist/shareHandler.js`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 14.5_
  
  - [ ]* 6.6 Write property tests for share handler
    - **Property 19: Share Link Uniqueness**
    - **Property 20: Share Link Access**
    - **Property 21: Unauthenticated Share Access**
    - **Validates: Requirements 10.1, 10.4, 10.5**

- [ ] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [] 8. Implement API endpoints
  - [x] 8.1 Create mood playlist generation endpoint
    - Implement `POST /api/playlists/mood-generate` route
    - Add Firebase Auth middleware for authentication
    - Wire together: validator → rate limiter → cache check → emotion analyzer → genre mapper → playlist generator → cache store
    - Add response formatting with playlist and rate limit info
    - Add error handling for all failure scenarios (validation, rate limit, API, database)
    - Add analytics logging for all events
    - Create `backend/src/routes/moodPlaylist.js`
    - _Requirements: 1.5, 2.6, 6.4, 8.5, 13.1, 13.2, 13.3, 13.5, 14.1, 14.2_
  
  - [x] 8.2 Create save playlist endpoint
    - Implement `POST /api/playlists/mood-save` route
    - Add Firebase Auth middleware
    - Wire save handler with request validation
    - Add error handling and user-friendly error messages
    - _Requirements: 9.1, 9.3, 9.5_
  
  - [x] 8.3 Create share playlist endpoints
    - Implement `POST /api/playlists/:id/share` route (authenticated)
    - Implement `GET /api/playlists/share/:shareId` route (public, no auth)
    - Wire share handler with UUID generation
    - Add error handling
    - _Requirements: 10.1, 10.3, 10.4, 10.5_
  
  - [x] 8.4 Write integration tests for API endpoints
    - Test end-to-end playlist generation flow
    - Test cache hit and miss scenarios
    - Test rate limiting for free and premium users
    - Test fallback mechanism with mocked API failure
    - Test save and share flows
    - _Requirements: All requirements_

- [x] 9. Implement frontend components
  - [x] 9.1 Create mood input component
    - Implement text input with multiline support (3-200 chars)
    - Add real-time character counter
    - Add client-side validation with error display
    - Add submit button with disabled state for invalid input
    - Create `frontend/src/components/MoodPlaylistGenerator.tsx`
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [x] 9.2 Create loading state component
    - Implement animated waveform (CSS animation or Lottie)
    - Add "Analyzing your vibe…" message
    - Add indeterminate progress indicator
    - Create `frontend/src/components/MoodPlaylistLoading.tsx`
    - _Requirements: 11.1, 11.2, 11.3_
  
  - [x] 9.3 Create playlist display component
    - Implement playlist metadata display (name, emotion badge)
    - Add song list display (20 songs)
    - Add play, save, and share buttons
    - Add emotion-based color theming
    - Create `frontend/src/components/MoodPlaylistDisplay.tsx`
    - _Requirements: 5.6, 5.7, 9.1, 10.1_
  
  - [x] 9.4 Wire frontend components with API
    - Implement API call to `POST /api/playlists/mood-generate`
    - Add loading state management
    - Add error handling with user-friendly messages
    - Add rate limit error display with upgrade CTA
    - Add analytics event tracking for play and save actions
    - Update `MoodPlaylistGenerator.tsx` with state management
    - _Requirements: 1.5, 6.4, 11.3, 11.4, 12.4, 12.5, 13.3, 13.5_
  
  - [x] 9.5 Write unit tests for frontend components
    - Test input validation and character counter
    - Test loading state display
    - Test playlist display with mock data
    - Test error message display
    - _Requirements: 1.1, 1.2, 1.3, 11.1, 11.2, 11.3, 11.4, 13.3_

- [-] 10. Error handling and user experience polish
  - [x] 10.1 Implement comprehensive error handling
    - Add user-friendly error messages for all error types (validation, rate limit, API, timeout, auth, database)
    - Ensure no technical details exposed to users
    - Add error logging for all failures
    - Update all service components with consistent error handling
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_
  
  - [x] 10.2 Write property tests for error handling
    - **Property 23: Error Logging**
    - **Property 24: Database Error Response**
    - **Property 25: User-Friendly Error Messages**
    - **Validates: Requirements 13.1, 13.2, 13.3, 13.5**

- [ ] 11. Environment configuration and deployment preparation
  - [x] 11.1 Add environment variables
    - Add `HUGGINGFACE_API_KEY` to environment configuration
    - Add `MOOD_PLAYLIST_ENABLED` feature flag
    - Add `MOOD_PLAYLIST_CACHE_TTL_HOURS` configuration (default: 24)
    - Add `MOOD_PLAYLIST_FREE_LIMIT` configuration (default: 3)
    - Update `.env.example` and deployment configuration
    - _Requirements: 2.1, 6.2, 8.3_
  
  - [x] 11.2 Create monitoring and alerting setup
    - Add metrics tracking for success rate, response time, API failure rate, cache hit rate, error rate
    - Add alert thresholds (API failure > 10%, response time > 8s, error rate > 5%, cache hit < 50%)
    - Document monitoring dashboard setup
    - _Requirements: 2.6, 8.5, 14.1, 14.2_

- [x] 12. Final integration and testing
  - [x] 12.1 Integration testing and bug fixes
    - Run all property-based tests and unit tests
    - Test end-to-end flows manually
    - Fix any integration issues
    - Verify all 14 requirements are met
    - _Requirements: All requirements_
  
  - [x] 12.2 Performance validation
    - Verify cache hit response time < 1s
    - Verify cache miss response time < 10s
    - Verify genre mapping < 100ms
    - Verify fallback detection < 500ms
    - Verify save operation < 2s
    - Verify share link generation < 1s
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_
  
  - [x] 12.3 Documentation and deployment
    - Document API endpoints in API documentation
    - Document environment variables and configuration
    - Document rollout strategy (beta → limited → full release)
    - Create deployment checklist
    - _Requirements: All requirements_

- [x] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property-based tests use fast-check library with minimum 100 iterations
- All property tests must include comment: `// Feature: ai-mood-playlist-generator, Property {number}: {property_text}`
- Backend uses Node.js/Express with JavaScript
- Frontend uses React Native with TypeScript
- Database uses Firebase Firestore
- HuggingFace API model: `j-hartmann/emotion-english-distilroberta-base`
- Rate limiting: 3/day for free users, unlimited for premium users
- Cache TTL: 24 hours
- Playlist size: exactly 20 songs
- Emotion categories: sadness, joy, anger, love, fear, surprise
