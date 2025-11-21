# iOS PWA Audio Playback Fix Guide

## Problem
Audio playback fails on iPhone PWA due to iOS restrictions:
- iOS requires user interaction before playing audio
- Service workers can interfere with audio streaming
- Audio context must be initialized properly
- CORS and crossOrigin issues

## Solution Implemented

### 1. iOS Audio Utility (`frontend/src/utils/iosAudioFix.ts`)
Handles all iOS-specific audio requirements:
- ✅ Detects iOS devices and PWA mode
- ✅ Initializes AudioContext properly
- ✅ Configures audio elements with iOS-specific attributes
- ✅ Handles user interaction requirements
- ✅ Bypasses service worker for audio files

### 2. iOS Audio Hook (`frontend/src/hooks/useIOSAudio.ts`)
React hook for easy integration:
- ✅ Auto-initializes on mount
- ✅ Unlocks audio on first user interaction
- ✅ Handles audio interruptions
- ✅ Provides `playWithIOSFix()` helper

### 3. Service Worker Configuration (`frontend/vite.config.ts`)
Updated to not cache audio files:
- ✅ Excludes audio files from precaching
- ✅ Uses NetworkOnly for audio URLs
- ✅ Prevents service worker interference

## How to Use

### In Your Audio Player Component

```typescript
import { useIOSAudio } from '@/hooks/useIOSAudio';
import { useEffect, useRef } from 'react';

const AudioPlayer = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const { playWithIOSFix, isIOSDevice } = useIOSAudio(audioRef.current);

  const handlePlay = async () => {
    try {
      await playWithIOSFix();
    } catch (error) {
      console.error('Playback failed:', error);
    }
  };

  return (
    <div>
      <audio ref={audioRef} />
      <button onClick={handlePlay}>Play</button>
    </div>
  );
};
```

### Manual Configuration (if not using hook)

```typescript
import { 
  configureAudioForIOS, 
  playAudioForIOS,
  unlockAudioOnIOS 
} from '@/utils/iosAudioFix';

// On component mount
useEffect(() => {
  if (audioRef.current) {
    configureAudioForIOS(audioRef.current);
  }
  
  // Unlock on first user interaction
  const unlock = () => unlockAudioOnIOS();
  document.addEventListener('touchstart', unlock, { once: true });
  
  return () => {
    document.removeEventListener('touchstart', unlock);
  };
}, []);

// When playing audio
const play = async () => {
  if (audioRef.current) {
    await playAudioForIOS(audioRef.current);
  }
};
```

## Testing Checklist

### On iPhone (Safari & PWA)
- [ ] Audio plays after clicking play button
- [ ] Audio continues when screen locks
- [ ] Audio resumes after phone call
- [ ] Audio works in background
- [ ] No CORS errors in console
- [ ] Service worker doesn't block audio

### Test Scenarios
1. **First Load**: Click play → Audio should play
2. **Lock Screen**: Play audio → Lock phone → Audio continues
3. **Background**: Play audio → Switch apps → Audio continues
4. **Interruption**: Play audio → Receive call → Audio pauses → End call → Resume works
5. **Offline**: No network → Cached UI works → Audio fails gracefully

## Common Issues & Solutions

### Issue: "NotAllowedError: play() failed"
**Cause**: No user interaction before play attempt
**Solution**: Ensure play is triggered by user gesture (click, touch)

### Issue: Audio stops when screen locks
**Cause**: Audio element not configured for background playback
**Solution**: Use `configureAudioForIOS()` which sets `playsinline` attribute

### Issue: CORS errors
**Cause**: Audio source doesn't allow cross-origin requests
**Solution**: Audio element has `crossOrigin="anonymous"` set

### Issue: Service worker blocks audio
**Cause**: Service worker caching audio responses
**Solution**: Updated vite.config.ts to use NetworkOnly for audio

### Issue: Audio doesn't load
**Cause**: iOS requires metadata preload
**Solution**: Set `preload="metadata"` (done in configureAudioForIOS)

## Deployment Steps

1. **Build with updated config**:
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy to production**:
   ```bash
   # Your deployment command
   vercel --prod
   # or
   npm run deploy
   ```

3. **Clear PWA cache on devices**:
   - On iPhone: Settings → Safari → Clear History and Website Data
   - Or: Uninstall PWA and reinstall

4. **Test on actual iPhone**:
   - Open in Safari
   - Add to Home Screen
   - Test audio playback

## Additional Recommendations

### 1. Add Loading States
```typescript
const [isLoading, setIsLoading] = useState(false);

const handlePlay = async () => {
  setIsLoading(true);
  try {
    await playWithIOSFix();
  } catch (error) {
    // Show error to user
  } finally {
    setIsLoading(false);
  }
};
```

### 2. Show User Prompts
```typescript
if (error.message === 'USER_INTERACTION_REQUIRED') {
  toast.info('Tap to enable audio playback');
}
```

### 3. Handle Network Errors
```typescript
audio.addEventListener('error', (e) => {
  if (audio.error?.code === MediaError.MEDIA_ERR_NETWORK) {
    toast.error('Network error - check your connection');
  }
});
```

### 4. Implement Retry Logic
```typescript
const playWithRetry = async (maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await playWithIOSFix();
      return;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
};
```

## Browser Support

| Feature | iOS Safari | iOS PWA | Android | Desktop |
|---------|-----------|---------|---------|---------|
| Basic Playback | ✅ | ✅ | ✅ | ✅ |
| Background Audio | ✅ | ✅ | ✅ | ✅ |
| Lock Screen Controls | ✅ | ✅ | ✅ | ✅ |
| Service Worker | ⚠️ | ⚠️ | ✅ | ✅ |

⚠️ = Requires special handling (implemented)

## Resources

- [iOS Audio Best Practices](https://developer.apple.com/documentation/webkit/delivering_video_content_for_safari)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [PWA Audio Guidelines](https://web.dev/media-session/)

## Support

If audio still doesn't work after implementing these fixes:
1. Check browser console for errors
2. Verify audio URL is accessible
3. Test with different audio formats
4. Check CORS headers on audio server
5. Try disabling service worker temporarily
