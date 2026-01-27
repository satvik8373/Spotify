import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';

/**
 * Enhanced lock screen sync hook with CarPlay support
 * Handles visibility changes, audio focus, and CarPlay connection states
 */
export const useLockScreenSync = () => {
  const { isPlaying, setIsPlaying } = usePlayerStore();
  const isLockScreenRef = useRef(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncTime = useRef(0);

  useEffect(() => {
    const handleVisibilityChange = () => {
      // Clear any pending sync
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }

      const now = Date.now();
      
      if (document.hidden) {
        // Going to background/lock screen/CarPlay - mark it
        isLockScreenRef.current = true;
        lastSyncTime.current = now;
        
        // Ensure MediaSession state is correct when going to background
        if ('mediaSession' in navigator) {
          const audio = document.querySelector('audio') as HTMLAudioElement;
          if (audio) {
            navigator.mediaSession.playbackState = audio.paused ? 'paused' : 'playing';
            
            // Update position state for CarPlay
            if ('setPositionState' in navigator.mediaSession && !isNaN(audio.duration)) {
              try {
                navigator.mediaSession.setPositionState({
                  duration: audio.duration || 0,
                  playbackRate: audio.playbackRate || 1,
                  position: audio.currentTime || 0
                });
              } catch (e) {
                // Ignore position state errors
              }
            }
          }
        }
      } else if (isLockScreenRef.current) {
        // Coming back from lock screen/CarPlay - sync after a delay
        const timeSinceLastSync = now - lastSyncTime.current;
        
        // Use shorter delay for recent syncs, longer for older ones
        const syncDelay = timeSinceLastSync < 5000 ? 100 : 300;
        
        syncTimeoutRef.current = setTimeout(() => {
          const audio = document.querySelector('audio') as HTMLAudioElement;
          if (audio) {
            const actuallyPlaying = !audio.paused && !audio.ended && audio.currentTime > 0;
            const store = usePlayerStore.getState();
            
            // Only update if there's a clear mismatch
            if (actuallyPlaying !== store.isPlaying) {
              store.setIsPlaying(actuallyPlaying);
              
              // Update MediaSession state
              if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = actuallyPlaying ? 'playing' : 'paused';
              }
            }
            
            // If we should be playing but audio is paused, try to resume
            if (store.isPlaying && audio.paused && !audio.ended && store.hasUserInteracted) {
              audio.play().catch(() => {
                // If play fails, update state to reflect reality
                store.setIsPlaying(false);
              });
            }
          }
          isLockScreenRef.current = false;
        }, syncDelay);
      }
    };

    // Handle audio focus changes (for CarPlay and other audio interruptions)
    const handleAudioFocusChange = () => {
      // Sync state when audio focus changes
      setTimeout(() => {
        const audio = document.querySelector('audio') as HTMLAudioElement;
        const store = usePlayerStore.getState();
        
        if (audio) {
          const actuallyPlaying = !audio.paused && !audio.ended && audio.currentTime > 0;
          
          if (actuallyPlaying !== store.isPlaying) {
            store.setIsPlaying(actuallyPlaying);
          }
        }
      }, 200);
    };

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Listen for focus changes (additional CarPlay support)
    window.addEventListener('focus', handleAudioFocusChange);
    window.addEventListener('blur', handleAudioFocusChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleAudioFocusChange);
      window.removeEventListener('blur', handleAudioFocusChange);
      
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [isPlaying, setIsPlaying]);

  // Return enhanced sync functions
  return {
    forceSyncAfterLockScreen: () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      
      const audio = document.querySelector('audio') as HTMLAudioElement;
      const store = usePlayerStore.getState();
      
      if (audio) {
        const actuallyPlaying = !audio.paused && !audio.ended && audio.currentTime > 0;
        
        if (actuallyPlaying !== store.isPlaying) {
          store.setIsPlaying(actuallyPlaying);
        }
        
        // Update MediaSession
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = actuallyPlaying ? 'playing' : 'paused';
          
          if ('setPositionState' in navigator.mediaSession && !isNaN(audio.duration)) {
            try {
              navigator.mediaSession.setPositionState({
                duration: audio.duration || 0,
                playbackRate: audio.playbackRate || 1,
                position: audio.currentTime || 0
              });
            } catch (e) {
              // Ignore position state errors
            }
          }
        }
      }
    },
    
    syncWithCarPlay: () => {
      // Force sync with CarPlay state
      const audio = document.querySelector('audio') as HTMLAudioElement;
      const store = usePlayerStore.getState();
      
      if (audio && 'mediaSession' in navigator) {
        const actuallyPlaying = !audio.paused && !audio.ended && audio.currentTime > 0;
        
        // Sync store state
        if (actuallyPlaying !== store.isPlaying) {
          store.setIsPlaying(actuallyPlaying);
        }
        
        // Sync MediaSession
        navigator.mediaSession.playbackState = actuallyPlaying ? 'playing' : 'paused';
        
        // Update position for CarPlay progress bar
        if ('setPositionState' in navigator.mediaSession && !isNaN(audio.duration)) {
          try {
            navigator.mediaSession.setPositionState({
              duration: audio.duration || 0,
              playbackRate: audio.playbackRate || 1,
              position: audio.currentTime || 0
            });
          } catch (e) {
            // Ignore position state errors
          }
        }
      }
    }
  };
};