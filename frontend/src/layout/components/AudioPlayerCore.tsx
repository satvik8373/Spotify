import React, { useRef, useEffect, useState, useCallback } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { usePhoneInterruption } from '../../hooks/usePhoneInterruption';

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
  onTimeUpdate: (currentTime: number, duration: number) => void;
  onLoadingChange: (loading: boolean) => void;
}

const AudioPlayerCore: React.FC<AudioPlayerCoreProps> = ({ 
  onTimeUpdate, 
  onLoadingChange 
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const prevSongRef = useRef<string | null>(null);
  const isHandlingPlayback = useRef(false);
  const loadStarted = useRef<boolean>(false);
  const playTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isInitialLoad, setIsInitialLoad] = useState(true);

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

  // Disable autoplay for first 3 seconds after page load
  useEffect(() => {
    // Use requestIdleCallback or queueMicrotask instead of setTimeout
    const idleCallback = (window as any).requestIdleCallback ? 
      (window as any).requestIdleCallback(() => setIsInitialLoad(false), { timeout: 3000 }) :
      setTimeout(() => setIsInitialLoad(false), 3000);
    
    return () => {
      if ((window as any).requestIdleCallback && typeof idleCallback === 'number') {
        (window as any).cancelIdleCallback(idleCallback);
      } else {
        clearTimeout(idleCallback as number);
      }
    };
  }, []);

  // Override audio play method during initial load to prevent autoplay
  useEffect(() => {
    if (!audioRef.current) return;
    
    const audio = audioRef.current;
    const originalPlay = audio.play.bind(audio);
    
    if (isInitialLoad) {
      audio.play = () => Promise.resolve();
    } else {
      audio.play = originalPlay;
    }
    
    return () => {
      if (audio) {
        audio.play = originalPlay;
      }
    };
  }, [isInitialLoad]);

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
    let isHandlingEnd = false;

    const handleSongEnd = () => {
      if (isHandlingEnd) return;
      isHandlingEnd = true;

      const state = usePlayerStore.getState();
      state.setUserInteracted();

      if (state.isRepeating) {
        audio.currentTime = 0;
        audio.play().catch(() => { });
        isHandlingEnd = false;
        return;
      }

      state.playNext();
      state.setIsPlaying(true);
      
      requestAnimationFrame(() => {
        audioRef.current?.play().catch(() => { });
        isHandlingEnd = false;
      });
    };

    // Throttled timeupdate with requestAnimationFrame
    const handleTimeUpdate = () => {
      const now = performance.now();
      if (now - lastTimeUpdate < 500) return; // 500ms throttle
      lastTimeUpdate = now;

      if (!audio || isNaN(audio.duration) || audio.duration <= 0) return;

      onTimeUpdate(audio.currentTime, audio.duration);

      if (audio.currentTime >= audio.duration - 0.3 && !audio.paused) {
        handleSongEnd();
      }
    };

    audio.addEventListener('ended', handleSongEnd, { passive: true });
    audio.addEventListener('timeupdate', handleTimeUpdate, { passive: true });

    return () => {
      audio.removeEventListener('ended', handleSongEnd);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [isPlaying, onTimeUpdate]);

  // Minimal background playback monitor - only when needed
  useEffect(() => {
    if (!currentSong || !audioRef.current || !document.hidden) return;

    const backgroundPlaybackMonitor = setInterval(() => {
      const state = usePlayerStore.getState();
      const audio = audioRef.current;
      if (!audio || audioFocusState.isInterrupted || !state.hasUserInteracted) return;

      if (audio.paused && state.isPlaying && !audio.ended && !state.wasPlayingBeforeInterruption) {
        audio.play().catch(() => { });
      }
    }, 5000); // Only check every 5s when in background

    return () => clearInterval(backgroundPlaybackMonitor);
  }, [currentSong, isPlaying, audioFocusState.isInterrupted]);

  // Handle play/pause logic - optimized
  useEffect(() => {
    if (!audioRef.current || isHandlingPlayback.current) return;

    // Prevent autoplay without user interaction
    const store = usePlayerStore.getState();
    if (isPlaying && !store.hasUserInteracted) {
      setIsPlaying(false);
      return;
    }

    // Block autoplay during initial page load period
    if (isInitialLoad && isPlaying) {
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
        onLoadingChange(false);
        return;
      }

      // Check if we need to load a new song
      if (prevSongRef.current !== songUrl) {
        const currentLoadingOperation = Date.now() + Math.random();

        if (audioRef.current) {
          (audioRef.current as any)._currentLoadingOperation = currentLoadingOperation;
        }

        // Pause current playback before changing source
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

          if (isPlaying) {
            playTimeoutRef.current = setTimeout(() => {
              if (!audioRef.current) return;

              if ((audioRef.current as any)._currentLoadingOperation !== currentLoadingOperation) {
                return;
              }

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
        requestIdleCallback(() => {
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
        }, { timeout: 2000 });
      } else {
        // Same song, just play/resume
        if (audio.paused) {
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
        } else {
          isHandlingPlayback.current = false;
        }
      }
    } else {
      // Pause the audio
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
      isHandlingPlayback.current = false;
    }
  }, [currentSong, isPlaying, setIsPlaying, onLoadingChange, isInitialLoad]);

  // Handle audio element errors
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleError = () => {
      onLoadingChange(false);
      setIsPlaying(false);
      isHandlingPlayback.current = false;
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
      />
    );
  }

  return (
    <audio
      ref={audioRef}
      src={currentSong?.audioUrl && !currentSong.audioUrl.startsWith('blob:') ? 
        currentSong.audioUrl.replace(/^http:\/\//, 'https://') : undefined}
      onTimeUpdate={updateAudioMetadata}
      onLoadedMetadata={updateAudioMetadata}
      onError={() => {
        if (currentSong) {
          setTimeout(() => playNext(), 1000);
        }
      }}
      preload="auto"
      playsInline
      webkit-playsinline="true"
      x-webkit-airplay="allow"
      // CarPlay specific attributes
      controls={false}
      crossOrigin="anonymous"
      // Ensure proper audio session for CarPlay
      onPlay={() => {
        // Update MediaSession when audio actually starts playing
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'playing';
        }
      }}
      onPause={() => {
        // Update MediaSession when audio actually pauses
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'paused';
        }
      }}
      onSeeked={() => {
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
      }}
      loop={usePlayerStore.getState().isRepeating}
      data-testid="audio-element"
      // Additional CarPlay compatibility
      style={{ display: 'none' }} // Hide the audio element completely
    />
  );
};

export default AudioPlayerCore;