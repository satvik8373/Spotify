# Complete Spotify Integration Guide for Mavrixfy

## Overview
This guide provides step-by-step instructions to integrate Spotify Liked Songs sync with your Mavrixfy app. The system includes:

- **OAuth2 Authentication** with Spotify
- **Automatic Token Storage** in Firestore
- **Bi-directional Sync** of liked songs
- **Scheduled Cron Jobs** for automatic updates
- **Real-time Status** tracking

## Prerequisites
- Firebase project with Firestore enabled
- Spotify Developer account
- Node.js 18+ installed
- Firebase CLI installed

## Step 1: Spotify Developer App Setup

### 1.1 Create Spotify App
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click "Create App"
3. Fill in the details:
   - **App name**: `Mavrixfy`
   - **App description**: `Music app with Spotify integration`
   - **Website**: Your app URL
   - **Redirect URI**: `https://1d3c38b2f441.ngrok-free.app/spotify-callback` (for development)
4. Click "Save"

### 1.2 Configure App Settings
1. Click on your app
2. Go to "Settings"
3. Add these Redirect URIs: 
   - `http://localhost:5173/spotify-callback`
   - `https://1d3c38b2f441.ngrok-free.app/spotify-callback`
   - Your production URL when deployed
4. Copy your **Client ID** and **Client Secret**

### 1.3 Add Users (Development Mode)
1. In Settings → User Management
2. Click "Add New User"
3. Add email addresses of users who need access
4. **Note**: For production, change app status to "Production" (requires Spotify review)

## Step 2: Environment Configuration

### 2.1 Backend Environment Variables
Create/update `backend/.env`:
```env
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
SPOTIFY_REDIRECT_URI=https://1d3c38b2f441.ngrok-free.app/spotify-callback
FIREBASE_PROJECT_ID=your_firebase_project_id
```

### 2.2 Frontend Environment Variables
Create/update `frontend/.env.local`:
```env
VITE_SPOTIFY_CLIENT_ID=your_client_id_here
VITE_SPOTIFY_CLIENT_SECRET=your_client_secret_here
VITE_REDIRECT_URI=https://1d3c38b2f441.ngrok-free.app/spotify-callback
VITE_API_URL=http://localhost:5000
```

### 2.3 Firebase Functions Configuration
Set Firebase Functions config:
```bash
firebase functions:config:set spotify.client_id="your_client_id_here"
firebase functions:config:set spotify.client_secret="your_client_secret_here"
```

## Step 3: Install Dependencies

### 3.1 Backend Dependencies
```bash
cd backend
npm install
```

### 3.2 Frontend Dependencies
```bash
cd frontend
npm install
```

### 3.3 Firebase Functions Dependencies
```bash
cd functions
npm install
```

## Step 4: Deploy Firebase Functions

### 4.1 Initialize Firebase (if not already done)
```bash
firebase init functions
```

### 4.2 Deploy Functions
```bash
firebase deploy --only functions
```

## Step 5: Start Development Servers

### 5.1 Start Backend
```bash
cd backend
npm start
```

### 5.2 Start Frontend
```bash
cd frontend
npm run dev
```

### 5.3 Start ngrok (for external access)
```bash
ngrok http 5173
```

## Step 6: Test the Integration

### 6.1 Test Authentication Flow
1. Open your app in browser
2. Go to Liked Songs page
3. Click "Connect with Spotify"
4. Complete OAuth flow
5. Verify tokens are stored in Firestore

### 6.2 Test Manual Sync
1. After authentication, click the "S" button on play button
2. Verify songs are synced to Firestore
3. Check sync status display

### 6.3 Test Automatic Sync
1. Like/unlike songs on Spotify
2. Wait for scheduled sync (every 6 hours)
3. Or trigger manual sync to see immediate results

## Step 7: Monitor and Debug

### 7.1 Check Firebase Functions Logs
```bash
firebase functions:log
```

### 7.2 Check Firestore Data
- Go to Firebase Console → Firestore
- Check collections:
  - `users/{userId}/spotifyTokens`
  - `users/{userId}/spotifyLikedSongs`
  - `users/{userId}/spotifySync`

