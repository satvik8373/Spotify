# Final Setup Checklist - Fix "Access Blocked" Error

## Current Status
❌ Getting "Access blocked: This app's request is invalid" from Google

## Root Causes
1. Environment variables not set in Vercel
2. Redirect URI mismatch in Google Cloud Console
3. Not added as test user
4. OAuth consent screen not configured

## Step-by-Step Fix (Do in Order)

### Step 1: Check Debug Endpoint

First, let's see what's configured:

**Visit this URL:**
```
https://spotify-api-drab.vercel.app/api/auth/google-mobile/debug
```

This will show you:
- Is GOOGLE_CLIENT_ID set?
- What's the redirect URI?
- Configuration status

**Expected output:**
```json
{
  "success": true,
  "config": {
    "clientIdConfigured": true,
    "clientIdPrefix": "816396705670-upf8vp...",
    "redirectUri": "https://spotify-api-drab.vercel.app/api/auth/google-mobile/callback"
  }
}
```

### Step 2: Add Environment Variables to Vercel

**CRITICAL**: This is likely the main issue!

1. Go to https://vercel.com/dashboard
2. Select your backend project (spotify-api-drab)
3. Click **Settings** → **Environment Variables**
4. Add these TWO variables:

   **Variable 1:**
   - Name: `GOOGLE_CLIENT_ID`
   - Value: `816396705670-upf8vphb0vfr52fk09qltluou7auemid.apps.googleusercontent.com`
   - Environment: Production, Preview, Development (select all)

   **Variable 2:**
   - Name: `GOOGLE_CLIENT_SECRET`
   - Value: `GOCSPX-****0quW` (use your full secret)
   - Environment: Production, Preview, Development (select all)

5. Click **Save**

### Step 3: Redeploy Backend

After adding environment variables:

1. Go to **Deployments** tab
2. Click the three dots (...) on the latest deployment
3. Click **Redeploy**
4. Wait 1-2 minutes for deployment to complete

### Step 4: Configure Google Cloud Console

#### A. Set Redirect URI

1. Go to https://console.cloud.google.com/apis/credentials
2. Click on your OAuth 2.0 Client ID: `816396705670-upf8vphb0vfr52fk09qltluou7auemid.apps.googleusercontent.com`
3. Under **Authorized redirect URIs**, add EXACTLY:
   ```
   https://spotify-api-drab.vercel.app/api/auth/google-mobile/callback
   ```
4. Remove any other redirect URIs that might conflict
5. Click **Save**

#### B. Configure OAuth Consent Screen

1. Go to https://console.cloud.google.com/apis/credentials/consent
2. Click **Edit App**
3. Fill in required fields:
   - **App name**: Mavrixfy
   - **User support email**: Your email
   - **Authorized domains**: Add `vercel.app` and `mavrixfy.site`
   - **Developer contact**: Your email
4. Click **Save and Continue**

#### C. Add Scopes

1. Click **Add or Remove Scopes**
2. Select these scopes:
   - `openid`
   - `email`  
   - `profile`
3. Click **Update**
4. Click **Save and Continue**

#### D. Add Test Users

**CRITICAL**: You must add yourself as a test user!

1. In the **Test users** section, click **Add Users**
2. Add your email address (the one you'll use to test)
3. Click **Save**

### Step 5: Wait and Test

Wait 2-3 minutes for all changes to propagate, then test:

**Test URL:**
```
https://spotify-api-drab.vercel.app/api/auth/google-mobile?returnUrl=https://mavrixfy.site
```

**Expected behavior:**
- Redirects to Google sign-in page
- You can sign in with your Google account
- Redirects back to mavrixfy.site with a token

## Verification Checklist

Before testing, verify ALL of these:

- [ ] GOOGLE_CLIENT_ID added to Vercel environment variables
- [ ] GOOGLE_CLIENT_SECRET added to Vercel environment variables
- [ ] Backend redeployed after adding env vars
- [ ] Debug endpoint shows clientIdConfigured: true
- [ ] Redirect URI in Google Cloud Console is EXACTLY: `https://spotify-api-drab.vercel.app/api/auth/google-mobile/callback`
- [ ] OAuth Consent Screen configured (app name, domains, etc.)
- [ ] Scopes added (openid, email, profile)
- [ ] Your email added as test user
- [ ] Waited 2-3 minutes after making changes

## Common Errors and Solutions

### Error: "Google OAuth not configured"
**Cause**: Environment variables not set in Vercel
**Solution**: Complete Step 2 and Step 3 above

### Error: "Access blocked: This app's request is invalid"
**Cause**: Usually redirect URI mismatch or missing scopes
**Solution**: 
- Verify redirect URI in Google Cloud Console matches exactly
- Make sure scopes are added (openid, email, profile)
- Check that authorized domains include `vercel.app`

### Error: "Access blocked: This app is not verified"
**Cause**: Not added as test user
**Solution**: Add your email as test user (Step 4D)

### Error: "redirect_uri_mismatch"
**Cause**: Redirect URI doesn't match
**Solution**: 
- Copy the redirect URI from debug endpoint
- Paste it EXACTLY in Google Cloud Console
- No trailing slashes, no extra characters

## Testing Flow

Once everything is configured:

1. **Test in browser first:**
   ```
   https://spotify-api-drab.vercel.app/api/auth/google-mobile?returnUrl=https://mavrixfy.site
   ```

2. **If browser works, test in Expo app:**
   - Open Expo app
   - Go to login
   - Click "Continue with Google"
   - Should work! 🎉

## Debug Commands

If still not working, check these:

**1. Check if env vars are set:**
```
https://spotify-api-drab.vercel.app/api/auth/google-mobile/debug
```

**2. Check Vercel deployment logs:**
- Go to Vercel dashboard
- Click on deployment
- Check function logs for errors

**3. Check what URL Google is receiving:**
- Open browser DevTools (F12)
- Go to Network tab
- Try the OAuth flow
- Look at the redirect to Google
- Check the URL parameters

## Expected Debug Output

After completing all steps, the debug endpoint should show:

```json
{
  "success": true,
  "config": {
    "clientIdConfigured": true,
    "clientIdPrefix": "816396705670-upf8vp...",
    "redirectUri": "https://spotify-api-drab.vercel.app/api/auth/google-mobile/callback",
    "host": "spotify-api-drab.vercel.app",
    "protocol": "https"
  },
  "instructions": {
    "step1": "Verify GOOGLE_CLIENT_ID is set in Vercel environment variables",
    "step2": "Verify GOOGLE_CLIENT_SECRET is set in Vercel environment variables",
    "step3": "Add this redirect URI to Google Cloud Console: https://spotify-api-drab.vercel.app/api/auth/google-mobile/callback",
    "step4": "Add yourself as a test user in Google OAuth Consent Screen",
    "googleCloudConsole": "https://console.cloud.google.com/apis/credentials"
  }
}
```

## Need More Help?

If you're still stuck after completing all steps:

1. Share screenshot of debug endpoint output
2. Share screenshot of Google Cloud Console redirect URIs
3. Share screenshot of Vercel environment variables (hide the secret values)
4. Share any error messages you're seeing

## Success Indicators

You'll know it's working when:
- ✅ Debug endpoint shows clientIdConfigured: true
- ✅ Test URL redirects to Google sign-in (not "Access blocked")
- ✅ You can sign in with Google
- ✅ Redirects back with id_token in URL
- ✅ Mobile app can sign in with Google

Good luck! 🚀
