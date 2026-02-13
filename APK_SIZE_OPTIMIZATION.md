# APK Size Optimization Guide

Your APK is 125 MB due to several issues. Here's how to reduce it to ~30-40 MB.

## 🔴 Critical Issues Found

### 1. Server Dependencies in Mobile App (20-30 MB)
Your mobile app includes server-side code that should NOT be bundled:
- `express` - Web server (not needed in mobile)
- `pg` (PostgreSQL) - Database driver (not needed in mobile)
- `drizzle-orm` + `drizzle-kit` - ORM (not needed in mobile)
- `http-proxy-middleware` - Server middleware (not needed in mobile)
- `tsx` - TypeScript executor (not needed in mobile)
- `ws` - WebSocket server (not needed in mobile)

### 2. Firebase Web SDK (10-15 MB)
Using full Firebase web SDK instead of React Native Firebase

### 3. No Code Splitting
Everything bundled together without optimization

## ✅ Solutions Applied

### Metro Config Optimizations
- ✅ Drop console.logs in production
- ✅ Block server directories from bundle
- ✅ Exclude database files

### EAS Build Optimizations
- ✅ App Bundle format (Google Play optimizes per device)
- ✅ Production environment variables
- ✅ Build caching

### App.json Optimizations (Already Applied)
- ✅ Hermes engine enabled
- ✅ Proguard enabled
- ✅ Resource shrinking enabled

## 🚀 Required Actions

### Step 1: Move Server Dependencies to devDependencies

Edit `Mavrixfy_App/package.json` and move these to `devDependencies`:

```json
"devDependencies": {
  // ... existing devDependencies
  "express": "^5.0.1",
  "pg": "^8.16.3",
  "drizzle-orm": "^0.39.3",
  "drizzle-kit": "^0.31.4",
  "http-proxy-middleware": "^3.0.5",
  "tsx": "^4.20.6",
  "ws": "^8.18.0"
}
```

Remove them from `dependencies`.

### Step 2: Use React Native Firebase (Optional but Recommended)

Replace `firebase` web SDK with React Native Firebase:

```bash
cd Mavrixfy_App
npm uninstall firebase
npx expo install @react-native-firebase/app @react-native-firebase/auth
```

This reduces Firebase from 10-15 MB to 2-3 MB.

### Step 3: Clean Install

```bash
cd Mavrixfy_App
rm -rf node_modules package-lock.json
npm install
```

### Step 4: Rebuild

```bash
eas build --platform android --profile production --clear-cache
```

## 📊 Expected Results

| Component | Before | After | Savings |
|-----------|--------|-------|---------|
| Server deps | 25 MB | 0 MB | -25 MB |
| Firebase | 12 MB | 3 MB | -9 MB |
| Optimizations | - | - | -15 MB |
| **Total** | **125 MB** | **35-45 MB** | **-80 MB** |

## 🔍 Additional Optimizations

### Remove Unused Expo Packages

Check if you're actually using all these:
- `expo-location` - GPS location
- `expo-image-picker` - Camera/gallery
- `expo-haptics` - Vibration
- `expo-blur` - Blur effects
- `expo-glass-effect` - Glass morphism

Remove unused ones:
```bash
npm uninstall expo-location expo-haptics
```

### Analyze Bundle Size

```bash
cd Mavrixfy_App
npx expo export --platform android
npx react-native-bundle-visualizer
```

### Enable Split APKs (Alternative to AAB)

If you want separate APKs per architecture in `eas.json`:

```json
"production": {
  "android": {
    "buildType": "apk",
    "gradleCommand": ":app:assembleRelease"
  }
}
```

Then configure in `android/app/build.gradle`:
```gradle
splits {
  abi {
    enable true
    reset()
    include "armeabi-v7a", "arm64-v8a", "x86", "x86_64"
    universalApk false
  }
}
```

This creates 4 APKs of ~25-30 MB each instead of one 125 MB APK.

## 📝 Notes

- App Bundle (AAB) is recommended for Google Play - it automatically optimizes per device
- If distributing outside Play Store, use split APKs
- Always test after removing dependencies to ensure app still works
- Server code should run separately, not bundled in mobile app
