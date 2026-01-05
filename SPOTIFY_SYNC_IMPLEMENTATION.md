# Spotify Sync Implementation Guide

## Architecture Overview

### Data Flow
1. **Web App**: User connects Spotify → OAuth → Tokens stored in Firestore → Liked songs synced to Firestore
2. **Mobile App**: User logs in with Firebase Auth → Reads synced songs from Firestore (no Spotify integration)

### Firestore Structure
```
users/
  {userId}/
    spotifyTokens/
      current/
        - access_token
        - refresh_token
        - expires_at
        - created_at
        - updated_at
    
    likedSongs/
      {trackId}/
        - trackId
        - title
        - artist
        - album
        - coverUrl
        - spotifyUrl
        - duration
        - addedAt
        - syncedAt
        - albumId
        - artistIds
        - popularity
        - previewUrl
    
    spotifySync/
      metadata/
        - lastSyncAt
        - totalSongs
        - syncStatus
        - addedCount
        - updatedCount
        - removedCount
        - error (if any)
```

## Implementation Status

### ✅ Already Implemented (Backend)
- Spotify OAuth flow (`/api/spotify/callback`)
- Token storage in Firestore (`spotifyTokenService.js`)
- Token refresh mechanism
- Liked songs sync (`spotifySyncService.js`)
- Manual sync endpoint (`/api/spotify/sync`)
- Real-time like/unlike operations
- Sync status tracking
- Migration from old structure

### ✅ Already Implemented (Frontend)
- Spotify OAuth initiation (`spotifyService.ts`)
- Token management
- Callback handling (`SpotifyCallback.tsx`)
- Sync service (`spotifySync.ts`)
- Context provider (`SpotifyContext.tsx`)

## Setup Instructions

### 1. Environment Variables

**Backend (.env)**
```env
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=https://your-domain.com/spotify-callback
FIREBASE_PROJECT_ID=spotify-8fefc
FRONTEND_URL=https://your-frontend-domain.com
```

**Frontend (.env)**
```env
VITE_SPOTIFY_CLIENT_ID=your_client_id
VITE_SPOTIFY_CLIENT_SECRET=your_client_secret
VITE_REDIRECT_URI=https://your-domain.com/spotify-callback
VITE_API_URL=https://your-backend-domain.com
```

### 2. Spotify App Configuration

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create/Edit your app
3. Add redirect URIs:
   - `http://localhost:5173/spotify-callback` (development)
   - `https://your-production-domain.com/spotify-callback` (production)
4. Copy Client ID and Client Secret to environment variables

### 3. Firebase Security Rules

