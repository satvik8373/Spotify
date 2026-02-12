# Fix OAuth Client Setup - Use the Correct Client

## What I See in Your Screenshot

You have multiple OAuth clients:
- ✅ **Web client** (created April 23, 2025) - This is the one you should use
- ❌ Android clients - These won't work for your backend
- ❌ iOS client - This won't work for your backend

## The Problem

You're probably using the wrong Client ID or the Web client doesn't have the correct redirect URI configured.

## Solution: Configure the Web Client

### Step 1: Click on the Web Client

1. In your Google Cloud Console (the screenshot you showed)
2. Click on **"Web client (auto created by Google Service)"**
3. This will open the configuration page

### Step 2: Verify and Update Configuration

On the Web client configuration page, you should see:

**Authorized JavaScript origins:**
```
https://spotify-api-drab.vercel.app
https://mavrixfy.site
```

**Authorized redirect URIs:**
```
https://spotify-api-drab.vercel.app/api/auth/google-mobile/callback
```

### Step 3: Get the Correct Client ID and Secret

From the Web client configuration page:

1. Copy the **Client ID** (should start with `816396705670-`)
2. Copy the **Client Secret** (should start with `GOCSPX-`)

### Step 4: Update Vercel Environment Variables

Make sure these match in Vercel:

1. Go to https://vercel.com/dashboard
2. Select your backend project
3. **Settings** → **Environment Variables**
4. Update or add:
   - `GOOGLE_CLIENT_ID` = The Client ID from the Web client
   - `GOOGLE_CLIENT_SECRET` = The Client Secret from the Web client
5. Make sure to select **Production, Preview, Development** for both
6. Click **Save**

### Step 5: Redeploy

1. Go to **Deployments** tab
2. Click the three dots on the latest deployment
3. Click **Redeploy**
4. Wait 2 minutes

### Step 6: Test

After redeployment:

1. Check debug endpoint:
   ```
   https://spotify-api-drab.vercel.app/api/auth/google-mobile/debug
   ```
   
   Should show:
   ```json
   {
     "config": {
       "clientSecretConfigured": true,
       "protocol": "https"
     },
     "status": {
       "readyForOAuth": true,
       "missingConfig": []
     }
   }
   ```

2. Test OAuth flow:
   ```
   https://spotify-api-drab.vercel.app/api/auth/google-mobile?returnUrl=https://mavrixfy.site
   ```

## Common Issues

### Issue: "Failed to get ID token from Google"

**Possible causes:**
1. ❌ Using Android/iOS client instead of Web client
2. ❌ Client Secret not set in Vercel
3. ❌ Wrong Client ID/Secret in Vercel
4. ❌ Redirect URI not configured in Web client

**Solution:**
- Make sure you're using the **Web client** credentials
- Verify redirect URI is exactly: `https://spotify-api-drab.vercel.app/api/auth/google-mobile/callback`
- No trailing slashes, no extra characters

### Issue: "redirect_uri_mismatch"

**Solution:**
- The redirect URI in Google Cloud Console must EXACTLY match what the backend sends
- Check the debug endpoint to see what redirect URI the backend is using
- Copy that exact URI to Google Cloud Console

## Which Client Type to Use?

For your backend OAuth flow, you MUST use:
- ✅ **Web application** client type

Do NOT use:
- ❌ Android client
- ❌ iOS client  
- ❌ Desktop client

## Verification Checklist

Before testing:

- [ ] Using the Web client (not Android/iOS)
- [ ] Web client has redirect URI: `https://spotify-api-drab.vercel.app/api/auth/google-mobile/callback`
- [ ] Copied Client ID from Web client to Vercel
- [ ] Copied Client Secret from Web client to Vercel
- [ ] Redeployed backend after updating env vars
- [ ] Debug endpoint shows `readyForOAuth: true`
- [ ] Protocol is `https` (not `http`)

## Quick Test

After completing all steps, this should work:

```
https://spotify-api-drab.vercel.app/api/auth/google-mobile?returnUrl=https://mavrixfy.site
```

Should:
1. Redirect to Google sign-in
2. After sign-in, redirect to callback
3. Exchange code for token
4. Redirect to mavrixfy.site with `?id_token=...`

If you see the token in the URL, it's working! 🎉

## Need the Exact Steps?

1. Click "Web client" in your Google Cloud Console
2. Copy the Client ID and Client Secret
3. Add them to Vercel environment variables
4. Redeploy
5. Test

That's it!
