# Database Migrations

This directory contains database migration scripts for the Mavrixfy backend.

## AI Mood Playlist Generator Migrations

### 1. Initialize Collections

**Script**: `init-mood-playlist-collections.js`

Creates the necessary Firestore collections for the mood playlist feature:
- `mood_playlist_cache` - Cached playlist generations
- `mood_playlist_rate_limits` - User rate limit tracking
- `mood_playlist_analytics` - Analytics events
- `playlist_shares` - Shareable playlist links

**Run**:
```bash
cd backend
node src/migrations/init-mood-playlist-collections.js
```

### 2. Add moodTags to Songs

**Script**: `add-moodtags-to-songs.js`

Adds the `moodTags` array field to all existing song documents.

**Run**:
```bash
cd backend
node src/migrations/add-moodtags-to-songs.js
```

### 3. Deploy Firestore Indexes

After running the migration scripts, deploy the indexes defined in `firestore.indexes.json`:

```bash
firebase deploy --only firestore:indexes
```

Or manually create indexes in the Firebase Console based on the definitions in `firestore.indexes.json`.

## Migration Order

1. Run `init-mood-playlist-collections.js`
2. Run `add-moodtags-to-songs.js`
3. Deploy Firestore indexes
4. Verify in Firebase Console

## Notes

- Ensure Firebase credentials are properly configured before running migrations
- Migrations are idempotent and can be run multiple times safely
- Always backup your database before running migrations in production
