import { useEffect, useRef, useCallback } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { isIOS, isPWA } from '@/utils/iosAudioFix';
import { resolveArtist } from '@/lib/resolveArtist';

/**
 * AudioBridge - Centralized audio session management for iOS PWA
 *
 * This hook fixes three critical iOS PWA audio bugs:
 * 1. Lock screen controls not responding
 * 2. CarPlay skip buttons not working
 * 3. Bluetooth audio getting stuck
 *
 * Root cause: iOS requires:
 * - MediaSession handlers registered BEFORE first play
 * - AudioContext connected to HTMLAudioElement via MediaElementSourceNode
 * - AudioContext auto-resume on Bluetooth route changes
 */

interface AudioBridgeState {
  isConnected: boolean;
  audioContextState: AudioContextState | null;
}

// Singleton state for AudioContext (must persist across component re-renders)
let globalAudioContext: AudioContext | null = null;
let globalMediaElementSource: MediaElementAudioSourceNode | null = null;
let connectedAudioElement: HTMLAudioElement | null = null;
let mediaSessionHandlersRegistered = false;

/**
 * Get or create the global AudioContext
 * MUST be called from a user gesture (click/touch) on iOS
 */
const getOrCreateAudioContext = (): AudioContext | null => {
  if (globalAudioContext && globalAudioContext.state !== 'closed') {
    return globalAudioContext;
  }

  try {
    // @ts-ignore - webkit prefix for older iOS
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    globalAudioContext = new AudioContextClass();

    // FIX BUG 3: Listen for AudioContext state changes (Bluetooth route change)
    globalAudioContext.addEventListener('statechange', () => {
      if (globalAudioContext?.state === 'suspended') {
        // Auto-resume when iOS suspends the context (Bluetooth disconnect/reconnect)
        globalAudioContext.resume().catch(() => {});
      }
    });

    return globalAudioContext;
  } catch (error) {
    return null;
  }
};

/**
 * Connect HTMLAudioElement to AudioContext via MediaElementSourceNode
 * This is CRITICAL for Bluetooth stability on iOS
 */
const connectAudioElementToContext = (audio: HTMLAudioElement): boolean => {
  // Skip if already connected to this element
  if (connectedAudioElement === audio && globalMediaElementSource) {
    return true;
  }

  const context = getOrCreateAudioContext();
  if (!context) return false;

  try {
    // Disconnect previous source if exists
    if (globalMediaElementSource) {
      try {
        globalMediaElementSource.disconnect();
      } catch (e) {
        // Ignore disconnect errors
      }
    }

    // Create new MediaElementSourceNode and connect to destination
    // This links the audio element to the AudioContext for proper session management
    globalMediaElementSource = context.createMediaElementSource(audio);
    globalMediaElementSource.connect(context.destination);
    connectedAudioElement = audio;

    return true;
  } catch (error) {
    // MediaElementSource can only be created once per element
    // If we get here, it was already connected (possibly by another component)
    return false;
  }
};

/**
 * Resume AudioContext - call this before/during play operations
 */
const resumeAudioContext = async (): Promise<void> => {
  if (globalAudioContext && globalAudioContext.state === 'suspended') {
    try {
      await globalAudioContext.resume();
    } catch (error) {
      // Silent fail - not critical
    }
  }
};

/**
 * Register all MediaSession action handlers
 * MUST be called BEFORE first audio.play() for iOS compatibility
 */
