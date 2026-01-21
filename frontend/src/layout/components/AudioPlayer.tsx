import { useRef, useEffect, useCallback, useState } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { resolveArtist } from '@/lib/resolveArtist';
import { backgroundAudioManager, configureAudioElement, unlockAudioOnIOS, isIOS, playAudioForIOS } from '@/utils/audioManager';

// Check if MediaSession API is supported
const isMediaSessionSupported = () => {
  return 'mediaSession' in navigator;
};

const AudioPlayer = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const filtersRef = useRef<BiquadFilterNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const playTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isHandlingPlayback = useRef(false);

  // Store hooks
  const {
    currentSong,
    isPlaying,
    playNext,
    setIsPlaying,
    setUserInteracted,
    setCurrentTime: setStoreCurrentTime,
    setDuration: setStoreDuration
  } = usePlayerStore();

  const { streamingQuality, equalizer } = useSettingsStore();

  // Initialize audio context and equalizer
  const initializeAudioContext = useCallback(() => {
    if (!audioRef.current || audioContextRef.current) return;

    try {
      console.log('Initializing audio context and equalizer...');
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContext();
      const source = audioContext.createMediaElementSource(audioRef.current);
      const gainNode = audioContext.createGain();

      // Create equalizer filters
      const frequencies = [60, 150, 400, 1000, 2400, 15000];
      const filters = frequencies.map((freq, index) => {
        const filter = audioContext.createBiquadFilter();
        filter.type = index === 0 ? 'lowshelf' : index === frequencies.length - 1 ? 'highshelf' : 'peaking';
        filter.frequency.value = freq;
        filter.Q.value = 1;
        filter.gain.value = 0;
        return filter;
      });

      // Connect audio nodes
      source.connect(filters[0]);
      for (let i = 0; i < filters.length - 1; i++) {
        filters[i].connect(filters[i + 1]);
      }
      filters[filters.length - 1].connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Store references
      audioContextRef.current = audioContext;
      sourceNodeRef.current = source;
      gainNodeRef.current = gainNode;
      filtersRef.current = filters;

      console.log('Audio context initialized successfully');

      // Apply current equalizer settings
      const frequencies_hz = ['60Hz', '150Hz', '400Hz', '1KHz', '2.4KHz', '15KHz'] as const;
      frequencies_hz.forEach((freq, index) => {
        if (filters[index]) {
          const gainValue = equalizer[freq] || 0;
          filters[index].gain.value = gainValue;
          console.log(`Set ${freq} to ${gainValue}dB`);
        }
      });

    } catch (error) {
      console.warn('Audio context initialization failed:', error);
    }
  }, [equalizer]);

  // Apply equalizer settings
  const applyEqualizerSettings = useCallback(() => {
    if (!filtersRef.current.length) return;

    console.log('Applying equalizer settings:', equalizer);
    const frequencies = ['60Hz', '150Hz', '400Hz', '1KHz', '2.4KHz', '15KHz'] as const;
    frequencies.forEach((freq, index) => {
      if (filtersRef.current[index]) {
        const gainValue = equalizer[freq] || 0;
        filtersRef.current[index].gain.value = gainValue;
        console.log(`Set ${freq} to ${gainValue}dB`);
      }
    });
  }, [equalizer]);

  // Apply streaming quality (affects audio element properties)
  const applyStreamingQuality = useCallback(() => {
    if (!audioRef.current) return;

    console.log('Applying streaming quality:', streamingQuality);
    const audio = audioRef.current;

    // Set audio quality preferences based on streaming quality setting
    switch (streamingQuality) {
      case 'Low':
        audio.setAttribute('preload', 'none');
        break;
      case 'Normal':
        audio.setAttribute('preload', 'metadata');
        break;
      case 'High':
      case 'Very High':
        audio.setAttribute('preload', 'auto');
        break;
      default: // Automatic
        audio.setAttribute('preload', 'metadata');
        break;
    }
  }, [streamingQuality]);

  // Initialize audio element with background audio support - OLD WORKING VERSION
  useEffect(() => {
    if (audioRef.current) {
      const audio = audioRef.current;

      console.log('🎵 Initializing reliable background audio system');

      // Configure audio element for background playback (OLD WORKING VERSION)
      configureAudioElement(audio);

      // Initialize background audio manager
      backgroundAudioManager.initialize(audio);

      // Initialize audio context on first user interaction
      const handleFirstPlay = () => {
        console.log('🎯 First play detected - initializing audio context');
        initializeAudioContext();
        unlockAudioOnIOS(); // iOS-specific unlock
        audio.removeEventListener('play', handleFirstPlay);
      };
      audio.addEventListener('play', handleFirstPlay);

      // Apply initial settings
      applyStreamingQuality();

      // Add debugging listeners
      audio.addEventListener('loadstart', () => {
        console.log('📥 Audio load start');
      });

      audio.addEventListener('loadeddata', () => {
        console.log('📊 Audio data loaded');
      });

      audio.addEventListener('canplaythrough', () => {
        console.log('🚀 Audio can play through');
      });

      return () => {
        audio.removeEventListener('play', handleFirstPlay);
      };
    }
  }, [initializeAudioContext, applyStreamingQuality]);

  // Apply equalizer settings when they change
  useEffect(() => {
    applyEqualizerSettings();
  }, [equalizer, applyEqualizerSettings]);

  // Apply streaming quality when it changes
  useEffect(() => {
    applyStreamingQuality();
  }, [streamingQuality, applyStreamingQuality]);

  // Handle song changes
  useEffect(() => {
    if (!audioRef.current || !currentSong) return;

    const audio = audioRef.current;
    let songUrl = currentSong.audioUrl || (currentSong as any).url;

    if (!songUrl) {
      console.warn('No audio URL found');
      return;
    }

    // Convert HTTP to HTTPS
    if (songUrl.startsWith('http://')) {
      songUrl = songUrl.replace('http://', 'https://');
    }

    // Check if this is the same song
    const isSameSong = audio.src === songUrl;

    if (!isSameSong) {
      console.log('🎵 Loading new song:', currentSong.title);
      audio.pause();
      audio.currentTime = 0;
      audio.src = songUrl;
      audio.load();
    }
  }, [currentSong]);

  // Handle play/pause state changes - OLD WORKING VERSION WITH iOS BACKGROUND HANDLING
  useEffect(() => {
    if (!audioRef.current || isLoading || isHandlingPlayback.current) return;

    if (isPlaying) {
      // Use a flag to prevent concurrent play/pause operations
      isHandlingPlayback.current = true;

      // Clear any existing timeout
      if (playTimeoutRef.current) {
        clearTimeout(playTimeoutRef.current);
      }

      // Small delay to ensure any previous pause operation is complete
      playTimeoutRef.current = setTimeout(() => {
        const playPromise = audioRef.current?.play();
        if (playPromise) {
          playPromise
            .then(() => {
              isHandlingPlayback.current = false;
            })
            .catch((err) => {
              if (err && typeof err.message === 'string' && err.message.includes('interrupted')) {
                // If the error was due to interruption, try again after a short delay
                setTimeout(() => {
                  audioRef.current?.play().catch(() => {
                    setIsPlaying(false);
                  });
                }, 300);
              } else {
                setIsPlaying(false);
              }
              isHandlingPlayback.current = false;
            });
        } else {
          isHandlingPlayback.current = false;
        }
      }, 250);
    } else {
      // Also handle pause with a flag to prevent conflicts
      isHandlingPlayback.current = true;

      // Clear any existing timeout
      if (playTimeoutRef.current) {
        clearTimeout(playTimeoutRef.current);
      }

      audioRef.current?.pause();

      // Release the flag after a short delay
      setTimeout(() => {
        isHandlingPlayback.current = false;
      }, 200);
    }
  }, [isPlaying, isLoading, setIsPlaying]);

  // Handle iOS-specific background playback issues - OLD WORKING VERSION
  useEffect(() => {
    // Only run on iOS devices
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (!isIOSDevice) return;

    // Set up a dedicated iOS background continuation timer
    // This is critical for iOS which has stricter background restrictions
    const iosBackgroundTimer = setInterval(() => {
      if (document.hidden && isPlaying && audioRef.current) {
        const audio = audioRef.current;
        const audioDuration = audio.duration;

        // Check if audio should be playing but isn't
        if (audio.paused && !audio.ended) {
          audio.play().catch(() => { });
        }

        // Check if we need to advance to the next track
        if (!isNaN(audioDuration) && audioDuration > 0) {
          // If we're at or very near the end
          if (audio.currentTime >= audioDuration - 0.3) {
            // Get fresh state to ensure latest data
            const state = usePlayerStore.getState();

            // Move to next track and ensure playback
            state.playNext();
            state.setIsPlaying(true);

            // Give time for state to update before attempting playback
            setTimeout(() => {
              const freshAudio = audioRef.current;
              if (freshAudio) {
                freshAudio.play().catch(() => { });
              }
            }, 200);
          }
        }
      }
    }, 500);

    return () => {
      clearInterval(iosBackgroundTimer);
    };
  }, [isPlaying, currentSong]);

  // Update MediaSession metadata and action handlers - OLD WORKING VERSION
  useEffect(() => {
    // Only proceed if MediaSession API is supported and we have a current song
    if (!isMediaSessionSupported() || !currentSong) {
      return;
    }

    // Function to update metadata that we can reuse
    const updateMediaSessionMetadata = () => {
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

        // Also update position state if possible
        if ('setPositionState' in navigator.mediaSession && audioRef.current) {
          navigator.mediaSession.setPositionState({
            duration: audioRef.current.duration || 0,
            playbackRate: audioRef.current.playbackRate || 1.0,
            position: audioRef.current.currentTime || 0
          });
        }
      } catch (error) {
        // Silent error handling for MediaSession errors
      }
    };

    // Initial metadata update
    updateMediaSessionMetadata();

    // Update metadata when song changes or playing state changes
    // This ensures lock screen controls always show the right info
    const handleAudioChange = () => {
      updateMediaSessionMetadata();
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    };

    // Listen for events that might indicate song changes
    audioRef.current?.addEventListener('loadedmetadata', handleAudioChange);
    audioRef.current?.addEventListener('play', handleAudioChange);
    audioRef.current?.addEventListener('pause', handleAudioChange);

    // Set up media session action handlers with better responsiveness
    navigator.mediaSession.setActionHandler('play', () => {
      setIsPlaying(true);
      // Explicitly attempt to play for more reliable playback
      if (audioRef.current && audioRef.current.paused) {
        audioRef.current.play().catch(() => {
          // Silent error handling
        });
      }
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      setIsPlaying(false);
      // Explicitly pause to ensure state consistency
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
    });

    navigator.mediaSession.setActionHandler('previoustrack', () => {
      // Mark user interaction to allow autoplay
      usePlayerStore.getState().setUserInteracted();
      // Call previous from store directly for better state handling
      const { playPrevious } = usePlayerStore.getState();
      if (playPrevious) {
        playPrevious();
        // Force playing state
        setTimeout(() => {
          if (audioRef.current && audioRef.current.paused) {
            audioRef.current.play().catch(() => { });
          }
        }, 100);
      }
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      // Mark user interaction to allow autoplay
      usePlayerStore.getState().setUserInteracted();
      // Call next from store directly
      playNext();
      // Force playing state
      setTimeout(() => {
        if (audioRef.current && audioRef.current.paused) {
          audioRef.current.play().catch(() => { });
        }
      }, 100);
    });

    // Seeking handlers with better reliability
    try {
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (audioRef.current && details.seekTime !== undefined) {
          audioRef.current.currentTime = details.seekTime;
          setStoreCurrentTime(details.seekTime);
          setUserInteracted();

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
      // Clean up event listeners
      audioRef.current?.removeEventListener('loadedmetadata', handleAudioChange);
      audioRef.current?.removeEventListener('play', handleAudioChange);
      audioRef.current?.removeEventListener('pause', handleAudioChange);
    };
  }, [currentSong, setIsPlaying, playNext, setUserInteracted, setStoreCurrentTime, isPlaying]);

  // Lock screen specific MediaSession update interval - OLD WORKING VERSION
  useEffect(() => {
    // Only run if MediaSession API is supported and we're playing
    if (!isMediaSessionSupported() || !isPlaying || !currentSong) return;

    // Update MediaSession position state periodically even when app is in background
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
    }, 1000);

    return () => {
      clearInterval(positionUpdateInterval);
    };
  }, [isPlaying, currentSong]);

  // Enhanced background playback support - OLD WORKING VERSION
  useEffect(() => {
    // Only run when we have a song playing
    if (!currentSong || !isPlaying) return;

    // Handle visibility change specifically for playback
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is now hidden (background)
        console.log("Page hidden, ensuring background playback");

        // Double check media session availability
        if (isMediaSessionSupported()) {
          // Force update position state for lock screen
          if ('setPositionState' in navigator.mediaSession && audioRef.current) {
            try {
              navigator.mediaSession.setPositionState({
                duration: audioRef.current.duration || 0,
                playbackRate: audioRef.current.playbackRate || 1,
                position: audioRef.current.currentTime || 0
              });
            } catch (e) { }
          }

          // Ensure media session handlers are registered
          navigator.mediaSession.setActionHandler('nexttrack', () => {
            // Mark user interaction to allow autoplay
            usePlayerStore.getState().setUserInteracted();
            // Call next from store directly with enhanced reliability
            const state = usePlayerStore.getState();
            state.playNext();
            state.setIsPlaying(true);

            // Try to force audio to play with multiple attempts
            const playAttempts = [0, 200, 500, 1000];
            playAttempts.forEach(delay => {
              setTimeout(() => {
                const audio = document.querySelector('audio');
                if (audio && audio.paused && !audio.ended) {
                  audio.play().catch(() => { });
                }
              }, delay);
            });
          });

          // Re-register play/pause handlers for reliability
          navigator.mediaSession.setActionHandler('play', () => {
            usePlayerStore.getState().setIsPlaying(true);
            const audio = document.querySelector('audio');
            if (audio && audio.paused) {
              audio.play().catch(() => { });
            }
          });

          navigator.mediaSession.setActionHandler('pause', () => {
            usePlayerStore.getState().setIsPlaying(false);
            const audio = document.querySelector('audio');
            if (audio && !audio.paused) {
              audio.pause();
            }
          });
        }

        // If playing, make sure audio element is actually playing
        if (isPlaying && audioRef.current && audioRef.current.paused && !audioRef.current.ended) {
          audioRef.current.play().catch(() => { });
        }
      } else {
        // Page is visible again
        console.log("Page visible, checking playback state");

        // If we're supposed to be playing but audio is paused, restart it
        if (isPlaying && audioRef.current?.paused && !audioRef.current?.ended) {
          console.log("Restarting paused audio after visibility change");
          audioRef.current.play().catch(() => { });
        }

        // Check if we need to update the UI state based on actual audio element state
        if (!isPlaying && audioRef.current && !audioRef.current.paused) {
          // Audio is playing but our state says it's not - sync them
          usePlayerStore.getState().setIsPlaying(true);
        }
      }
    };

    // Handle page visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Setup wake lock for improved background playback (where supported)
    let wakeLock: any = null;

    const requestWakeLock = async () => {
      if ('wakeLock' in navigator) {
        try {
          // Request a screen wake lock to improve background playback
          wakeLock = await (navigator as any).wakeLock.request('screen');
          console.log('Wake lock acquired for improved playback');

          wakeLock.addEventListener('release', () => {
            console.log('Wake lock released');
            // Try to reacquire if we're still playing
            if (isPlaying) {
              requestWakeLock();
            }
          });
        } catch (err) {
          // Silent fail for unsupported browsers
        }
      }
    };

    // Request wake lock when playing
    if (isPlaying) {
      requestWakeLock();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      // Release wake lock if we have one
      if (wakeLock) {
        wakeLock.release().catch(() => { });
      }
    };
  }, [currentSong, isPlaying]);

  // Simple event handlers
  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current) return;
    const audio = audioRef.current;
    setStoreCurrentTime(audio.currentTime);
    if (!isNaN(audio.duration)) {
      setStoreDuration(audio.duration);
    }
  }, [setStoreCurrentTime, setStoreDuration]);

  const handleSongEnd = useCallback(() => {
    setUserInteracted();
    playNext();
  }, [playNext, setUserInteracted]);

  const handleCanPlay = useCallback(() => {
    // Resume audio context if suspended (required for some browsers)
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(console.warn);
    }

    if (isPlaying && audioRef.current) {
      // Use iOS-specific playback if on iOS
      if (isIOS()) {
        playAudioForIOS(audioRef.current).catch(() => { });
      } else {
        audioRef.current.play().catch(() => { });
      }
    }
  }, [isPlaying]);

  const handleError = useCallback(() => {
    console.error('Audio error, skipping to next song');
    setTimeout(() => playNext(), 1000);
  }, [playNext]);

  // Cleanup audio context and background audio manager on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(console.warn);
      }
      backgroundAudioManager.cleanup();
    };
  }, []);

  return (
    <audio
      ref={audioRef}
      onTimeUpdate={handleTimeUpdate}
      onEnded={handleSongEnd}
      onCanPlay={handleCanPlay}
      onError={handleError}
      onLoadStart={() => {
        console.log('📥 Audio load start');
      }}
      onWaiting={() => {
        console.log('⏳ Audio waiting');
        setIsLoading(true);
      }}
      onPlaying={() => {
        console.log('Audio playing event');
        setIsLoading(false);
      }}
      onPause={() => {
        console.log('Audio pause event');
      }}
      onPlay={() => {
        console.log('Audio play event');
      }}
      preload="auto"
      playsInline
      webkit-playsinline="true"
      controls={false}
      x-webkit-airplay="allow"
    />
  );
};

export default AudioPlayer;
