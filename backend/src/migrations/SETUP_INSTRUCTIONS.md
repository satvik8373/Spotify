# AI Mood Playlist Generator - Database Setup Instructions

This guide walks you through setting up the database schema for the AI Mood Playlist Generator feature.

## Prerequisites

- Firebase Admin SDK configured with proper credentials
- Node.js 18+ installed
- Firebase CLI installed (for index deployment)

## Setup Steps

### Step 1: Initialize Firestore Collections

Run the collection initialization script to create the required collections:

```bash
cd backend
node src/migrations/init-mood-playlist-collections.js
```

This creates:
- `mood_playlist_cache` - Stores cached playlist generations (24-hour TTL)
- `mood_playlist_rate_limits` - Tracks user rate limits (3/day for free users)
- `mood_playlist_analytics` - Stores analytics events
- `playlist_shares` - Manages shareable playlist links

### Step 2: Add moodTags to Existing Songs

Run the migration to add the `moodTags` field to all existing songs:

```bash
cd backend
node src/migrations/add-moodtags-to-songs.js
```

This adds an empty `moodTags: []` array to all song documents that don't already have this field.

### Step 3: Deploy Firestore Indexes

Deploy the indexes defined in `firestore.indexes.json`:

```bash
# From project root
firebase deploy --only firestore:indexes
```

**Required Indexes:**
- `mood_playlist_cache`: `moodText` (unique), `expiresAt`
- `mood_playlist_rate_limits`: `userId`
- `mood_playlist_analytics`: composite index on `userId + eventType + timestamp`
- `playlist_shares`: `shareId`, `playlistId`
- `songs`: composite index on `genre + moodTags`

### Step 4: Verify Setup

1. Check Firebase Console to ensure all collections exist
2. Verify indexes are created (may take a few minutes)
3. Check that songs have the `moodTags` field

## Schema Overview

### Song Schema (Extended)
```javascript
{
  _id: "string",
  title: "string",
  artist: "string",
  album: "string",
  genre: "string",
  moodTags: ["string"], // NEW: Array of mood tags
  duration: number,
  imageUrl: "string",
  streamUrl: "string",
  year: number,
  source: "string"
}
```

### Playlist Schema (Extended)
```javascript
{
  _id: "string",
  name: "string",
  description: "string",
  isPublic: boolean,
  songs: ["songId"],
  createdBy: { uid, fullName, imageUrl },
  createdAt: Timestamp,
  // NEW FIELDS for mood playlists:
  moodGenerated: boolean,
  emotion: "sadness|joy|anger|love|fear|surprise",
  moodText: "string",
  generatedAt: Timestamp
}
```

## Next Steps

After completing the database setup:

1. **Populate moodTags**: Consider adding meaningful mood tags to songs based on genre and characteristics
2. **Test the setup**: Run a test mood playlist generation to verify everything works
3. **Monitor indexes**: Check Firebase Console to ensure indexes are built successfully
4. **Configure environment**: Set up the `HUGGINGFACE_API_KEY` environment variable

## Troubleshooting

### Collections not created
- Verify Firebase credentials are properly configured
- Check that the Firebase project ID matches your environment

### Index deployment fails
- Ensure you have proper permissions in Firebase Console
- Check that `firestore.indexes.json` is valid JSON
- Try creating indexes manually in Firebase Console

### Migration script errors
- Check Firebase Admin SDK initialization
- Verify network connectivity to Firebase
- Review error messages for specific issues

## Rollback

If you need to rollback the changes:

1. Delete the new collections from Firebase Console
2. Remove the `moodTags` field from songs (optional, as empty arrays are harmless)
3. Delete the deployed indexes from Firebase Console

## Support

For issues or questions, refer to:
- Design document: `.kiro/specs/ai-mood-playlist-generator/design.md`
- Requirements: `.kiro/specs/ai-mood-playlist-generator/requirements.md`
- Firebase documentation: https://firebase.google.com/docs/firestore
