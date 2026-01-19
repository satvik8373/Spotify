import { useRef, useState, useEffect, useCallback } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import {
  playAudioSafely,
  configureAudioElement,
  processAudioURL,
  isValidAudioURL,
  markUserInteraction,
  audioInterruptionManager,
  InterruptionReason
} from '@/utils/audioManager';
import { syncAudioElementWithStore } from '@/utils/playerStateSync';
import { resolveArtist } from '@/lib/resolveArtist';
import { backgroundAudioService } from '@/services/backgroundAudioService';
import { useIOSAudio } from '@/hooks/useIOSAudio';
import { useLockScreenSync } from '@/hooks/useLockScreenSync';

const AudioPlayer = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Store hooks
  const {
    currentSong,
    isPlaying,
    playNext,
    playPrevious,
    setIsPlaying,
    setUserInteracted,
    setCurrentTime: setStoreCurrentTime,
    setDuration: setStoreDuration
  } = usePlayerStore();

  const { streamingQuality } = useSettingsStore();

  // iOS audio handling
  const { isIOSDevice } = useIOSAudio(audioRef.current);

  // Lock screen synchronization
  useLockScreenSync();

  // Initialize background audio service
  useEffect(() => {
    backgroundAudioService.initialize();
    backgroundAudioService.enableBackgroundAudio();
    backgroundAudioService.preventAudioInterruption();
  }, []);

  // Notify background service of audio state changes
  useEffect(() => {
    backgroundAudioService.onAudioStateChange(isPlaying, currentSong);
  }, [isPlaying, currentSong]);

  // Background playback support - prevent pausing when page is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden (minimized, locked, or tab switched)
        // Keep audio playing for background playback
        console.log('Page hidden - maintaining background playback');

        // Ensure audio context stays active
        if (audioRef.current && !audioRef.current.paused && isPlaying) {
          // Keep the audio playing in background
          audioRef.current.play().catch(() => {
            console.warn('Background playback interrupted');
          });
        }
      } else {
        // Page is visible again - handle carefully to prevent flickering
        console.log('Page visible - checking playback state');

        // Add a small delay to prevent flickering and allow audio state to stabilize
        setTimeout(() => {
          if (audioRef.current) {
            const audio = audioRef.current;
            const actuallyPlaying = !audio.paused && !audio.ended;

            // Only update state if there's actually a mismatch
            if (actuallyPlaying !== isPlaying) {
              console.log('Syncing state after visibility change:', { actuallyPlaying, storeIsPlaying: isPlaying });
              setIsPlaying(actuallyPlaying);
            }

            // If we expect to be playing but audio is paused, try to resume
            if (isPlaying && audio.paused && !audio.ended) {
              setUserInteracted();
              playAudioSafely(audio).catch(() => { });
            }
          }
        }, 100); // Small delay to prevent flickering
      }
    };

    // Also handle focus events for better lock screen handling
    const handleFocus = () => {
      // Add a longer delay for focus events as they can be more jarring
      setTimeout(() => {
        if (audioRef.current && !document.hidden) {
          const audio = audioRef.current;
          const actuallyPlaying = !audio.paused && !audio.ended;

          // Only sync if there's a real mismatch
          if (actuallyPlaying !== isPlaying) {
            console.log('Syncing state after focus:', { actuallyPlaying, storeIsPlaying: isPlaying });
            setIsPlaying(actuallyPlaying);
          }
        }
      }, 200); // Longer delay for focus events
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isPlaying, setIsPlaying, setUserInteracted]);

  // Audio interruption handling - only for real interruptions
  useEffect(() => {
    const handleInterruption = (reason: InterruptionReason) => {
      // Only pause for actual interruptions (calls, notifications)
      // Don't pause for page visibility changes or minimizing
      if (reason === 'call' || reason === 'notification') {
        if (isPlaying && audioRef.current && !audioRef.current.paused) {
          audioRef.current.pause();
          setIsPlaying(false);
        }
      }
    };

    const handleResume = () => {
      // Resume playback after real interruption if we were playing
      setTimeout(() => {
        if (audioRef.current && audioRef.current.paused && isPlaying) {
          setUserInteracted();
          playAudioSafely(audioRef.current).catch(() => { });
          setIsPlaying(true);
        }
      }, 300);
    };

    audioInterruptionManager.initialize({
      onInterrupted: handleInterruption,
      onResumed: handleResume
    });

    return () => {
      audioInterruptionManager.cleanup();
    };
  }, [isPlaying, setIsPlaying, setUserInteracted]);

  // Initialize audio context on user interaction
  useEffect(() => {
    const handleUserInteraction = () => {
      markUserInteraction();
      setUserInteracted();
    };

    document.addEventListener('click', handleUserInteraction, { once: true, passive: true });
    document.addEventListener('touchstart', handleUserInteraction, { once: true, passive: true });

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, [setUserInteracted]);

  // Configure audio element
  useEffect(() => {
    if (audioRef.current) {
      configureAudioElement(audioRef.current);
    }
  }, []);

  // Handle song changes
  useEffect(() => {
    if (!audioRef.current || !currentSong) return;

    const audio = audioRef.current;
    let songUrl = currentSong.audioUrl;

    // Fix CORS and add quality parameter
    if (songUrl && isValidAudioURL(songUrl)) {
      songUrl = processAudioURL(songUrl);

      if (!songUrl.startsWith('blob:')) {
        const separator = songUrl.includes('?') ? '&' : '?';
        const qualityParam = streamingQuality.toLowerCase().replace(/\s+/g, '_');
        songUrl = `${songUrl}${separator}quality=${qualityParam}`;
      }
    }

    // Skip invalid URLs
    if (!isValidAudioURL(songUrl) || songUrl.startsWith('blob:')) {
      console.warn('Invalid audio URL, skipping to next song');
      setTimeout(() => playNext(), 500);
      return;
    }

    // Check if this is the same song (don't reload if same)
    const isSameSong = audio.src === songUrl;

    if (!isSameSong) {
      // Only load new song if it's different
      setIsLoading(true);
      audio.pause();
      audio.src = songUrl;
      audio.load();

      const handleCanPlay = () => {
        setIsLoading(false);

        if (isPlaying) {
          playAudioSafely(audio).catch((error) => {
            console.error('Playback failed:', error);
            setIsPlaying(false);
          });
        }
        audio.removeEventListener('canplay', handleCanPlay);
      };

      audio.addEventListener('canplay', handleCanPlay);

      return () => {
        audio.removeEventListener('canplay', handleCanPlay);
      };
    }
    // If same song, don't reload - just handle play/pause state
  }, [currentSong, playNext, setIsPlaying, streamingQuality]);

  // Handle play/pause state changes
  useEffect(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;

    if (isPlaying && audio.paused) {
      playAudioSafely(audio).catch((error) => {
        console.error('Playback failed:', error);
        setIsPlaying(false);
      });
    } else if (!isPlaying && !audio.paused) {
      audio.pause();
    }

    // Sync the actual audio state with the store state
    const syncAudioState = () => {
      // Only sync if the page is visible to prevent unnecessary updates during background playback
      if (document.hidden) return;

      syncAudioElementWithStore(audio, isPlaying, setIsPlaying);
    };

    // Check sync less frequently to prevent flickering
    const syncInterval = setInterval(syncAudioState, 2000); // Increased from 1000ms to 2000ms

    return () => {
      clearInterval(syncInterval);
    };
  }, [isPlaying, setIsPlaying]);

  // Update MediaSession for lock screen controls
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentSong) return;

    // Debounce MediaSession updates to prevent flickering during lock screen transitions
    const updateTimeout = setTimeout(() => {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentSong.title || 'Unknown Title',
          artist: resolveArtist(currentSong),
          album: currentSong.albumId ? String(currentSong.albumId) : 'Unknown Album',
          artwork: [{
            src: currentSong.imageUrl || 'https://cdn.iconscout.com/icon/free/png-256/free-music-1779799-1513951.png',
            sizes: '512x512',
            type: 'image/jpeg'
          }]
        });

        // Only update playback state if it's actually different to prevent unnecessary updates
        const currentPlaybackState = navigator.mediaSession.playbackState;
        const newPlaybackState = isPlaying ? 'playing' : 'paused';

        if (currentPlaybackState !== newPlaybackState) {
          navigator.mediaSession.playbackState = newPlaybackState;
        }

        // Set action handlers with improved state management
        navigator.mediaSession.setActionHandler('play', () => {
          // Only update if we're not already playing to prevent flickering
          if (!isPlaying) {
            setUserInteracted();
            setIsPlaying(true);
          }
        });

        navigator.mediaSession.setActionHandler('pause', () => {
          // Only update if we're currently playing to prevent flickering
          if (isPlaying) {
            setIsPlaying(false);
          }
        });

        navigator.mediaSession.setActionHandler('previoustrack', () => {
          setUserInteracted();
          playPrevious();
        });

        navigator.mediaSession.setActionHandler('nexttrack', () => {
          setUserInteracted();
          playNext();
        });

        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (audioRef.current && details.seekTime !== undefined) {
            audioRef.current.currentTime = details.seekTime;
            setStoreCurrentTime(details.seekTime);
          }
        });

      } catch (error) {
        console.warn('MediaSession setup failed:', error);
      }
    }, 100); // Debounce MediaSession updates by 100ms

    return () => {
      clearTimeout(updateTimeout);
    };
  }, [currentSong, isPlaying, setIsPlaying, playNext, playPrevious, setUserInteracted]);

  // Audio event handlers
  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;
    const newCurrentTime = audio.currentTime;
    const newDuration = audio.duration;

    // Update store with current time and duration for mobile progress bar
    setStoreCurrentTime(newCurrentTime);

    if (!isNaN(newDuration)) {
      setStoreDuration(newDuration);
    }

    // Update MediaSession position
    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
      try {
        navigator.mediaSession.setPositionState({
          duration: newDuration || 0,
          playbackRate: audio.playbackRate || 1,
          position: newCurrentTime || 0
        });
      } catch (error) {
        // Ignore position state errors
      }
    }
  }, [setStoreCurrentTime, setStoreDuration]);

  // Restore saved position when audio is ready
  const restoreSavedPosition = useCallback(() => {
    if (!audioRef.current || !currentSong) return;

    try {
      const savedState = localStorage.getItem('player_state');
      if (savedState) {
        const { currentTime: savedTime, currentSong: savedSong } = JSON.parse(savedState);

        // Check if this is the same song
        if (savedTime && savedTime > 0 && savedSong &&
          (savedSong._id === currentSong._id ||
            (savedSong as any).id === (currentSong as any).id ||
            savedSong.title === currentSong.title)) {

          const audio = audioRef.current;
          if (audio.duration > 0 && savedTime < audio.duration) {
            audio.currentTime = savedTime;
            setStoreCurrentTime(savedTime);
            console.log('Restored playback position:', savedTime);
          }
        }
      }
    } catch (error) {
      console.error('Error restoring playback position:', error);
    }
  }, [currentSong, setStoreCurrentTime]);

  const handleSongEnd = useCallback(() => {
    const state = usePlayerStore.getState();

    if (state.isRepeating) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => { });
      }
    } else {
      setUserInteracted();
      playNext();
      setIsPlaying(true);
    }
  }, [playNext, setIsPlaying, setUserInteracted]);

  // AudioPlayer should only handle the audio logic, not render UI
  // The PlaybackControls component handles all UI rendering
  return (
    <audio
      ref={audioRef}
      onTimeUpdate={handleTimeUpdate}
      onEnded={handleSongEnd}
      onLoadStart={() => setIsLoading(true)}
      onCanPlay={() => {
        setIsLoading(false);
        // Restore saved position when audio is ready
        restoreSavedPosition();
      }}
      onLoadedMetadata={() => {
        // Also try to restore position when metadata is loaded
        setTimeout(restoreSavedPosition, 100);
      }}
      onWaiting={() => setIsLoading(true)}
      onPlaying={() => {
        setIsLoading(false);
        // Ensure store state matches actual playing state
        if (!isPlaying) {
          setIsPlaying(true);
        }
      }}
      onPause={() => {
        // Only update store if this wasn't triggered by the store
        const audio = audioRef.current;
        if (audio && !audio.ended && isPlaying) {
          // This pause wasn't initiated by our store, so update the store
          setIsPlaying(false);
        }
      }}
      onError={() => {
        console.error('Audio error, skipping to next song');
        setTimeout(() => playNext(), 1000);
      }}
      preload="metadata"
      playsInline
      controls={false}
    />
  );
};

export default AudioPlayer;