# Mavrixfy Spotify Sync - Quick Start Guide

## Overview

This guide will help you quickly set up and use the Spotify sync functionality in Mavrixfy.

## Architecture Summary

```
┌─────────────────┐         ┌──────────────┐         ┌─────────────────┐
│   Web App       │────────▶│   Firestore  │◀────────│   Mobile App    │
│                 │         │              │         │                 │
│ • Spotify OAuth │         │ • Tokens     │         │ • Firebase Auth │
│ • Sync Songs    │         │ • Songs      │         │ • Read Songs    │
│ • Manage Tokens │         │ • Metadata   │         │ • Real-time     │
└─────────────────┘         └──────────────┘         └─────────────────┘
         │                                                     │
         │                                                     │
         ▼                                                     ▼
  Spotify API                                          No Spotify API
```

## Setup (5 minutes)

### 1. Environment Variables

**Backend (.env)**
```bash
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=https://your-domain.com/spotify-callback
FIREBASE_PROJECT_ID=spotify-8fefc
```

**Frontend (.env)**
```bash
VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id
VITE_SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
VITE_REDIRECT_URI=https://your-domain.com/spotify-callback
VITE_API_URL=https://your-backend-url.com
```

### 2. Spotify App Setup

1. Go to https://developer.spotify.com/dashboard
2. Create a new app or use existing
3. Add redirect URI: `https://your-domain.com/spotify-callback`
4. Copy Client ID and Secret to your `.env` files

### 3. Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

## Web App Integration (Connect Spotify)

### Add Spotify Sync Manager to Your Dashboard

```tsx
import { SpotifySyncManager } from '@/components/SpotifySyncManager';

function UserDashboard() {
  return (
    <div>
      <h1>My Dashboard</h1>
      <SpotifySyncManager />
    </div>
  );
}
```

### Manual Sync Example

```tsx
import { 
  fetchAllSpotifySavedTracks, 
  syncSpotifyLikedSongsToMavrixfy 
} from '@/services/spotifySync';

async function syncNow() {
  const tracks = await fetchAllSpotifySavedTracks();
  const result = await syncSpotifyLikedSongsToMavrixfy(tracks);
  console.log(`Synced ${result.syncedCount} new songs`);
}
```

### Background Auto-Sync

```tsx
import { backgroundAutoSyncOnce } from '@/services/spotifySync';

// In your app initialization or dashboard
useEffect(() => {
  // Auto-sync if last sync was > 10 minutes ago
  backgroundAutoSyncOnce();
}, []);
```

## Mobile App Integration (Read Synced Songs)

### Option 1: Using React Hooks (Recommended)

```tsx
import { useMobileLikedSongs, useMobileSyncMetadata } from '@/services/mobileLikedSongsService';

function LikedSongsScreen() {
  const { songs, loading, error } = useMobileLikedSongs();
  const { metadata } = useMobileSyncMetadata();

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      <h2>{metadata.totalSongs} Liked Songs</h2>
      <p>Last synced: {metadata.lastSyncAt?.toLocaleString()}</p>
      
      {songs.map(song => (
        <SongItem key={song.id} song={song} />
      ))}
    </div>
  );
}
```

### Option 2: Using Pre-built Component

```tsx
import { MobileSyncedSongs } from '@/components/MobileSyncedSongs';

function LikedSongsScreen() {
  const handleSongClick = (song) => {
    console.log('Playing:', song.title);
    // Play the song
  };

  return (
    <MobileSyncedSongs
      onSongClick={handleSongClick}
      showSearch={true}
      showSyncStatus={true}
    />
  );
}
```

### Option 3: Manual Subscription

```tsx
import { subscribeMobileLikedSongs } from '@/services/mobileLikedSongsService';

useEffect(() => {
  const unsubscribe = subscribeMobileLikedSongs(
    (songs) => {
      console.log('Songs updated:', songs.length);
      setSongs(songs);
    },
    (error) => {
      console.error('Error:', error);
    }
  );

  return () => unsubscribe?.();
}, []);
```

## Common Use Cases

### 1. Display Liked Songs Count

```tsx
import { getMobileLikedSongsCount } from '@/services/mobileLikedSongsService';

const count = await getMobileLikedSongsCount();
console.log(`You have ${count} liked songs`);
```

