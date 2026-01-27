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

    // Register action handlers once
    navigator.mediaSession.setActionHandler('play', () => {
      const store = usePlayerStore.getState();
      store.setUserInteracted();
      store.setIsPlaying(true);
      
      // Get the actual audio element from DOM for reliability
      const audio = document.querySelector('audio') as HTMLAudioElement;
      if (audio && audio.paused) {
        audio.play().catch((error) => {
          console.debug('MediaSession play failed:', error);
          // Retry after a short delay for CarPlay compatibility
          setTimeout(() => {
            if (audio && audio.paused) {
              audio.play().catch(() => {});
            }
          }, 100);
        });
      }
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      const store = usePlayerStore.getState();
      store.setIsPlaying(false);
      
      // Get the actual audio element from DOM for reliability
      const audio = document.querySelector('audio') as HTMLAudioElement;
      if (audio && !audio.paused) {
        audio.pause();
      }
    });

    navigator.mediaSession.setActionHandler('previoustrack', () => {
      const store = usePlayerStore.getState();
      store.setUserInteracted();
      if (store.playPrevious) {
        store.playPrevious();
        
        // Ensure playback continues after track change
        setTimeout(() => {
          const audio = document.querySelector('audio') as HTMLAudioElement;
          if (audio && audio.paused && !audio.ended) {
            store.setIsPlaying(true);
            audio.play().catch(() => {});
          }
        }, 200);
      }
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      const store = usePlayerStore.getState();
      store.setUserInteracted();
      store.playNext();
      store.setIsPlaying(true);

      // Enhanced reliability for CarPlay and background playback
      setTimeout(() => {
        const audio = document.querySelector('audio') as HTMLAudioElement;
        if (audio && audio.paused && !audio.ended) {
          audio.play().catch((error) => {
            console.debug('MediaSession next track play failed:', error);
            // Additional retry for CarPlay
            setTimeout(() => {
              if (audio && audio.paused && !audio.ended) {
                audio.play().catch(() => {});
              }
            }, 300);
          });
        }
      }, 100);
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
              console.debug('MediaSession position update after seek failed:', e);
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
      console.debug('MediaSession seek handlers setup failed:', error);
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
          console.debug('MediaSession cleanup failed:', error);
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
          // Ignore position state errors but try to recover
          console.debug('MediaSession position update failed:', e);
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