# Spotify Auto-Sync Feature

## Overview

The Spotify Auto-Sync feature automatically monitors your Spotify liked songs and adds new ones to your Mavrixfy liked songs collection. This ensures your Mavrixfy library stays up-to-date with your Spotify preferences without manual intervention.

## Features

### 🔄 Automatic Synchronization
- Periodically checks Spotify for newly liked songs (last 7 days)
- Automatically searches for high-quality audio versions using Mavrixfy's music API
- Adds new songs to your personal liked songs collection
- Skips songs that already exist in your library

### ⚙️ Configurable Settings
- **Check Intervals**: 15 minutes, 30 minutes, 1 hour, 2 hours, 6 hours, 12 hours, or daily
- **Enable/Disable**: Toggle auto-sync on/off as needed
- **Manual Sync**: Trigger immediate sync check
- **Smart Filtering**: Only processes recent songs to avoid overwhelming

### 📊 Status Monitoring
- Real-time status updates during sync operations
- Visual indicators for sync progress and completion
- Toast notifications for successful additions
- Error handling with retry logic

### 🎵 Intelligent Processing
- **Duplicate Detection**: Prevents re-adding existing songs
- **High-Quality Audio**: Searches for best available audio sources
- **Source Tracking**: Marks songs as Spotify-synced with visual indicators
- **Rate Limiting**: Prevents API overload with smart delays

## How It Works

1. **Authentication Check**: Verifies both Mavrixfy and Spotify authentication
2. **Recent Songs Fetch**: Gets songs liked on Spotify in the last 7 days
3. **Duplicate Filtering**: Checks against existing Mavrixfy liked songs
4. **Audio Search**: Finds high-quality audio versions using music API
5. **Library Addition**: Adds new songs to user's liked songs collection
6. **Status Updates**: Provides real-time feedback throughout the process

## Usage

### Enabling Auto-Sync

1. Navigate to **Liked Songs** page
2. Click the **"+"** button to open the add songs dialog
3. Switch to the **"Auto-Sync"** tab
4. Toggle **"Enable Auto-Sync"** to ON
5. Select your preferred check interval
6. Auto-sync will start automatically

### Manual Sync

- Click **"Sync Now"** button in the Auto-Sync settings
- Or use the manual Spotify sync in the "Spotify Sync" tab

### Monitoring Status

- **Active Badge**: Shows when auto-sync is enabled
- **Status Updates**: Real-time sync progress information
- **Next Check Timer**: Shows time until next automatic check
- **Toast Notifications**: Success/error messages for sync operations

## Technical Details

### Storage
- All liked songs are stored in `users/{userId}/likedSongs/{songId}`
- Auto-sync configuration saved in localStorage
- Source tracking with `source: 'spotify'` field

### Performance
- **Smart Batching**: Processes maximum 20 songs per sync
- **Rate Limiting**: 200ms delay between song searches
- **Efficient Filtering**: Only checks recent songs (7 days)
- **Background Processing**: Non-blocking sync operations

### Error Handling
- **Authentication Errors**: Auto-disables sync if auth fails
- **Network Errors**: Retries with exponential backoff
- **API Limits**: Respects rate limits with smart delays
- **Graceful Degradation**: Continues processing other songs if one fails

## Configuration

### Default Settings
```typescript
{
  enabled: false,
  intervalMinutes: 30,
  maxSongsPerSync: 20,
  lastSyncTimestamp: 0
}
```

### Supported Intervals
- 15 minutes (frequent updates)
- 30 minutes (recommended default)
- 1 hour (balanced)
- 2 hours (moderate)
- 6 hours (light usage)
- 12 hours (minimal)
- Daily (occasional sync)

## Benefits

### For Users
- **Seamless Experience**: No manual intervention required
- **Always Up-to-Date**: Latest Spotify likes automatically available
- **High-Quality Audio**: Better audio sources than Spotify previews
- **Unified Library**: Single place for all liked music

### For App
- **User Engagement**: Keeps users active with fresh content
- **Data Consistency**: Maintains synchronized music preferences
- **Reduced Manual Work**: Less user effort required
- **Better Retention**: Users stay engaged with automatic updates

## Troubleshooting

### Auto-Sync Not Working
1. Check Spotify connection in settings
2. Verify Mavrixfy authentication
3. Ensure auto-sync is enabled
4. Check browser console for errors

### Songs Not Being Added
1. Verify songs are recently liked on Spotify (within 7 days)
2. Check if songs already exist in Mavrixfy library
3. Ensure audio sources are available for the songs
4. Check network connectivity

### Performance Issues
1. Reduce sync frequency (increase interval)
2. Check browser performance during sync
3. Clear browser cache if needed
4. Restart auto-sync service

## Future Enhancements

- **Playlist Sync**: Extend to sync entire Spotify playlists
- **Bi-directional Sync**: Sync Mavrixfy likes back to Spotify
- **Advanced Filtering**: Genre, artist, or date-based filters
- **Sync Analytics**: Detailed sync statistics and history
- **Batch Operations**: Bulk sync management tools