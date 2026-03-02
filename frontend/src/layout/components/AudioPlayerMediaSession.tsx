import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { resolveArtist } from '@/lib/resolveArtist';

// Check if MediaSession API is supported
const isMediaSessionSupported = () => {
  return 'mediaSession' in navigator;
};

interface AudioPlayerMediaSessionProps {
  currentSong: any;
  isPlaying: boolean;
  audioRef: React.RefObject<HTMLAudioElement>;
}

const AudioPlayerMediaSession: React.FC<AudioPlayerMediaSessionProps> = ({
  currentSong,
  isPlaying,
  audioRef
}) => {
  const mediaSessionInitialized = useRef(false);

  // Initialize MediaSession handlers once
  useEffect(() => {
    if (!isMediaSessionSupported() || mediaSessionInitialized.current) {
      return;
    }

    mediaSessionInitialized.current = true;
    
    // Prevent multiple rapid calls
    let isHandlingAction = false;

    // Register action handlers once
    navigator.mediaSession.setActionHandler('play', () => {
      if (isHandlingAction) return;
      isHandlingAction = true;
      
      const store = usePlayerStore.getState();
      store.setUserInteracted();
      
      // Get the actual audio element from DOM for reliability
      const audio = document.querySelector('audio') as HTMLAudioElement;
      if (audio && audio.paused && !audio.ended) {
        audio.play()
          .then(() => {
            store.setIsPlaying(true);
            isHandlingAction = false;
          })
          .catch(() => {
            // Single retry for Bluetooth devices
            setTimeout(() => {
              if (audio && audio.paused && !audio.ended) {
                audio.play()
                  .then(() => store.setIsPlaying(true))
                  .catch(() => store.setIsPlaying(false))
                  .finally(() => { isHandlingAction = false; });
              } else {
                isHandlingAction = false;
              }
            }, 150);
          });
      } else {
        store.setIsPlaying(true);
        isHandlingAction = false;
      }
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      if (isHandlingAction) return;
      isHandlingAction = true;
      
      const store = usePlayerStore.getState();
      store.setIsPlaying(false);
      
      // Get the actual audio element from DOM for reliability
      const audio = document.querySelector('audio') as HTMLAudioElement;
      if (audio && !audio.paused) {
        audio.pause();
      }
      
      setTimeout(() => { isHandlingAction = false; }, 100);
    });

    navigator.mediaSession.setActionHandler('previoustrack', () => {
      if (isHandlingAction) return;
      isHandlingAction = true;
      
      const store = usePlayerStore.getState();
      store.setUserInteracted();
      if (store.playPrevious) {
        store.playPrevious();
        
        // Ensure playback continues after track change
        setTimeout(() => {
          const audio = document.querySelector('audio') as HTMLAudioElement;
          if (audio && audio.paused && !audio.ended && store.isPlaying) {
            audio.play().catch(() => {});
          }
          isHandlingAction = false;
        }, 250);
      } else {
        isHandlingAction = false;
      }
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      if (isHandlingAction) return;
      isHandlingAction = true;
      
      const store = usePlayerStore.getState();
      store.setUserInteracted();
      store.playNext();

      // Enhanced reliability for Bluetooth devices
      setTimeout(() => {
        const audio = document.querySelector('audio') as HTMLAudioElement;
        if (audio && audio.paused && !audio.ended && store.isPlaying) {
          audio.play()
            .then(() => { isHandlingAction = false; })
            .catch(() => {
              // Single retry for Bluetooth devices
              setTimeout(() => {
                if (audio && audio.paused && !audio.ended) {
                  audio.play()
                    .catch(() => {})
                    .finally(() => { isHandlingAction = false; });
                } else {
                  isHandlingAction = false;
                }
              }, 200);
            });
        } else {
          isHandlingAction = false;
        }
      }, 150);
    });

    // Seeking handler with improved CarPlay compatibility
    try {
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        // Get the actual audio element from DOM for reliability
        const audio = document.querySelector('audio') as HTMLAudioElement;
        if (audio && details.seekTime !== undefined) {
          const seekTime = Math.max(0, Math.min(details.seekTime, audio.duration || 0));
          audio.currentTime = seekTime;
          
          const store = usePlayerStore.getState();
          if (store.setCurrentTime) {
            store.setCurrentTime(seekTime);
          }

          // Update position state immediately after seeking for CarPlay
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

          // If we were playing, ensure playback continues after seek
          if (store.isPlaying && audio.paused) {
            audio.play().catch(() => {});
          }
        }
      });

      // Add support for seeking backward/forward (CarPlay specific)
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const audio = document.querySelector('audio') as HTMLAudioElement;
        if (audio) {
          const seekOffset = details.seekOffset || 10; // Default 10 seconds
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
          const seekOffset = details.seekOffset || 10; // Default 10 seconds
          const newTime = Math.min(audio.duration || 0, audio.currentTime + seekOffset);
          audio.currentTime = newTime;
          
          const store = usePlayerStore.getState();
          if (store.setCurrentTime) {
            store.setCurrentTime(newTime);
          }
        }
      });
    } catch (error) {
      // Seek handlers setup failed
    }

    return () => {
      // Cleanup handlers on unmount
      if (isMediaSessionSupported()) {
        try {
          navigator.mediaSession.setActionHandler('play', null);
          navigator.mediaSession.setActionHandler('pause', null);
          navigator.mediaSession.setActionHandler('previoustrack', null);
          navigator.mediaSession.setActionHandler('nexttrack', null);
          navigator.mediaSession.setActionHandler('seekto', null);
          navigator.mediaSession.setActionHandler('seekbackward', null);
          navigator.mediaSession.setActionHandler('seekforward', null);
        } catch (error) {
          // MediaSession cleanup failed
        }
      }
    };
  }, [audioRef]);

  // Update MediaSession metadata when song changes
  useEffect(() => {
    if (!isMediaSessionSupported() || !currentSong) {
      return;
    }

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title || 'Unknown Title',
        artist: resolveArtist(currentSong),
        album: currentSong.albumId ? String(currentSong.albumId) : 'Unknown Album',
        artwork: [
          {
            src: currentSong.imageUrl || 'https://cdn.iconscout.com/icon/free/png-256/free-music-1779799-1513951.png',
            sizes: '512x512',
            type: 'image/jpeg'
          }
        ]
      });
    } catch (error) {
      // Silent error handling
    }
  }, [currentSong]);

  // Update playback state
  useEffect(() => {
    if (isMediaSessionSupported()) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  // Update position state more frequently for better CarPlay/lock screen sync
  useEffect(() => {
    if (!isMediaSessionSupported() || !currentSong) return;

    let positionUpdateInterval: NodeJS.Timeout | null = null;

    const updatePositionState = () => {
      // Get the actual audio element from DOM to ensure we have the right reference
      const audio = document.querySelector('audio') as HTMLAudioElement;
      if (audio && 'setPositionState' in navigator.mediaSession) {
        try {
          const duration = audio.duration || 0;
          const position = audio.currentTime || 0;
          const playbackRate = audio.playbackRate || 1;

          // Only update if we have valid values
          if (!isNaN(duration) && !isNaN(position) && duration > 0) {
            navigator.mediaSession.setPositionState({
              duration,
              playbackRate,
              position: Math.min(position, duration) // Ensure position doesn't exceed duration
            });
          }
        } catch (e) {
          // Ignore position state errors
        }
      }
    };

    if (isPlaying) {
      // Update immediately when playback starts
      updatePositionState();
      
      // Update every 500ms for smooth progress bar in CarPlay/lock screen
      positionUpdateInterval = setInterval(updatePositionState, 500);
    } else {
      // Update once when paused to ensure correct state
      updatePositionState();
    }

    return () => {
      if (positionUpdateInterval) {
        clearInterval(positionUpdateInterval);
      }
    };
  }, [isPlaying, currentSong]);

  return null; // This component doesn't render anything
};

export default AudioPlayerMediaSession;