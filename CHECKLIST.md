# ✅ WebView Authentication Fix Checklist

Print this and check off each item as you complete it.

---

## 📋 Pre-Flight Check

- [x] Code changes applied (verified by diagnostic script)
- [x] All files modified correctly
- [x] Using `signInWithPopup` (not redirect)

---

## 🔥 Firebase Console Configuration

### Part 1: Firebase Console
- [ ] Opened https://console.firebase.google.com/project/spotify-8fefc/authentication/settings
- [ ] Clicked on "Authorized domains" section
- [ ] Clicked "Add domain" button
- [ ] Added: `capacitor://localhost`
- [ ] Clicked "Add" to save
- [ ] Verified `capacitor://localhost` appears in the list

### Part 2: Google Cloud Console
- [ ] Opened https://console.cloud.google.com/apis/credentials
- [ ] Selected project: spotify-8fefc
- [ ] Found OAuth 2.0 Client ID (Web client)
- [ ] Clicked on it to edit

#### Authorized JavaScript origins:
- [ ] Added: `capacitor://localhost`
- [ ] Added: `http://localhost:3000`
- [ ] Added: `https://spotify-8fefc.firebaseapp.com`
- [ ] Added: `https://spotify-8fefc.web.app`

#### Authorized redirect URIs:
- [ ] Added: `capacitor://localhost/__/auth/handler`
- [ ] Added: `http://localhost:3000/__/auth/handler`
- [ ] Added: `https://spotify-8fefc.firebaseapp.com/__/auth/handler`
- [ ] Added: `https://spotify-8fefc.web.app/__/auth/handler`

- [ ] Clicked "Save" button
- [ ] Waited for "Saved" confirmation

---

## 🔨 Build & Deploy

### Build
- [ ] Opened terminal
- [ ] Changed to frontend directory: `cd frontend`
- [ ] Ran: `npm run build:mobile`
- [ ] Build completed without errors
- [ ] Ran: `npx cap sync`
- [ ] Sync completed without errors

### Android (if applicable)
- [ ] Ran: `npx cap open android`
- [ ] Android Studio opened
- [ ] Clicked "Run" (green play button)
- [ ] App installed on device/emulator
- [ ] App launched successfully

### iOS (if applicable)
- [ ] Ran: `npx cap open ios`
- [ ] Xcode opened
- [ ] Selected device/simulator
- [ ] Clicked "Run" (play button)
- [ ] App installed on device/simulator
- [ ] App launched successfully

---

## 🧪 Testing

### Initial Test
- [ ] App opened successfully
- [ ] Navigated to login page
- [ ] Clicked "Sign in with Google" button
- [ ] Popup opened (not full page redirect)
- [ ] Google account picker appeared
- [ ] Selected Google account
- [ ] Popup closed automatically
- [ ] User is now logged in
- [ ] User profile/name displays correctly

### Persistence Test
- [ ] Closed app completely
- [ ] Reopened app
- [ ] User is still logged in (didn't need to login again)

### Sign Out Test
- [ ] Clicked sign out button
- [ ] User signed out successfully
- [ ] Redirected to login page
- [ ] Clicked "Sign in with Google" again
- [ ] Login works again

---

## 🔍 Console Verification

### Expected Console Logs
- [ ] Saw: "🔧 Configuring WebView for authentication..."
- [ ] Saw: "✅ Auth cache cleared"
- [ ] Saw: "✅ WebView configured for authentication"
- [ ] Saw: "🔐 Starting Google sign-in with popup..."
- [ ] Saw: "✅ Google sign-in successful: [email]"
- [ ] No error messages in console

---

## 🐛 Troubleshooting (If Issues)

### If Popup Doesn't Open
- [ ] Checked Android MainActivity is configured (Android only)
- [ ] Checked iOS Info.plist is configured (iOS only)
- [ ] Rebuilt app after configuration changes
- [ ] Checked WebView console for errors

### If "Unauthorized Domain" Error
- [ ] Double-checked `capacitor://localhost` in Firebase Console
- [ ] Verified it's spelled correctly (no typos)
- [ ] Waited 5 minutes for changes to propagate
- [ ] Tried again

### If "Redirect URI Mismatch" Error
- [ ] Checked redirect URIs in Google Cloud Console
- [ ] Verified `capacitor://localhost/__/auth/handler` is added
- [ ] Clicked Save in Google Cloud Console
- [ ] Waited 5 minutes for changes to propagate
- [ ] Tried again

### If Old Code Still Running
- [ ] Cleared app data: `adb shell pm clear com.mavrixfy.app`
- [ ] Uninstalled app from device
- [ ] Ran `npm run build:mobile` again
- [ ] Ran `npx cap sync` again
- [ ] Rebuilt and reinstalled app
- [ ] Tried again

---

## 📊 Platform-Specific Checks

### Android Only
- [ ] MainActivity.java exists at: `android/app/src/main/java/com/mavrixfy/app/MainActivity.java`
- [ ] MainActivity has popup configuration (use template if needed)
- [ ] Rebuilt in Android Studio after MainActivity changes
- [ ] Checked Android Logcat for errors: `adb logcat | grep -i firebase`

### iOS Only
- [ ] Info.plist exists at: `ios/App/App/Info.plist`
- [ ] Info.plist has LSApplicationQueriesSchemes
- [ ] Rebuilt in Xcode after Info.plist changes
- [ ] Checked Xcode console for errors

---

## ✅ Final Verification

### All Platforms Working
- [ ] Desktop Chrome browser: Login works
- [ ] Desktop Firefox browser: Login works
- [ ] Mobile Safari browser: Login works
- [ ] Mobile Chrome browser: Login works
- [ ] Android app (WebView): Login works
- [ ] iOS app (WebView): Login works

### All Features Working
- [ ] Sign up with Google works
- [ ] Sign in with Google works
- [ ] Sign out works
- [ ] Login persists after app restart
- [ ] User profile displays correctly
- [ ] No console errors

---

## 🎉 Success!

If all items are checked, your WebView authentication is fully working!

**Date completed:** _______________
**Time taken:** _______________
**Issues encountered:** _______________

---

## 📞 If Still Not Working

Contact information or next steps:
1. Check `DEBUG_WEBVIEW_AUTH.md` for detailed troubleshooting
2. Run diagnostic: `node frontend/check-auth-setup.js`
3. Check console logs for specific error messages
4. Verify Firebase Console configuration one more time

---

**Most common issue:** Forgetting to add `capacitor://localhost` to Firebase Console authorized domains!
