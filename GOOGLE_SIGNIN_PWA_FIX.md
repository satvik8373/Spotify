# Google Sign-In PWA/WebView Fix Guide

## Problem
Google Sign-In fails in PWA (Progressive Web App) and WebView environments with errors like:
- "Unauthorized domain"
- "Missing initial state"
- "Popup blocked"
- "Operation not supported"

## Root Cause
- `signInWithRedirect` doesn't work properly in PWA/WebView
- Redirects break the standalone app experience
- iOS PWA has strict popup policies
- WebView environments have different security contexts

## Solution Implemented

### 1. Updated Auth Service (`frontend/src/services/hybridAuthService.ts`)

**Changes Made:**
- ✅ Prioritizes `signInWithPopup` over `signInWithRedirect`
- ✅ Removes automatic fallback to redirect
- ✅ Adds PWA and iOS detection helpers
- ✅ Better error handling with user-friendly messages
- ✅ Handles redirect result for edge cases

**Key Code:**
```typescript
// Always try popup first (works best in PWA)
try {
  userCredential = await signInWithPopup(auth, provider);
} catch (popupError) {
  // Show user-friendly message instead of redirect
  if (errorMsg.includes('popup-blocked')) {
    throw new Error('Please allow popups for Google Sign-In');
  }
  throw popupError;
}
```

### 2. Firebase Console Configuration

**Required Steps:**

1. **Go to Firebase Console** → Your Project → Authentication → Settings → Authorized domains

2. **Add these domains:**
   ```
   localhost
   your-domain.com
   www.your-domain.com
   your-domain.vercel.app
   ```

3. **For iOS PWA**, also add:
   ```
   your-app-id.firebaseapp.com
   ```

4. **OAuth Consent Screen** (Google Cloud Console):
   - Go to: https://console.cloud.google.com/apis/credentials/consent
   - Add authorized domains
   - Add authorized redirect URIs:
     ```
     https://your-domain.com/__/auth/handler
     https://your-project-id.firebaseapp.com/__/auth/handler
     ```

### 3. Testing Checklist

#### Desktop Browser
- [ ] Google Sign-In works in Chrome
- [ ] Google Sign-In works in Firefox
- [ ] Google Sign-In works in Safari
- [ ] Popup opens and closes properly

#### Mobile Browser
- [ ] Works in iOS Safari
- [ ] Works in Android Chrome
- [ ] Popup doesn't get blocked

#### PWA (Installed)
- [ ] Works in iOS PWA (Add to Home Screen)
- [ ] Works in Android PWA
- [ ] No "unauthorized domain" errors
- [ ] Popup opens within app context

#### WebView
- [ ] Works in iOS WebView
- [ ] Works in Android WebView
- [ ] No CORS errors

## Common Issues & Solutions

### Issue 1: "Unauthorized domain" Error

**Cause:** Domain not added to Firebase authorized domains

**Solution:**
1. Go to Firebase Console → Authentication → Settings
2. Add your domain to "Authorized domains"
3. Wait 5-10 minutes for changes to propagate
4. Clear browser cache and try again

### Issue 2: "Popup blocked" Error

**Cause:** Browser blocking popups

**Solution:**
1. Ensure sign-in is triggered by user click (not automatic)
2. Check browser popup settings
3. Add your domain to allowed popups
4. Use `signInWithPopup` (not redirect)

### Issue 3: "Missing initial state" Error

**Cause:** Using `signInWithRedirect` in PWA

**Solution:**
- Use `signInWithPopup` instead (already implemented)
- Avoid redirect-based auth in PWA

### Issue 4: Works in browser but not in PWA

**Cause:** PWA has different security context

**Solution:**
1. Add PWA domain to Firebase authorized domains
2. Ensure OAuth consent screen has correct URIs
3. Test in actual PWA (not just browser)
4. Check service worker isn't interfering

### Issue 5: iOS PWA specific issues

**Cause:** iOS has stricter PWA policies

**Solution:**
1. Ensure popup is triggered by direct user action
2. Don't use `setTimeout` before opening popup
3. Add `display: 'popup'` to provider parameters
4. Test on actual iOS device (simulator may differ)

