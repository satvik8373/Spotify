# Error Handling Documentation
## AI Mood Playlist Generator

This document describes the comprehensive error handling implemented across all mood playlist services.

## Requirements Addressed

- **Requirement 13.1**: Add error logging for all failures
- **Requirement 13.2**: Return error message for database query failures
- **Requirement 13.3**: Display user-friendly error messages for all failures
- **Requirement 13.4**: Return "joy" as default emotion when fallback fails
- **Requirement 13.5**: Never display technical error details to users

## Error Handling Strategy

### 1. Internal Logging (Requirement 13.1)

All services log errors internally with detailed information for debugging:

```javascript
console.error('[ServiceName] Error description:', {
  error: error.message,
  stack: error.stack,
  context: 'relevant context',
  timestamp: new Date().toISOString()
});
```

**What is logged:**
- Error message and stack trace
- Service/component name
- Relevant context (user ID, input data, etc.)
- Timestamp

**What is NOT logged:**
- User passwords or sensitive credentials
- API keys or tokens
- PII (Personally Identifiable Information) beyond user IDs

### 2. User-Friendly Error Messages (Requirements 13.3, 13.5)

All error responses to users follow these principles:

- **No technical details**: Stack traces, error codes, or internal implementation details are never exposed
- **Actionable guidance**: Messages tell users what to do next
- **Consistent format**: All errors follow the same response structure

#### Standard Error Response Format

```json
{
  "error": "Error category",
  "message": "User-friendly description"
}
```

### 3. Error Categories and Messages

#### Validation Errors (400)

**Trigger**: Invalid mood text input

**User Message**: 
```
"Please enter a mood description between 3 and 200 characters"
```

**Internal Log**: Includes actual input length and validation failure reason

---

#### Authentication Errors (401)

**Trigger**: Missing or invalid Firebase token

**User Message**:
```
"Please log in to generate mood playlists"
```

**Internal Log**: Includes token validation failure details

---

#### Rate Limit Errors (429)

**Trigger**: Free user exceeds 3 generations per day

**User Message**:
```
"You've reached your daily limit of 3 mood playlists. Upgrade to premium for unlimited generations!"
```

**Response includes**:
- `upgradeUrl`: Link to premium page
- `resetAt`: When the limit resets (midnight UTC)

**Internal Log**: Includes user ID, current count, and premium status

---

#### Not Found Errors (404)

**Trigger**: Playlist or share link not found

**User Message**:
```
"This shareable link is invalid or has expired."
"The shared playlist no longer exists."
```

**Internal Log**: Includes requested resource ID

---

#### Permission Errors (403)

**Trigger**: User tries to access/modify resource they don't own

**User Message**:
```
"You do not have permission to perform this action."
```

**Internal Log**: Includes user ID and resource ID

---

#### API/Timeout Errors (500/504)

**Trigger**: HuggingFace API failure, database errors, or timeouts

**User Message**:
```
"Something went wrong. Please try again."
```

**Fallback Behavior**:
- HuggingFace API failure → Use keyword-based fallback
- Fallback failure → Default to "joy" emotion (Requirement 13.4)
- Database error → Return error message (Requirement 13.2)

**Internal Log**: Includes full error details, API response codes, and timing information

---

### 4. Fallback Chain (Requirement 13.4)

The system implements a multi-level fallback strategy:

```
1. HuggingFace API
   ↓ (on failure/timeout)
2. Keyword-based detection
   ↓ (on failure)
3. Default emotion: "joy"
   ↓ (if no songs found)
4. Trending playlist
```

**Example Implementation** (emotionAnalyzer.js):

```javascript
try {
  // Try HuggingFace API
  const response = await huggingfaceClient.post('', { inputs: moodText });
  return extractEmotion(response);
} catch (error) {
  console.error('[EmotionAnalyzer] API error, using fallback');
  
  try {
    // Try keyword-based fallback
    return detectEmotionByKeywords(moodText);
  } catch (fallbackError) {
    console.error('[EmotionAnalyzer] Fallback failed, using default');
    
    // Return default emotion
    return {
      emotion: 'joy',
      confidence: 0.5,
      source: 'default',
      processingTime: Date.now() - startTime
    };
  }
}
```

---

### 5. Service-Specific Error Handling

#### Validator Service

**Error Handling**:
- Catches all validation errors
- Returns consistent error message for all validation failures
- Never exposes validation logic details

**Example**:
```javascript
try {
  // Validation logic
} catch (error) {
  console.error('[Validator] Unexpected error:', error);
  return {
    isValid: false,
    sanitized: '',
    error: 'Please enter a mood description between 3 and 200 characters'
  };
}
```

---

#### Rate Limiter Service

**Error Handling**:
- Fails open on database errors (allows request to proceed)
- Logs all errors for monitoring
- Never blocks users due to internal errors

**Example**:
```javascript
try {
  // Rate limit check
} catch (error) {
  console.error('[RateLimiter] Error checking rate limit:', error);
  // Fail open - allow request
  return {
    allowed: true,
    remaining: FREE_USER_DAILY_LIMIT,
    resetAt: getNextMidnightUTC(new Date())
  };
}
```

---

#### Emotion Analyzer Service

**Error Handling**:
- Implements full fallback chain
- Handles API timeouts (5 seconds)
- Always returns a valid emotion

**Fallback Triggers**:
- API timeout (ECONNABORTED)
- API error (4xx, 5xx responses)
- Invalid response format
- Network errors

---

#### Genre Mapper Service