### 2. Search Songs

```tsx
import { searchMobileLikedSongs } from '@/services/mobileLikedSongsService';

const results = await searchMobileLikedSongs('Beatles');
console.log(`Found ${results.length} songs`);
```

### 3. Check Sync Status

```tsx
import { getMobileSyncMetadata, formatMobileSyncStatus } from '@/services/mobileLikedSongsService';

const metadata = await getMobileSyncMetadata();
const statusText = formatMobileSyncStatus(metadata);
console.log(statusText); // "2 hours ago"
```

### 4. Get Single Song

```tsx
import { getMobileSongById } from '@/services/mobileLikedSongsService';

const song = await getMobileSongById('track_id_123');
if (song) {
  console.log(song.title);
}
```

## API Endpoints

### Sync Songs (Backend)
```bash
POST /api/spotify/sync
Body: { "userId": "firebase_user_id" }
```

### Get Synced Songs (Backend)
```bash
GET /api/spotify/liked-songs/:userId
```

### Get Sync Status (Backend)
```bash
GET /api/spotify/sync-status/:userId
```

## Testing

### Test Web App Spotify Connection

1. Open browser console
2. Run:
```javascript
import { debugAuthenticationState } from '@/services/spotifyService';
debugAuthenticationState();
```

### Test Mobile App Firestore Access

1. Open browser console
2. Run:
```javascript
import { getMobileLikedSongs } from '@/services/mobileLikedSongsService';
const songs = await getMobileLikedSongs();
console.log(songs);
```

## Troubleshooting

### "User not authenticated"
- Ensure user is logged in with Firebase Auth
- Check `auth.currentUser` is not null

### "No songs found"
- User needs to connect Spotify on web app first
- Check sync status: `getMobileSyncMetadata()`

### "Permission denied"
- Deploy Firestore security rules
- Verify user ID matches authenticated user

### Tokens not refreshing
- Check backend logs for token refresh errors
- Verify Spotify credentials are correct

## Performance Tips

1. **Use Real-time Listeners**: Automatically updates UI when songs change
2. **Implement Pagination**: For large song libraries (>1000 songs)
3. **Cache Images**: Use lazy loading for album covers
4. **Debounce Search**: Wait 300ms before searching
5. **Background Sync**: Sync every 10-30 minutes, not on every app open

## Security Checklist

- [ ] Firestore rules deployed
- [ ] Spotify Client Secret only in backend
- [ ] HTTPS for all OAuth redirects
- [ ] Token refresh implemented
- [ ] User data isolated per user

## Next Steps

1. **Add Playlist Sync**: Extend to sync user playlists
2. **Recently Played**: Track listening history
3. **Offline Mode**: Cache songs for offline playback
4. **Push Notifications**: Notify when new songs are synced
5. **Analytics**: Track sync success rates

## Support

For issues or questions:
- Check `SPOTIFY_SYNC_IMPLEMENTATION.md` for detailed docs
- Review backend logs for sync errors
- Test with Spotify's API console

## Example Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── SpotifySyncManager.tsx      # Web: Spotify connection UI
│   │   └── MobileSyncedSongs.tsx       # Mobile: Display synced songs
│   ├── services/
│   │   ├── spotifyService.ts           # Web: Spotify API calls
│   │   ├── spotifySync.ts              # Web: Sync logic
│   │   └── mobileLikedSongsService.ts  # Mobile: Firestore reads
│   └── pages/
│       └── MobileLikedSongsPage.tsx    # Mobile: Example page

backend/
├── src/
│   ├── routes/
│   │   └── spotify.route.js            # Spotify endpoints
│   └── services/
│       ├── spotify.service.js          # Spotify API wrapper
│       ├── spotifyTokenService.js      # Token management
│       └── spotifySyncService.js       # Sync logic
```

## Quick Commands

```bash
# Install dependencies
npm install

# Start development
npm run dev

# Deploy Firestore rules
firebase deploy --only firestore:rules

# Test backend
curl http://localhost:5000/api/spotify/sync-status/USER_ID

# Build for production
npm run build
```

---

**Ready to go!** Start by adding `<SpotifySyncManager />` to your web app dashboard.
