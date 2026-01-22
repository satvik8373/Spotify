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
      usePlayerStore.getState().setIsPlaying(true);
      if (audioRef.current && audioRef.current.paused) {
        audioRef.current.play().catch(() => { });
      }
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      usePlayerStore.getState().setIsPlaying(false);
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
    });

    navigator.mediaSession.setActionHandler('previoustrack', () => {
      const store = usePlayerStore.getState();
      store.setUserInteracted();
      if (store.playPrevious) {
        store.playPrevious();
      }
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      const store = usePlayerStore.getState();
      store.setUserInteracted();
      store.playNext();
      store.setIsPlaying(true);

      // Enhanced reliability for background playback
      // Use requestAnimationFrame instead of setTimeout to avoid performance violations
      requestAnimationFrame(() => {
        const audio = document.querySelector('audio');
        if (audio && audio.paused && !audio.ended) {
          audio.play().catch(() => { });
        }
      });
    });

    // Seeking handler
    try {
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (audioRef.current && details.seekTime !== undefined) {
          audioRef.current.currentTime = details.seekTime;
          
          const store = usePlayerStore.getState();
          if (store.setCurrentTime) {
            store.setCurrentTime(details.seekTime);
          }

          // Update position state after seeking
          if ('setPositionState' in navigator.mediaSession) {
            navigator.mediaSession.setPositionState({
              duration: audioRef.current.duration,
              playbackRate: audioRef.current.playbackRate,
              position: details.seekTime
            });
          }
        }
      });
    } catch (error) {
      // Silent error handling
    }

    return () => {
      // Cleanup handlers on unmount
      if (isMediaSessionSupported()) {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('seekto', null);
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

  // Update position state periodically (throttled)
  useEffect(() => {
    if (!isMediaSessionSupported() || !isPlaying || !currentSong) return;

    const positionUpdateInterval = setInterval(() => {
      if (audioRef.current && 'setPositionState' in navigator.mediaSession) {
        try {
          navigator.mediaSession.setPositionState({
            duration: audioRef.current.duration || 0,
            playbackRate: audioRef.current.playbackRate || 1,
            position: audioRef.current.currentTime || 0
          });
        } catch (e) {
          // Ignore position state errors
        }
      }
    }, 2000); // Update every 2 seconds instead of 1 second

    return () => {
      clearInterval(positionUpdateInterval);
    };
  }, [isPlaying, currentSong, audioRef]);

  return null; // This component doesn't render anything
};

export default AudioPlayerMediaSession;