# Deploy Firestore Rules

## Issue
The mobile app is getting "Missing or insufficient permissions" errors when trying to fetch user playlists from Firebase.

## Solution
Updated Firestore security rules to properly allow authenticated users to access their data.

## Changes Made

1. **Fixed likedSongs collection path** - Moved from subcollection to root level
2. **Updated playlist permissions** - Allow all authenticated users to read playlists
3. **Fixed owner check** - Check both `createdBy.uid` and `createdBy.id` fields

## Deploy to Firebase

### Option 1: Firebase Console (Easiest)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **spotify-8fefc**
3. Click **Firestore Database** in the left menu
4. Click the **Rules** tab
5. Copy the contents of `firestore.rules` file
6. Paste into the editor
7. Click **Publish**

### Option 2: Firebase CLI

If you have Firebase CLI installed:

```bash
firebase deploy --only firestore:rules
```

## Updated Rules

The new rules allow:

✅ **Public playlists** - Any authenticated user can read
✅ **User playlists** - Users can read/write their own playlists
✅ **Liked songs** - Users can read/write their own liked songs
✅ **User profiles** - Users can read all profiles, edit their own

## Test After Deployment

1. Restart your mobile app
2. The Firebase permission errors should be gone
3. You should see your playlists load successfully

## Firestore Rules Content

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && request.auth.uid == userId;
      allow update, delete: if isOwner(userId);
      
      match /spotifySync/{docId} {
        allow read, write, delete: if isAuthenticated() && isOwner(userId);
      }
    }
    
    match /likedSongs/{userId} {
      allow read, write, delete: if isAuthenticated() && isOwner(userId);
    }
    
    match /songs/{songId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isAuthenticated() && isOwner(resource.data.createdBy.id);
    }
    
    match /albums/{albumId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isAuthenticated() && isOwner(resource.data.createdBy.id);
    }
    
    match /playlists/{playlistId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isAuthenticated() && 
        (isOwner(resource.data.createdBy.uid) || isOwner(resource.data.createdBy.id));
    }
  }
}
```

## Important Notes

- These rules require users to be authenticated (signed in)
- Guest users won't be able to access Firestore data
- Make sure users are properly signed in before accessing data
- The rules are now deployed and active immediately after publishing

---

**Status**: Rules updated locally, needs deployment to Firebase Console
**Priority**: High - Blocking user playlist access
**Impact**: Fixes "Missing or insufficient permissions" errors
