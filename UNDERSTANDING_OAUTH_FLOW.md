# Understanding the Google OAuth Flow

## Why "Authorization code not provided"?

You're seeing this error because you visited the **callback URL directly** in your browser. The callback URL should ONLY be accessed by Google after authentication.

## The Correct OAuth Flow

```
1. User clicks "Sign in with Google"
   ↓
2. App redirects to: /api/auth/google-mobile?returnUrl=...
   ↓
3. Backend redirects to Google OAuth
   ↓
4. User signs in with Google
   ↓
5. Google redirects to: /api/auth/google-mobile/callback?code=...
   ↓
6. Backend exchanges code for ID token
   ↓
7. Backend redirects back to app with ID token
   ↓
8. App uses ID token to sign in with Firebase
```

## How to Test Properly

### Option 1: Use the Test HTML Page

1. Open `TEST_GOOGLE_AUTH.html` in your browser
2. Click "Test Google Sign-In"
3. Sign in with Google
4. You should be redirected back with a token

### Option 2: Test from Your Expo App

This is the real test:

1. Make sure Expo is running: `npx expo start`
2. Open app on your device
3. Go to login screen
4. Click "Continue with Google"
5. Browser opens and redirects to Google
6. Sign in with Google
7. Should redirect back to app and sign you in

### Option 3: Test with cURL

```bash
# This will show you the redirect URL
curl -I "https://spotify-api-drab.vercel.app/api/auth/google-mobile?returnUrl=test"
```

You should see a `Location:` header pointing to Google OAuth.

## What Each URL Does

### `/api/auth/google-mobile?returnUrl=...`
**Purpose**: Entry point for OAuth flow
**What it does**: 
- Validates returnUrl parameter
- Constructs Google OAuth URL
- Redirects browser to Google sign-in

**Test it**:
```
https://spotify-api-drab.vercel.app/api/auth/google-mobile?returnUrl=https://mavrixfy.site
```
Should redirect to Google sign-in page.

### `/api/auth/google-mobile/callback?code=...`
**Purpose**: Callback endpoint for Google
**What it does**:
- Receives authorization code from Google
- Exchanges code for ID token
- Redirects back to your app with token

**DON'T visit this directly!** Google will call it automatically.

## Current Status Check

Let's verify everything is set up:

### ✅ Backend Deployed
- Code is on Vercel
- Endpoints are accessible

### ⚠️ Need to Verify

1. **Environment Variables in Vercel**
   ```
   GOOGLE_CLIENT_ID = 816396705670-upf8vphb0vfr52fk09qltluou7auemid.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET = GOCSPX-****0quW
   ```

2. **Google Cloud Console - Redirect URI**
   ```
   https://spotify-api-drab.vercel.app/api/auth/google-mobile/callback
   ```

3. **Google Cloud Console - Test Users**
   - Your email must be added as a test user

## Test Right Now

### Step 1: Test the Entry Point

Open this URL in your browser:
```
https://spotify-api-drab.vercel.app/api/auth/google-mobile?returnUrl=https://mavrixfy.site
```

**Expected**: Should redirect to Google sign-in page

**If you see an error**, it means:
- ❌ "Google OAuth not configured" → Environment variables not set in Vercel
- ❌ "Access Blocked" → You're not added as a test user
- ❌ "redirect_uri_mismatch" → Redirect URI wrong in Google Cloud Console

### Step 2: Complete the Sign-In

1. Sign in with your Google account
2. You should be redirected to `https://mavrixfy.site?id_token=...`
3. If you see the token in the URL, **OAuth is working!** ✅

### Step 3: Test from Mobile App

Now that OAuth works in the browser, test from your Expo app:

1. Open Expo app
2. Login screen → "Continue with Google"
3. Should open browser, sign in, redirect back
4. You're signed in! 🎉

## Common Issues

### Issue: "Authorization code not provided"
**Cause**: You visited the callback URL directly
**Solution**: Don't visit `/callback` directly. Start from `/google-mobile?returnUrl=...`

### Issue: "Access Blocked"
**Cause**: Not added as test user
**Solution**: 
1. Go to https://console.cloud.google.com/apis/credentials/consent
2. Add your email under "Test users"

### Issue: "redirect_uri_mismatch"
**Cause**: Redirect URI doesn't match Google Cloud Console
**Solution**: 
1. Go to https://console.cloud.google.com/apis/credentials
2. Edit your OAuth Client ID
3. Make sure redirect URI is exactly:
   ```
   https://spotify-api-drab.vercel.app/api/auth/google-mobile/callback
   ```

### Issue: "Google OAuth not configured"
**Cause**: Environment variables not set in Vercel
**Solution**:
1. Go to Vercel dashboard → Your project
2. Settings → Environment Variables
3. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
4. Redeploy

## Verification Checklist

Before testing from mobile:

- [ ] Environment variables added to Vercel
- [ ] Vercel redeployed after adding env vars
- [ ] Redirect URI correct in Google Cloud Console
- [ ] Test user added (your email)
- [ ] Entry point URL redirects to Google (test in browser)
- [ ] Can complete sign-in flow in browser
- [ ] Expo app has correct EXPO_PUBLIC_DOMAIN in .env

## Next Steps

Once the browser test works:
1. The mobile app will work the same way
2. Test from Expo app
3. Enjoy Google sign-in! 🎉

## Debug Tips

If something doesn't work:

1. **Check Vercel Logs**
   - Go to Vercel dashboard
   - Click on deployment
   - Check function logs

2. **Check Browser Console**
   - Open DevTools (F12)
   - Look for errors or redirects

3. **Check Network Tab**
   - See what URLs are being called
   - Check response codes

4. **Test Each Step**
   - Entry point → Should redirect to Google
   - Google sign-in → Should redirect to callback
   - Callback → Should redirect to your app with token
