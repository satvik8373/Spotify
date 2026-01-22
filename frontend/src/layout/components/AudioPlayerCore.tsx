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
    const timer = setTimeout(() => setIsInitialLoad(false), 3000);
    return () => clearTimeout(timer);
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

  // Optimized song end handling - consolidated event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    let endingDetectionInterval: NodeJS.Timeout | null = null;
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

      // Move to next song
      state.playNext();
      state.setIsPlaying(true);

      setTimeout(() => {
        const newAudio = audioRef.current;
        if (newAudio) {
          newAudio.play().catch(() => { });
        }
        isHandlingEnd = false;
      }, 100);
    };

    // Single consolidated timeupdate listener with throttling
    const handleTimeUpdate = () => {
      const now = Date.now();
      if (now - lastTimeUpdate < 1000) return; // Throttled to 1 second
      lastTimeUpdate = now;

      if (!audio || isNaN(audio.duration) || audio.duration <= 0) return;

      // Update parent component
      onTimeUpdate(audio.currentTime, audio.duration);

      // Check for song end
      if (audio.currentTime >= audio.duration - 0.3 && !audio.paused) {
        handleSongEnd();
      }
    };

    // Single event listeners
    audio.addEventListener('ended', handleSongEnd);
    audio.addEventListener('timeupdate', handleTimeUpdate);

    // Reduced frequency background monitor
    endingDetectionInterval = setInterval(() => {
      if (!isPlaying || !audio) return;

      // Background/lockscreen end detection
      if (document.hidden && audio.currentTime >= audio.duration - 0.5) {
        handleSongEnd();
      }

      // Resume paused audio
      if (audio.paused && !audio.ended) {
        audio.play().catch(() => { });
      }
    }, 3000); // Reduced frequency

    return () => {
      audio.removeEventListener('ended', handleSongEnd);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      if (endingDetectionInterval) clearInterval(endingDetectionInterval);
    };
  }, [isPlaying, onTimeUpdate]);

  // Optimized background playback monitor
  useEffect(() => {
    if (!currentSong || !audioRef.current) return;

    const backgroundPlaybackMonitor = setInterval(() => {
      const state = usePlayerStore.getState();
      const audio = audioRef.current;
      if (!audio) return;

      if (audioFocusState.isInterrupted || !state.hasUserInteracted) {
        return;
      }

      if (audio.paused && state.isPlaying && !audio.ended && !state.wasPlayingBeforeInterruption) {
        audio.play().catch(() => { });
      }

      if (!isNaN(audio.duration) && audio.duration > 0) {
        if (audio.ended || (audio.currentTime >= audio.duration - 0.5 && audio.currentTime > 0)) {
          state.playNext();
          state.setIsPlaying(true);
          setTimeout(() => audioRef.current?.play().catch(() => { }), 100);
        }
      }
    }, 3000); // Reduced frequency

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

        // Preload next song (optimized)
        const nextIndex = (usePlayerStore.getState().currentIndex + 1) % usePlayerStore.getState().queue.length;
        const nextSong = usePlayerStore.getState().queue[nextIndex];
        if (nextSong && nextSong.audioUrl) {
          const preloadAudio = new Audio();
          preloadAudio.src = nextSong.audioUrl;
          preloadAudio.load();
          
          // Properly dispose of preload element
          setTimeout(() => {
            preloadAudio.src = '';
            preloadAudio.remove();
          }, 2000);
        }
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
    return <audio ref={audioRef} preload="auto" />;
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
      loop={usePlayerStore.getState().isRepeating}
      data-testid="audio-element"
    />
  );
};

export default AudioPlayerCore;