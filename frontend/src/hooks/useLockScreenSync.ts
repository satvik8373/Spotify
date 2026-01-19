import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';

/**
 * Hook to handle lock screen scenarios and prevent flickering
 * This hook specifically deals with the state synchronization issues
 * that occur when the device is locked/unlocked
 */
export const useLockScreenSync = () => {
  const { isPlaying, setIsPlaying } = usePlayerStore();
  const lockScreenTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isHandlingLockScreenRef = useRef(false);

  useEffect(() => {
    const handleVisibilityChange = () => {
      // Clear any existing timeout
      if (lockScreenTimeoutRef.current) {
        clearTimeout(lockScreenTimeoutRef.current);
      }

      if (document.hidden) {
        // Device is being locked or app is going to background
        isHandlingLockScreenRef.current = true;
        console.log('Lock screen detected - preserving audio state');
      } else {
        // Device is being unlocked or app is coming to foreground
        if (isHandlingLockScreenRef.current) {
          console.log('Unlock screen detected - syncing audio state');
          
          // Add a longer delay to prevent flickering after lock screen
          lockScreenTimeoutRef.current = setTimeout(() => {
            const audio = document.querySelector('audio');
            if (audio) {
              const actuallyPlaying = !audio.paused && !audio.ended;
              
              // Only update if there's a real mismatch
              if (actuallyPlaying !== isPlaying) {
                console.log('Correcting state after lock screen:', { 
                  actuallyPlaying, 
                  storeIsPlaying: isPlaying 
                });
                setIsPlaying(actuallyPlaying);
              }
            }
            
            isHandlingLockScreenRef.current = false;
          }, 300); // Longer delay for lock screen scenarios
        }
      }
    };

    // Listen for page visibility changes (lock screen events)
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Also listen for focus events as backup
    const handleFocus = () => {
      if (isHandlingLockScreenRef.current) {
        // Add extra delay for focus events after lock screen
        setTimeout(() => {
          const audio = document.querySelector('audio');
          if (audio) {
            const actuallyPlaying = !audio.paused && !audio.ended;
            if (actuallyPlaying !== isPlaying) {
              setIsPlaying(actuallyPlaying);
            }
          }
          isHandlingLockScreenRef.current = false;
        }, 500);
      }
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      
      if (lockScreenTimeoutRef.current) {
        clearTimeout(lockScreenTimeoutRef.current);
      }
    };
  }, [isPlaying, setIsPlaying]);
};