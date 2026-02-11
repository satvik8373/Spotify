# iOS PWA Crash Fixes

## Problem
The app was crashing in iOS PWA standalone mode with "Something went wrong" errors after being added to the home screen.

## Root Causes Identified

1. **localStorage/sessionStorage failures** - iOS PWA has strict storage quotas and can fail silently
2. **Service Worker conflicts** - iOS has limited SW support in standalone mode
3. **Unhandled promise rejections** - Network errors and storage errors weren't caught
4. **Memory pressure** - iOS aggressively manages memory in PWA mode

## Solutions Implemented

### 1. iOS-Safe Storage Handler (`iosStorageHandler.ts`)
- Detects when localStorage/sessionStorage fails
- Automatically falls back to in-memory storage
- Handles QuotaExceededError by clearing old cache
- Prevents app crashes from storage failures

### 2. Enhanced Error Boundary (`ErrorBoundary.tsx`)
- Detects iOS PWA mode specifically
- Provides iOS-specific recovery instructions
- Saves error state to sessionStorage for recovery
- Offers "Go Home" option in addition to reload

### 3. Global Error Handlers (`main.tsx`)
- Catches all unhandled errors and promise rejections
- iOS-specific error recovery for common issues
- Prevents default error handling that causes crashes
- Handles network and storage errors gracefully

### 4. Service Worker Optimization (`service-worker.js`)
- Detects iOS and uses simpler caching strategy
- Skips aggressive caching on iOS to prevent quota issues
- Network-first approach for iOS to avoid stale cache
- Minimal static file caching

### 5. Recovery Component (`IOSPWARecovery.tsx`)
- Monitors for repeated errors
- Detects storage quota issues
- Provides user-friendly recovery UI
- Can clear cache and reload automatically

### 6. Updated Storage Utils (`storageUtils.ts`)
- All storage operations now use iOS-safe wrappers
- Never throws errors, always returns fallback values
- Integrated with in-memory fallback system

### 7. Manifest Updates (`manifest.json`)
- Changed `client_mode` to `focus-existing` for better iOS handling
- Simplified `display_override` to just `standalone`
- Added `?source=pwa` to start_url for tracking

## Testing Checklist

### iOS Safari (Standalone Mode)
- [ ] Add to Home Screen
- [ ] Open from home screen
- [ ] Navigate between pages
- [ ] Play music
- [ ] Like songs/playlists
- [ ] Search functionality
- [ ] Close and reopen app
- [ ] Test with airplane mode
- [ ] Test with low storage
- [ ] Force quit and reopen

### Expected Behavior
- App should never show "Something went wrong" on normal usage
- If errors occur, recovery UI should appear
- Storage failures should fall back to memory
- Network errors should be handled gracefully
- App should survive force quit and reopen

## Monitoring

Check browser console for these messages:
- `localStorage not available, using memory fallback` - Storage fallback working
- `iOS PWA mode detected` - iOS detection working
- `Storage error in iOS PWA - attempting recovery` - Recovery triggered

## Additional Recommendations

1. **Test on real iOS devices** - Simulator doesn't replicate all PWA behaviors
2. **Monitor error logs** - Set up error tracking (Sentry, LogRocket, etc.)
3. **Periodic cache cleanup** - Implement automatic cleanup of old data
4. **User education** - Add help section about closing/reopening app if issues persist

## Files Modified

- `frontend/src/components/ErrorBoundary.tsx` - Enhanced error handling
- `frontend/src/main.tsx` - Global error handlers
- `frontend/src/utils/iosStorageHandler.ts` - NEW: iOS-safe storage
- `frontend/src/utils/storageUtils.ts` - Updated to use safe storage
- `frontend/src/components/IOSPWARecovery.tsx` - NEW: Recovery UI
- `frontend/src/App.tsx` - Added recovery component
- `frontend/src/contexts/AuthContext.tsx` - Uses safe storage
- `frontend/public/service-worker.js` - iOS-optimized caching
- `frontend/public/manifest.json` - iOS-friendly settings

## Performance Impact

- Minimal - fallback storage only used when needed
- No impact on non-iOS devices
- Slightly reduced caching on iOS (intentional for stability)

## Future Improvements

1. Implement IndexedDB fallback for larger data
2. Add telemetry to track iOS-specific issues
3. Periodic health checks for storage availability
4. User preference to disable SW on iOS if needed
