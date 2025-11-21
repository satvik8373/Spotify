# CarPlay & Android Auto Integration Guide

## Overview
Your Mavrixfy PWA can be integrated with CarPlay and Android Auto using Capacitor native builds.

## Prerequisites
- Capacitor installed (✓ Already configured)
- Android Studio (for Android Auto)
- Xcode (for CarPlay)
- Apple Developer Account (for CarPlay entitlement)

---

## Android Auto Integration

### 1. Install Required Dependencies
```bash
npm install @capacitor/android
npx cap add android
```

### 2. Add Android Auto Support

Create `android/app/src/main/res/xml/automotive_app_desc.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<automotiveApp>
    <uses name="media"/>
</automotiveApp>
```

### 3. Update AndroidManifest.xml
Add to `android/app/src/main/AndroidManifest.xml`:
```xml
<application>
    <!-- Existing content -->
    
    <!-- Android Auto Support -->
    <meta-data
        android:name="com.google.android.gms.car.application"
        android:resource="@xml/automotive_app_desc"/>
    
    <service
        android:name=".MediaPlaybackService"
        android:exported="true">
        <intent-filter>
            <action android:name="android.media.browse.MediaBrowserService"/>
        </intent-filter>
    </service>
</application>

<!-- Add permissions -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE"/>
<uses-permission android:name="android.permission.WAKE_LOCK"/>
```

### 4. Create Media Service
Create `android/app/src/main/java/com/mavrixfy/app/MediaPlaybackService.java`:
```java
package com.mavrixfy.app;

import android.os.Bundle;
import android.support.v4.media.MediaBrowserCompat;
import android.support.v4.media.session.MediaSessionCompat;
import androidx.media.MediaBrowserServiceCompat;
import java.util.ArrayList;
import java.util.List;

public class MediaPlaybackService extends MediaBrowserServiceCompat {
    private MediaSessionCompat mediaSession;
    
    @Override
    public void onCreate() {
        super.onCreate();
        
        // Initialize media session
        mediaSession = new MediaSessionCompat(this, "MavrixfySession");
        setSessionToken(mediaSession.getSessionToken());
        
        // Set up media session callbacks
        mediaSession.setCallback(new MediaSessionCallback());
        mediaSession.setActive(true);
    }
    
    @Override
    public BrowserRoot onGetRoot(String clientPackageName, int clientUid, Bundle rootHints) {
        return new BrowserRoot("root", null);
    }
    
    @Override
    public void onLoadChildren(String parentId, Result<List<MediaBrowserCompat.MediaItem>> result) {
        List<MediaBrowserCompat.MediaItem> mediaItems = new ArrayList<>();
        // Load your songs here from your API
        result.sendResult(mediaItems);
    }
    
    private class MediaSessionCallback extends MediaSessionCompat.Callback {
        @Override
        public void onPlay() {
            // Handle play
        }
        
        @Override
        public void onPause() {
            // Handle pause
        }
        
        @Override
        public void onSkipToNext() {
            // Handle next
        }
        
        @Override
        public void onSkipToPrevious() {
            // Handle previous
        }
    }
}
```

### 5. Build Android App
```bash
npm run build
npx cap sync android
npx cap open android
```

---

## Apple CarPlay Integration

### 1. Install iOS Dependencies
```bash
npm install @capacitor/ios
npx cap add ios
```

### 2. Request CarPlay Entitlement
1. Go to Apple Developer Portal
2. Navigate to Certificates, Identifiers & Profiles
3. Select your App ID
4. Enable "CarPlay" capability
5. Download updated provisioning profile

### 3. Update Info.plist
Add to `ios/App/App/Info.plist`:
```xml
<key>UIBackgroundModes</key>
<array>
    <string>audio</string>
</array>

<key>NSAppleMusicUsageDescription</key>
<string>Mavrixfy needs access to play music in CarPlay</string>

<key>UIRequiredDeviceCapabilities</key>
<array>
    <string>arm64</string>
</array>
```