**Error Handling**:
- Returns default genres for invalid emotions
- Never throws errors
- Logs all unexpected inputs

**Example**:
```javascript
try {
  // Genre mapping logic
} catch (error) {
  console.error('[GenreMapper] Unexpected error:', error);
  // Return default genres for 'joy'
  return ['dance', 'pop', 'bollywood'];
}
```

---

#### Playlist Generator Service

**Error Handling**:
- Handles database query failures
- Falls back to trending playlist when no songs found
- Expands genres when insufficient songs available

**Example**:
```javascript
try {
  // Generate playlist
} catch (error) {
  console.error('[PlaylistGenerator] Error generating playlist:', error);
  throw new Error('Something went wrong. Please try again.');
}
```

---

#### Cache Manager Service

**Error Handling**:
- Cache failures don't block playlist generation
- Expired cache entries are deleted asynchronously
- Returns null on cache errors (triggers fresh generation)

**Example**:
```javascript
try {
  // Cache operations
} catch (error) {
  console.error('[CacheManager] Error:', error);
  return null; // Allow fallback to generation
}
```

---

#### Save Handler Service

**Error Handling**:
- Validates all required fields
- Returns descriptive error messages
- Handles permission errors gracefully

**Error Messages**:
- Missing data: "Something went wrong. Please try again."
- Permission denied: "Something went wrong. Please try again."
- Database error: "Something went wrong. Please try again."

---

#### Share Handler Service

**Error Handling**:
- Validates share IDs
- Handles non-existent playlists
- Allows unauthenticated access to public shares

**Error Messages**:
- Invalid share ID: "This shareable link is invalid or has expired."
- Playlist not found: "The shared playlist no longer exists."
- Not public: "This playlist is no longer shared publicly."

---

#### Analytics Service

**Error Handling**:
- Fire-and-forget logging (never blocks responses)
- All errors are caught and logged
- Failed analytics don't affect user experience

**Example**:
```javascript
const logEvent = async (eventData) => {
  try {
    db.collection(ANALYTICS_COLLECTION).add(event).catch((error) => {
      console.error('Analytics logging error:', error);
    });
  } catch (error) {
    console.error('Analytics event preparation error:', error);
  }
};
```

---

### 6. API Route Error Handling

The main API route (`moodPlaylist.route.js`) implements comprehensive error handling:

**Features**:
- Try-catch blocks around all async operations
- Consistent error response format
- Appropriate HTTP status codes
- Internal logging for all errors

**Example**:
```javascript
router.post('/mood-generate', protectRoute, async (req, res) => {
  try {
    // Request handling logic
  } catch (error) {
    console.error('[MoodPlaylistAPI] Error:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.uid,
      timestamp: new Date().toISOString()
    });
    
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Something went wrong. Please try again.'
    });
  }
});
```

---

### 7. HuggingFace Client Error Handling

**Request Interceptor**:
- Logs all outgoing requests
- Never logs API keys
- Includes timestamp and request metadata

**Response Interceptor**:
- Logs successful responses
- Logs error responses with status codes
- Never logs sensitive response data

**Example**:
```javascript
client.interceptors.response.use(
  (response) => {
    console.log('[HuggingFace] Response:', {
      status: response.status,
      dataLength: JSON.stringify(response.data).length,
      timestamp: new Date().toISOString()
    });
    return response;
  },
  (error) => {
    console.error('[HuggingFace] Response error:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      timestamp: new Date().toISOString()
    });
    return Promise.reject(error);
  }
);
```

---

## Testing Error Handling

### Unit Tests

Each service has property-based tests that validate error handling:

- **Property 23**: Error Logging - Verifies all errors are logged internally
- **Property 24**: Database Error Response - Verifies user-friendly messages for DB errors
- **Property 25**: User-Friendly Error Messages - Verifies no technical details exposed

### Integration Tests

The integration test suite (`moodPlaylist.integration.test.js`) includes:

- Validation error scenarios
- Rate limit error scenarios
- API failure scenarios
- Database error scenarios
- Authentication error scenarios

---

## Monitoring and Alerting

### Metrics to Track

1. **Error Rate**: Percentage of requests that result in errors
2. **API Failure Rate**: HuggingFace API failures
3. **Fallback Usage Rate**: How often fallback detection is used
4. **Cache Error Rate**: Cache operation failures
5. **Database Error Rate**: Firestore operation failures

### Alert Thresholds

- API failure rate > 10%
- Error rate > 5%
- Fallback usage > 30%
- Cache error rate > 10%

---

## Best Practices

### DO:
✓ Log all errors internally with full context
✓ Return user-friendly error messages
✓ Use appropriate HTTP status codes
✓ Implement fallback mechanisms
✓ Fail gracefully (don't crash the app)
✓ Include timestamps in all logs
✓ Use consistent error response format

### DON'T:
✗ Expose stack traces to users
✗ Include technical error codes in user messages
✗ Log sensitive information (passwords, API keys)
✗ Block requests due to non-critical errors (e.g., analytics)
✗ Throw errors without catching them
✗ Return different error formats for different endpoints

---

## Summary

The AI Mood Playlist Generator implements comprehensive error handling that:

1. **Logs all errors internally** for debugging and monitoring
2. **Returns user-friendly messages** without technical details
3. **Implements fallback mechanisms** to ensure service availability
4. **Handles all error types** consistently across all services
5. **Never blocks users** due to non-critical failures
6. **Provides actionable guidance** in error messages

This approach ensures a robust, user-friendly experience while maintaining detailed internal logs for debugging and monitoring.
