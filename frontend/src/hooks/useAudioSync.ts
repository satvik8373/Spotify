import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';

/**
 * Unified Audio Sync Hook
 * Consolidates all audio synchronization logic to prevent conflicts
 * between different platform-specific hooks
 */
export const useAudioSync = () => {
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncTime = useRef(0);
  const isSyncing = useRef(false);

  useEffect(() => {
    // Single unified sync interval
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
    }

    syncIntervalRef.current = setInterval(() => {
      // Prevent overlapping syncs
      if (isSyncing.current) return;
      
      const now = Date.now();
      // Throttle to max once per 500ms
      if (now - lastSyncTime.current < 500) return;
      
      isSyncing.current = true;
      lastSyncTime.current = now;

      try {
        const audio = document.querySelector('audio') as HTMLAudioElement;
        const store = usePlayerStore.getState();
        
        if (!audio || !store.currentSong) {
          isSyncing.current = false;
          return;
        }

        const actuallyPlaying = !audio.paused && !audio.ended && audio.currentTime > 0;
        const shouldBePlaying = store.isPlaying;
        
        // Only sync if there's a mismatch and no interruption in progress
        if (actuallyPlaying !== shouldBePlaying && !store.wasPlayingBeforeInterruption) {
          // Update store to match reality
          if (actuallyPlaying !== shouldBePlaying) {
            store.setIsPlaying(actuallyPlaying);
          }
        }

        // Update MediaSession if available
        if ('mediaSession' in navigator) {
          const currentState = navigator.mediaSession.playbackState;
          const expectedState = actuallyPlaying ? 'playing' : 'paused';
          
          if (currentState !== expectedState) {
            navigator.mediaSession.playbackState = expectedState;
          }
        }
      } catch (error) {
        // Audio sync error
      } finally {
        isSyncing.current = false;
      }
    }, 1000); // Check every second

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, []);

  return {
    isSyncing: isSyncing.current
  };
};
