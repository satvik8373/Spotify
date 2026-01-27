import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';

/**
 * CarPlay-specific sync hook to handle playback issues
 * Addresses stuck playback and progress bar sync issues
 */
export const useCarPlaySync = () => {
  const carPlaySyncInterval = useRef<NodeJS.Timeout | null>(null);
  const lastKnownPosition = useRef(0);
  const stuckDetectionCount = useRef(0);

  useEffect(() => {
    // Start CarPlay monitoring when component mounts
    const startCarPlayMonitoring = () => {
      if (carPlaySyncInterval.current) {
        clearInterval(carPlaySyncInterval.current);
      }

      carPlaySyncInterval.current = setInterval(() => {
        const audio = document.querySelector('audio') as HTMLAudioElement;
        const store = usePlayerStore.getState();
        
        if (!audio || !store.currentSong) return;

        // Check if audio is stuck (position not advancing)
        const currentPosition = audio.currentTime;
        const isPlaying = !audio.paused && !audio.ended;
        
        if (isPlaying && store.isPlaying) {
          // If position hasn't changed in 3 checks and we should be playing
          if (Math.abs(currentPosition - lastKnownPosition.current) < 0.1) {
            stuckDetectionCount.current++;
            
            if (stuckDetectionCount.current >= 3) {
              console.debug('CarPlay: Detected stuck playback, attempting recovery');
              
              // Try to recover stuck playback
              const currentTime = audio.currentTime;
              audio.pause();
              
              // Small delay then resume
              setTimeout(() => {
                if (audio && store.isPlaying) {
                  audio.currentTime = currentTime;
                  audio.play().catch((error) => {
                    console.debug('CarPlay recovery failed:', error);
                    // If recovery fails, update state to reflect reality
                    store.setIsPlaying(false);
                  });
                }
              }, 100);
              
              stuckDetectionCount.current = 0;
            }
          } else {
            // Position is advancing normally
            stuckDetectionCount.current = 0;
          }
          
          lastKnownPosition.current = currentPosition;
        }

        // Sync MediaSession position more frequently for CarPlay
        if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
          if (!isNaN(audio.duration) && audio.duration > 0) {
            try {
              navigator.mediaSession.setPositionState({
                duration: audio.duration,
                playbackRate: audio.playbackRate || 1,
                position: Math.min(currentPosition, audio.duration)
              });
            } catch (e) {
              // Ignore position state errors
            }
          }
        }

        // Ensure playback state consistency
        if (isPlaying !== store.isPlaying) {
          if (isPlaying && !store.isPlaying) {
            // Audio is playing but store thinks it's paused
            store.setIsPlaying(true);
          } else if (!isPlaying && store.isPlaying && !audio.ended) {
            // Store thinks it's playing but audio is paused (and not ended)
            if (store.hasUserInteracted) {
              // Try to resume if user has interacted
              audio.play().catch(() => {
                store.setIsPlaying(false);
              });
            } else {
              store.setIsPlaying(false);
            }
          }
        }
      }, 1000); // Check every second
    };

    // Handle CarPlay connection/disconnection events
    const handleCarPlayConnection = () => {
      console.debug('CarPlay: Connection state changed, restarting monitoring');
      startCarPlayMonitoring();
    };

    // Listen for audio output device changes (CarPlay connection)
    if ('mediaDevices' in navigator) {
      navigator.mediaDevices.addEventListener('devicechange', handleCarPlayConnection);
    }

    // Start monitoring
    startCarPlayMonitoring();

    return () => {
      if (carPlaySyncInterval.current) {
        clearInterval(carPlaySyncInterval.current);
      }
      
      if ('mediaDevices' in navigator) {
        navigator.mediaDevices.removeEventListener('devicechange', handleCarPlayConnection);
      }
    };
  }, []);

  // Manual recovery function
  const recoverStuckPlayback = () => {
    const audio = document.querySelector('audio') as HTMLAudioElement;
    const store = usePlayerStore.getState();
    
    if (audio && store.isPlaying) {
      console.debug('CarPlay: Manual recovery triggered');
      const currentTime = audio.currentTime;
      
      audio.pause();
      setTimeout(() => {
        if (audio && store.isPlaying) {
          audio.currentTime = currentTime;
          audio.play().catch((error) => {
            console.debug('Manual recovery failed:', error);
            store.setIsPlaying(false);
          });
        }
      }, 200);
    }
  };

  // Force sync with CarPlay
  const forceSyncWithCarPlay = () => {
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
      
      // Update position
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
  };

  return {
    recoverStuckPlayback,
    forceSyncWithCarPlay
  };
};