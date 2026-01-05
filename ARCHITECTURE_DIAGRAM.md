# Mavrixfy Spotify Sync - Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           MAVRIXFY ECOSYSTEM                            │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐         ┌──────────────────────┐
│                      │         │                      │
│     WEB APP          │         │    MOBILE APP        │
│   (React/Vite)       │         │   (React/Capacitor)  │
│                      │         │                      │
└──────────────────────┘         └──────────────────────┘
         │                                  │
         │                                  │
         ▼                                  ▼
┌──────────────────────┐         ┌──────────────────────┐
│  Spotify OAuth       │         │  Firebase Auth       │
│  + Sync Manager      │         │  + Read Songs        │
└──────────────────────┘         └──────────────────────┘
         │                                  │
         │                                  │
         ▼                                  ▼
┌─────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js/Express)            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Spotify    │  │    Token     │  │    Sync      │ │
│  │   Service    │  │   Service    │  │   Service    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
         │                    │                    │
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────┐
│                  FIRESTORE DATABASE                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │  users/{userId}/                                 │  │
│  │    ├── spotifyTokens/current                     │  │
│  │    ├── likedSongs/{trackId}                      │  │
│  │    └── spotifySync/metadata                      │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
         │                                          │
         │                                          │
         ▼                                          ▼
┌──────────────────────┐         ┌──────────────────────┐
│   Spotify API        │         │  Real-time Updates   │
│   (External)         │         │  (Firestore)         │
└──────────────────────┘         └──────────────────────┘
```

## Data Flow - Initial Sync

```
┌─────────────────────────────────────────────────────────────────────┐
│                        INITIAL SYNC FLOW                            │
└─────────────────────────────────────────────────────────────────────┘

1. USER ACTION
   │
   ├─▶ User clicks "Connect Spotify" on Web App
   │
   ▼

2. OAUTH FLOW
   │
   ├─▶ Redirect to Spotify OAuth
   ├─▶ User authorizes app
   ├─▶ Spotify redirects back with code
   │
   ▼

3. TOKEN EXCHANGE
   │
   ├─▶ Frontend sends code to Backend
   ├─▶ Backend exchanges code for tokens
   ├─▶ Backend stores tokens in Firestore
   │       └─▶ users/{userId}/spotifyTokens/current
   │
   ▼

4. FETCH SONGS
   │
   ├─▶ Backend calls Spotify API
   ├─▶ Fetch all liked songs (paginated)
   ├─▶ Map to Mavrixfy format
   │
   ▼

5. STORE IN FIRESTORE
   │
   ├─▶ Batch write to Firestore
   │       └─▶ users/{userId}/likedSongs/{trackId}
   ├─▶ Update sync metadata
   │       └─▶ users/{userId}/spotifySync/metadata
   │
   ▼

6. REAL-TIME UPDATE
   │
   ├─▶ Firestore triggers snapshot listeners
   ├─▶ Mobile app receives updates instantly
   ├─▶ UI updates automatically
   │
   ▼

7. COMPLETE
   └─▶ User sees synced songs on all devices
