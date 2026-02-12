# Google Auth Quick Start - Mavrixfy Mobile App

## What Was Fixed

Your Expo mobile app couldn't authenticate with Google because:
1. Backend didn't have Google OAuth mobile endpoints
2. App was trying to use localhost instead of production URL

## What Was Added

### Backend Changes (`backend/`)
- ✅ Added `/api/auth/google-mobile` endpoint
- ✅ Added `/api/auth/google-mobile/callback` endpoint
- ✅ Updated auth controller with OAuth flow

### Mobile App Changes (`Mavrixfy_App/`)
- ✅ Updated `.env.example` with production URL
- ✅ Improved `api-config.ts` for better URL handling
- ✅ Created setup documentation

## Quick Setup (3 Steps)

### 1. Get Google OAuth Credentials

Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
- Create OAuth 2.0 Client ID (Web application)
- Add redirect URI: `https://spotify-api-drab.vercel.app/api/auth/google-mobile/callback`
- Copy Client ID and Client Secret

### 2. Configure Vercel

Add to your Vercel project environment variables:
```
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

Then redeploy your backend.

### 3. Configure Mobile App

Update `Mavrixfy_App/.env`:
```bash
EXPO_PUBLIC_DOMAIN=https://spotify-api-drab.vercel.app
```

## Test It

```bash
cd Mavrixfy_App
npx expo start
```

Open on your device → Login → Click "Continue with Google" → Should work! ✨

## Files Modified

```
backend/
├── src/controllers/auth.controller.js  (Added Google OAuth handlers)
├── src/routes/auth.route.js           (Added Google OAuth routes)
└── .env.example                        (Added Google OAuth config)

Mavrixfy_App/
├── lib/api-config.ts                   (Improved URL handling)
├── .env.example                        (Updated with production URL)
├── GOOGLE_AUTH_SETUP.md               (Detailed setup guide)
└── GOOGLE_AUTH_QUICK_START.md         (This file)
```

## Troubleshooting

**Error: "Google OAuth not configured"**
→ Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to Vercel

**Error: "Redirect URI mismatch"**
→ Check Google Cloud Console redirect URI matches exactly

**App doesn't redirect back**
→ Verify `expo-web-browser` is installed: `npx expo install expo-web-browser`

## Need Help?

Check the detailed guide: `Mavrixfy_App/GOOGLE_AUTH_SETUP.md`
