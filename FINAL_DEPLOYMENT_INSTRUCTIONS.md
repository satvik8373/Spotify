# Final Deployment Instructions - Google OAuth Setup

## ✅ All Code is Ready!

Your backend code is complete and pushed to GitHub. Now you just need to add the environment variables to Vercel.

## Critical Step: Add Environment Variables to Vercel

### Go to Vercel Dashboard

1. Visit: https://vercel.com/dashboard
2. Select your backend project: **spotify-api-drab**
3. Click **Settings** → **Environment Variables**

### Add These Two Variables

**Variable 1: GOOGLE_CLIENT_ID**
- Name: `GOOGLE_CLIENT_ID`
- Value: `[YOUR_GOOGLE_CLIENT_ID]` (Get from Google Cloud Console)
- Environment: ✅ Production ✅ Preview ✅ Development
- Click **Save**

**Variable 2: GOOGLE_CLIENT_SECRET**
- Name: `GOOGLE_CLIENT_SECRET`
- Value: `[YOUR_GOOGLE_CLIENT_SECRET]` (Get from Google Cloud Console)
- Environment: ✅ Production ✅ Preview ✅ Development
- Click **Save**

### Redeploy (CRITICAL!)

After adding the variables:

1. Go to **Deployments** tab
2. Click the three dots (...) on the latest deployment
3. Click **Redeploy**
4. Wait 2-3 minutes for deployment to complete

## Test After Deployment

### Step 1: Check Debug Endpoint

Visit:
```
https://spotify-api-drab.vercel.app/api/auth/google-mobile/debug
```

Should show:
```json
{
  "config": {
    "clientIdConfigured": true,
    "clientSecretConfigured": true,
    "protocol": "https"
  },
  "status": {
    "readyForOAuth": true,
    "missingConfig": []
  }
}
```

### Step 2: Test OAuth Flow

Visit:
```
https://spotify-api-drab.vercel.app/api/auth/google-mobile?returnUrl=https://mavrixfy.site
```

**Expected behavior:**
1. ✅ Redirects to Google sign-in
2. ✅ Sign in with your Google account
3. ✅ Redirects back to mavrixfy.site
4. ✅ URL contains `?id_token=...`

If you see the token in the URL, **Google OAuth is working!** 🎉

### Step 3: Test from Expo App

Once the browser test works:

1. Open your Expo app (make sure it's running: `npx expo start`)
2. Go to login screen
3. Click **"Continue with Google"**
4. Browser opens → Google sign-in
5. After sign-in → redirects back to app
6. You're logged in! ✨

## Troubleshooting

### If debug endpoint shows `clientSecretConfigured: false`

- You forgot to add the environment variable
- OR you forgot to redeploy after adding it
- Solution: Add the variable and redeploy

### If you get "invalid_client" error

- The Client Secret is wrong
- Solution: Double-check you copied the full secret from Google Cloud Console

### If you get "Access blocked"

- You're not added as a test user
- Solution: Go to https://console.cloud.google.com/apis/credentials/consent
- Add your email under "Test users"

## Summary

Your credentials (from Google Cloud Console):
- ✅ Client ID: `[YOUR_GOOGLE_CLIENT_ID]`
- ✅ Client Secret: `[YOUR_GOOGLE_CLIENT_SECRET]`
- ✅ Redirect URI: `https://spotify-api-drab.vercel.app/api/auth/google-mobile/callback`
- ✅ Code: Already pushed to GitHub

**What you need to do:**
1. Add the two environment variables to Vercel
2. Redeploy
3. Test!

That's it! Once you add the environment variables and redeploy, Google OAuth will work perfectly! 🚀
