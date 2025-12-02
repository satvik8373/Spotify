# 🔍 Debug WebView Authentication Issues

## 🎯 Quick Diagnosis

Since the code changes are applied but login still doesn't work in WebView, the issue is likely one of these:

### 1. **Firebase Console Not Configured** ⚠️ MOST COMMON

**Check this first!**

Go to: https://console.firebase.google.com/project/spotify-8fefc/authentication/settings

**Required Settings:**

#### Authorized Domains (Must have these):
- ✅ `localhost`
- ✅ `spotify-8fefc.firebaseapp.com`
- ✅ `spotify-8fefc.web.app`
- ✅ **`capacitor://localhost`** ← CRITICAL for mobile app!

#### Google Cloud Console OAuth Settings:
Go to: https://console.cloud.google.com/apis/credentials

Find your OAuth 2.0 Client ID and add:

**Authorized JavaScript origins:**
```
https://spotify-8fefc.firebaseapp.com
https://spotify-8fefc.web.app
http://localhost:3000
capacitor://localhost
```

**Authorized redirect URIs:**
```
https://spotify-8fefc.firebaseapp.com/__/auth/handler
https://spotify-8fefc.web.app/__/auth/handler
http://localhost:3000/__/auth/handler
capacitor://localhost/__/auth/handler
```

---

### 2. **App Not Rebuilt After Changes**

The code changes need to be built and synced:

```bash
cd frontend
npm run build:mobile
npx cap sync
```

Then rebuild the app in Android Studio or Xcode.

---

### 3. **Android MainActivity Not Configured**

If using Android, you need to configure the MainActivity to allow popups.

**Location:** `android/app/src/main/java/com/mavrixfy/app/MainActivity.java`

Use the template from `android-MainActivity-template.java` in the root folder.

**Key settings needed:**
```java
settings.setJavaScriptCanOpenWindowsAutomatically(true);
settings.setSupportMultipleWindows(true);
cookieManager.setAcceptThirdPartyCookies(webView, true);
```

---

### 4. **iOS Info.plist Not Configured**

If using iOS, you need to configure Info.plist.

**Location:** `ios/App/App/Info.plist`

Use the template from `ios-Info-plist-additions.xml` in the root folder.

**Key settings needed:**
```xml
<key>LSApplicationQueriesSchemes</key>
<array>
    <string>googlechrome</string>
    <string>googlechromes</string>
</array>
```

---

## 🧪 Step-by-Step Debugging

### Step 1: Check Console Logs

**Android:**
```bash
adb logcat | grep -i "firebase\|auth\|google\|webview\|mavrixfy"
```

**iOS:**
Open Xcode → View → Debug Area → Show Debug Area

**Look for these errors:**
- ❌ "Unauthorized domain" → Firebase Console issue
- ❌ "Popup blocked" → MainActivity/Info.plist issue
- ❌ "Network error" → Check internet connection
- ❌ "Missing initial state" → Should be fixed, but check if using redirect

### Step 2: Test in Browser First

```bash
cd frontend
npm run dev
```

Open http://localhost:3000 and test Google login.

**If it works in browser but not in app:**
- Issue is WebView-specific
- Check MainActivity (Android) or Info.plist (iOS)
- Check Firebase authorized domains includes `capacitor://localhost`

**If it doesn't work in browser either:**
- Issue is Firebase Console configuration
- Check authorized domains
- Check OAuth redirect URIs

### Step 3: Enable WebView Debugging

**Android:**
1. Connect device via USB
2. Open Chrome on desktop
3. Go to `chrome://inspect`
4. Find your app
5. Click "Inspect"
6. Try to login and watch console

**iOS:**
1. Connect device via USB
2. Open Safari on Mac
3. Go to Develop → [Your Device] → [Your App]
4. Try to login and watch console

### Step 4: Check Network Requests

In the WebView inspector:
1. Go to Network tab
2. Click "Sign in with Google"
3. Look for failed requests

**Common failures:**
- Request to `accounts.google.com` blocked → Check allowNavigation
- Request to `firebase.googleapis.com` blocked → Check allowNavigation
- 401/403 errors → Check Firebase Console configuration

---

## 🔧 Common Fixes

### Fix 1: Firebase Console (Most Common)

```bash
# Checklist:
□ Logged into Firebase Console
□ Selected project: spotify-8fefc
□ Went to Authentication → Settings
□ Added "capacitor://localhost" to authorized domains
□ Went to Google Cloud Console
□ Added JavaScript origins
□ Added redirect URIs
□ Clicked Save
```

### Fix 2: Rebuild App

