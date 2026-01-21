# Fix: "Can't load URL - Domain not included in app's domains"

## Quick Fix Checklist

### ✅ Step 1: Configure App Domains
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Select your app
3. Go to **Settings** → **Basic**
4. In **App Domains**, add (one per line):
   ```
   localhost
   mavrixfy.site
   spotify-8fefc.firebaseapp.com
   ```

**Important:** 
- ❌ Don't include `http://` or `https://`
- ❌ Don't include port numbers like `:3000`
- ✅ Just the domain name: `localhost`, `mavrixfy.site`

### ✅ Step 2: Set Site URL
1. Go to **Facebook Login** → **Settings**
2. Set **Site URL** to:
   - Development: `http://localhost:3000`
   - Production: `https://mavrixfy.site`

### ✅ Step 3: Configure OAuth Redirect URIs
1. In **Facebook Login** → **Settings**
2. Add to **Valid OAuth Redirect URIs**:
   ```
   https://spotify-8fefc.firebaseapp.com/__/auth/handler
   http://localhost:3000/
   https://localhost:3000/
   https://mavrixfy.site/
   https://www.mavrixfy.site/
   https://mavrixfy.site/login
   https://mavrixfy.site/register
   ```

### ✅ Step 4: Save Changes
1. Click **Save Changes** in Facebook app settings
2. Wait 1-2 minutes for changes to propagate
3. Try Facebook login again

## Visual Guide

### App Domains Configuration:
```
┌─────────────────────────────────┐
│ App Domains                     │
├─────────────────────────────────┤
│ localhost                       │
│ mavrixfy.site                   │
│ spotify-8fefc.firebaseapp.com   │
└─────────────────────────────────┘
```

### Site URL Configuration:
```
┌─────────────────────────────────┐
│ Site URL                        │
├─────────────────────────────────┤
│ https://mavrixfy.site           │
└─────────────────────────────────┘
```

### OAuth Redirect URIs:
```
┌─────────────────────────────────────────────────────────┐
│ Valid OAuth Redirect URIs                               │
├─────────────────────────────────────────────────────────┤
│ https://spotify-8fefc.firebaseapp.com/__/auth/handler  │
│ http://localhost:3000/                                  │
│ https://localhost:3000/                                 │
│ https://mavrixfy.site/                                  │
│ https://www.mavrixfy.site/                              │
│ https://mavrixfy.site/login                             │
│ https://mavrixfy.site/register                          │
└─────────────────────────────────────────────────────────┘
```

## Still Having Issues?

### Check These Common Mistakes:

1. **Wrong Domain Format**
   - ❌ `http://localhost:3000` (in App Domains)
   - ✅ `localhost` (in App Domains)

2. **Missing Firebase Domain**
   - ❌ Only adding your website domain
   - ✅ Also add `spotify-8fefc.firebaseapp.com`

3. **Case Sensitivity**
   - Make sure domain names match exactly
   - Check for typos in domain names

4. **Cache Issues**
   - Clear browser cache and cookies
   - Try in incognito/private browsing mode
   - Wait 1-2 minutes after saving Facebook settings

### Test Your Configuration:

1. Open browser developer tools (F12)
2. Go to Console tab
3. Try Facebook login
4. Check for any error messages
5. Look for network requests to Facebook

## Expected Flow:

1. User clicks "Continue with Facebook"
2. Facebook popup opens
3. User sees Facebook login page (not error)
4. User logs in and grants permissions
5. Popup closes and user is authenticated

If you see the domain error, the issue is in steps 1-3, which means Facebook app configuration needs to be fixed.

## Need Help?

If you're still seeing the error after following these steps:

1. Double-check all domain configurations
2. Make sure you saved changes in Facebook app
3. Try clearing browser cache
4. Test in a different browser
5. Check that your Facebook app is in the correct mode (Development vs Live)

The error should be resolved once the domains are properly configured in your Facebook app settings.