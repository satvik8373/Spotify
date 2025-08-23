# Spotify Production Setup Guide

## 🚨 Production Environment Variables

To make Spotify integration work in production on `mavrixfilms.live`, you need to set these environment variables:

### Frontend Environment Variables (Vite)

Create a `.env.production` file in your frontend directory:

```bash
# API Configuration (CRITICAL - Vercel Backend)
VITE_API_URL=https://spotify-api-drab.vercel.app

# Spotify Configuration
VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id_here
VITE_REDIRECT_URI=https://mavrixfilms.live/spotify-callback

# Other Production Settings
VITE_APP_ENV=production
VITE_APP_URL=https://mavrixfilms.live
```

### Backend Environment Variables

Set these in your Vercel backend environment variables:

```bash
# Spotify Configuration
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
SPOTIFY_REDIRECT_URI=https://mavrixfilms.live/spotify-callback

# CORS Configuration (IMPORTANT)
CORS_ORIGIN=https://mavrixfilms.live,https://www.mavrixfilms.live
```

## 🔧 Spotify Developer Dashboard Configuration

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Select your app
3. In "Redirect URIs", add: `https://mavrixfilms.live/spotify-callback`
4. Save the changes

## 📍 Production URLs

- **Main Site**: `https://mavrixfilms.live`
- **Spotify Callback**: `https://mavrixfilms.live/spotify-callback`
- **Backend API**: `https://spotify-api-drab.vercel.app` (Vercel)

## 🚀 Deployment Steps

### 1. Set Environment Variables
```bash
# Frontend (Vite) - CRITICAL
VITE_API_URL=https://spotify-api-drab.vercel.app
VITE_SPOTIFY_CLIENT_ID=your_client_id
VITE_REDIRECT_URI=https://mavrixfilms.live/spotify-callback

# Backend (Vercel)
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=https://mavrixfilms.live/spotify-callback
CORS_ORIGIN=https://mavrixfilms.live,https://www.mavrixfilms.live
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
- Ensure `VITE_API_URL` is set correctly

### Localhost:5000 Errors (FIXED)
- ✅ **SOLVED**: Set `VITE_API_URL=https://spotify-api-drab.vercel.app` in production
- ✅ **SOLVED**: Updated axios configuration to detect production environment
- ✅ **SOLVED**: Removed hardcoded localhost forcing

### Mixed Content Warnings
- Audio files from Saavn are using HTTP instead of HTTPS
- This is usually from cached data or old URLs
- Clear browser cache and reload
- Check if any hardcoded HTTP URLs exist in your data

## 📱 Testing Checklist

- [ ] Environment variables set in production
- [ ] **VITE_API_URL=https://spotify-api-drab.vercel.app** (CRITICAL)
- [ ] Spotify dashboard redirect URI updated
- [ ] Frontend deployed with new code
- [ ] Backend deployed with environment variables
- [ ] Button is clickable and shows loading state
- [ ] Redirects to Spotify authorization
- [ ] Callback works and stores tokens
- [ ] User can see connected status
- [ ] No more localhost:5000 API calls
- [ ] CORS errors resolved

## 🆘 Common Issues

1. **Missing CLIENT_ID**: Button will show "Configuration Error"
2. **Wrong redirect URI**: Spotify will reject the authorization
3. **Environment variables not loaded**: Check deployment configuration
4. **CORS errors**: Backend not accessible from frontend domain
5. **Localhost API calls**: Set `VITE_API_URL=https://spotify-api-drab.vercel.app`
6. **Mixed content**: Clear browser cache, check for hardcoded HTTP URLs

## 🚨 CRITICAL FIXES APPLIED

### ✅ **Fixed localhost:5000 API calls**
- Updated `frontend/src/lib/axios.ts` to detect production environment
- Removed hardcoded `FORCE_LOCALHOST = true`
- Now automatically uses production API URL in production

### ✅ **Enhanced SpotifyLogin component**
- Added configuration validation
- Better error handling and debugging
- Loading states and user feedback

### ✅ **Production environment detection**
- Automatically detects `mavrixfilms.live` domain
- Uses correct API URLs for each environment

## 📞 Support

If you're still having issues:
1. Check browser console for error messages
2. Verify all environment variables are set
3. Confirm Spotify dashboard configuration
4. **Ensure `VITE_API_URL=https://spotify-api-drab.vercel.app` is set**
5. Test with a simple redirect first
6. Clear browser cache and reload
