import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';

/**
 * Android Auto specific sync hook
 * Handles Android Auto integration and media controls
 */
export const useAndroidAutoSync = () => {
  const androidAutoSyncInterval = useRef<NodeJS.Timeout | null>(null);
  const isAndroidAutoConnected = useRef(false);

  // Detect if running in Android Auto environment
  const detectAndroidAuto = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isAndroidWebView = userAgent.includes('wv') || userAgent.includes('android');
    const hasLargeScreen = window.screen.width >= 800 && window.screen.height >= 480;
    
    // Check for Android Auto specific indicators
    const isLandscape = window.screen.width > window.screen.height;
    const hasAndroidAutoUA = userAgent.includes('androidauto') || userAgent.includes('automotive');
    
    return (isAndroidWebView && hasLargeScreen && isLandscape) || hasAndroidAutoUA;
  };

  useEffect(() => {
    // Check if we're in Android Auto environment
    isAndroidAutoConnected.current = detectAndroidAuto();
    
    // Android Auto environment detection complete

    const startAndroidAutoMonitoring = () => {
      if (androidAutoSyncInterval.current) {
        clearInterval(androidAutoSyncInterval.current);
      }

      androidAutoSyncInterval.current = setInterval(() => {
        const audio = document.querySelector('audio') as HTMLAudioElement;
        const store = usePlayerStore.getState();
        
        if (!audio || !store.currentSong) return;

        // Enhanced MediaSession updates for Android Auto
        if ('mediaSession' in navigator) {
          const isPlaying = !audio.paused && !audio.ended;
          
          // Update playback state only if changed
          if (navigator.mediaSession.playbackState !== (isPlaying ? 'playing' : 'paused')) {
            navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
          }

          // Ensure metadata is always up to date for Android Auto
          if (store.currentSong && navigator.mediaSession.metadata?.title !== store.currentSong.title) {
            try {
              navigator.mediaSession.metadata = new MediaMetadata({
                title: store.currentSong.title || 'Unknown Title',
                artist: store.currentSong.artist || 'Unknown Artist',
                album: store.currentSong.albumId ? String(store.currentSong.albumId) : 'Unknown Album',
                artwork: [
                  {
                    src: store.currentSong.imageUrl || 'https://cdn.iconscout.com/icon/free/png-256/free-music-1779799-1513951.png',
                    sizes: '512x512',
                    type: 'image/jpeg'
                  },
                  {
                    src: store.currentSong.imageUrl || 'https://cdn.iconscout.com/icon/free/png-256/free-music-1779799-1513951.png',
                    sizes: '256x256',
                    type: 'image/jpeg'
                  },
                  {
                    src: store.currentSong.imageUrl || 'https://cdn.iconscout.com/icon/free/png-256/free-music-1779799-1513951.png',
                    sizes: '128x128',
                    type: 'image/jpeg'
                  }
                ]
              });
            } catch (e) {
              // Ignore metadata update errors
            }
          }
        }

        // Android Auto specific state synchronization (but don't fight with MediaSession handlers)
        if (isAndroidAutoConnected.current) {
          const actuallyPlaying = !audio.paused && !audio.ended && audio.currentTime > 0;
          
          // Only sync if there's a clear mismatch and no user action in progress
          if (actuallyPlaying !== store.isPlaying && !store.wasPlayingBeforeInterruption) {
            store.setIsPlaying(actuallyPlaying);
          }
          
          // Handle stuck playback in Android Auto
          if (store.isPlaying && audio.paused && !audio.ended && store.hasUserInteracted) {
            audio.play().catch(() => {
              store.setIsPlaying(false);
            });
          }
        }
      }, 800); // Slightly faster updates for Android Auto
    };

    // Handle orientation changes (Android Auto connection/disconnection)
    const handleOrientationChange = () => {
      const wasConnected = isAndroidAutoConnected.current;
      isAndroidAutoConnected.current = detectAndroidAuto();
      
      if (wasConnected !== isAndroidAutoConnected.current) {
        // Restart monitoring with new state
        startAndroidAutoMonitoring();
        
        // Force sync MediaSession when connecting/disconnecting
        setTimeout(() => {
          const audio = document.querySelector('audio') as HTMLAudioElement;
          const store = usePlayerStore.getState();
          
          if (audio && store.currentSong && 'mediaSession' in navigator) {
            navigator.mediaSession.playbackState = audio.paused ? 'paused' : 'playing';
            
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
        }, 500);
      }
    };

    // Listen for orientation changes and resize events
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);

    // Start monitoring
    startAndroidAutoMonitoring();

    return () => {
      if (androidAutoSyncInterval.current) {
        clearInterval(androidAutoSyncInterval.current);
      }
      
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, []);

  // MediaSession action handlers are owned by AudioPlayerMediaSession.tsx.
  // This hook remains read-only for sync/recovery to avoid handler conflicts.

  return {
    isAndroidAutoConnected: isAndroidAutoConnected.current,
    forceAndroidAutoSync: () => {
      const audio = document.querySelector('audio') as HTMLAudioElement;
      const store = usePlayerStore.getState();
      
      if (audio && store.currentSong && 'mediaSession' in navigator) {
        const actuallyPlaying = !audio.paused && !audio.ended && audio.currentTime > 0;
        
        // Sync store state
        if (actuallyPlaying !== store.isPlaying) {
          store.setIsPlaying(actuallyPlaying);
        }
        
        // Sync MediaSession
        navigator.mediaSession.playbackState = actuallyPlaying ? 'playing' : 'paused';
        
        // Update position and metadata
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