```

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      WEB APP COMPONENTS                             │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  SpotifySyncManager.tsx                                          │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  • Connect/Disconnect Spotify                              │  │
│  │  • Display sync status                                     │  │
│  │  • Manual sync trigger                                     │  │
│  │  • Show last sync time                                     │  │
│  │  • Error handling                                          │  │
│  └────────────────────────────────────────────────────────────┘  │
│                           │                                       │
│                           ▼                                       │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  spotifyService.ts                                         │  │
│  │  • OAuth URL generation                                    │  │
│  │  • Token management                                        │  │
│  │  • Spotify API calls                                       │  │
│  └────────────────────────────────────────────────────────────┘  │
│                           │                                       │
│                           ▼                                       │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  spotifySync.ts                                            │  │
│  │  • Fetch all liked songs                                   │  │
│  │  • Sync to Firestore                                       │  │
│  │  • Background auto-sync                                    │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                     MOBILE APP COMPONENTS                           │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  MobileSyncedSongs.tsx                                           │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  • Display synced songs                                    │  │
│  │  • Real-time updates                                       │  │
│  │  • Search functionality                                    │  │
│  │  • Sync status badge                                       │  │
│  │  • Song click handlers                                     │  │
│  └────────────────────────────────────────────────────────────┘  │
│                           │                                       │
│                           ▼                                       │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  mobileLikedSongsService.ts                                │  │
│  │  • Read from Firestore                                     │  │
│  │  • Real-time listeners                                     │  │
│  │  • Search songs locally                                    │  │
│  │  • React hooks (useMobileLikedSongs)                       │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

## Backend Services

```
┌─────────────────────────────────────────────────────────────────────┐
│                       BACKEND SERVICES                              │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  spotify.route.js                                                │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  POST /api/spotify/callback                                │  │
│  │  POST /api/spotify/sync                                    │  │
│  │  GET  /api/spotify/sync-status/:userId                     │  │
│  │  GET  /api/spotify/liked-songs/:userId                     │  │
│  │  POST /api/spotify/like-unlike                             │  │
│  │  DELETE /api/spotify/liked-songs/:userId                   │  │
│  │  POST /api/spotify/migrate/:userId                         │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│  spotify.service.js                                              │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  • getAuthorizationUrl()                                   │  │
│  │  • getAccessToken()                                        │  │
│  │  • refreshAccessToken()                                    │  │
│  │  • getUserProfile()                                        │  │
│  │  • getUserPlaylists()                                      │  │
│  │  • formatSongData()                                        │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│  spotifyTokenService.js                                          │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  • storeSpotifyTokens()                                    │  │
│  │  • getSpotifyTokens()                                      │  │
│  │  • refreshSpotifyTokens()                                  │  │
│  │  • removeSpotifyTokens()                                   │  │
│  │  • hasValidSpotifyTokens()                                 │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│  spotifySyncService.js                                           │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  • fetchSpotifyLikedSongs()                                │  │
│  │  • syncSpotifyLikedSongs()                                 │  │
│  │  • handleSpotifyLikeUnlike()                               │  │
│  │  • getSyncedLikedSongs()                                   │  │
│  │  • getSyncStatus()                                         │  │
│  │  • migrateLikedSongsStructure()                            │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

## Firestore Data Model

```
┌─────────────────────────────────────────────────────────────────────┐
│                      FIRESTORE STRUCTURE                            │
└─────────────────────────────────────────────────────────────────────┘

users/
  {userId}/                          ← Firebase User ID
    │
    ├── spotifyTokens/
    │     └── current/
    │           ├── access_token: string
    │           ├── refresh_token: string
    │           ├── expires_at: timestamp
    │           ├── created_at: timestamp
    │           └── updated_at: timestamp
    │
    ├── likedSongs/
    │     ├── {trackId1}/
    │     │     ├── trackId: string
    │     │     ├── title: string
    │     │     ├── artist: string
    │     │     ├── album: string
    │     │     ├── coverUrl: string
    │     │     ├── spotifyUrl: string
    │     │     ├── duration: number
    │     │     ├── addedAt: timestamp
    │     │     ├── syncedAt: timestamp
    │     │     ├── albumId: string (optional)
    │     │     ├── artistIds: array (optional)
    │     │     ├── popularity: number (optional)
    │     │     └── previewUrl: string (optional)
    │     │
    │     ├── {trackId2}/
    │     └── {trackId3}/
    │
    └── spotifySync/
          └── metadata/
                ├── lastSyncAt: timestamp
                ├── totalSongs: number
                ├── syncStatus: string
                ├── addedCount: number
                ├── updatedCount: number
                ├── removedCount: number
                └── error: string (optional)
```

## Security Model