const registerMediaSessionHandlers = (
  audioRef: React.RefObject<HTMLAudioElement>,
  onTrackChange?: () => void
): void => {
  if (!('mediaSession' in navigator)) return;

  // FIX BUG 1 & 2: Always re-register handlers to ensure fresh references
  // iOS ignores handlers registered after playback starts

  const getAudio = (): HTMLAudioElement | null => {
    return audioRef.current ?? (document.querySelector('audio') as HTMLAudioElement | null);
  };

  // Debounce rapid calls
  let isHandling = false;
  const withDebounce = (fn: () => void) => {
    return () => {
      if (isHandling) return;
      isHandling = true;
      fn();
      setTimeout(() => { isHandling = false; }, 150);
    };
  };

  // Play with retry for Bluetooth devices
  const playHandler = withDebounce(() => {
    const store = usePlayerStore.getState();
    store.setUserInteracted();

    // Resume AudioContext first (critical for Bluetooth)
    resumeAudioContext().then(() => {
      const audio = getAudio();
      if (audio && audio.paused && !audio.ended) {
        audio.play()
          .then(() => store.setIsPlaying(true))
          .catch(() => {
            // Single retry after short delay
            setTimeout(() => {
              const a = getAudio();
              if (a && a.paused && !a.ended) {
                a.play()
                  .then(() => store.setIsPlaying(true))
                  .catch(() => store.setIsPlaying(false));
              }
            }, 150);
          });
      }
    });
  });

  // Pause handler
  const pauseHandler = withDebounce(() => {
    const store = usePlayerStore.getState();
    store.setIsPlaying(false);
    const audio = getAudio();
    if (audio && !audio.paused) {
      audio.pause();
    }
  });

  // Next track handler with playback continuation
  const nextTrackHandler = () => {
    if (isHandling) return;
    isHandling = true;

    const store = usePlayerStore.getState();
    store.setUserInteracted();
    store.playNext();

    // Ensure playback continues after track change
    ensurePlaybackContinues(audioRef, () => {
      isHandling = false;
      onTrackChange?.();
    });
  };

  // Previous track handler
  const prevTrackHandler = () => {
    if (isHandling) return;
    isHandling = true;

    const store = usePlayerStore.getState();
    store.setUserInteracted();

    const audio = getAudio();
    // Standard UX: if >3s in, restart current; else go to previous
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
      isHandling = false;
    } else {
      store.playPrevious();
      ensurePlaybackContinues(audioRef, () => {
        isHandling = false;
        onTrackChange?.();
      });
    }
  };

  // Seek to specific position (used by lock screen scrubber)
  const seekToHandler = (details: MediaSessionActionDetails) => {
    const audio = getAudio();
    if (audio && details.seekTime !== undefined) {
      const seekTime = Math.max(0, Math.min(details.seekTime, audio.duration || 0));
      audio.currentTime = seekTime;

      const store = usePlayerStore.getState();
      store.setCurrentTime(seekTime);

      updatePositionState(audio);

      // Resume if we were playing
      if (store.isPlaying && audio.paused) {
        audio.play().catch(() => {});
      }
    }
  };

  // Register all handlers with safe wrapper
  const safeSetHandler = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
    try {
      navigator.mediaSession.setActionHandler(action, handler);
    } catch (e) {
      // Ignore unsupported actions
    }
  };

  safeSetHandler('play', playHandler);
  safeSetHandler('pause', pauseHandler);
  safeSetHandler('nexttrack', nextTrackHandler);
  safeSetHandler('previoustrack', prevTrackHandler);
  safeSetHandler('seekto', seekToHandler);

  // IMPORTANT: Do NOT register seekbackward/seekforward handlers
  // iOS lock screen has limited space and will show seek buttons INSTEAD of
  // previous/next track buttons if these handlers are registered.
  // By setting them to null, iOS shows the track navigation buttons.
  safeSetHandler('seekbackward', null);
  safeSetHandler('seekforward', null);

  mediaSessionHandlersRegistered = true;
};

/**
 * Ensure playback continues after track change
 * Uses exponential backoff retry for reliability
 */
const ensurePlaybackContinues = (
  audioRef: React.RefObject<HTMLAudioElement>,
  onDone: () => void
): void => {
  const retryDelays = [120, 250, 500, 1000, 2000];
  let retryIndex = 0;

  const attempt = () => {
    const store = usePlayerStore.getState();
    const audio = audioRef.current ?? document.querySelector('audio') as HTMLAudioElement;

    if (!audio || !store.isPlaying || audio.ended) {
      onDone();
      return;
    }

    if (!audio.paused) {
      onDone();
      return;
    }

    // Resume AudioContext before attempting play
    resumeAudioContext().then(() => {
      if (!audio) {
        onDone();
        return;
      }

      // FIX: Explicit load() before play() prevents Bluetooth stuck bug
      if (audio.readyState < 2) {
        audio.load();
      }

      audio.play()
        .then(() => {
          store.setIsPlaying(true);
          onDone();
        })
        .catch(() => {
          retryIndex++;
          if (retryIndex >= retryDelays.length) {
            onDone();
            return;
          }
          setTimeout(attempt, retryDelays[retryIndex]);
        });
    });
  };

  setTimeout(attempt, retryDelays[0]);
};

