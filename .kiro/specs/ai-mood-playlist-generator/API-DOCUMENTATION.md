# AI Mood Playlist Generator - API Documentation

## Overview

The AI Mood Playlist Generator API allows users to generate personalized playlists based on natural language mood descriptions. The system uses emotion detection AI to analyze mood text and creates curated 20-song playlists matching the detected emotion.

**Base URL**: `/api/playlists`

**Authentication**: All endpoints require Firebase Authentication token in the `Authorization` header.

---

## Endpoints

### 1. Generate Mood Playlist

Generate a personalized playlist based on mood description.

**Endpoint**: `POST /api/playlists/mood-generate`

**Authentication**: Required

**Rate Limiting**:
- Free users: 3 requests per day (resets at midnight UTC)
- Premium users: Unlimited

**Request Headers**:
```
Authorization: Bearer <firebase-auth-token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "moodText": "string (3-200 characters)"
}
```

**Request Example**:
```json
{
  "moodText": "feeling happy and energetic today"
}
```

**Success Response (200 OK)**:
```json
{
  "playlist": {
    "_id": "playlist_abc123",
    "name": "Joy vibes",
    "emotion": "joy",
    "songs": [
      "song_id_1",
      "song_id_2",
      ...
    ],
    "songCount": 20,
    "generatedAt": "2026-03-03T10:30:00.000Z",
    "cached": false
  },
  "rateLimitInfo": {
    "remaining": 2,
    "resetAt": "2026-03-04T00:00:00.000Z"
  }
}
```

**Error Responses**:

**400 Bad Request** - Invalid input:
```json
{
  "error": "Validation failed",
  "message": "Mood text must be between 3 and 200 characters"
}
```

**401 Unauthorized** - Missing or invalid auth token:
```json
{
  "error": "Unauthorized",
  "message": "Please log in to generate mood playlists"
}
```

**429 Too Many Requests** - Rate limit exceeded:
```json
{
  "error": "Rate limit exceeded",
  "message": "Free users can generate 3 playlists per day. Upgrade to premium for unlimited generations.",
  "upgradeUrl": "/premium",
  "resetAt": "2026-03-04T00:00:00.000Z"
}
```

**500 Internal Server Error** - Server error:
```json
{
  "error": "Internal server error",
  "message": "Something went wrong. Please try again."
}
```

**504 Gateway Timeout** - Request timeout:
```json
{
  "error": "Request timeout",
  "message": "Request timed out. Please try again."
}
```

---

### 2. Save Playlist

Save a generated playlist to user's library.

**Endpoint**: `POST /api/playlists/mood-save`

**Authentication**: Required

**Request Headers**:
```
Authorization: Bearer <firebase-auth-token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "playlistId": "string",
  "name": "string (optional)"
}
```

**Request Example**:
```json
{
  "playlistId": "playlist_abc123",
  "name": "My Happy Playlist"
}
```

**Success Response (200 OK)**:
```json
{
  "success": true,
  "playlistId": "saved_playlist_xyz789",
  "message": "Playlist saved successfully"
}
```

**Error Responses**:

**400 Bad Request** - Invalid input:
```json
{
  "error": "Validation failed",
  "message": "Playlist ID is required"
}
```

**401 Unauthorized** - Missing or invalid auth token:
```json
{
  "error": "Unauthorized",
  "message": "Please log in to save playlists"
}
```

**404 Not Found** - Playlist not found:
```json
{
  "error": "Not found",
  "message": "Playlist not found"
}
```

**500 Internal Server Error** - Server error:
```json
{
  "error": "Internal server error",
  "message": "Failed to save playlist. Please try again."
}
```

---

### 3. Share Playlist

Generate a shareable link for a playlist.

**Endpoint**: `POST /api/playlists/:id/share`

**Authentication**: Required

**Request Headers**:
```
Authorization: Bearer <firebase-auth-token>
```

**URL Parameters**:
- `id` (string): Playlist ID

**Request Example**:
```
POST /api/playlists/playlist_abc123/share
```

**Success Response (200 OK)**:
```json
{
  "shareUrl": "https://mavrixfy.site/playlist/share/uuid-share-id-123",
  "shareId": "uuid-share-id-123"
}
```

**Error Responses**:

**401 Unauthorized** - Missing or invalid auth token:
```json
{
  "error": "Unauthorized",
  "message": "Please log in to share playlists"
}
```

**404 Not Found** - Playlist not found:
```json
{
  "error": "Not found",
  "message": "Playlist not found"
}
```

**500 Internal Server Error** - Server error:
```json
{
  "error": "Internal server error",
  "message": "Failed to generate share link. Please try again."
}
```

---

### 4. Access Shared Playlist

Access a playlist via share link (no authentication required).

**Endpoint**: `GET /api/playlists/share/:shareId`

**Authentication**: Not required (public endpoint)

**URL Parameters**:
- `shareId` (string): Share ID from share URL

**Request Example**:
```
GET /api/playlists/share/uuid-share-id-123
```

**Success Response (200 OK)**:
```json
{
  "playlist": {
    "_id": "playlist_abc123",
    "name": "Joy vibes",
    "emotion": "joy",
    "songs": [
      {
        "_id": "song_id_1",
        "title": "Happy Song",
        "artist": "Artist Name",
        "album": "Album Name",
        "imageUrl": "https://...",
        "duration": 180
      },
      ...
    ],
    "songCount": 20,
    "generatedAt": "2026-03-03T10:30:00.000Z",
    "sharedBy": {
      "fullName": "User Name",
      "imageUrl": "https://..."
    }
  }
}
```

**Error Responses**:

**404 Not Found** - Share link not found:
```json
{
  "error": "Not found",
  "message": "Shared playlist not found"
}
```

