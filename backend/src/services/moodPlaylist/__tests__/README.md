# Mood Playlist Property-Based Tests

This directory contains property-based tests for the AI Mood Playlist Generator feature using the `fast-check` library.

## Running Tests

### Install Dependencies

First, install the testing dependencies:

```bash
cd backend
npm install
```

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run Specific Test File

```bash
npm test -- validator.property.test.js
```

## Test Structure

### Property 1: Input Length Validation

Tests that the validator correctly accepts strings between 3-200 characters and rejects strings outside this range.

- ✓ Accepts valid length strings (3-200 chars)
- ✓ Rejects strings shorter than 3 characters
- ✓ Rejects strings longer than 200 characters
- ✓ Handles whitespace-only strings as invalid
- ✓ Validates based on trimmed length

**Validates Requirements:** 1.1, 1.2, 1.3

### Property 2: Input Sanitization

Tests that the sanitizer removes SQL injection patterns and dangerous characters from any input.

- ✓ Removes SQL injection keywords (SELECT, INSERT, UPDATE, etc.)
- ✓ Removes dangerous special characters (<, >, {, }, [, ], \)
- ✓ Removes SQL comment patterns (--, /*, */)
- ✓ Normalizes text to lowercase
- ✓ Collapses multiple whitespace into single space
- ✓ Preserves safe punctuation
- ✓ Handles mixed malicious patterns
- ✓ Always returns a string

**Validates Requirements:** 1.4

### Property 11: Free User Rate Limiting

Tests that the rate limiter correctly enforces the 3 requests per day limit for free users.

- ✓ Allows requests when daily count is less than 3
- ✓ Rejects requests when daily count is 3 or more
- ✓ Correctly tracks remaining count
- ✓ Provides resetAt timestamp
- ✓ Handles concurrent requests atomically

**Validates Requirements:** 6.2, 6.3

### Property 12: Rate Limit Error Message

Tests that rate-limited requests return appropriate error messages.

- ✓ Returns error message when rate limit exceeded
- ✓ Returns "Rate limit exceeded" specific message
- ✓ Does not return error when request is allowed
- ✓ Includes error field in response structure

**Validates Requirements:** 6.4

### Property 13: Premium User Bypass

Tests that premium users can make unlimited requests without rate limiting.

- ✓ Allows all requests regardless of count
- ✓ Returns unlimited remaining (-1)
- ✓ Does not set resetAt timestamp
- ✓ Bypasses limit even after many requests
- ✓ Does not create rate limit documents
- ✓ Handles premium status change correctly

**Validates Requirements:** 7.1, 7.2

### Property 14: Cache Hit Consistency

Tests that the cache manager returns the same cached playlist when queried with the same normalized mood text.

- ✓ Returns the same cached playlist on subsequent requests
- ✓ Returns cached playlist on second request with same mood text
- ✓ Returns null for mood text that was never cached
- ✓ Maintains cache consistency across multiple cache/retrieve cycles

**Validates Requirements:** 8.2

### Property 15: Cache Key Normalization

Tests that the cache manager treats mood texts that normalize to the same value as the same cache key.

- ✓ Treats case-insensitive mood texts as the same cache key
- ✓ Treats mood texts with different whitespace as the same cache key
- ✓ Treats mood texts with collapsed whitespace as the same cache key
- ✓ Normalizes cache keys consistently for any input
- ✓ Produces the same normalized key regardless of input variations
- ✓ Handles empty or invalid inputs gracefully in normalization

**Validates Requirements:** 8.4

### Property 23: Error Logging

Tests that all errors are logged internally with proper context for debugging and monitoring.

- ✓ Logs all errors with error message and timestamp
- ✓ Includes service name in error logs for traceability
- ✓ Logs error context including input parameters
- ✓ Never logs sensitive information like API keys or passwords
- ✓ Provides detailed internal logs while showing simple messages to users

**Validates Requirements:** 13.1

### Property 24: Database Error Response

Tests that database query failures return user-friendly error messages.

- ✓ Returns user-friendly error message when database query fails
- ✓ Returns error message for any database operation failure
- ✓ Provides consistent error message format across database errors
- ✓ Never exposes database implementation details

**Validates Requirements:** 13.2

### Property 25: User-Friendly Error Messages

Tests that error messages shown to users are friendly, actionable, and never expose technical details.

- ✓ Never exposes stack traces in error messages
- ✓ Never exposes internal error codes or technical details
- ✓ Provides actionable guidance in error messages
- ✓ Uses consistent, professional language in all error messages
- ✓ Never exposes internal implementation details
- ✓ Maintains consistent error message length (not too verbose)

**Validates Requirements:** 13.3, 13.5

## Firebase Setup for Integration Tests

Tests that interact with Firestore (rate limiter and cache manager property tests) require Firebase credentials to be configured.

### Option 1: Environment Variables

Set the following environment variables:

```bash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
```

### Option 2: Application Default Credentials

Install and configure the Google Cloud SDK:

```bash
gcloud auth application-default login
```

### Option 3: Service Account Key File

Place your Firebase service account JSON file in the project and set:

```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

### Running Tests Without Firebase

Tests that don't require Firestore (validator, fallback detector, genre mapper, emotion analyzer) can run without Firebase credentials:

```bash
npm test -- validator.property.test.js
npm test -- fallbackDetector.property.test.js
npm test -- genreMapper.property.test.js
npm test -- emotionAnalyzer.property.test.js
```

## Property-Based Testing

Each test runs 30-100 iterations with randomly generated inputs to ensure the properties hold across a wide range of cases. This approach is more thorough than traditional example-based testing.

Rate limiter tests use reduced iteration counts (30-50) due to async Firestore operations, with extended timeouts (30s) to accommodate database latency.

## Test Tags

All tests include the feature tag comment:
```javascript
// Feature: ai-mood-playlist-generator, Property {number}: {property_text}
```

This enables traceability between tests and requirements.