### 7.3 Debug Frontend
- Open browser DevTools
- Check Console for sync status
- Check Network tab for API calls

## Step 8: Production Deployment

### 8.1 Update Redirect URIs
1. Go to Spotify Developer Dashboard
2. Add your production domain to Redirect URIs
3. Update environment variables

### 8.2 Deploy to Production
```bash
# Deploy backend
cd backend
npm run deploy

# Deploy frontend
cd frontend
npm run build
npm run deploy

# Deploy functions
firebase deploy --only functions
```

## File Structure Overview

```
spotify/
├── backend/
│   ├── src/
│   │   ├── services/
│   │   │   ├── spotifyTokenService.js    # Token management
│   │   │   └── spotifySyncService.js     # Sync logic
│   │   └── routes/
│   │       └── spotify.route.js          # API endpoints
│   └── .env                              # Environment variables
├── frontend/
│   ├── src/
│   │   ├── services/
│   │   │   ├── spotifyService.ts         # Frontend Spotify API
│   │   │   └── syncedLikedSongsService.ts # Synced songs API
│   │   └── pages/
│   │       └── liked-songs/
│   │           └── LikedSongsPage.tsx    # UI integration
│   └── .env.local                        # Frontend environment
└── functions/
    ├── index.js                          # Cloud Functions
    └── package.json                      # Functions dependencies
```

## API Endpoints

### Backend Endpoints
- `POST /api/spotify/callback` - Handle OAuth callback
- `POST /api/spotify/sync` - Manual sync trigger
- `GET /api/spotify/liked-songs/:userId` - Get synced songs
- `GET /api/spotify/sync-status/:userId` - Get sync status

### Firebase Functions
- `syncSpotifyLikedSongs` - Scheduled cron job (every 6 hours)

## Data Models

### Spotify Tokens (Firestore)
```javascript
{
  access_token: "string",
  refresh_token: "string", 
  expires_at: timestamp,
  created_at: timestamp,
  updated_at: timestamp
}
```

### Liked Songs (Firestore)
```javascript
{
  trackId: "string",
  title: "string",
  artist: "string",
  album: "string",
  coverUrl: "string",
  spotifyUrl: "string",
  duration: number,
  addedAt: "string",
  albumId: "string",
  artistIds: ["string"],
  popularity: number,
  previewUrl: "string",
  syncedAt: timestamp
}
```

### Sync Metadata (Firestore)
```javascript
{
  lastSyncAt: timestamp,
  totalSongs: number,
  addedCount: number,
  updatedCount: number,
  removedCount: number,
  syncStatus: "completed|failed|never",
  syncType: "manual|scheduled"
}
```

## Troubleshooting

### Common Issues

1. **"Invalid redirect URI"**
   - Check Spotify app settings
   - Verify environment variables match exactly

2. **"403 Forbidden" from Spotify API**
   - Check if tokens are expired
   - Verify user is added to app (development mode)
   - Check scopes are correct

3. **Sync not working**
   - Check Firebase Functions logs
   - Verify tokens are stored in Firestore
   - Check user permissions

4. **CORS errors**
   - Update backend CORS configuration
   - Check frontend API URL

### Debug Commands
```bash
# Check functions logs
firebase functions:log

# Check environment variables
firebase functions:config:get

# Test functions locally
firebase emulators:start --only functions
```

## Security Considerations

1. **Never expose Client Secret** in frontend code
2. **Use environment variables** for all sensitive data
3. **Validate user permissions** before sync operations
4. **Implement rate limiting** for API calls
5. **Monitor function usage** and costs

## Performance Optimization

1. **Batch operations** for Firestore writes
2. **Pagination** for large song lists
3. **Caching** of frequently accessed data
4. **Background processing** for sync operations

## Support

For issues or questions:
1. Check Firebase Functions logs
2. Review browser console errors
3. Verify environment configuration
4. Test with different user accounts

---

**Note**: This integration requires users to be added to your Spotify app in development mode. For production use, submit your app for Spotify review to enable unlimited user access.