**500 Internal Server Error** - Server error:
```json
{
  "error": "Internal server error",
  "message": "Failed to load shared playlist. Please try again."
}
```

---

## Data Models

### Playlist Object

```typescript
interface Playlist {
  _id: string;                    // Unique playlist identifier
  name: string;                   // Playlist name (e.g., "Joy vibes")
  emotion: EmotionLabel;          // Detected emotion
  songs: string[];                // Array of song IDs
  songCount: number;              // Number of songs (always 20)
  generatedAt: string;            // ISO 8601 timestamp
  cached: boolean;                // Whether result was from cache
  moodGenerated?: boolean;        // True for mood-generated playlists
  moodText?: string;              // Original mood text
}
```

### Emotion Labels

```typescript
type EmotionLabel = 
  | "sadness"
  | "joy"
  | "anger"
  | "love"
  | "fear"
  | "surprise";
```

### Rate Limit Info

```typescript
interface RateLimitInfo {
  remaining: number;              // Remaining requests for today
  resetAt: string;                // ISO 8601 timestamp of reset time
}
```

---

## Emotion to Genre Mapping

The system maps detected emotions to music genres as follows:

| Emotion | Genres |
|---------|--------|
| sadness | lofi, sad hindi, acoustic |
| joy | dance, pop, bollywood |
| anger | rap, rock |
| love | romantic, soft |
| fear | instrumental |
| surprise | indie |

---

## Caching Behavior

- **Cache Duration**: 24 hours
- **Cache Key**: Normalized mood text (lowercase, trimmed, collapsed whitespace)
- **Cache Hit**: Returns cached playlist within ~500ms
- **Cache Miss**: Generates new playlist (2-10 seconds)

**Example**:
- "Feeling Happy" and "feeling happy" → Same cache entry
- "feeling  happy" (extra spaces) → Same cache entry
- "feeling happy!" → Different cache entry (punctuation)

---

## Error Handling

### User-Friendly Error Messages

All error responses contain user-friendly messages without technical details:

- ✅ "Mood text must be between 3 and 200 characters"
- ✅ "Free users can generate 3 playlists per day"
- ✅ "Something went wrong. Please try again."
- ❌ "TypeError: Cannot read property 'emotion' of undefined"
- ❌ "Firebase error: permission-denied"

### Error Logging

All errors are logged internally with full technical details for debugging, but these details are never exposed to users.

---

## Performance Characteristics

| Operation | Target | Typical |
|-----------|--------|---------|
| Cache hit response | < 1s | 200-500ms |
| Cache miss response | < 10s | 2-6s |
| Save operation | < 2s | 200-600ms |
| Share link generation | < 1s | 150-400ms |

---

## Rate Limiting Details

### Free Users
- **Limit**: 3 playlist generations per day
- **Reset**: Midnight UTC
- **Enforcement**: Per user ID (Firebase UID)
- **Response**: 429 status code with upgrade prompt

### Premium Users
- **Limit**: Unlimited
- **Verification**: Checks user's premium status in Firebase

### Rate Limit Headers

Response includes rate limit information:
```json
{
  "rateLimitInfo": {
    "remaining": 2,
    "resetAt": "2026-03-04T00:00:00.000Z"
  }
}
```

---

## Analytics Events

The following events are tracked automatically (fire-and-forget, non-blocking):

1. **mood_input_submitted** - When user submits mood text
2. **emotion_detected** - When emotion is detected (AI or fallback)
3. **playlist_generated** - When playlist is generated
4. **playlist_played** - When user plays a generated playlist
5. **playlist_saved** - When user saves a playlist
6. **rate_limit_hit** - When free user hits rate limit
7. **premium_conversion** - When user upgrades after rate limit

---

## Best Practices

### Client Implementation

1. **Input Validation**
   - Validate mood text length (3-200 chars) before sending
   - Show character counter to user
   - Disable submit button for invalid input

2. **Loading States**
   - Show loading animation during generation
   - Display "Analyzing your vibe…" message
   - Expect 2-10 second response time

3. **Error Handling**
   - Display user-friendly error messages
   - Show upgrade prompt for rate limit errors
   - Provide retry option for server errors

4. **Rate Limiting**
   - Display remaining generations to free users
   - Show countdown to reset time
   - Highlight premium benefits when limit reached

5. **Caching**
   - Inform users that similar moods may return cached results
   - Don't retry immediately if result seems cached

### Example Client Code (React Native)

```typescript
const generateMoodPlaylist = async (moodText: string) => {
  try {
    setLoading(true);
    setError(null);
    
    const response = await fetch('/api/playlists/mood-generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ moodText })
    });
    
    if (!response.ok) {
      const error = await response.json();
      
      if (response.status === 429) {
        // Show upgrade prompt
        setError(error.message);
        setShowUpgradeModal(true);
      } else {
        setError(error.message);
      }
      return;
    }
    
    const data = await response.json();
    setPlaylist(data.playlist);
    setRateLimitInfo(data.rateLimitInfo);
    
  } catch (error) {
    setError('Something went wrong. Please try again.');
  } finally {
    setLoading(false);
  }
};
```

---

## Security Considerations

1. **Authentication**: All endpoints (except share access) require valid Firebase auth token
2. **Input Sanitization**: All mood text is sanitized to prevent SQL injection
3. **Rate Limiting**: Prevents abuse and API cost overruns
4. **Share Links**: Use UUIDs to prevent enumeration attacks
5. **Error Messages**: Never expose technical details or stack traces

---

## Support

For API issues or questions:
- Email: support@mavrixfy.site
- Documentation: https://mavrixfy.site/docs/mood-playlist-api
- Status Page: https://status.mavrixfy.site