/**
 * Update MediaSession position state
 */
const updatePositionState = (audio: HTMLAudioElement): void => {
  if (!('mediaSession' in navigator) || !('setPositionState' in navigator.mediaSession)) {
    return;
  }

  try {
    const duration = audio.duration || 0;
    const position = audio.currentTime || 0;

    if (!isNaN(duration) && !isNaN(position) && duration > 0) {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: audio.playbackRate || 1,
        position: Math.min(position, duration)
      });
    }
  } catch (e) {
    // Ignore position state errors
  }
};

/**
 * Update MediaSession metadata for current track
 */
const updateMetadata = (song: any): void => {
  if (!('mediaSession' in navigator) || !song) return;

  try {
    // Artwork URL must be absolute for CarPlay
    let artworkUrl = song.imageUrl || 'https://cdn.iconscout.com/icon/free/png-256/free-music-1779799-1513951.png';

    // Ensure absolute URL
    if (artworkUrl && !artworkUrl.startsWith('http')) {
      artworkUrl = window.location.origin + artworkUrl;
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title || 'Unknown Title',
      artist: resolveArtist(song),
      album: song.albumId ? String(song.albumId) : song.album || 'Unknown Album',
      artwork: [
        {
          src: artworkUrl,
          sizes: '512x512',
          type: 'image/jpeg'
        }
      ]
    });
  } catch (error) {
    // Silent error handling
  }
};

/**
 * Main hook for audio bridge functionality
 */
export const useAudioBridge = (audioRef: React.RefObject<HTMLAudioElement>) => {
  const isInitialized = useRef(false);
  const positionUpdateInterval = useRef<NodeJS.Timeout | null>(null);

  // Get current state from store
  const { currentSong, isPlaying } = usePlayerStore();

  // Initialize audio bridge on first user interaction
  const initializeBridge = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || isInitialized.current) return;

    // Create AudioContext (must be in user gesture)
    getOrCreateAudioContext();

    // Connect audio element to context (fixes Bluetooth bug)
    // Note: Only do this on iOS PWA to avoid issues on other platforms
    if (isIOS() && isPWA()) {
      connectAudioElementToContext(audio);
    }

    // Register MediaSession handlers BEFORE first play
    registerMediaSessionHandlers(audioRef);

    // Add play event listener to ensure AudioContext resumption
    audio.addEventListener('play', () => {
      resumeAudioContext();
    });

    isInitialized.current = true;
  }, [audioRef]);

  // Re-register handlers when audioRef changes (component remount)
  useEffect(() => {
    if (audioRef.current && mediaSessionHandlersRegistered) {
      // Re-register to ensure fresh references
      registerMediaSessionHandlers(audioRef);
    }
  }, [audioRef]);

  // Update metadata when song changes
  useEffect(() => {
    if (currentSong) {
      updateMetadata(currentSong);
    }
  }, [currentSong]);

  // Update playback state
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  // Update position state periodically when playing
  useEffect(() => {
    if (positionUpdateInterval.current) {
      clearInterval(positionUpdateInterval.current);
      positionUpdateInterval.current = null;
    }

    if (!isPlaying || !currentSong) return;

    const updatePosition = () => {
      const audio = audioRef.current ?? document.querySelector('audio') as HTMLAudioElement;
      if (audio) {
        updatePositionState(audio);
      }
    };

    // Update immediately
    updatePosition();

    // Update every 500ms for smooth lock screen progress
    positionUpdateInterval.current = setInterval(updatePosition, 500);

    return () => {
      if (positionUpdateInterval.current) {
        clearInterval(positionUpdateInterval.current);
      }
    };
  }, [isPlaying, currentSong, audioRef]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (positionUpdateInterval.current) {
        clearInterval(positionUpdateInterval.current);
      }
    };
  }, []);

  return {
    initializeBridge,
    resumeAudioContext,
    isInitialized: isInitialized.current,
    audioContextState: globalAudioContext?.state ?? null
  };
};

export default useAudioBridge;
