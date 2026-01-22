import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';

/**
 * Simplified lock screen sync hook that prevents flickering
 * Focuses on clean state management without background service interference
 */
export const useLockScreenSync = () => {
  const { isPlaying, setIsPlaying } = usePlayerStore();
  const isLockScreenRef = useRef(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleVisibilityChange = () => {
      // Clear any pending sync
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }

      if (document.hidden) {
        // Going to background/lock screen - just mark it
        isLockScreenRef.current = true;
      } else if (isLockScreenRef.current) {
        // Coming back from lock screen - sync after a delay
        
        // Use a single, clean sync after lock screen
        syncTimeoutRef.current = setTimeout(() => {
          const audio = document.querySelector('audio');
          if (audio) {
            const actuallyPlaying = !audio.paused && !audio.ended && audio.currentTime > 0;
            
            // Only update if there's a clear mismatch
            if (actuallyPlaying !== isPlaying) {
              setIsPlaying(actuallyPlaying);
            }
          }
          isLockScreenRef.current = false;
        }, 200); // Shorter, more responsive delay
      }
    };

    // Only listen for visibility changes - simpler approach
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [isPlaying, setIsPlaying]);

  // Return a function to manually sync if needed
  return {
    forceSyncAfterLockScreen: () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      
      const audio = document.querySelector('audio');
      if (audio) {
        const actuallyPlaying = !audio.paused && !audio.ended && audio.currentTime > 0;
        if (actuallyPlaying !== isPlaying) {
          setIsPlaying(actuallyPlaying);
        }
      }
      isLockScreenRef.current = false;
    }
  };
};