# Spotify Production Setup Guide

## 🚨 Production Environment Variables

To make Spotify integration work in production on `mavrixfilms.live`, you need to set these environment variables:

### Frontend Environment Variables (Vite)

Create a `.env.production` file in your frontend directory:

```bash
# Spotify Configuration
VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id_here
VITE_SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
VITE_REDIRECT_URI=https://mavrixfilms.live/spotify-callback
```

### Backend Environment Variables

Set these in your backend production environment:

```bash
# Spotify Configuration
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
SPOTIFY_REDIRECT_URI=https://mavrixfilms.live/spotify-callback
```

## 🔧 Spotify Developer Dashboard Configuration

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Select your app
3. In "Redirect URIs", add: `https://mavrixfilms.live/spotify-callback`
4. Save the changes

## 📍 Production URLs

- **Main Site**: `https://mavrixfilms.live`
- **Spotify Callback**: `https://mavrixfilms.live/spotify-callback`
- **Backend API**: `https://mavrixfilms.live/api` (or your backend domain)

## 🚀 Deployment Steps

### 1. Set Environment Variables
```bash
# Frontend (Vite)
VITE_SPOTIFY_CLIENT_ID=your_client_id
VITE_REDIRECT_URI=https://mavrixfilms.live/spotify-callback

# Backend
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=https://mavrixfilms.live/spotify-callback
```

### 2. Update Spotify Dashboard
- Add redirect URI: `https://mavrixfilms.live/spotify-callback`

### 3. Deploy Both Frontend and Backend
- Ensure environment variables are set in production
- Deploy with updated code

### 4. Test the Integration
- Visit `https://mavrixfilms.live`
- Click "Connect with Spotify"
- Should redirect to Spotify authorization

## 🔍 Troubleshooting

### Button Not Clickable
- Check browser console for errors
- Verify environment variables are set
- Check if CLIENT_ID is present

### Redirect URI Mismatch
- Ensure Spotify dashboard has correct redirect URI
- Check environment variable matches exactly
- No trailing slashes

### CORS Issues
- Verify backend is accessible from frontend domain
- Check backend CORS configuration

## 📱 Testing Checklist

- [ ] Environment variables set in production
- [ ] Spotify dashboard redirect URI updated
- [ ] Frontend deployed with new code
- [ ] Backend deployed with environment variables
- [ ] Button is clickable and shows loading state
- [ ] Redirects to Spotify authorization
- [ ] Callback works and stores tokens
- [ ] User can see connected status

## 🆘 Common Issues

1. **Missing CLIENT_ID**: Button will show "Configuration Error"
2. **Wrong redirect URI**: Spotify will reject the authorization
3. **Environment variables not loaded**: Check deployment configuration
4. **CORS errors**: Backend not accessible from frontend domain

## 📞 Support

If you're still having issues:
1. Check browser console for error messages
2. Verify all environment variables are set
3. Confirm Spotify dashboard configuration
4. Test with a simple redirect first
