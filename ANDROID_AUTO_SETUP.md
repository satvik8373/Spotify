# Android Auto Setup Guide

## Why Your Web App Wasn't Showing in Android Auto

Android Auto has different requirements compared to CarPlay and requires specific configurations to work with web applications.

## Issues and Solutions

### 1. **Missing Android Auto Specific Manifest Properties**
**Problem**: Basic PWA manifest wasn't optimized for Android Auto
**Solution**: Enhanced manifest.json with:
- `scope` and `lang` properties
- `display_override` for better Android Auto compatibility
- `launch_handler` for proper app launching
- `shortcuts` for quick access features
- `related_applications` configuration

### 2. **Missing Android Auto Meta Tags**
**Problem**: HTML didn't include Android Auto specific meta tags
**Solution**: Added Android Auto specific meta tags:
- `android-app-capable`
- `android-app-status-bar-style`
- `android-app-title`
- `media-session-api` support indicator

### 3. **Insufficient MediaSession API Implementation**
**Problem**: MediaSession wasn't optimized for Android Auto's requirements
**Solution**: Created dedicated `useAndroidAutoSync` hook with:
- Android Auto environment detection
- Enhanced MediaSession handlers
- Faster position updates (800ms vs 2000ms)
- Better error handling and retry logic

## Files Modified/Created

### 1. Enhanced PWA Manifest
**File**: `frontend/public/manifest.json`
- Added `scope`, `lang`, `dir` properties
- Added `display_override` for better Android Auto support
- Added `launch_handler` for proper app launching
- Added `shortcuts` for quick access to search and liked songs
- Added `related_applications` configuration

### 2. Enhanced HTML Meta Tags
**File**: `frontend/index.html`
- Added Android Auto specific meta tags
- Added media session API support indicator
- Enhanced mobile web app capabilities

### 3. New Android Auto Sync Hook
**File**: `frontend/src/hooks/useAndroidAutoSync.ts` (New)
- Detects Android Auto environment automatically
- Enhanced MediaSession implementation for Android Auto
- Faster position updates (800ms intervals)
- Better error handling and retry mechanisms
- Orientation change detection for connection/disconnection

### 4. Updated Main Audio Player
**File**: `frontend/src/layout/components/AudioPlayer.tsx`
- Integrated Android Auto sync hook
- Now supports CarPlay, lock screen, and Android Auto simultaneously

## Android Auto Detection Logic

The app now automatically detects Android Auto environment using:

1. **User Agent Detection**: Looks for 'automotive' or 'androidauto' in user agent
2. **Screen Size Detection**: Checks for large screen (≥800x480) in landscape mode
3. **WebView Detection**: Identifies Android WebView environment
4. **Orientation Detection**: Monitors for landscape orientation typical of car displays

## Key Android Auto Features

### 1. **Automatic Environment Detection**
- Detects when running in Android Auto
- Adjusts behavior automatically
- Enhanced logging for debugging

### 2. **Enhanced MediaSession Integration**
- Faster position updates (800ms vs 2000ms)
- Better metadata synchronization
- Enhanced error handling with retries
- Support for seek forward/backward

### 3. **Connection State Monitoring**
- Monitors orientation changes
- Detects Android Auto connection/disconnection
- Automatically restarts monitoring when state changes

### 4. **Optimized Audio Playback**
- Enhanced stuck playback detection
- Better resume logic after interruptions
- Improved track change handling

## How to Test Android Auto Integration

### Prerequisites
1. Android device with Android Auto app installed
2. Car with Android Auto support OR Android Auto desktop app
3. USB cable or wireless Android Auto connection

### Testing Steps

#### Method 1: Using Android Auto Desktop App
1. Download Android Auto Desktop app from Google
2. Connect your Android device via USB
3. Enable Developer Options on your Android device
4. Enable "Unknown sources" in Android Auto settings
5. Open your PWA in Chrome on your phone
6. Connect to Android Auto desktop app
7. Your web app should appear in the Android Auto interface

#### Method 2: Using Car with Android Auto
1. Connect your Android device to your car via USB or wireless
2. Open your PWA in Chrome on your phone
3. The app should appear in Android Auto's app list
4. Test media controls, track changes, and seek functionality

#### Method 3: Using Android Auto Simulator
1. Use Android Studio's Android Auto simulator
2. Connect your device to the simulator
3. Test the web app in the simulated Android Auto environment

### What to Test
1. **App Visibility**: Verify the app appears in Android Auto
2. **Media Controls**: Test play, pause, next, previous buttons
3. **Progress Bar**: Verify progress bar updates smoothly
4. **Seek Functionality**: Test seek forward/backward
5. **Track Information**: Verify song title, artist, and artwork display
6. **Connection Handling**: Test connecting/disconnecting from Android Auto

## Troubleshooting

### App Not Appearing in Android Auto
1. **Check PWA Installation**: Ensure the app is installed as a PWA on your phone
2. **Verify Manifest**: Check that manifest.json is properly configured
3. **Check Chrome Flags**: Enable "Desktop PWAs" flag in Chrome
4. **Clear Cache**: Clear Chrome cache and reinstall the PWA
5. **Check Android Auto Settings**: Ensure "Unknown sources" is enabled

### Media Controls Not Working
1. **Check MediaSession Support**: Verify browser supports MediaSession API
2. **Check Console Logs**: Look for Android Auto specific debug messages
3. **Test Audio Element**: Ensure audio element is properly configured
4. **Verify User Interaction**: Ensure user has interacted with the app

### Progress Bar Not Updating
1. **Check Position Updates**: Verify position updates are running (800ms intervals)
2. **Check MediaSession State**: Ensure MediaSession.setPositionState is working
3. **Verify Audio Duration**: Check that audio.duration is valid
4. **Check Error Logs**: Look for position state update errors

## Technical Requirements

### Browser Support
- Chrome 66+ (MediaSession API support)
- Android 6.0+ (Android Auto support)
- PWA installation capability

### Android Auto Requirements
- Android Auto app installed
- Car with Android Auto support OR Android Auto desktop app
- USB connection or wireless Android Auto capability
- "Unknown sources" enabled in Android Auto settings

### PWA Requirements
- Valid manifest.json with Android Auto optimizations
- Service Worker for offline capability
- HTTPS connection (required for PWA)
- MediaSession API implementation

## Advanced Configuration

### Custom Android Auto Behavior
You can customize Android Auto behavior by modifying the `useAndroidAutoSync` hook:

```typescript
// Adjust update frequency (default: 800ms)
const updateInterval = 800;

// Customize Android Auto detection
const detectAndroidAuto = () => {
  // Add custom detection logic
  return customDetectionLogic();
};

// Add custom MediaSession handlers
navigator.mediaSession.setActionHandler('customaction', handleCustomAction);
```

### Debug Mode
Enable debug logging by adding to your browser console:
```javascript
localStorage.setItem('androidAutoDebug', 'true');
```

This will show detailed Android Auto detection and sync information in the console.

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| MediaSession API | ✅ 66+ | ✅ 82+ | ❌ | ✅ 79+ |
| Android Auto | ✅ | ❌ | ❌ | ❌ |
| PWA Support | ✅ | ✅ | ✅ | ✅ |

**Note**: Android Auto only works with Chrome-based browsers on Android devices.

## Next Steps

1. **Test the Implementation**: Follow the testing steps above
2. **Monitor Performance**: Check console logs for any issues
3. **User Feedback**: Gather feedback from users with Android Auto
4. **Iterate**: Improve based on real-world usage patterns

Your web app should now be compatible with Android Auto and appear in the Android Auto interface when properly configured!