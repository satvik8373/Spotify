# Deploy Backend with Google OAuth - Quick Guide

## Your Google OAuth Credentials (Added to backend/.env)
✅ Client ID: `816396705670-upf8vphb0vfr52fk09qltluou7auemid.apps.googleusercontent.com`
✅ Client Secret: `GOCSPX-****0quW`

## Deploy Options

### Option 1: Git Push (Easiest - Auto Deploy)

If your backend is connected to a Git repository:

```bash
# In the root directory
git add .
git commit -m "Add Google OAuth mobile endpoints"
git push
```

Vercel will automatically deploy your changes.

### Option 2: Vercel Dashboard (Manual)

1. Go to https://vercel.com/dashboard
2. Find your backend project (spotify-api-drab)
3. Go to **Settings** → **Environment Variables**
4. Add these two variables:
   ```
   GOOGLE_CLIENT_ID = 816396705670-upf8vphb0vfr52fk09qltluou7auemid.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET = GOCSPX-****0quW
   ```
5. Go to **Deployments** tab
6. Click the three dots on the latest deployment
7. Click **Redeploy**

### Option 3: Vercel CLI

Open a new terminal and run:

```bash
cd backend
vercel --prod
```

If prompted, follow the authentication steps.

## After Deployment

### 1. Verify the Endpoint Works

Open this URL in your browser:
```
https://spotify-api-drab.vercel.app/api/auth/google-mobile?returnUrl=test
```

You should be redirected to Google sign-in (not see "Cannot GET").

### 2. Configure Google Cloud Console

Make sure your redirect URI is added:

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Click on your OAuth 2.0 Client ID
3. Under **Authorized redirect URIs**, add:
   ```
   https://spotify-api-drab.vercel.app/api/auth/google-mobile/callback
   ```
4. Click **Save**

### 3. Test on Mobile App

1. Make sure your Expo app is running (`npx expo start`)
2. Open the app on your device
3. Go to login screen
4. Click "Continue with Google"
5. Should now work! 🎉

## Troubleshooting

**Still getting "Cannot GET"?**
- Wait 1-2 minutes for deployment to complete
- Check Vercel deployment logs
- Verify environment variables are set

**"Redirect URI mismatch"?**
- Double-check the redirect URI in Google Cloud Console
- Make sure it's exactly: `https://spotify-api-drab.vercel.app/api/auth/google-mobile/callback`

**"Google OAuth not configured"?**
- Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are in Vercel
- Redeploy after adding environment variables

## Files Changed (Already Done ✅)

- ✅ `backend/src/controllers/auth.controller.js` - Added OAuth handlers
- ✅ `backend/src/routes/auth.route.js` - Added routes
- ✅ `backend/.env` - Added Google credentials
- ✅ `Mavrixfy_App/lib/api-config.ts` - Updated URL handling
- ✅ `Mavrixfy_App/.env.example` - Updated with production URL

## Next: Deploy Now!

Choose one of the options above and deploy. The easiest is Option 1 (Git push) if you have Git set up.
