import React, { useRef, useEffect, useCallback } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { usePhoneInterruption } from '../../hooks/usePhoneInterruption';
import { unlockAudioOnIOS, isIOS } from '@/utils/iosAudioFix';
import { useAudioBridge } from '@/hooks/useAudioBridge';
import { precacheUpcomingTracks, cacheAudioUrl } from '@/utils/audioCache';

// Helper function to validate URLs
const isValidUrl = (url: string): boolean => {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
};

interface AudioPlayerCoreProps {
  audioRef: React.RefObject<HTMLAudioElement>;
  onTimeUpdate: (currentTime: number, duration: number) => void;
  onLoadingChange: (loading: boolean) => void;
}

const AudioPlayerCore: React.FC<AudioPlayerCoreProps> = ({
  audioRef,
  onTimeUpdate,
  onLoadingChange
}) => {
  const prevSongRef = useRef<string | null>(null);
  const isHandlingPlayback = useRef(false);
  const isHandlingEndRef = useRef(false);
  const isTrackTransitionPauseRef = useRef(false);
  const loadStarted = useRef<boolean>(false);
  const playTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    currentSong,
    isPlaying,
    playNext,
    setCurrentSong,
    setIsPlaying,
    setCurrentTime,
    setDuration
  } = usePlayerStore();

  // Use phone interruption hook for automatic pause/resume during calls
  const audioFocusState = usePhoneInterruption(audioRef);

  // Use audio bridge for iOS PWA MediaSession + AudioContext management
  const { initializeBridge, resumeAudioContext } = useAudioBridge(audioRef);

  const resumeAfterTrackAdvance = useCallback(() => {
    const retryDelays = [120, 300, 700, 1300, 2000];
    let retryIndex = 0;

    const attemptResume = async () => {
      const state = usePlayerStore.getState();
      const audio = audioRef.current;

      if (!audio) {
        isHandlingEndRef.current = false;
        return;
      }

      if (!state.isPlaying || audio.ended) {
        isHandlingEndRef.current = false;
        return;
      }

      if (!audio.paused) {
        state.setIsPlaying(true);
        isHandlingEndRef.current = false;
        return;
      }

      // Resume AudioContext before play (fixes Bluetooth stuck bug)
      await resumeAudioContext();

      state.setUserInteracted();
      audio.play()
        .then(() => {
          state.setIsPlaying(true);
          isHandlingEndRef.current = false;
        })
        .catch(() => {
          retryIndex += 1;
          if (retryIndex >= retryDelays.length) {
            isHandlingEndRef.current = false;
            return;
          }
          setTimeout(attemptResume, retryDelays[retryIndex]);
        });
    };

    setTimeout(attemptResume, retryDelays[0]);
  }, [audioRef, resumeAudioContext]);

  // Initialize audio context for iOS on mount
  useEffect(() => {
    if (isIOS()) {
      // Unlock audio and initialize bridge on first user interaction
      const handleFirstInteraction = () => {
        unlockAudioOnIOS();
        initializeBridge(); // Initialize AudioContext + MediaSession handlers
        document.removeEventListener('touchstart', handleFirstInteraction);
        document.removeEventListener('click', handleFirstInteraction);
      };

      document.addEventListener('touchstart', handleFirstInteraction, { once: true });
      document.addEventListener('click', handleFirstInteraction, { once: true });

      return () => {
        document.removeEventListener('touchstart', handleFirstInteraction);
        document.removeEventListener('click', handleFirstInteraction);
      };
    } else {
      // For non-iOS, still initialize the bridge on first interaction
      const handleFirstInteraction = () => {
        initializeBridge();
        document.removeEventListener('click', handleFirstInteraction);
      };
      document.addEventListener('click', handleFirstInteraction, { once: true });
      return () => {
        document.removeEventListener('click', handleFirstInteraction);
      };
    }
  }, [initializeBridge]);

  // Clean up on unmount and save state before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (audioRef.current && currentSong) {
        try {
          const playerState = {
            currentSong: currentSong,
            currentTime: audioRef.current.currentTime,
            timestamp: new Date().toISOString()
          };
          localStorage.setItem('player_state', JSON.stringify(playerState));
        } catch (error) {
          // Silent error handling
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (playTimeoutRef.current) {
        clearTimeout(playTimeoutRef.current);
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentSong]);

  // Ultra-optimized song end handling - minimal overhead
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    let lastTimeUpdate = 0;

    const handleSongEnd = () => {
      if (isHandlingEndRef.current) return;
      isHandlingEndRef.current = true;

      const state = usePlayerStore.getState();
      state.setUserInteracted();

      if (state.isRepeating) {
        audio.currentTime = 0;
        audio.play()
          .catch(() => { })
          .finally(() => { isHandlingEndRef.current = false; });
        return;
      }

      state.playNext();
      resumeAfterTrackAdvance();
    };

    // Throttled timeupdate with requestAnimationFrame
    const handleTimeUpdate = () => {
      const now = performance.now();
      if (now - lastTimeUpdate < 500) return; // 500ms throttle
      lastTimeUpdate = now;

      if (!audio || isNaN(audio.duration) || audio.duration <= 0) return;

      onTimeUpdate(audio.currentTime, audio.duration);

      // Check for song end with small buffer
      if (audio.currentTime >= audio.duration - 0.5 && !audio.paused && !isHandlingEndRef.current) {
        handleSongEnd();
      }
    };

    audio.addEventListener('ended', handleSongEnd, { passive: true });
    audio.addEventListener('timeupdate', handleTimeUpdate, { passive: true });

    return () => {
      audio.removeEventListener('ended', handleSongEnd);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [isPlaying, onTimeUpdate, resumeAfterTrackAdvance]);

  // Fallback for lock-screen/background cases where ended event can be delayed or missed.
  useEffect(() => {
    if (!currentSong) return;

    const interval = setInterval(() => {
      const audio = audioRef.current;
      const state = usePlayerStore.getState();
      if (!audio || !state.isPlaying || state.isRepeating || isHandlingEndRef.current) return;

      if (audio.ended || (audio.duration > 0 && audio.currentTime >= audio.duration - 0.15)) {
        isHandlingEndRef.current = true;
        state.setUserInteracted();
        state.playNext();
        resumeAfterTrackAdvance();
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [currentSong, resumeAfterTrackAdvance]);

  // Background playback monitor for lock-screen/iOS resume reliability
  useEffect(() => {
    if (!currentSong || !audioRef.current) return;

    let hiddenMonitor: number | null = null;

    const recoverPlaybackIfNeeded = () => {
      const state = usePlayerStore.getState();
      const audio = audioRef.current;
      if (!audio || audioFocusState.isInterrupted || !state.hasUserInteracted || state.wasPlayingBeforeInterruption) return;

      if (audio.paused && state.isPlaying && !audio.ended && audio.readyState >= 2) {
        audio.play().catch(() => { });
      }
    };

    const stopMonitor = () => {
      if (hiddenMonitor !== null) {
        window.clearInterval(hiddenMonitor);
        hiddenMonitor = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (hiddenMonitor === null) {
          hiddenMonitor = window.setInterval(recoverPlaybackIfNeeded, 2500);
        }
      } else {
        stopMonitor();
      }
      recoverPlaybackIfNeeded();
    };

    handleVisibilityChange();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopMonitor();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentSong, audioFocusState.isInterrupted, audioRef]);

  // Handle play/pause logic - optimized
  useEffect(() => {
    if (!audioRef.current || isHandlingPlayback.current) return;

    // Prevent autoplay without user interaction
    const store = usePlayerStore.getState();
    if (isPlaying && !store.hasUserInteracted) {
      setIsPlaying(false);
      return;
    }

    if (isPlaying) {
      isHandlingPlayback.current = true;
      onLoadingChange(true);

      const audio = audioRef.current;
      const songUrl = currentSong?.audioUrl;

      if (!songUrl || !isValidUrl(songUrl)) {
        setIsPlaying(false);
        isHandlingPlayback.current = false;
        isTrackTransitionPauseRef.current = false;
        onLoadingChange(false);
        return;
      }

      // Wrap in try-catch for mobile safety
      try {

        // Check if we need to load a new song
        if (prevSongRef.current !== songUrl) {
          const currentLoadingOperation = Date.now() + Math.random();

          if (audioRef.current) {
            (audioRef.current as any)._currentLoadingOperation = currentLoadingOperation;
          }

          // Pause current playback before changing source
          isTrackTransitionPauseRef.current = true;
          audio.pause();
          audio.currentTime = 0;
          audio.src = '';
          audio.load();

          const handleCanPlay = () => {
            const currentAudioEl = audioRef.current;
            if (!currentAudioEl) return;

            if ((currentAudioEl as any)._currentLoadingOperation !== currentLoadingOperation) {
              return;
            }

            onLoadingChange(false);
            prevSongRef.current = songUrl;
            isTrackTransitionPauseRef.current = false;

            if (isPlaying) {
              playTimeoutRef.current = setTimeout(async () => {
                if (!audioRef.current) return;

                if ((audioRef.current as any)._currentLoadingOperation !== currentLoadingOperation) {
                  return;
                }

                // Resume AudioContext before play (fixes Bluetooth stuck bug on iOS)
                await resumeAudioContext();

                const playPromise = audioRef.current.play();
                if (playPromise !== undefined) {
                  playPromise
                    .then(() => {
                      isHandlingPlayback.current = false;
                    })
                    .catch(() => {
                      setIsPlaying(false);
                      isHandlingPlayback.current = false;
                    });
                } else {
                  isHandlingPlayback.current = false;
                }
              }, 150);
            } else {
              isHandlingPlayback.current = false;
            }

            if (audio) {
              audio.removeEventListener('canplay', handleCanPlay);
            }
          };

          audio.addEventListener('canplay', handleCanPlay);
          audio.src = songUrl;
          audio.load();

          // Preload next song only when current song is playing smoothly
          setTimeout(() => {
            try {
              const state = usePlayerStore.getState();
              const nextIndex = (state.currentIndex + 1) % state.queue.length;
              const nextSong = state.queue[nextIndex];
              if (nextSong?.audioUrl && isValidUrl(nextSong.audioUrl)) {
                const preloadAudio = new Audio();
                preloadAudio.preload = 'metadata';
                preloadAudio.src = nextSong.audioUrl;
                setTimeout(() => {
                  preloadAudio.src = '';
                }, 3000);
              }
            } catch (error) {
              // Preload failed, continue without it
            }
          }, 2000);
        } else {
          // Same song, just play/resume
          if (audio.paused) {
            // Resume AudioContext before play (fixes Bluetooth stuck bug)
            resumeAudioContext().then(() => {
              const playPromise = audio.play();
              if (playPromise !== undefined) {
                playPromise
                  .then(() => {
                    isHandlingPlayback.current = false;
                  })
                  .catch(() => {
                    setIsPlaying(false);
                    isHandlingPlayback.current = false;
                  });
              } else {
                isHandlingPlayback.current = false;
              }
            });
          } else {
            isHandlingPlayback.current = false;
          }
        }
      } catch (error) {
        // Catch any errors during playback setup
        setIsPlaying(false);
        isHandlingPlayback.current = false;
        isTrackTransitionPauseRef.current = false;
        onLoadingChange(false);
      }
    } else {
      // Pause the audio
      try {
        if (audioRef.current && !audioRef.current.paused) {
          audioRef.current.pause();
        }
      } catch (error) {
        // Ignore pause errors
      }
      isHandlingPlayback.current = false;
    }
  }, [currentSong, isPlaying, setIsPlaying, onLoadingChange, resumeAudioContext]);

  // Handle audio element errors
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleError = () => {
      onLoadingChange(false);
      setIsPlaying(false);
      isHandlingPlayback.current = false;
      isTrackTransitionPauseRef.current = false;
    };

    audio.addEventListener('error', handleError);
    return () => audio.removeEventListener('error', handleError);
  }, [setIsPlaying, onLoadingChange]);

  // Try to restore playback state on mount
  useEffect(() => {
    if (!loadStarted.current) {
      loadStarted.current = true;

      try {
        const savedPlayerState = localStorage.getItem('player_state');
        if (savedPlayerState) {
          const playerState = JSON.parse(savedPlayerState);
          if (playerState.currentSong) {
            setCurrentSong(playerState.currentSong);
            setIsPlaying(false); // Never autoplay on page refresh

            if (playerState.currentTime && playerState.currentTime > 0) {
              setTimeout(() => {
                const audio = audioRef.current;
                if (audio && audio.duration > 0 && playerState.currentTime < audio.duration) {
                  audio.currentTime = playerState.currentTime;
                  if (setCurrentTime) {
                    setCurrentTime(playerState.currentTime);
                  }
                }
              }, 1000);
            }
          }
        }
      } catch (error) {
        // Error restoring playback state
      }
    }
  }, [setCurrentSong, setIsPlaying, setCurrentTime]);

  // Update audio metadata
  const updateAudioMetadata = useCallback(() => {
    if (audioRef.current) {
      const currentTime = audioRef.current.currentTime;
      const duration = audioRef.current.duration;

      if (setCurrentTime) {
        setCurrentTime(currentTime);
      }
      if (setDuration && !isNaN(duration)) {
        setDuration(duration);
      }

      onTimeUpdate(currentTime, duration);
    }
  }, [setCurrentTime, setDuration, onTimeUpdate]);

  if (!currentSong) {
    return (
      <audio
        ref={audioRef}
        preload="auto"
        playsInline
        webkit-playsinline="true"
        x-webkit-airplay="allow"
        crossOrigin="anonymous"
        controls={false}
        style={{ display: 'none' }}
        onError={(e) => {
          // Silent error handling for no song state
        }}
      />
    );
  }

  const audioUrl = currentSong?.audioUrl && !currentSong.audioUrl.startsWith('blob:') ?
    currentSong.audioUrl.replace(/^http:\/\//, 'https://') : currentSong?.audioUrl;

  // Don't render audio element if no valid URL
  if (!audioUrl || audioUrl === '') {
    return (
      <audio
        ref={audioRef}
        preload="none"
        playsInline
        webkit-playsinline="true"
        x-webkit-airplay="allow"
        crossOrigin="anonymous"
        controls={false}
        style={{ display: 'none' }}
      />
    );
  }

  return (
    <audio
      ref={audioRef}
      src={audioUrl}
      onTimeUpdate={updateAudioMetadata}
      onLoadedMetadata={updateAudioMetadata}
      onError={(e) => {
        const audio = e.target as HTMLAudioElement;
        const error = audio.error;

        // Only log meaningful errors (not empty src)
        if (error && error.code !== 4 && process.env.NODE_ENV === 'development') {
          // Error logging only in development
        }

        if (currentSong && error && error.code !== 4) {
          setTimeout(() => {
            try {
              playNext();
            } catch (error) {
              // Silent error handling
            }
          }, 1000);
        }
      }}
      preload="auto"
      playsInline
      webkit-playsinline="true"
      x-webkit-airplay="allow"
      // CarPlay specific attributes
      controls={false}
      crossOrigin="anonymous"
      // Ensure proper audio session for CarPlay and phone call resumes
      onPlay={() => {
        try {
          // Sync state if OS resumes playback (e.g. phone call ends)
          const store = usePlayerStore.getState();
          if (!store.isPlaying) {
            store.setIsPlaying(true);
          }
          // Clear interruption markers after real playback resumes.
          usePlayerStore.setState({
            wasPlayingBeforeInterruption: false,
            interruptionReason: null
          });
          // Update MediaSession when audio actually starts playing
          if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'playing';
          }

          // Pre-cache current and upcoming tracks for offline playback
          if (store.currentSong?.audioUrl) {
            cacheAudioUrl(store.currentSong.audioUrl);
          }
          if (store.queue.length > 1) {
            precacheUpcomingTracks(store.queue, store.currentIndex, 3);
          }
        } catch (error) {
          // Silent error handling
        }
      }}
      onPause={() => {
        try {
          // Ignore pause events caused by internal track source transitions.
          if (isTrackTransitionPauseRef.current) {
            return;
          }
          // Sync state if OS violently pauses playback (e.g. phone call comes in)
          const store = usePlayerStore.getState();
          if (store.isPlaying) {
            store.setIsPlaying(false);
          }
          // Update MediaSession when audio actually pauses
          if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'paused';
          }
        } catch (error) {
          // Silent error handling
        }
      }}
      onSeeked={() => {
        try {
          // Update position state after seeking for CarPlay sync
          if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession && audioRef.current) {
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
        } catch (error) {
          // Silent error handling
        }
      }}
      loop={usePlayerStore.getState().isRepeating}
      data-testid="audio-element"
      // Additional CarPlay compatibility
      style={{ display: 'none' }} // Hide the audio element completely
    />
  );
};

export default AudioPlayerCore;
