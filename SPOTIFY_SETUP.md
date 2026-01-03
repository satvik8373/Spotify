# Spotify Integration Setup

To enable Spotify integration in your Mavrixfy app, you need to configure Spotify API credentials.

## 1. Create a Spotify App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Click "Create App"
4. Fill in the app details:
   - **App Name**: Mavrixfy
   - **App Description**: Music streaming application
   - **Website**: Your website URL (optional)
   - **Redirect URI**: `http://localhost:3000/spotify-callback` (for development)
   - **API/SDKs**: Web API

## 2. Get Your Credentials

After creating the app:
1. Click on your app in the dashboard
2. Go to "Settings"
3. Copy your **Client ID** and **Client Secret**

## 3. Configure Backend

Update your `backend/.env` file:

```env
# Replace with your actual Spotify credentials
SPOTIFY_CLIENT_ID=your_actual_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_actual_spotify_client_secret_here
SPOTIFY_REDIRECT_URI=http://localhost:3000/spotify-callback
```

## 4. Configure Frontend

Update your `frontend/.env` file:

```env
# Replace with your actual Spotify client ID
VITE_SPOTIFY_CLIENT_ID=your_actual_spotify_client_id_here
VITE_REDIRECT_URI=http://localhost:3000/spotify-callback
```

## 5. Production Setup

For production deployment:

1. **Update Redirect URIs** in your Spotify app settings:
   - Add your production domain: `https://yourdomain.com/spotify-callback`

2. **Update Environment Variables**:
   - Backend: Set `SPOTIFY_REDIRECT_URI=https://yourdomain.com/spotify-callback`
   - Frontend: Set `VITE_REDIRECT_URI=https://yourdomain.com/spotify-callback`

## 6. Test the Integration

1. Start your backend: `cd backend && npm start`
2. Start your frontend: `cd frontend && npm run dev`
3. Log in to your app
4. Try connecting to Spotify from the web interface

## Troubleshooting

### "Spotify integration not configured" Error
- Make sure you've set real Spotify credentials (not placeholder values)
- Restart your backend after updating the `.env` file

### "Invalid redirect URI" Error
- Make sure the redirect URI in your Spotify app settings matches exactly
- Check that your frontend and backend redirect URIs match

### "Invalid client" Error
- Double-check your Client ID and Client Secret
- Make sure there are no extra spaces in your `.env` file

## Features Enabled

Once configured, users will be able to:
- Connect their Spotify account
- Import their Spotify liked songs
- Search Spotify's music catalog
- Create playlists with Spotify tracks
- Sync liked songs between Spotify and Mavrixfy

## Security Notes

- Never commit your `.env` files to version control
- Use environment variables for production deployment
- Regularly rotate your Spotify Client Secret
- Consider using Spotify's PKCE flow for enhanced security in production