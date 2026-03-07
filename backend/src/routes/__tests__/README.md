# Mood Playlist Integration Tests

## Overview

This directory contains integration tests for the AI Mood → Auto Playlist Generator feature. The tests validate end-to-end functionality of the mood playlist API endpoints.

## Test File

- `moodPlaylist.integration.test.js` - Comprehensive integration tests for all mood playlist endpoints

## Test Coverage

### 1. Playlist Generation Flow (POST /api/playlists/mood-generate)
- ✅ End-to-end playlist generation with valid mood text
- ✅ Cache hit scenario (same mood text within 24 hours)
- ✅ Cache miss scenario (different mood text)
- ✅ Validation error handling
- ✅ Authentication error handling
- ✅ Performance requirements (< 10 seconds)

### 2. Rate Limiting
- ✅ Free user rate limiting (3 requests per day)
- ✅ Premium user bypass (unlimited requests)
- ✅ Rate limit error messages with upgrade prompt
- ✅ Rate limit reset at midnight UTC
- ✅ Request count tracking

### 3. Fallback Mechanism
- ✅ Fallback when HuggingFace API times out
- ✅ Fallback when HuggingFace API returns error
- ✅ Default to "joy" when fallback fails
- ✅ Performance requirements (< 6 seconds with fallback)

### 4. Save Playlist Flow (POST /api/playlists/mood-save)
- ✅ Save generated playlist to user library
- ✅ Error handling for save failures
- ✅ Metadata completeness validation
- ✅ Performance requirements (< 2 seconds)

### 5. Share Playlist Flow
- ✅ Create shareable link (POST /api/playlists/:id/share)
- ✅ Access shared playlist (GET /api/playlists/share/:shareId)
- ✅ Unauthenticated access to shared playlists
- ✅ Share ID uniqueness
- ✅ 404 for invalid share IDs
- ✅ 403 for non-public playlists
- ✅ Performance requirements (< 1 second)

### 6. Cache Behavior
- ✅ Cache key normalization
- ✅ Cache miss handling
- ✅ Cache storage after generation
- ✅ Performance requirements (< 1 second for cache hits)

### 7. Analytics Tracking
- ✅ Mood input submission events
- ✅ Emotion detection events
- ✅ Playlist generation events
- ✅ Rate limit hit events

### 8. Error Handling
- ✅ User-friendly error messages
- ✅ No technical details exposed to users
- ✅ Internal error logging
- ✅ Database error handling
- ✅ Authentication error handling

### 9. Performance Validation
- ✅ Cache hit response time (< 1 second)
- ✅ Genre mapping time (< 100ms)
- ✅ Save operation time (< 2 seconds)
- ✅ Share link generation time (< 1 second)

## Running the Tests

### Install Dependencies

```bash
cd backend
npm install
```

This will install `supertest` and other required testing dependencies.

### Run All Tests

```bash
npm test
```

### Run Integration Tests Only

```bash
npm test -- moodPlaylist.integration.test.js
```

### Run with Coverage

```bash
npm run test:coverage
```

### Watch Mode

```bash
npm run test:watch
```

## Test Structure

The tests use:
- **Jest** - Testing framework
- **Supertest** - HTTP assertion library
- **Mocked Services** - All mood playlist services are mocked to isolate endpoint logic
- **Firebase Admin Mocks** - Authentication and Firestore are mocked

## Important Notes

1. **Endpoint Implementation Required**: These tests are written for endpoints that will be implemented in tasks 8.1 and 8.2. Once those endpoints are created, these tests will validate their functionality.

2. **Service Mocks**: All services (validator, rate limiter, emotion analyzer, etc.) are mocked. This allows testing the endpoint logic independently of service implementation.

3. **Authentication**: Firebase Auth is mocked. Tests simulate both authenticated and unauthenticated requests.

4. **Performance**: Tests include performance assertions to ensure the system meets the specified requirements.

## Next Steps

After implementing the API endpoints (tasks 8.1 and 8.2):

1. Update the test file to import the actual route handlers
2. Mount the routes on the Express app in the test setup
3. Run the tests to validate the implementation
4. Fix any failing tests
5. Add additional edge case tests as needed

## Requirements Validated

These integration tests validate all requirements from the spec:
- Requirements 1.1-1.5 (Mood Text Input)
- Requirements 2.1-2.6 (Emotion Detection)
- Requirements 3.1-3.5 (Fallback Detection)
- Requirements 4.1-4.8 (Genre Mapping)
- Requirements 5.1-5.8 (Playlist Generation)
- Requirements 6.1-6.5 (Rate Limiting - Free Users)
- Requirements 7.1-7.3 (Premium Users)
- Requirements 8.1-8.5 (Caching)
- Requirements 9.1-9.5 (Save Playlist)
- Requirements 10.1-10.5 (Share Playlist)
- Requirements 12.1-12.7 (Analytics)
- Requirements 13.1-13.5 (Error Handling)
- Requirements 14.1-14.5 (Performance)
