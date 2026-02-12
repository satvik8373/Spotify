# Fix Google "Access Blocked" Error

## Problem
Google is blocking access because your OAuth app is in "Testing" mode and needs proper configuration.

## Quick Fix (5 Minutes)

### Step 1: Configure OAuth Consent Screen

1. Go to [Google Cloud Console - OAuth Consent Screen](https://console.cloud.google.com/apis/credentials/consent)

2. **User Type**: Select **External** (unless you have a Google Workspace)

3. Click **Edit App**

4. Fill in required fields:
   - **App name**: `Mavrixfy`
   - **User support email**: Your email
   - **App logo**: (optional, can skip)
   - **Application home page**: `https://mavrixfy.site`
   - **Application privacy policy link**: `https://mavrixfy.site/privacy` (create a simple privacy page)
   - **Application terms of service link**: `https://mavrixfy.site/terms` (create a simple terms page)
   - **Authorized domains**: Add `mavrixfy.site` and `vercel.app`
   - **Developer contact information**: Your email

5. Click **Save and Continue**

### Step 2: Add Scopes

1. Click **Add or Remove Scopes**
2. Add these scopes:
   - `openid`
   - `email`
   - `profile`
3. Click **Update** then **Save and Continue**

### Step 3: Add Test Users (Important!)

1. In the **Test users** section, click **Add Users**
2. Add your email address (the one you'll use to test)
3. Add any other email addresses that need to test the app
4. Click **Save and Continue**

### Step 4: Verify OAuth Client Configuration

1. Go to [Credentials](https://console.cloud.google.com/apis/credentials)
2. Click on your OAuth 2.0 Client ID
3. Verify these settings:

   **Authorized JavaScript origins:**
   ```
   https://spotify-api-drab.vercel.app
   https://mavrixfy.site
   ```

   **Authorized redirect URIs:**
   ```
   https://spotify-api-drab.vercel.app/api/auth/google-mobile/callback
   ```

4. Click **Save**

### Step 5: Test Again

Wait 1-2 minutes for changes to propagate, then test:

```
https://spotify-api-drab.vercel.app/api/auth/google-mobile?returnUrl=test
```

You should now see the Google sign-in page instead of "Access Blocked"!

## Alternative: Publish Your App (For Production)

If you want anyone to use Google login (not just test users):

1. Go to [OAuth Consent Screen](https://console.cloud.google.com/apis/credentials/consent)
2. Click **Publish App**
3. Google will review your app (can take a few days)

**Note**: For testing and development, adding test users is sufficient!

## Common Issues

### Issue: Still seeing "Access Blocked"

**Solutions:**
1. Make sure you added your email as a test user
2. Clear browser cache and cookies
3. Try in incognito/private mode
4. Wait 5 minutes for Google's changes to propagate

### Issue: "Redirect URI mismatch"

**Solution:**
Make sure the redirect URI in Google Cloud Console exactly matches:
```
https://spotify-api-drab.vercel.app/api/auth/google-mobile/callback
```

### Issue: "App domain not verified"

**Solution:**
1. Go to OAuth Consent Screen
2. Under "Authorized domains", add:
   - `vercel.app`
   - `mavrixfy.site`

## Testing Checklist

- [ ] OAuth Consent Screen configured
- [ ] Test users added (your email)
- [ ] Scopes added (openid, email, profile)
- [ ] Redirect URI configured correctly
- [ ] Authorized domains added
- [ ] Environment variables in Vercel (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
- [ ] Backend redeployed on Vercel

## For Mobile App Testing

Once Google OAuth is working in the browser, it will work in your Expo app too!

Test flow:
1. Open Expo app
2. Go to login
3. Click "Continue with Google"
4. Browser opens → Google sign-in
5. After sign-in → redirects back to app
6. You're logged in! ✨

## Need Help?

If you're still stuck:
1. Check Google Cloud Console logs
2. Check Vercel deployment logs
3. Verify all environment variables are set
4. Make sure you're using a test user email

## Privacy & Terms Pages (Quick Setup)

If you don't have privacy/terms pages yet, create simple ones:

**Privacy Policy** (`https://mavrixfy.site/privacy`):
```
Privacy Policy for Mavrixfy

We collect email and profile information via Google OAuth for authentication purposes only.
We do not share your data with third parties.
Contact: [your-email]
```

**Terms of Service** (`https://mavrixfy.site/terms`):
```
Terms of Service for Mavrixfy

By using Mavrixfy, you agree to use the service responsibly.
We reserve the right to terminate accounts that violate our policies.
Contact: [your-email]
```

These can be simple text pages for testing purposes.