Add to `firestore.rules`:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User data
    match /users/{userId} {
      // Allow users to read/write their own data
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Spotify tokens - only the user can access
      match /spotifyTokens/{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      // Liked songs - only the user can access
      match /likedSongs/{songId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      // Spotify sync metadata - only the user can access
      match /spotifySync/{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

## Usage Flow

### Web App - Initial Spotify Connection

1. User clicks "Connect Spotify" button
2. Frontend calls `spotifyService.getLoginUrl()`
3. User redirects to Spotify OAuth
4. User authorizes the app
5. Spotify redirects to `/spotify-callback?code=...`
6. Frontend calls backend `/api/spotify/callback` with code and userId
7. Backend exchanges code for tokens
8. Backend stores tokens in Firestore
9. Backend performs initial sync of liked songs
10. Frontend receives success response

### Web App - Subsequent Syncs

**Automatic Background Sync:**
```typescript
// In your app initialization or user dashboard
import { backgroundAutoSyncOnce } from '@/services/spotifySync';

// Check and sync if needed (every 10 minutes by default)
await backgroundAutoSyncOnce();
```

**Manual Sync:**
```typescript
import { fetchAllSpotifySavedTracks, syncSpotifyLikedSongsToMavrixfy } from '@/services/spotifySync';

const tracks = await fetchAllSpotifySavedTracks();
const result = await syncSpotifyLikedSongsToMavrixfy(tracks);
console.log(`Synced ${result.syncedCount} new songs`);
```

### Mobile App - Reading Synced Songs

```typescript
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

// Real-time listener for liked songs
const userId = auth.currentUser?.uid;
if (userId) {
  const likedSongsRef = collection(db, 'users', userId, 'likedSongs');
  const q = query(likedSongsRef, orderBy('addedAt', 'desc'));
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const songs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Update your app state with songs
    console.log(`Loaded ${songs.length} liked songs`);
  });
  
  // Clean up listener when component unmounts
  return () => unsubscribe();
}
```

## API Endpoints

### POST /api/spotify/callback
Exchange authorization code for tokens and perform initial sync.

**Request:**
```json
{
  "code": "spotify_auth_code",
  "redirect_uri": "https://your-domain.com/spotify-callback",
  "userId": "firebase_user_id"
}
```

**Response:**
```json
{
  "access_token": "...",
  "refresh_token": "...",
  "expires_in": 3600,
  "synced": true
}
```

### POST /api/spotify/sync
Manually trigger a sync of liked songs.

**Request:**
```json
{
  "userId": "firebase_user_id"
}
```

**Response:**
```json
{
  "success": true,
  "total": 150,
  "added": 5,
  "updated": 145,
  "removed": 0
}
```

### GET /api/spotify/sync-status/:userId
Get sync status for a user.

**Response:**
```json
{
  "hasSynced": true,
  "lastSyncAt": "2024-01-05T10:30:00Z",
  "syncStatus": "completed",
  "totalSongs": 150
}
```

### GET /api/spotify/liked-songs/:userId
Get all synced liked songs for a user.

**Response:**
```json
[
  {
    "id": "track_id",
    "trackId": "track_id",
    "title": "Song Title",
    "artist": "Artist Name",
    "album": "Album Name",
    "coverUrl": "https://...",
    "duration": 180,
    "addedAt": "2024-01-05T10:00:00Z"
  }
]
```

## Features

### ✅ Implemented Features

1. **OAuth Authentication**: Secure Spotify login flow
2. **Token Management**: Automatic token refresh
3. **Initial Sync**: Fetch all liked songs on first connection
4. **Incremental Sync**: Only sync new/changed songs
5. **Background Sync**: Automatic periodic syncing
6. **Real-time Updates**: Firestore listeners for instant updates
7. **Error Handling**: Comprehensive error tracking
8. **Migration Support**: Move from old to new data structure

### 🚀 Future Enhancements

1. **Playlist Sync**: Sync user playlists
2. **Recently Played**: Track listening history
3. **Multiple Services**: Support Apple Music, YouTube Music
4. **Offline Mode**: Cache songs for offline playback
5. **Sync Scheduling**: User-configurable sync intervals
6. **Conflict Resolution**: Handle manual changes vs Spotify changes

## Security Considerations

1. **Token Storage**: Tokens stored in Firestore with user-level security
2. **Client Secret**: Never exposed to frontend (only backend)
3. **HTTPS Only**: All OAuth redirects use HTTPS
4. **Token Expiry**: Automatic refresh before expiration
5. **User Isolation**: Each user can only access their own data

## Troubleshooting

### Tokens Not Storing
- Check Firebase security rules
- Verify userId is correct
- Check backend logs for errors

### Sync Not Working
- Verify Spotify tokens are valid
- Check if user has liked songs on Spotify
- Review sync metadata for error messages

### Mobile App Not Showing Songs
- Ensure user is authenticated with Firebase
- Check Firestore security rules
- Verify collection path: `users/{userId}/likedSongs`

## Testing

### Test Spotify Connection
```typescript
import { isAuthenticated, debugAuthenticationState } from '@/services/spotifyService';

// Check if user is authenticated
console.log('Is authenticated:', isAuthenticated());

// Debug full auth state
debugAuthenticationState();
```

### Test Sync
```typescript
import { fetchAllSpotifySavedTracks } from '@/services/spotifySync';

const tracks = await fetchAllSpotifySavedTracks();
console.log(`Fetched ${tracks.length} tracks from Spotify`);
```

### Test Firestore Read
```typescript
import { getSyncedLikedSongs } from '@/services/syncedLikedSongsService';

const songs = await getSyncedLikedSongs();
console.log(`Loaded ${songs.length} songs from Firestore`);
```

## Performance Optimization

1. **Pagination**: Spotify API uses 50 items per page
2. **Batch Writes**: Firestore batch operations for efficiency
3. **Incremental Updates**: Only sync changed songs
4. **Caching**: Store last sync timestamp to avoid unnecessary syncs
5. **Real-time Listeners**: Use Firestore snapshots for instant updates

## Deployment Checklist

- [ ] Set production environment variables
- [ ] Configure Spotify app redirect URIs
- [ ] Deploy Firebase security rules
- [ ] Test OAuth flow in production
- [ ] Verify token refresh works
- [ ] Test sync on production data
- [ ] Monitor error logs
- [ ] Set up sync monitoring/alerts