```bash
# Clear everything and rebuild
cd frontend
rm -rf dist node_modules
npm install
npm run build:mobile

# Sync with Capacitor
npx cap sync

# Android: Open in Android Studio and rebuild
npx cap open android

# iOS: Open in Xcode and rebuild
npx cap open ios
```

### Fix 3: Configure Android MainActivity

1. Copy `android-MainActivity-template.java` content
2. Open `android/app/src/main/java/com/mavrixfy/app/MainActivity.java`
3. Replace with template content
4. Rebuild in Android Studio

### Fix 4: Configure iOS Info.plist

1. Open `ios-Info-plist-additions.xml`
2. Copy the XML entries
3. Open `ios/App/App/Info.plist` in Xcode
4. Add the entries
5. Rebuild in Xcode

---

## 📊 Diagnostic Checklist

Run through this checklist:

### Code Changes
- [x] `capacitor.config.json` updated
- [x] `frontend/index.html` has cache headers
- [x] `frontend/src/utils/webViewDetection.ts` exists
- [x] `frontend/src/services/hybridAuthService.ts` imports WebView utils
- [x] `frontend/src/main.tsx` initializes WebView config

### Firebase Configuration
- [ ] Firebase Console: `capacitor://localhost` in authorized domains
- [ ] Google Cloud Console: JavaScript origins added
- [ ] Google Cloud Console: Redirect URIs added
- [ ] Google Sign-in method is enabled

### Build & Deploy
- [ ] Ran `npm run build:mobile`
- [ ] Ran `npx cap sync`
- [ ] Rebuilt app in Android Studio/Xcode
- [ ] Installed fresh build on device

### Platform-Specific
- [ ] Android: MainActivity configured (if Android)
- [ ] iOS: Info.plist configured (if iOS)
- [ ] WebView debugging enabled
- [ ] Can inspect WebView console

### Testing
- [ ] Login works in desktop browser
- [ ] Login works in mobile browser
- [ ] Can see console logs in WebView inspector
- [ ] No network errors in Network tab

---

## 🎯 What Error Are You Seeing?

### Error: "Popup blocked"
**Cause:** WebView not configured to allow popups
**Fix:** Configure MainActivity (Android) or Info.plist (iOS)

### Error: "Unauthorized domain"
**Cause:** Domain not in Firebase authorized domains
**Fix:** Add `capacitor://localhost` to Firebase Console

### Error: "Redirect URI mismatch"
**Cause:** Missing redirect URI in Google Cloud Console
**Fix:** Add `capacitor://localhost/__/auth/handler`

### Error: Nothing happens when clicking button
**Cause:** JavaScript error or popup blocked silently
**Fix:** Check WebView console for errors

### Error: "Network error"
**Cause:** Request blocked by WebView
**Fix:** Check `allowNavigation` in capacitor.config.json

---

## 🚀 Quick Test Script

Create a test to verify everything:

```bash
# 1. Check if files exist
ls frontend/src/utils/webViewDetection.ts
ls frontend/scripts/add-cache-busting.js

# 2. Check if imports are correct
grep "isWebView\|clearAuthCache" frontend/src/services/hybridAuthService.ts

# 3. Check capacitor config
grep "allowNavigation" capacitor.config.json

# 4. Build and test
cd frontend
npm run build:mobile
npx cap sync
npx cap run android  # or ios
```

---

## 📞 Still Not Working?

If you've done all of the above and it still doesn't work, provide:

1. **What error message do you see?**
   - In WebView console
   - In Android Logcat / iOS Console
   - In Network tab

2. **What happens when you click "Sign in with Google"?**
   - Nothing
   - Popup opens but closes immediately
   - Popup opens but shows error
   - Page redirects instead of popup

3. **Does it work in browser?**
   - Yes → WebView-specific issue
   - No → Firebase Console issue

4. **Platform?**
   - Android
   - iOS
   - Both

5. **Have you configured Firebase Console?**
   - Added `capacitor://localhost` to authorized domains?
   - Added redirect URIs to Google Cloud Console?

---

## ✅ Success Indicators

When everything is working, you should see:

**Console logs:**
```
🔧 Configuring WebView for authentication...
✅ Auth cache cleared
✅ WebView configured for authentication
🌍 Environment Info: { isWebView: true, ... }
🔧 Using WebView-optimized Google sign-in
🔐 Starting Google sign-in with popup...
✅ Google sign-in successful: user@example.com
```

**User experience:**
1. Click "Sign in with Google"
2. Popup opens with Google sign-in
3. Select account
4. Popup closes
5. User is logged in ✅

---

**Most likely issue:** Firebase Console not configured with `capacitor://localhost`

**Fix:** Follow Step 1 above and add the domain to Firebase Console.