```
┌─────────────────────────────────────────────────────────────────────┐
│                       SECURITY LAYERS                               │
└─────────────────────────────────────────────────────────────────────┘

1. AUTHENTICATION
   ├─▶ Web: Firebase Auth + Spotify OAuth
   └─▶ Mobile: Firebase Auth only

2. AUTHORIZATION
   ├─▶ Firestore Rules: User can only access own data
   └─▶ Backend: Verify user ID matches authenticated user

3. TOKEN SECURITY
   ├─▶ Client Secret: Never exposed to frontend
   ├─▶ Access Token: Stored in Firestore (user-level)
   ├─▶ Refresh Token: Stored in Firestore (user-level)
   └─▶ Auto-refresh: Before expiration

4. DATA ISOLATION
   ├─▶ Each user has own subcollection
   ├─▶ No cross-user data access
   └─▶ Firestore rules enforce isolation

5. TRANSPORT SECURITY
   ├─▶ HTTPS only for OAuth
   ├─▶ HTTPS only for API calls
   └─▶ Secure WebSocket for real-time updates
```

## Performance Optimization

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PERFORMANCE STRATEGIES                           │
└─────────────────────────────────────────────────────────────────────┘

1. SPOTIFY API
   ├─▶ Pagination: 50 songs per request
   ├─▶ Parallel requests: Fetch multiple pages
   └─▶ Rate limiting: Respect API limits

2. FIRESTORE
   ├─▶ Batch writes: Up to 500 operations
   ├─▶ Incremental sync: Only new/changed songs
   ├─▶ Indexed queries: Fast lookups
   └─▶ Offline persistence: Instant mobile load

3. FRONTEND
   ├─▶ Real-time listeners: Instant updates
   ├─▶ Lazy loading: Images on demand
   ├─▶ Debounced search: 300ms delay
   ├─▶ Virtual scrolling: Large lists
   └─▶ Memoization: Prevent re-renders

4. CACHING
   ├─▶ Firestore cache: Offline support
   ├─▶ Last sync timestamp: Avoid unnecessary syncs
   └─▶ Token cache: Reduce auth calls
```

## Error Handling

```
┌─────────────────────────────────────────────────────────────────────┐
│                      ERROR HANDLING FLOW                            │
└─────────────────────────────────────────────────────────────────────┘

1. SPOTIFY API ERRORS
   ├─▶ 401 Unauthorized → Refresh token
   ├─▶ 403 Forbidden → Clear tokens, re-authenticate
   ├─▶ 429 Rate Limited → Retry with backoff
   └─▶ 5xx Server Error → Retry with exponential backoff

2. FIRESTORE ERRORS
   ├─▶ Permission Denied → Check auth state
   ├─▶ Network Error → Use cached data
   └─▶ Quota Exceeded → Notify user

3. TOKEN ERRORS
   ├─▶ Expired → Auto-refresh
   ├─▶ Invalid → Clear and re-authenticate
   └─▶ Missing → Prompt user to connect

4. SYNC ERRORS
   ├─▶ Partial Failure → Continue with successful items
   ├─▶ Complete Failure → Log error, update metadata
   └─▶ Network Timeout → Retry later
```

## Monitoring & Logging

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MONITORING POINTS                                │
└─────────────────────────────────────────────────────────────────────┘

1. SYNC METRICS
   ├─▶ Total songs synced
   ├─▶ Sync duration
   ├─▶ Success/failure rate
   └─▶ Last sync timestamp

2. API METRICS
   ├─▶ Spotify API calls
   ├─▶ Response times
   ├─▶ Error rates
   └─▶ Rate limit status

3. USER METRICS
   ├─▶ Active connections
   ├─▶ Sync frequency
   ├─▶ Song counts
   └─▶ Error occurrences

4. PERFORMANCE METRICS
   ├─▶ Firestore read/write counts
   ├─▶ Token refresh frequency
   ├─▶ Cache hit rates
   └─▶ Mobile load times
```

---

This architecture provides a scalable, secure, and performant solution for syncing Spotify data across web and mobile platforms.
