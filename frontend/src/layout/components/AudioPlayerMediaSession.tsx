import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { resolveArtist } from '@/lib/resolveArtist';

// Check if MediaSession API is supported
const isMediaSessionSupported = () => {
  return 'mediaSession' in navigator;
};

const safeSetActionHandler = (action: MediaSessionAction, handler: any) => {
  try {
    navigator.mediaSession.setActionHandler(action, handler);
  } catch (_error) {
    // Ignore unsupported action handlers on some browsers/iOS versions.
  }
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
    const getAudioElement = (): HTMLAudioElement | null => {
      return audioRef.current ?? (document.querySelector('audio') as HTMLAudioElement | null);
    };

    const ensurePlaybackContinues = (onDone: () => void) => {
      const retryDelays = [180, 350, 700, 1200];
      let retryIndex = 0;

      const attemptPlay = () => {
        const store = usePlayerStore.getState();
        const audio = getAudioElement();

        if (!audio || !store.isPlaying || audio.ended) {
          onDone();
          return;
        }

        if (!audio.paused) {
          onDone();
          return;
        }

        audio.play()
          .then(() => onDone())
          .catch(() => {
            retryIndex += 1;
            if (retryIndex >= retryDelays.length) {
              onDone();
              return;
            }
            setTimeout(attemptPlay, retryDelays[retryIndex]);
          });
      };

      setTimeout(attemptPlay, retryDelays[0]);
    };

    // Register action handlers once
    safeSetActionHandler('play', () => {
      if (isHandlingAction) return;
      isHandlingAction = true;
      
      const store = usePlayerStore.getState();
      store.setUserInteracted();
      
      const audio = getAudioElement();
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

    safeSetActionHandler('pause', () => {
      if (isHandlingAction) return;
      isHandlingAction = true;
      
      const store = usePlayerStore.getState();
      store.setIsPlaying(false);
      
      const audio = getAudioElement();
      if (audio && !audio.paused) {
        audio.pause();
      }
      
      setTimeout(() => { isHandlingAction = false; }, 100);
    });

    safeSetActionHandler('previoustrack', () => {
      if (isHandlingAction) return;
      isHandlingAction = true;
      
      const store = usePlayerStore.getState();
      store.setUserInteracted();
      if (store.playPrevious) {
        store.playPrevious();
        ensurePlaybackContinues(() => { isHandlingAction = false; });
      } else {
        isHandlingAction = false;
      }
    });

    safeSetActionHandler('nexttrack', () => {
      if (isHandlingAction) return;
      isHandlingAction = true;
      
      const store = usePlayerStore.getState();
      store.setUserInteracted();
      store.playNext();
      ensurePlaybackContinues(() => { isHandlingAction = false; });
    });

    // Seeking handler with improved CarPlay compatibility
    try {
      safeSetActionHandler('seekto', (details: MediaSessionActionDetails) => {
        const audio = getAudioElement();
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
      safeSetActionHandler('seekbackward', (details: MediaSessionActionDetails) => {
        const audio = getAudioElement();
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

      safeSetActionHandler('seekforward', (details: MediaSessionActionDetails) => {
        const audio = getAudioElement();
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
        safeSetActionHandler('play', null);
        safeSetActionHandler('pause', null);
        safeSetActionHandler('previoustrack', null);
        safeSetActionHandler('nexttrack', null);
        safeSetActionHandler('seekto', null);
        safeSetActionHandler('seekbackward', null);
        safeSetActionHandler('seekforward', null);
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
