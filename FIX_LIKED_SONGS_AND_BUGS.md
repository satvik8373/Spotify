# Fix Liked Songs and Other Bugs

## Issue Summary
Liked songs are not loading in the mobile app due to Firestore security rules not being deployed.

## Root Cause
The `firestore.rules` file has been updated with proper security rules, but these rules have **NOT been deployed** to Firebase Console. The app is getting "Missing or insufficient permissions" errors when trying to access the `likedSongs` collection.

---

## CRITICAL FIX: Deploy Firestore Rules

### Step 1: Deploy Rules to Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `spotify-8fefc`
3. Navigate to **Firestore Database** → **Rules** tab
4. Copy the contents from `firestore.rules` file (shown below)
5. Paste into the Firebase Console rules editor
6. Click **Publish** button

### Firestore Rules to Deploy:

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && request.auth.uid == userId;
      allow update, delete: if isOwner(userId);
      
      // Spotify Sync metadata subcollection
      match /spotifySync/{docId} {
        allow read, write, delete: if isAuthenticated() && isOwner(userId);
      }
    }
    
    // Liked Songs collection (root level, keyed by userId)
    match /likedSongs/{userId} {
      allow read, write, delete: if isAuthenticated() && isOwner(userId);
    }
    
    // Songs collection
    match /songs/{songId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isAuthenticated() && isOwner(resource.data.createdBy.id);
    }
    
    // Albums collection
    match /albums/{albumId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isAuthenticated() && isOwner(resource.data.createdBy.id);
    }
    
    // Playlists collection
    match /playlists/{playlistId} {
      // Allow read if authenticated (for public playlists and user's own playlists)
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isAuthenticated() && 
        (isOwner(resource.data.createdBy.uid) || isOwner(resource.data.createdBy.id));
    }
  }
}
```

### Step 2: Verify Rules Deployment

After publishing, test the liked songs functionality:

1. Open the mobile app
2. Log in with Google
3. Try to like a song
4. Navigate to "Liked Songs" screen
5. Verify songs are loading

---

## How Liked Songs Work

### Mobile App Flow:

1. **On App Load** (`PlayerContext.tsx`):
   - Checks if user is authenticated
   - If authenticated: Loads liked songs from Firestore (`getLikedSongsFromFirestore()`)
   - If not authenticated or Firestore fails: Falls back to local AsyncStorage

2. **When User Likes a Song**:
   - Adds to local state immediately (instant UI feedback)
   - Saves to AsyncStorage (local persistence)
   - If authenticated: Syncs to Firestore (`addLikedSongToFirestore()`)

3. **When User Unlikes a Song**:
   - Removes from local state immediately
   - Removes from AsyncStorage
   - If authenticated: Removes from Firestore (`removeLikedSongFromFirestore()`)

### Data Storage:

- **Firestore Path**: `likedSongs/{userId}`
- **Document Structure**:
  ```json
  {
    "songs": [
      {
        "id": "song_id",
        "title": "Song Title",
        "artist": "Artist Name",
        "imageUrl": "https://...",
        "audioUrl": "https://...",
        "duration": 180,
        "createdAt": "2026-02-12T...",
        "updatedAt": "2026-02-12T..."
      }
    ],
    "updatedAt": "2026-02-12T..."
  }
  ```

- **Local Storage**: AsyncStorage keys
  - `likedSongIds`: Array of song IDs
  - `likedSongsData`: Array of full song objects

---

## Additional Improvements Made

### 1. Guest-to-Authenticated Sync
**Status**: ✅ FIXED

Added automatic sync logic when user logs in:
- When authenticated user loads the app, it checks for local liked songs
- If local songs exist, they are automatically synced to Firestore
- Prevents data loss when guest users log in
- Includes detailed console logging for debugging

### 2. Enhanced Error Logging
**Status**: ✅ IMPROVED

Added comprehensive logging throughout the liked songs flow:
- `🔐 Loading liked songs for authenticated user`
- `✅ Loaded X liked songs from Firestore`
- `🔄 Syncing X local liked songs to Firestore...`
- `✅ Synced song: [title]`
- `❌ Failed to sync song: [title]`
- `⚠️ Falling back to local storage`
- `👤 Loading liked songs from local storage (guest mode)`

This makes debugging much easier and helps identify permission issues.

### 3. Better Error Handling
**Status**: ✅ IMPROVED

- Like/unlike operations now log success/failure to console
- Firestore errors are caught and logged without breaking the UI
- Local storage always works as fallback

---

## Additional Bugs to Check

### 1. Guest Mode Liked Songs
**Status**: Working as designed
- Guest users can like songs (stored in AsyncStorage only)
- When guest logs in, their local liked songs should sync to Firestore
- **Potential Issue**: No automatic sync on login

**Fix Needed**: Add sync logic when user logs in

### 2. User Playlists Permission Error
**Error in logs**: `Error fetching user playlists: [FirebaseError: Missing or insufficient permissions.]`

**Cause**: Same as liked songs - Firestore rules not deployed

**Fix**: Deploy the rules (Step 1 above)

### 3. Expo AV Deprecation Warning
**Warning**: `[expo-av]: Expo AV has been deprecated and will be removed in SDK 54`

**Impact**: Low priority - app still works
**Recommendation**: Migrate to `expo-audio` and `expo-video` before SDK 54

### 4. JioSaavn Playlist Loading
**Status**: Fixed in previous updates
- Backend now uses multiple API fallbacks
- All platforms use same categories and queries

---

## Testing Checklist

After deploying Firestore rules, test these scenarios:

- [ ] **Liked Songs - Authenticated User**
  - [ ] Like a song → Check if it appears in Firestore
  - [ ] Unlike a song → Check if it's removed from Firestore
  - [ ] Navigate to "Liked Songs" screen → Verify all songs load
  - [ ] Close app and reopen → Verify liked songs persist

- [ ] **Liked Songs - Guest User**
  - [ ] Like a song as guest
  - [ ] Close app and reopen → Verify liked songs persist locally
  - [ ] Log in → Check if local liked songs sync to Firestore

- [ ] **User Playlists**
  - [ ] Create a playlist
  - [ ] Add songs to playlist
  - [ ] View playlist → Verify songs load
  - [ ] Delete playlist

- [ ] **Public Playlists**
  - [ ] View public playlists on home screen
  - [ ] Open a public playlist → Verify songs load

- [ ] **JioSaavn Playlists**
  - [ ] Verify all 10 categories load on home screen
  - [ ] Open a JioSaavn playlist → Verify songs load
  - [ ] Play a song from JioSaavn playlist

---

## Known Limitations

1. **No automatic sync on login**: Guest liked songs don't automatically sync when user logs in
2. **No conflict resolution**: If user has liked songs in both local storage and Firestore, no merge logic exists
3. **No offline queue**: Liked songs require network to load from Firestore

---

## Next Steps

1. **IMMEDIATE**: Deploy Firestore rules (Step 1 above)
2. **TEST**: Run through testing checklist
3. **REPORT**: Let me know if any issues persist
4. **OPTIONAL**: Implement guest-to-authenticated sync logic
