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
    
    if (isAndroidAutoConnected.current) {
      console.debug('Android Auto environment detected');
    }

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
          
          // Update playback state
          navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
          
          // Update position state more frequently for Android Auto
          if ('setPositionState' in navigator.mediaSession && !isNaN(audio.duration)) {
            try {
              navigator.mediaSession.setPositionState({
                duration: audio.duration || 0,
                playbackRate: audio.playbackRate || 1,
                position: Math.min(audio.currentTime || 0, audio.duration || 0)
              });
            } catch (e) {
              // Ignore position state errors
            }
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
              console.debug('Android Auto metadata update failed:', e);
            }
          }
        }

        // Android Auto specific state synchronization
        if (isAndroidAutoConnected.current) {
          const actuallyPlaying = !audio.paused && !audio.ended && audio.currentTime > 0;
          
          if (actuallyPlaying !== store.isPlaying) {
            store.setIsPlaying(actuallyPlaying);
          }
          
          // Handle stuck playback in Android Auto
          if (store.isPlaying && audio.paused && !audio.ended && store.hasUserInteracted) {
            console.debug('Android Auto: Attempting to resume paused audio');
            audio.play().catch((error) => {
              console.debug('Android Auto resume failed:', error);
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
        console.debug('Android Auto connection state changed:', isAndroidAutoConnected.current);
        
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

  // Enhanced MediaSession action handlers for Android Auto
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    // Android Auto optimized action handlers
    const handlePlay = () => {
      const store = usePlayerStore.getState();
      store.setUserInteracted();
      store.setIsPlaying(true);
      
      const audio = document.querySelector('audio') as HTMLAudioElement;
      if (audio && audio.paused) {
        audio.play().catch((error) => {
          console.debug('Android Auto play failed:', error);
          // Retry with a delay for Android Auto
          setTimeout(() => {
            if (audio && audio.paused) {
              audio.play().catch(() => {
                store.setIsPlaying(false);
              });
            }
          }, 200);
        });
      }
    };

    const handlePause = () => {
      const store = usePlayerStore.getState();
      store.setIsPlaying(false);
      
      const audio = document.querySelector('audio') as HTMLAudioElement;
      if (audio && !audio.paused) {
        audio.pause();
      }
    };

    const handlePreviousTrack = () => {
      const store = usePlayerStore.getState();
      store.setUserInteracted();
      if (store.playPrevious) {
        store.playPrevious();
        
        // Ensure playback continues after track change in Android Auto
        setTimeout(() => {
          const audio = document.querySelector('audio') as HTMLAudioElement;
          if (audio && audio.paused && !audio.ended) {
            store.setIsPlaying(true);
            audio.play().catch(() => {});
          }
        }, 300);
      }
    };

    const handleNextTrack = () => {
      const store = usePlayerStore.getState();
      store.setUserInteracted();
      store.playNext();
      store.setIsPlaying(true);

      // Enhanced reliability for Android Auto
      setTimeout(() => {
        const audio = document.querySelector('audio') as HTMLAudioElement;
        if (audio && audio.paused && !audio.ended) {
          audio.play().catch((error) => {
            console.debug('Android Auto next track play failed:', error);
            // Additional retry for Android Auto
            setTimeout(() => {
              if (audio && audio.paused && !audio.ended) {
                audio.play().catch(() => {});
              }
            }, 500);
          });
        }
      }, 150);
    };

    const handleSeekTo = (details: MediaSessionActionDetails) => {
      const audio = document.querySelector('audio') as HTMLAudioElement;
      if (audio && details.seekTime !== undefined) {
        const seekTime = Math.max(0, Math.min(details.seekTime, audio.duration || 0));
        audio.currentTime = seekTime;
        
        const store = usePlayerStore.getState();
        if (store.setCurrentTime) {
          store.setCurrentTime(seekTime);
        }

        // Update position state immediately for Android Auto
        if ('setPositionState' in navigator.mediaSession) {
          try {
            navigator.mediaSession.setPositionState({
              duration: audio.duration || 0,
              playbackRate: audio.playbackRate || 1,
              position: seekTime
            });
          } catch (e) {
            // Ignore position state errors
          }
        }

        // Ensure playback continues after seek in Android Auto
        if (store.isPlaying && audio.paused) {
          audio.play().catch(() => {});
        }
      }
    };

    // Set up action handlers
    try {
      navigator.mediaSession.setActionHandler('play', handlePlay);
      navigator.mediaSession.setActionHandler('pause', handlePause);
      navigator.mediaSession.setActionHandler('previoustrack', handlePreviousTrack);
      navigator.mediaSession.setActionHandler('nexttrack', handleNextTrack);
      navigator.mediaSession.setActionHandler('seekto', handleSeekTo);
      
      // Android Auto specific handlers
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const audio = document.querySelector('audio') as HTMLAudioElement;
        if (audio) {
          const seekOffset = details.seekOffset || 10;
          const newTime = Math.max(0, audio.currentTime - seekOffset);
          audio.currentTime = newTime;
          
          const store = usePlayerStore.getState();
          if (store.setCurrentTime) {
            store.setCurrentTime(newTime);
          }
        }
      });

      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const audio = document.querySelector('audio') as HTMLAudioElement;
        if (audio) {
          const seekOffset = details.seekOffset || 10;
          const newTime = Math.min(audio.duration || 0, audio.currentTime + seekOffset);
          audio.currentTime = newTime;
          
          const store = usePlayerStore.getState();
          if (store.setCurrentTime) {
            store.setCurrentTime(newTime);
          }
        }
      });
    } catch (error) {
      console.debug('Android Auto MediaSession setup failed:', error);
    }

    return () => {
      // Cleanup handlers
      try {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('seekto', null);
        navigator.mediaSession.setActionHandler('seekbackward', null);
        navigator.mediaSession.setActionHandler('seekforward', null);
      } catch (error) {
        console.debug('Android Auto MediaSession cleanup failed:', error);
      }
    };
  }, []);

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