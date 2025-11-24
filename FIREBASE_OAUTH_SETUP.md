# 🔥 Firebase OAuth Configuration - Quick Setup

## 🎯 Your Project Details
- **Project ID:** spotify-8fefc
- **Auth Domain:** spotify-8fefc.firebaseapp.com
- **Current Issue:** Mobile app WebView authentication

---

## ⚡ Quick Fix (5 Minutes)

### Step 1: Firebase Console - Authorized Domains
1. Go to: https://console.firebase.google.com/project/spotify-8fefc/authentication/settings
2. Scroll to **Authorized domains**
3. Click **Add domain**
4. Add these domains (one at a time):
   ```
   localhost
   spotify-8fefc.firebaseapp.com
   spotify-8fefc.web.app
   capacitor://localhost
   ```
5. If you have a custom domain, add it too

### Step 2: Google Cloud Console - OAuth Settings
1. Go to: https://console.cloud.google.com/apis/credentials
2. Select project: **spotify-8fefc**
3. Find your **OAuth 2.0 Client ID** (Web client)
4. Click on it to edit

#### Add Authorized JavaScript origins:
```
https://spotify-8fefc.firebaseapp.com
https://spotify-8fefc.web.app
http://localhost:3000
capacitor://localhost
```

#### Add Authorized redirect URIs:
```
https://spotify-8fefc.firebaseapp.com/__/auth/handler
https://spotify-8fefc.web.app/__/auth/handler
http://localhost:3000/__/auth/handler
capacitor://localhost/__/auth/handler
```

5. Click **Save**

### Step 3: Rebuild Mobile App
```bash
cd frontend
npm run build:mobile
```

---

## 🔍 Verify Configuration

### Check Firebase Console
```bash
# Your current configuration should show:
✅ Google Sign-in: Enabled
✅ Authorized domains: localhost, spotify-8fefc.firebaseapp.com, capacitor://localhost
```

### Check Google Cloud Console
```bash
# Your OAuth client should have:
✅ JavaScript origins: 4+ entries
✅ Redirect URIs: 4+ entries including capacitor://localhost
```

---

## 🧪 Test Authentication

### Test 1: Browser (Should work)
```bash
cd frontend
npm run dev
# Visit http://localhost:3000
# Click "Sign in with Google"
# Should open popup and login successfully
```

### Test 2: Mobile App
```bash
# Android
npx cap run android

# iOS
npx cap run ios

# Test login in the app
# Should open popup and login successfully
```

---

## ❌ Common Errors & Fixes

### Error: "Unauthorized domain"
**Cause:** Domain not in Firebase authorized domains
**Fix:** Add domain to Firebase Console → Authentication → Settings → Authorized domains

### Error: "Redirect URI mismatch"
**Cause:** Missing redirect URI in Google Cloud Console
**Fix:** Add `https://spotify-8fefc.firebaseapp.com/__/auth/handler` to OAuth client

### Error: "Popup blocked"
**Cause:** WebView not configured to allow popups
**Fix:** Already fixed in `capacitor.config.json` - rebuild app

### Error: "Missing initial state"
**Cause:** Using signInWithRedirect instead of signInWithPopup
**Fix:** Already fixed in code - using signInWithPopup

---

## 📱 Mobile-Specific Configuration

### Android: Enable Popups in WebView
File: `android/app/src/main/java/.../MainActivity.java`

```java
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    
    // Enable WebView debugging
    WebView.setWebContentsDebuggingEnabled(true);
    
    // Get WebView settings
    WebSettings settings = this.bridge.getWebView().getSettings();
    
    // Enable JavaScript and popups
    settings.setJavaScriptEnabled(true);
    settings.setDomStorageEnabled(true);
    settings.setJavaScriptCanOpenWindowsAutomatically(true);
    settings.setSupportMultipleWindows(true);
    
    // Allow third-party cookies for OAuth
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
      android.webkit.CookieManager.getInstance().setAcceptThirdPartyCookies(
        this.bridge.getWebView(), true
      );
    }
  }
}
```

### iOS: Configure Info.plist
File: `ios/App/App/Info.plist`

Add these entries:
```xml
<key>LSApplicationQueriesSchemes</key>
<array>
    <string>googlechrome</string>
    <string>googlechromes</string>
</array>

<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
```

---

## 🚀 Deploy Checklist

Before deploying to production:

- [ ] Firebase authorized domains configured
- [ ] Google OAuth redirect URIs configured
- [ ] Code uses `signInWithPopup` (not redirect)
- [ ] WebView cache clearing implemented
- [ ] Capacitor config updated
- [ ] Android MainActivity configured (if using Android)
- [ ] iOS Info.plist configured (if using iOS)
- [ ] Tested in browser
- [ ] Tested in mobile app
- [ ] No console errors

---

## 📞 Need Help?

### Debug Android
```bash
# View logs
adb logcat | grep -i "firebase\|auth\|google"

# Clear app data
adb shell pm clear com.mavrixfy.app
```

### Debug iOS
```bash
# View logs in Xcode
# Product → Scheme → Edit Scheme → Run → Arguments
# Add: -FIRDebugEnabled
```

### Check Network Requests
1. Open Chrome DevTools (F12)
2. Go to Network tab
3. Try to login
4. Look for failed requests to `accounts.google.com` or `firebase.googleapis.com`

---

## ✅ Success Indicators

When everything is working:
- ✅ Popup opens when clicking "Sign in with Google"
- ✅ Google account picker appears
- ✅ After selecting account, popup closes
- ✅ User is logged in
- ✅ No errors in console
- ✅ Works in both browser and mobile app

---

## 🎉 You're Done!

Your authentication should now work in:
- ✅ Desktop browsers
- ✅ Mobile browsers
- ✅ Android app (WebView)
- ✅ iOS app (WebView)
- ✅ PWA mode

Time to test: **5 minutes**
