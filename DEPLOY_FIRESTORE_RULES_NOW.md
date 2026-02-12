# 🚨 DEPLOY FIRESTORE RULES - CRITICAL FIX

## Issue
Mobile app shows: `Error fetching liked songs: Firebase error`
Web app works fine.

## Root Cause
The Firestore rules support **two different structures**:
- **Web app**: `users/{userId}/likedSongs/{songId}` (subcollection)
- **Mobile app**: `likedSongs/{userId}` (root collection with songs array)

The current deployed rules only support the web app structure.

---

## ✅ SOLUTION: Deploy Updated Rules

### Step 1: Copy These Rules

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
      
      // Spotify Tokens subcollection - only the user can access their tokens
      match /spotifyTokens/{tokenId} {
        allow read, write, delete: if isAuthenticated() && isOwner(userId);
      }
      
      // Liked Songs subcollection (WEB APP STRUCTURE)
      match /likedSongs/{songId} {
        allow read, write, delete: if isAuthenticated() && isOwner(userId);
      }
      
      // Spotify Sync metadata subcollection
      match /spotifySync/{docId} {
        allow read, write, delete: if isAuthenticated() && isOwner(userId);
      }
    }
    
    // Liked Songs collection at root level (MOBILE APP STRUCTURE)
    // Document ID is the userId, contains array of songs
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

### Step 2: Deploy to Firebase Console

1. **Open Firebase Console**
   - Go to: https://console.firebase.google.com/
   - Select project: **spotify-8fefc**

2. **Navigate to Firestore Rules**
   - Click **Firestore Database** in left sidebar
   - Click **Rules** tab at the top

3. **Replace Rules**
   - Select all existing rules (Ctrl+A / Cmd+A)
   - Delete them
   - Paste the new rules from Step 1
   - Click **Publish** button

4. **Verify Deployment**
   - You should see "Rules published successfully"
   - Check the timestamp shows today's date

---

## 🧪 Testing After Deployment

### Test 1: Mobile App - Liked Songs
1. Open mobile app
2. Log in with Google
3. Check console logs - you should see:
   ```
   📡 Fetching liked songs from Firestore path: likedSongs/[userId]
   ✅ Successfully fetched X liked songs from Firestore
   ```
4. Like a song - check for:
   ```
   📡 Adding song to Firestore: likedSongs/[userId]
   ✅ Successfully added "[song title]" to Firestore
   ```

### Test 2: Web App - Liked Songs
1. Open web app
2. Log in
3. Like/unlike songs
4. ✅ Should still work as before

### Test 3: Cross-Platform Sync
**Important**: Web and mobile use different structures, so they won't sync automatically. This is expected behavior.

---

## 📊 Data Structure Comparison

### Web App Structure
```
users/
  {userId}/
    likedSongs/
      {songId1}/
        title: "Song 1"
        artist: "Artist 1"
        ...
      {songId2}/
        title: "Song 2"
        ...
```

### Mobile App Structure
```
likedSongs/
  {userId}/
    songs: [
      {
        id: "songId1",
        title: "Song 1",
        artist: "Artist 1",
        ...
      },
      {
        id: "songId2",
        title: "Song 2",
        ...
      }
    ]
    updatedAt: timestamp
```

---

## 🔍 Debugging

If you still see errors after deploying:

### Check Console Logs
Look for these error codes:
- `permission-denied` → Rules not deployed correctly
- `not-found` → Document doesn't exist (normal for new users)
- `unauthenticated` → User not logged in

### Verify Authentication
```typescript
// In mobile app console, check:
console.log("User ID:", authUser?.id);
console.log("Firebase User:", firebaseUser?.uid);
```

Both should show the same user ID.

### Check Firestore Console
1. Go to Firebase Console → Firestore Database → Data
2. Look for `likedSongs` collection at root level
3. Check if your user ID exists as a document
4. Verify the document has a `songs` array

---

## 🎯 What This Fixes

✅ Mobile app can read liked songs
✅ Mobile app can add liked songs
✅ Mobile app can remove liked songs
✅ Web app continues to work
✅ Better error logging for debugging
✅ Guest-to-authenticated sync works

---

## ⚠️ Known Limitations

1. **No cross-platform sync**: Web and mobile use different structures
2. **Migration needed**: To unify structures, you'd need to migrate data
3. **Duplicate data**: Users might have different liked songs on web vs mobile

---

## 🚀 Next Steps After Deployment

1. Deploy the rules (Step 2 above)
2. Test mobile app liked songs
3. Check console logs for any errors
4. Report back with results

If you see any errors, copy the exact error message including the error code!