### 4. Create CarPlay Scene Delegate
Create `ios/App/App/CarPlaySceneDelegate.swift`:
```swift
import CarPlay
import MediaPlayer

class CarPlaySceneDelegate: UIResponder, CPTemplateApplicationSceneDelegate {
    var interfaceController: CPInterfaceController?
    
    func templateApplicationScene(_ templateApplicationScene: CPTemplateApplicationScene,
                                 didConnect interfaceController: CPInterfaceController) {
        self.interfaceController = interfaceController
        
        // Create tabs
        let nowPlayingTemplate = CPNowPlayingTemplate.shared
        let libraryTemplate = createLibraryTemplate()
        
        let tabBarTemplate = CPTabBarTemplate(templates: [libraryTemplate, nowPlayingTemplate])
        interfaceController.setRootTemplate(tabBarTemplate, animated: true)
    }
    
    func createLibraryTemplate() -> CPListTemplate {
        let items = [
            CPListItem(text: "Trending", detailText: "Popular songs"),
            CPListItem(text: "Bollywood", detailText: "Hindi hits"),
            CPListItem(text: "Hollywood", detailText: "English hits"),
            CPListItem(text: "Liked Songs", detailText: "Your favorites")
        ]
        
        return CPListTemplate(title: "Library", sections: [CPListSection(items: items)])
    }
    
    func templateApplicationScene(_ templateApplicationScene: CPTemplateApplicationScene,
                                 didDisconnect interfaceController: CPInterfaceController) {
        self.interfaceController = nil
    }
}
```

### 5. Update AppDelegate
Add to `ios/App/App/AppDelegate.swift`:
```swift
import CarPlay

func application(_ application: UIApplication,
                configurationForConnecting connectingSceneSession: UISceneSession,
                options: UIScene.ConnectionOptions) -> UISceneConfiguration {
    
    if connectingSceneSession.role == .carTemplateApplication {
        let scene = UISceneConfiguration(name: "CarPlay", sessionRole: connectingSceneSession.role)
        scene.delegateClass = CarPlaySceneDelegate.self
        return scene
    }
    
    return UISceneConfiguration(name: "Default", sessionRole: connectingSceneSession.role)
}
```

### 6. Build iOS App
```bash
npm run build
npx cap sync ios
npx cap open ios
```

---

## Testing

### Android Auto Testing
1. Install Android Auto app on your phone
2. Enable Developer Mode in Android Auto settings
3. Connect phone to car or use Android Auto simulator
4. Your app should appear in the media section

### CarPlay Testing
1. Connect iPhone to CarPlay-enabled car or use Xcode simulator
2. Go to Settings > General > CarPlay
3. Select your car
4. Your app should appear in the CarPlay interface

---

## Important Notes

### Limitations:
- **UI Restrictions**: CarPlay/Android Auto have strict UI guidelines
- **No Custom UI**: You can only use provided templates
- **Audio Focus**: Must handle audio focus properly
- **Background Audio**: Requires proper background audio handling

### Required Features:
- ✓ Media playback controls
- ✓ Now playing information
- ✓ Browse library
- ✓ Search functionality
- ✓ Queue management

### Best Practices:
1. Keep UI simple and driver-friendly
2. Use large touch targets
3. Minimize driver distraction
4. Handle connectivity issues gracefully
5. Cache content for offline playback

---

## Alternative: Web-Based Solution

If native integration is too complex, you can:

1. **Optimize PWA for car browsers**
   - Large buttons (min 44x44px)
   - High contrast colors
   - Voice control support
   - Simplified navigation

2. **Use Bluetooth Audio**
   - Stream audio via Bluetooth
   - Control via car's media controls
   - Display metadata via Bluetooth AVRCP

3. **Create Car Mode UI**
   - Simplified interface for driving
   - Voice commands
   - Gesture controls
   - Auto-play features

---

## Next Steps

1. Choose your approach (Native vs Web-based)
2. Set up development environment
3. Implement media service
4. Test on actual devices
5. Submit for app store review

For native integration, I recommend starting with Android Auto as it's easier to implement and test.
