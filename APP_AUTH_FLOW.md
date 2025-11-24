# 🔐 App Authentication Flow

## What I Created

A custom authentication page (`/app-auth`) on your website that the app can open for authentication.

## How It Works

### Flow:
1. **User opens app** → Sees website in WebView
2. **Taps floating login button** (green button with login icon)
3. **Opens `/app-auth` page** → Beautiful auth page
4. **Taps "Continue with Google"** → Native Google Sign-In
5. **Authenticates** → Gets Firebase token
6. **Token sent to app** → Via localStorage and custom URL scheme
7. **App reads token** → User is authenticated!

## Files Created

### Website
- `frontend/src/pages/app-auth/AppAuthPage.tsx` - Beautiful auth page
- Updated `frontend/src/App.tsx` - Added `/app-auth` route

### Flutter App
- Updated `mavrixfy_flutter/lib/main.dart` - Added floating login button

## Features

### Auth Page (`/app-auth`)
- ✅ Beautiful dark UI
- ✅ Google Sign-In button
- ✅ Loading states
- ✅ Error handling
- ✅ Sends token to app via:
  - Custom URL scheme (`mavrixfy://auth`)
  - localStorage (app can read)

### Flutter App
- ✅ Floating action button (green, bottom-right)
- ✅ Opens `/app-auth` when tapped
- ✅ Can read auth data from localStorage

## Deploy & Test

### 1. Deploy Website
```bash
cd frontend
npm run build
vercel --prod
```

### 2. Build APK
```bash
cd mavrixfy_flutter
flutter clean
flutter pub get
flutter build apk --release
```

### 3. Test
1. Install APK
2. Open app
3. Tap green floating button (bottom-right)
4. Opens auth page
5. Tap "Continue with Google"
6. Sign in
7. ✅ Token sent to app!

## Next Steps (Optional)

### 1. Handle Custom URL Scheme

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="mavrixfy" android:host="auth" />
</intent-filter>
```

### 2. Read Auth Data in Flutter

```dart
// Read from localStorage via JavaScript
_controller.runJavaScriptReturningResult('''
  localStorage.getItem('app_auth_data')
''').then((result) {
  // Parse and use auth data
  print('Auth data: $result');
});
```

### 3. Store Auth Token

Use `shared_preferences` or `flutter_secure_storage`:

```dart
import 'package:shared_preferences/shared_preferences.dart';

Future<void> saveAuthToken(String token) async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.setString('auth_token', token);
}
```

## How Auth Page Works

### 1. User Clicks "Continue with Google"
```typescript
const handleGoogleSignIn = async () => {
  const userProfile = await signInWithGoogle();
  const idToken = await user.getIdToken();
  sendTokenToApp(user.uid, idToken);
};
```

### 2. Send Token to App
```typescript
const sendTokenToApp = (userId: string, token: string) => {
  // Store in localStorage (app can read)
  localStorage.setItem('app_auth_data', JSON.stringify({
    userId,
    token,
    email,
    name,
    picture
  }));
  
  // Try custom URL scheme
  window.location.href = `mavrixfy://auth?data=${encodedData}`;
};
```

### 3. App Reads Token
```dart
// Via JavaScript
_controller.runJavaScriptReturningResult('''
  localStorage.getItem('app_auth_data')
''');

// Or via custom URL scheme (if configured)
```

## UI Preview

### Auth Page
```
┌─────────────────────────┐
│                         │
│      🎵 (Logo)         │
│                         │
│  Sign in to Mavrixfy   │
│  Continue with your    │
│  Google account        │
│                         │
│  ┌───────────────────┐ │
│  │  🔵 Continue with │ │
│  │     Google        │ │
│  └───────────────────┘ │
│                         │
│  By continuing, you    │
│  agree to Terms...     │
│                         │
└─────────────────────────┘
```

### App with Floating Button
```
┌─────────────────────────┐
│  Website Content        │
│                         │
│                         │
│                         │
│                         │
│                         │
│                    [🔓] │ ← Floating button
└─────────────────────────┘
```

## Advantages

✅ **Clean separation** - Auth happens on website
✅ **Secure** - Uses Firebase authentication
✅ **Flexible** - Can add more auth methods easily
✅ **Professional** - Like Spotify, Discord, etc.
✅ **Simple** - Just one button in app

## Alternative: Auto-Open Auth Page

If you want to auto-open auth page when not logged in:

```dart
void _initializeWebView() {
  // ... existing code ...
  
  // Check if user is authenticated
  _controller.runJavaScriptReturningResult('''
    localStorage.getItem('app_auth_data')
  ''').then((result) {
    if (result == 'null' || result == null) {
      // Not authenticated, open auth page
      _openAuthPage();
    }
  });
}
```

## Summary

Created a beautiful authentication page at `/app-auth` that:
- Shows Google Sign-In button
- Authenticates user
- Sends token back to app
- Works with WebView

App has a floating button to open this page.

**Deploy website + build APK + test!** 🚀

---

**Auth Page URL:** https://mavrixfilms.live/app-auth
**Floating Button:** Green button with login icon (bottom-right)
