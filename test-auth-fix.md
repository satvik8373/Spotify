# 🧪 Authentication Fix Testing Guide

## 🎯 What to Test

This guide helps you verify that all authentication issues are fixed.

---

## ✅ Pre-Test Checklist

Before testing, ensure:
- [ ] Code changes are committed
- [ ] Frontend is built: `npm run build:mobile`
- [ ] Capacitor is synced: `npx cap sync`
- [ ] Firebase Console is configured (see FIREBASE_OAUTH_SETUP.md)
- [ ] Google Cloud Console OAuth is configured

---

## 🌐 Test 1: Desktop Browser

### Chrome/Edge/Firefox
```bash
cd frontend
npm run dev
```

1. Open http://localhost:3000
2. Click "Sign in with Google"
3. **Expected:** Popup opens with Google sign-in
4. Select a Google account
5. **Expected:** Popup closes, you're logged in
6. Check console for errors
7. **Expected:** No errors, see "✅ Google sign-in successful"

### Result:
- [ ] ✅ Popup opens
- [ ] ✅ Login successful
- [ ] ✅ No console errors
- [ ] ✅ User profile displays

---

## 📱 Test 2: Mobile Browser

### iOS Safari
1. Open Safari on iPhone
2. Go to your deployed URL or use ngrok for local testing
3. Click "Sign in with Google"
4. **Expected:** Popup or redirect to Google
5. Sign in
6. **Expected:** Return to app, logged in

### Android Chrome
1. Open Chrome on Android
2. Go to your deployed URL
3. Click "Sign in with Google"
4. **Expected:** Popup or redirect to Google
5. Sign in
6. **Expected:** Return to app, logged in

### Result:
- [ ] ✅ iOS Safari works
- [ ] ✅ Android Chrome works
- [ ] ✅ Login persists after refresh

---

## 📲 Test 3: Android App (WebView)

### Build and Run
```bash
cd frontend
npm run build:mobile
npx cap run android
```

### Test Steps
1. App opens
2. Navigate to login page
3. Click "Sign in with Google"
4. **Expected:** Popup opens with Google sign-in
5. Select account
6. **Expected:** Popup closes, logged in
7. Close app completely
8. Reopen app
9. **Expected:** Still logged in

### Debug if Issues
```bash
# View logs
adb logcat | grep -i "firebase\|auth\|google\|webview"

# Clear app data and retry
adb shell pm clear com.mavrixfy.app
```

### Result:
- [ ] ✅ Popup opens in WebView
- [ ] ✅ Login successful
- [ ] ✅ No "missing initial state" error
- [ ] ✅ Login persists after app restart
- [ ] ✅ No console errors

---

## 🍎 Test 4: iOS App (WebView)

### Build and Run
```bash
cd frontend
npm run build:mobile
npx cap run ios
```

### Test Steps
1. App opens in simulator/device
2. Navigate to login page
3. Click "Sign in with Google"
4. **Expected:** Popup opens with Google sign-in
5. Select account
6. **Expected:** Popup closes, logged in
7. Close app completely
8. Reopen app
9. **Expected:** Still logged in

### Debug if Issues
1. Open Xcode
2. View console logs
3. Look for Firebase/Auth errors

### Result:
- [ ] ✅ Popup opens in WebView
- [ ] ✅ Login successful
- [ ] ✅ No errors
- [ ] ✅ Login persists after app restart

---

## 🔄 Test 5: Cache Clearing