## Implementation Best Practices

### 1. Always Use Popup in PWA
```typescript
// ✅ Good - Works in PWA
await signInWithPopup(auth, provider);

// ❌ Bad - Breaks PWA
await signInWithRedirect(auth, provider);
```

### 2. Handle Errors Gracefully
```typescript
try {
  await signInWithPopup(auth, provider);
} catch (error) {
  if (error.message.includes('popup-blocked')) {
    toast.error('Please allow popups to sign in');
  } else {
    toast.error('Sign-in failed. Please try again.');
  }
}
```

### 3. Trigger on User Action
```typescript
// ✅ Good - Direct user click
<button onClick={handleGoogleLogin}>Sign in</button>

// ❌ Bad - Automatic/delayed
useEffect(() => {
  setTimeout(() => handleGoogleLogin(), 1000);
}, []);
```

### 4. Configure Provider Properly
```typescript
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ 
  prompt: 'select_account',
  display: 'popup' // Important for PWA
});
```

## Deployment Checklist

### Before Deploying:
- [ ] Update Firebase authorized domains
- [ ] Update OAuth consent screen
- [ ] Test in development
- [ ] Test in production URL
- [ ] Test as PWA (installed)

### After Deploying:
- [ ] Clear browser cache
- [ ] Uninstall and reinstall PWA
- [ ] Test on multiple devices
- [ ] Monitor error logs

### Firebase Console Steps:
1. **Authentication → Settings → Authorized domains**
   - Add production domain
   - Add staging domain (if any)

2. **Google Cloud Console → OAuth consent screen**
   - Add authorized domains
   - Add redirect URIs

3. **Wait 5-10 minutes** for changes to propagate

## Alternative Solutions

### Option 1: Custom OAuth Flow (Advanced)
If popup still doesn't work, implement custom OAuth:
```typescript
// Redirect to Google OAuth directly
window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?
  client_id=${CLIENT_ID}&
  redirect_uri=${REDIRECT_URI}&
  response_type=code&
  scope=email profile`;
```

### Option 2: Email/Password Only
Disable Google Sign-In in PWA and use email/password:
```typescript
if (isPWA()) {
  // Hide Google Sign-In button
  // Show only email/password form
}
```

### Option 3: Deep Link to Browser
Open Google Sign-In in system browser:
```typescript
if (isPWA()) {
  // Open in system browser
  window.open('https://your-domain.com/login', '_system');
}
```

## Monitoring & Debugging

### Enable Debug Logging
```typescript
// In development
if (import.meta.env.DEV) {
  console.log('Auth method:', isPWA() ? 'PWA' : 'Browser');
  console.log('Platform:', isIOS() ? 'iOS' : 'Other');
}
```

### Track Auth Errors
```typescript
try {
  await signInWithGoogle();
} catch (error) {
  // Send to analytics
  analytics.logEvent('auth_error', {
    method: 'google',
    error: error.message,
    isPWA: isPWA(),
    platform: navigator.userAgent
  });
}
```

### Test Matrix

| Environment | Method | Status |
|-------------|--------|--------|
| Chrome Desktop | Popup | ✅ |
| Safari Desktop | Popup | ✅ |
| iOS Safari | Popup | ✅ |
| iOS PWA | Popup | ✅ |
| Android Chrome | Popup | ✅ |
| Android PWA | Popup | ✅ |
| iOS WebView | Popup | ⚠️ |
| Android WebView | Popup | ⚠️ |

⚠️ = May require additional configuration

## Resources

- [Firebase Auth Documentation](https://firebase.google.com/docs/auth/web/google-signin)
- [PWA Best Practices](https://web.dev/pwa-checklist/)
- [OAuth 2.0 for Mobile Apps](https://developers.google.com/identity/protocols/oauth2/native-app)

## Support

If Google Sign-In still doesn't work:
1. Check Firebase Console for authorized domains
2. Verify OAuth consent screen configuration
3. Test in incognito/private mode
4. Check browser console for specific errors
5. Try on different device/browser
6. Contact Firebase Support with error details
