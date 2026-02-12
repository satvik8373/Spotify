# Urgent Fix - Google OAuth Not Working

## Current Issues

1. ❌ **Mobile**: "Cannot GET /auth/google-mobile" - Backend not deployed
2. ❌ **Desktop**: "Error 400: redirect_uri_mismatch" - Wrong redirect URI

## Root Cause

The backend code changes were committed to Git but **Vercel hasn't deployed them yet** because:
- The backend might not be connected to auto-deploy from Git
- OR the deployment is still in progress
- OR environment variables aren't set in Vercel

## Quick Fix (Do This Now)

### Step 1: Check Vercel Deployment Status

1. Go to https://vercel.com/dashboard
2. Find your backend project (spotify-api-drab)
3. Check the **Deployments** tab
4. Look for the latest deployment - is it "Ready" or "Building"?

### Step 2: Manual Deploy via Vercel CLI

Open a NEW terminal (not the one running Expo) and run:

```bash
cd backend
vercel --prod
```

Follow the prompts:
- Login if needed
- Confirm project settings
- Wait for deployment to complete

### Step 3: Add Environment Variables in Vercel

**CRITICAL**: After deployment, add these in Vercel dashboard:

1. Go to: https://vercel.com/your-project/settings/environment-variables
2. Add:
   ```
   GOOGLE_CLIENT_ID = 816396705670-upf8vphb0vfr52fk09qltluou7auemid.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET = GOCSPX-****0quW
   ```
3. Click **Save**
4. Go to Deployments → Click "Redeploy" on latest deployment

### Step 4: Fix Redirect URI in Google Cloud Console

1. Go to [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials)
2. Click your OAuth 2.0 Client ID
3. Under **Authorized redirect URIs**, make sure you have EXACTLY:
   ```
   https://spotify-api-drab.vercel.app/api/auth/google-mobile/callback
   ```
4. Remove any other redirect URIs that might be causing conflicts
5. Click **Save**

### Step 5: Add Test User

1. Go to [OAuth Consent Screen](https://console.cloud.google.com/apis/credentials/consent)
2. Scroll to **Test users**
3. Click **Add Users**
4. Add your email address
5. Click **Save**

### Step 6: Test

After 2-3 minutes, test these URLs:

**Test 1 - Check if endpoint exists:**
```
https://spotify-api-drab.vercel.app/api/auth/google-mobile?returnUrl=test
```
Should redirect to Google (not show "Cannot GET")

**Test 2 - Check from mobile:**
Open your Expo app → Login → Click "Continue with Google"

## Alternative: Check if Backend is Connected to Git

If Vercel isn't auto-deploying:

1. Go to Vercel dashboard → Your project
2. Click **Settings** → **Git**
3. Check if it's connected to your GitHub repo
4. If not, click **Connect Git Repository**
5. Select your repo and branch (main)
6. Vercel will auto-deploy on every push

## Verification Checklist

- [ ] Backend deployed to Vercel (check deployments tab)
- [ ] Environment variables added (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
- [ ] Redirect URI in Google Cloud Console is correct
- [ ] Test user added in Google OAuth Consent Screen
- [ ] Endpoint responds (not "Cannot GET")
- [ ] Mobile app can trigger Google sign-in

## If Still Not Working

### Check Vercel Logs

1. Go to Vercel dashboard → Your project
2. Click on the latest deployment
3. Click **Functions** tab
4. Look for errors in the logs

### Check if Routes are Registered

The routes should be in `backend/src/index.js`:
```javascript
app.use("/api/auth", authRoutes);
```

This should already be there, but verify it exists.

## Expected Flow (When Working)

1. User clicks "Continue with Google" in Expo app
2. App opens browser: `https://spotify-api-drab.vercel.app/api/auth/google-mobile?returnUrl=...`
3. Backend redirects to Google OAuth
4. User signs in with Google
5. Google redirects back to: `https://spotify-api-drab.vercel.app/api/auth/google-mobile/callback`
6. Backend exchanges code for token
7. Backend redirects back to app with ID token
8. App signs in user with Firebase

## Need Help?

If you're stuck, share:
1. Screenshot of Vercel deployments page
2. Screenshot of Google Cloud Console redirect URIs
3. Any error messages from Vercel logs