### Test Cache Busting
1. Login to app
2. Note the current version
3. Make a small change to code
4. Build: `npm run build:mobile`
5. Sync: `npx cap sync`
6. Open app (don't uninstall)
7. **Expected:** New code is loaded, not cached version

### Verify
```bash
# Check if cache-busting is applied
# Open dist/index.html and look for ?v= in script tags
cat frontend/dist/index.html | grep "?v="
```

### Result:
- [ ] ✅ New code loads without uninstalling app
- [ ] ✅ Cache-busting parameters present
- [ ] ✅ No stale JavaScript

---

## 🔐 Test 6: Authentication Flow

### Complete Flow Test
1. **Sign Up with Google**
   - Click "Sign up"
   - Click "Sign in with Google"
   - Select account
   - **Expected:** Account created, logged in

2. **Sign Out**
   - Click profile/menu
   - Click "Sign out"
   - **Expected:** Logged out, redirected to login

3. **Sign In with Google**
   - Click "Sign in with Google"
   - Select same account
   - **Expected:** Logged in immediately

4. **Persistence**
   - Close app/browser
   - Reopen
   - **Expected:** Still logged in

### Result:
- [ ] ✅ Sign up works
- [ ] ✅ Sign out works
- [ ] ✅ Sign in works
- [ ] ✅ Session persists

---

## 🐛 Test 7: Error Handling

### Test Error Scenarios

#### Popup Blocked
1. Manually block popups in browser
2. Try to login
3. **Expected:** Error message shown

#### Network Error
1. Disconnect internet
2. Try to login
3. **Expected:** Network error message

#### User Cancels
1. Click "Sign in with Google"
2. Close popup without selecting account
3. **Expected:** No error, can retry

### Result:
- [ ] ✅ Popup blocked error handled
- [ ] ✅ Network error handled
- [ ] ✅ User cancel handled gracefully

---

## 📊 Test 8: Performance

### Measure Login Speed
1. Open DevTools → Network tab
2. Click "Sign in with Google"
3. Measure time from click to logged in
4. **Expected:** < 3 seconds

### Check Console Logs
1. Open DevTools → Console
2. Login
3. **Expected:** See these logs:
   ```
   🔧 Configuring WebView for authentication...
   ✅ WebView configured for authentication
   🔐 Starting Google sign-in with popup...
   ✅ Google sign-in successful: user@example.com
   ```

### Result:
- [ ] ✅ Login completes in < 3 seconds
- [ ] ✅ Proper logs appear
- [ ] ✅ No error logs

---

## 🎯 Final Verification

### All Platforms Working
- [ ] ✅ Desktop Chrome
- [ ] ✅ Desktop Firefox
- [ ] ✅ Desktop Safari
- [ ] ✅ Mobile Safari (iOS)
- [ ] ✅ Mobile Chrome (Android)
- [ ] ✅ Android App (WebView)
- [ ] ✅ iOS App (WebView)
- [ ] ✅ PWA mode

### All Features Working
- [ ] ✅ Sign up with Google
- [ ] ✅ Sign in with Google
- [ ] ✅ Sign out
- [ ] ✅ Session persistence
- [ ] ✅ Profile display
- [ ] ✅ No cache issues

### No Errors
- [ ] ✅ No "missing initial state" error
- [ ] ✅ No "unauthorized domain" error
- [ ] ✅ No "popup blocked" error (unless actually blocked)
- [ ] ✅ No console errors

---

## 🎉 Success Criteria

**All tests pass = Authentication is fully fixed!**

If any test fails, check:
1. Firebase Console configuration
2. Google Cloud Console OAuth settings
3. Capacitor config
4. Android MainActivity (if Android fails)
5. iOS Info.plist (if iOS fails)

---

## 📞 Troubleshooting

### Still seeing "missing initial state"?
- You're using `signInWithRedirect` somewhere
- Search codebase: `grep -r "signInWithRedirect" frontend/src`

### Popup not opening in app?
- Check Android MainActivity has popup settings
- Check iOS Info.plist has LSApplicationQueriesSchemes
- Check capacitor.config.json has allowNavigation

### Login works in browser but not app?
- Clear app cache and data
- Rebuild: `npm run build:mobile && npx cap sync`
- Check Firebase authorized domains includes capacitor://localhost

---

## ✅ Report Template

After testing, fill this out:

```
# Authentication Fix Test Report

Date: [DATE]
Tester: [NAME]

## Desktop Browser
- Chrome: ✅/❌
- Firefox: ✅/❌
- Safari: ✅/❌

## Mobile Browser
- iOS Safari: ✅/❌
- Android Chrome: ✅/❌

## Mobile App
- Android WebView: ✅/❌
- iOS WebView: ✅/❌

## Issues Found
[List any issues]

## Overall Status
✅ All tests passed / ❌ Issues found

## Notes
[Any additional notes]
```

---

Good luck with testing! 🚀
