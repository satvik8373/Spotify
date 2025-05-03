import React from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Heart, SkipBack, SkipForward, Play, Pause, Shuffle, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLikedSongsStore } from '@/stores/useLikedSongsStore';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import SongDetailsView from '@/components/SongDetailsView';
import { useMusicStore } from '@/stores/useMusicStore';

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

// Format time helper function
const formatTime = (seconds: number) => {
  if (isNaN(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

// Check if MediaSession API is supported
const isMediaSessionSupported = () => {
  return 'mediaSession' in navigator;
};

// Add AudioContext singleton for better audio control and preventing multiple instances
let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

const AudioPlayer = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const prevSongRef = useRef<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const playTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isHandlingPlayback = useRef(false);
  const loadStarted = useRef<boolean>(false);
  const [isFullscreenMobile, setIsFullscreenMobile] = useState(false);
  const [currentTime, setLocalCurrentTime] = useState(0);
  const [duration, setLocalDuration] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [volume, setVolume] = useState(75);
  const [showSongDetails, setShowSongDetails] = useState(false);
  const errorNotificationRef = useRef<{ [key: string]: boolean }>({});
  const interruptionRef = useRef<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const { 
    currentSong, 
    isPlaying, 
    queue, 
    playNext, 
    setCurrentSong, 
    setIsPlaying,
    currentTime: storeCurrentTime,
    duration: storeDuration,
    isShuffled,
    toggleShuffle,
    setSystemInterruption
  } = usePlayerStore();

  const { likedSongIds, toggleLikeSong } = useLikedSongsStore();

  // These may not exist in the store based on linter errors
  const playerStore = usePlayerStore();
  const setCurrentTime = playerStore.setCurrentTime;
  const setDuration = playerStore.setDuration;
  const playPrevious = playerStore.playPrevious;
  
  // Prevent multiple audio instances by managing the audio context
  useEffect(() => {
    // Initialize audio context on first user interaction
    const initAudioContext = () => {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = getAudioContext();
          
          // Resume the context if it's suspended
          if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume().catch(err => {
              console.error('Failed to resume AudioContext:', err);
            });
          }
        }
      } catch (error) {
        console.error('Failed to initialize AudioContext:', error);
      }
    };
    
    // Listen for user interaction to initialize audio context
    const userInteractionEvents = ['click', 'touchstart', 'keydown'];
    
    const handleUserInteraction = () => {
      initAudioContext();
      
      // Remove listeners after first interaction
      userInteractionEvents.forEach(event => {
        document.removeEventListener(event, handleUserInteraction);
      });
    };
    
    // Add listeners for user interaction
    userInteractionEvents.forEach(event => {
      document.addEventListener(event, handleUserInteraction);
    });
    
    // Suspend audio context when page is hidden
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setSystemInterruption();
        if (audioRef.current && !audioRef.current.paused) {
          audioRef.current.pause();
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      // Clean up event listeners
      userInteractionEvents.forEach(event => {
        document.removeEventListener(event, handleUserInteraction);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [setSystemInterruption]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (playTimeoutRef.current) {
        clearTimeout(playTimeoutRef.current);
      }
      
      // Pause audio and clean up audio context
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Enhanced phone call and interruption detection
  useEffect(() => {
    // Function to detect audio focus changes
    const detectAudioFocusChange = () => {
      if (audioRef.current?.paused && isPlaying) {
        // Audio was paused externally while we think it's playing
        interruptionRef.current = true;
        setSystemInterruption();
      }
    };
    
    // Check periodically for focus changes
    const focusCheckInterval = setInterval(detectAudioFocusChange, 1000);
    
    // iOS-specific handling
    const handleBeforeUnload = () => {
      if (isPlaying) {
        setSystemInterruption();
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Handle pause events from system
    const handleSystemPause = () => {
      if (isPlaying && !isHandlingPlayback.current) {
        // This pause wasn't initiated by our code - likely system interruption
        interruptionRef.current = true;
        setSystemInterruption();
      }
    };
    
    if (audioRef.current) {
      audioRef.current.addEventListener('pause', handleSystemPause);
    }
    
    return () => {
      clearInterval(focusCheckInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (audioRef.current) {
        audioRef.current.removeEventListener('pause', handleSystemPause);
      }
    };
  }, [isPlaying, setSystemInterruption]);

  // Add/update the handle song ends function to ensure it doesn't auto-restart after interruptions
  useEffect(() => {
    const audio = audioRef.current;

    const handleEnded = () => {
      // Get the current state for logging and better control
      const state = usePlayerStore.getState();
      
      // Reset interruption state when song naturally ends
      interruptionRef.current = false;
      
      // Make sure user is marked as having interacted to enable autoplay
      state.setUserInteracted();
      
      // Force a slight delay to ensure proper state updates
      setTimeout(() => {
        // Call playNext directly from store for more reliable progression
        state.playNext();
        
        // Force playing state to be true only if we should auto-resume
        if (state.shouldAutoResume()) {
          state.setIsPlaying(true);
        } else {
          // Don't auto-resume if we shouldn't
          state.setIsPlaying(false);
        }
      }, 100);
    };

    audio?.addEventListener('ended', handleEnded);

    return () => audio?.removeEventListener('ended', handleEnded);
  }, []);

  // Improved error handling with debouncing
  const showErrorOnce = (errorMessage: string, errorId: string) => {
    // Only show each unique error once
    if (!errorNotificationRef.current[errorId]) {
      errorNotificationRef.current[errorId] = true;
      toast.error(errorMessage, {
        id: errorId,
        duration: 3000,
      });
      
      // Reset after some time so we can show the error again later if needed
      setTimeout(() => {
        errorNotificationRef.current[errorId] = false;
      }, 10000); // Reset after 10 seconds
    }
  };

  // Handle audio errors with better error reporting
  const handleError = (e: any) => {
    console.error('AudioPlayer error:', e);
    
    const errorCode = audioRef.current?.error?.code;
    let errorMessage = 'Unable to play this song';
    let errorId = 'audio-error';
    
    // Mark as interrupted
    interruptionRef.current = true;
    setSystemInterruption();
    
    switch(errorCode) {
      case 1: // MEDIA_ERR_ABORTED
        // User aborted - don't show error
        return;
      case 2: // MEDIA_ERR_NETWORK
        errorMessage = 'Network error - check your connection';
        errorId = 'network-error';
        break;
      case 3: // MEDIA_ERR_DECODE
        errorMessage = 'Audio format not supported';
        errorId = 'format-error';
        break;
      case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
        errorMessage = 'Audio source not available';
        errorId = 'source-error';
        break;
      default:
        // Unknown error
        break;
    }
    
    // Show error message only once per error type
    showErrorOnce(errorMessage, errorId);
    
    // Try to play next song if there was a media error
    if (errorCode === 3 || errorCode === 4) {
      setTimeout(() => playNext(), 1000);
    }
  };

  // Update MediaSession metadata and action handlers
  useEffect(() => {
    // Only proceed if MediaSession API is supported and we have a current song
    if (!isMediaSessionSupported() || !currentSong) {
      return;
    }

    // Update metadata
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.title || 'Unknown Title',
      artist: currentSong.artist || 'Unknown Artist',
      album: currentSong.albumId ? String(currentSong.albumId) : '',
      artwork: [
        {
          src: currentSong.imageUrl || 'https://cdn.iconscout.com/icon/free/png-256/free-music-1779799-1513951.png',
          sizes: '512x512',
          type: 'image/jpeg'
        }
      ]
    });

    // Set up media session action handlers
    navigator.mediaSession.setActionHandler('play', () => {
      // Only allow play if not interrupted by a system event
      if (!interruptionRef.current) {
        setIsPlaying(true);
      }
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      setIsPlaying(false);
    });

    navigator.mediaSession.setActionHandler('previoustrack', () => {
      playPrevious();
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      playNext();
    });

    // Seeking handlers (optional but useful)
    try {
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (audioRef.current && details.seekTime !== undefined) {
          audioRef.current.currentTime = details.seekTime;
          setLocalCurrentTime(details.seekTime);
          if (setCurrentTime) {
            setCurrentTime(details.seekTime);
          }
        }
      });
    } catch (error) {
      console.warn('Seek actions not supported', error);
    }

    // Position state (shows progress on lock screen for supported browsers)
    try {
      if ('setPositionState' in navigator.mediaSession) {
        const updatePositionState = () => {
          if (audioRef.current && !isNaN(audioRef.current.duration)) {
            navigator.mediaSession.setPositionState({
              duration: audioRef.current.duration,
              playbackRate: audioRef.current.playbackRate,
              position: audioRef.current.currentTime
            });
          }
        };
        
        // Update position state initially and on time update
        updatePositionState();
        audioRef.current?.addEventListener('timeupdate', updatePositionState);
        
        return () => {
          audioRef.current?.removeEventListener('timeupdate', updatePositionState);
        };
      }
    } catch (error) {
      console.warn('Position state not supported', error);
    }
  }, [currentSong, setIsPlaying, playNext, playPrevious, setCurrentTime]);

  // Update playback state in MediaSession
  useEffect(() => {
    if (isMediaSessionSupported()) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  // Update like status whenever the current song or likedSongIds changes
  useEffect(() => {
    if (!currentSong) return;
    
    const songId = (currentSong as any).id || currentSong._id;
    const liked = songId ? likedSongIds?.has(songId) : false;
    
    setIsLiked(liked);
  }, [currentSong, likedSongIds]);

  // Keyboard controls for mobile player
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFullscreenMobile) return;
      
      if (e.code === 'Space') {
        e.preventDefault();
        playerStore.togglePlay();
      } else if (e.code === 'ArrowLeft') {
        playPrevious();
      } else if (e.code === 'ArrowRight') {
        playNext();
      } else if (e.code === 'Escape') {
        setIsFullscreenMobile(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreenMobile, playNext, playPrevious, playerStore]);

  // Enhance MediaSession with proper interruption handling
  useEffect(() => {
    if (!isMediaSessionSupported() || !currentSong) {
      return;
    }

    // Set up interruption handler for iOS Safari
    const handleVisibilityChange = () => {
      if (document.hidden && isPlaying) {
        // Mark as interrupted when app goes to background while playing
        interruptionRef.current = true;
        // Pause audio when app goes to background
        setIsPlaying(false);
        if (audioRef.current) {
          audioRef.current.pause();
        }
      }
    };

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Set up media session event handlers
    navigator.mediaSession.setActionHandler('play', () => {
      // Only allow play if not interrupted by a system event
      if (!interruptionRef.current) {
        setIsPlaying(true);
      }
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      setIsPlaying(false);
    });

    navigator.mediaSession.setActionHandler('previoustrack', () => {
      playPrevious();
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      playNext();
    });

    // Add specific handler for Android audio focus changes
    if ('onStateChange' in navigator.mediaSession) {
      // @ts-ignore - This is available in Chrome/Android but not typed
      navigator.mediaSession.onStateChange = (event: any) => {
        if (event.state === 'interrupted') {
          // Mark as interrupted and pause playback
          interruptionRef.current = true;
          setIsPlaying(false);
          if (audioRef.current) {
            audioRef.current.pause();
          }
        }
      };
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if ('onStateChange' in navigator.mediaSession) {
        // @ts-ignore
        navigator.mediaSession.onStateChange = null;
      }
    };
  }, [currentSong, isPlaying, setIsPlaying, playNext, playPrevious]);

  // Handle system interruption events (like phone calls)
  useEffect(() => {
    const handleAudioInterruption = () => {
      if (audioRef.current?.paused && isPlaying) {
        // If audio is paused externally while we think it's playing
        // Mark as interrupted and update our state
        interruptionRef.current = true;
        setIsPlaying(false);
      }
    };

    // Check for audio interruptions regularly
    const interruptionCheck = setInterval(handleAudioInterruption, 1000);

    // iOS specific events for interruptions
    const handlePause = () => {
      if (isPlaying) {
        // If system paused the audio while our state is playing
        interruptionRef.current = true;
        setIsPlaying(false);
      }
    };

    if (audioRef.current) {
      audioRef.current.addEventListener('pause', handlePause);
    }

    return () => {
      clearInterval(interruptionCheck);
      if (audioRef.current) {
        audioRef.current.removeEventListener('pause', handlePause);
      }
    };
  }, [isPlaying, setIsPlaying]);

  // Modified play/pause logic with interruption handling
  useEffect(() => {
    if (!audioRef.current || isLoading || isHandlingPlayback.current) return;

    if (isPlaying) {
      // Only attempt to play if not interrupted
      if (!interruptionRef.current) {
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
                // Clear interruption state on successful play
                interruptionRef.current = false;
              })
              .catch(error => {
                console.error('Error playing audio:', error);
                // If play fails, we're still in an interrupted state
                interruptionRef.current = true;
                setIsPlaying(false);
                isHandlingPlayback.current = false;
                
                // Show toast only for user-actionable errors, not system interruptions
                if (!error.message.includes('interrupted') && 
                    !error.message.includes('NotAllowedError')) {
                  toast.error('Playback error: Try again');
                }
              });
          } else {
            isHandlingPlayback.current = false;
          }
        }, 250);
      } else {
        // If interrupted, update our state to match reality
        setIsPlaying(false);
      }
    } else {
      // Handle pause with a flag to prevent conflicts
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

  // Background audio focus handler
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Add event listeners for audio focus events
    const handleAudioFocusLoss = () => {
      if (isPlaying) {
        interruptionRef.current = true;
        setIsPlaying(false);
      }
    };

    // Listen for external media pause events
    audio.addEventListener('pause', () => {
      if (isPlaying && !isHandlingPlayback.current) {
        // If paused externally and not by our own code
        interruptionRef.current = true;
        setIsPlaying(false);
      }
    });

    // Setup audio focus listeners for different platforms
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && isPlaying) {
        interruptionRef.current = true;
        setIsPlaying(false);
      }
    });

    // Listen for page unload/refresh
    window.addEventListener('beforeunload', handleAudioFocusLoss);

    return () => {
      window.removeEventListener('beforeunload', handleAudioFocusLoss);
    };
  }, [isPlaying, setIsPlaying]);

  // Cleanup interruption state when user explicitly plays
  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isPlaying) {
      // User is explicitly playing - clear interruption state
      interruptionRef.current = false;
    }
    playerStore.togglePlay();
  };

  // Integrate with the existing handleEnded function
  useEffect(() => {
    const audio = audioRef.current;

    const handleEnded = () => {
      // Reset interruption state when song ends naturally
      interruptionRef.current = false;
      
      // Get the current state for logging and better control
      const state = usePlayerStore.getState();
      console.log("Song ended, current queue:", state.queue.length, "items, index:", state.currentIndex);
      
      // Make sure user is marked as having interacted to enable autoplay
      state.setUserInteracted();
      
      // Force a slight delay to ensure proper state updates
      setTimeout(() => {
        // Call playNext directly from store for more reliable progression
        state.playNext();
        // Force playing state to be true for next song
        state.setIsPlaying(true);
        console.log("Playing next song, new index:", usePlayerStore.getState().currentIndex);
      }, 100);
    };

    audio?.addEventListener('ended', handleEnded);

    return () => audio?.removeEventListener('ended', handleEnded);
  }, []);

  // Handle audio errors more gracefully
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleError = (e: ErrorEvent) => {
      console.error('Audio element error:', e);
      // Mark as interrupted
      interruptionRef.current = true;
      setIsPlaying(false);
      isHandlingPlayback.current = false;
      
      // Check if we need to switch to next song
      const errorCode = audio.error?.code;
      if (errorCode === 3 || errorCode === 4) { // MEDIA_ERR_DECODE or MEDIA_ERR_SRC_NOT_SUPPORTED
        // Only show error once
        toast.error('Unable to play this song - skipping to next', { id: 'audio-playback-error' });
        setTimeout(() => playNext(), 1000);
      }
    };

    audio.addEventListener('error', handleError as any);
    return () => audio.removeEventListener('error', handleError as any);
  }, [setIsPlaying, playNext]);

  // handle song changes
  useEffect(() => {
    if (!audioRef.current || !currentSong) return;

    const audio = audioRef.current;
    const songUrl = currentSong.audioUrl;

    // Validate the URL
    if (!isValidUrl(songUrl)) {
      console.error('Invalid audio URL:', songUrl);
      
      // Try to find audio for this song
      toast.loading(`Searching for "${currentSong.title}" by ${currentSong.artist}...`);
      
      // Use setTimeout to avoid blocking the UI
      setTimeout(async () => {
        try {
          // Search for the song using the music API
          const searchQuery = `${currentSong.title} ${currentSong.artist}`.trim();
          await useMusicStore.getState().searchIndianSongs(searchQuery);
          
          const results = useMusicStore.getState().indianSearchResults;
          
          if (results && results.length > 0) {
            // Found a match, update the song with the audio URL
            const foundSong = results[0];
            
            // Update the currentSong with the found audio URL
            const updatedSong = {
              ...currentSong,
              audioUrl: foundSong.url || '',
              imageUrl: currentSong.imageUrl || foundSong.image
            };
            
            // Update the song in the queue
            const currentQueue = usePlayerStore.getState().queue;
            const currentIndex = usePlayerStore.getState().currentIndex;
            
            const updatedQueue = currentQueue.map((song, idx) => 
              idx === currentIndex ? updatedSong : song
            );
            
            // Update the player store with the new queue and song
            usePlayerStore.setState({
              queue: updatedQueue,
              currentSong: updatedSong
            });
            
            // Update the player UI state
            setCurrentSong(updatedSong);
            
            toast.success(`Found audio for "${currentSong.title}"`);
            
            // Give a small delay for the state to update
            setTimeout(() => {
              // Force a play attempt with the new URL
              if (isPlaying) {
                audioRef.current?.load();
                audioRef.current?.play().catch(err => {
                  console.error('Error playing audio after finding URL:', err);
                  toast.error('Playback error: ' + err.message);
                });
              }
            }, 300);
          } else {
            // No results found
            toast.error(`Could not find audio for "${currentSong.title}"`);
            // Skip to the next song after a short delay
            setTimeout(() => {
              playNext();
            }, 1500);
          }
        } catch (error) {
          console.error('Error searching for song:', error);
          toast.error('Failed to find audio for this song');
          // Skip to the next song after a short delay
          setTimeout(() => {
            playNext();
          }, 1500);
        }
      }, 100);
      
      return;
    }

    // check if this is actually a new song
    const isSongChange = prevSongRef.current !== songUrl;
    if (isSongChange) {
      console.log('Loading audio source:', songUrl);

      try {
        // Indicate loading state to prevent play attempts during load
        setIsLoading(true);
        isHandlingPlayback.current = true;

        // Clear any existing timeout
        if (playTimeoutRef.current) {
          clearTimeout(playTimeoutRef.current);
        }

        // Pause current playback before changing source
        audio.pause();

        // Set up event listeners for this specific load sequence
        const handleCanPlay = () => {
          setIsLoading(false);
          prevSongRef.current = songUrl;

          if (isPlaying) {
            // Wait a bit before playing to avoid interruption errors
            playTimeoutRef.current = setTimeout(() => {
              const playPromise = audio.play();
              playPromise
                .then(() => {
                  isHandlingPlayback.current = false;
                })
                .catch(error => {
                  console.error('Error playing audio after load:', error);
                  toast.error(`Playback error: ${error.message}`);
                  setIsPlaying(false);
                  isHandlingPlayback.current = false;
                });
            }, 300);
          } else {
            isHandlingPlayback.current = false;
          }

          // Remove the one-time listener
          audio.removeEventListener('canplay', handleCanPlay);
        };

        // Listen for the canplay event which indicates the audio is ready
        audio.addEventListener('canplay', handleCanPlay);

        // Set the new source
        audio.src = songUrl;
        audio.load(); // Explicitly call load to begin fetching the new audio
      } catch (error) {
        console.error('Error setting audio source:', error);
        toast.error('Cannot play this song: Error loading audio');
        setIsLoading(false);
        isHandlingPlayback.current = false;
      }
    }
  }, [currentSong, isPlaying, setIsPlaying]);

  // Try to restore playback state on mount
  useEffect(() => {
    // This ensures we only try to restore on initial page load, not on remounts
    if (!loadStarted.current) {
      loadStarted.current = true;

      try {
        const savedPlayerState = localStorage.getItem('player_state');
        if (savedPlayerState) {
          const playerState = JSON.parse(savedPlayerState);
          if (playerState.currentSong) {
            // Always set current song even if it's already set
            setCurrentSong(playerState.currentSong);
            
            // Set mini player to show immediately
            if (!currentSong) {
              setIsFullscreenMobile(false);
            }

            // Don't autoplay immediately on page refresh
            setIsPlaying(false);
            
            console.log('Restored player state from localStorage:', playerState.currentSong.title);
          }
        }
      } catch (error) {
        console.error('Error restoring player state in AudioPlayer:', error);
      }
    }
  }, [setCurrentSong, currentSong, setIsPlaying]);

  // Save player state on song changes and unmount
  useEffect(() => {
    // Only save if we have a current song
    if (currentSong) {
      const playerState = {
        currentSong,
        timestamp: new Date().toISOString()
      };
      
      try {
        localStorage.setItem('player_state', JSON.stringify(playerState));
      } catch (error) {
        console.error('Error saving player state:', error);
      }
    }
    
    // Also save on unmount
    return () => {
      if (currentSong) {
        const playerState = {
          currentSong,
          timestamp: new Date().toISOString()
        };
        
        try {
          localStorage.setItem('player_state', JSON.stringify(playerState));
        } catch (error) {
          console.error('Error saving player state on unmount:', error);
        }
      }
    };
  }, [currentSong]);

  // Share audio time with other components and update MediaSession
  const updateAudioMetadata = () => {
    if (audioRef.current) {
      const currentTime = audioRef.current.currentTime;
      const duration = audioRef.current.duration;
      
      // Update local state
      setLocalCurrentTime(currentTime);
      if (!isNaN(duration)) {
        setLocalDuration(duration);
      }
      
      // Only call these functions if they exist in the store
      if (setCurrentTime) {
        setCurrentTime(currentTime);
      }
      if (setDuration && !isNaN(duration)) {
        setDuration(duration);
      }
      
      // Update MediaSession position state if supported
      if (isMediaSessionSupported() && 'setPositionState' in navigator.mediaSession && !isNaN(duration)) {
        try {
          navigator.mediaSession.setPositionState({
            duration: duration,
            playbackRate: audioRef.current.playbackRate,
            position: currentTime
          });
        } catch (error) {
          // Ignore position state errors
        }
      }
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setLocalCurrentTime(value[0]);
      if (setCurrentTime) {
        setCurrentTime(value[0]);
      }
    }
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
    if (audioRef.current) {
      audioRef.current.volume = value[0] / 100;
    }
  };

  const handleLikeToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!currentSong) return;
    
    const songId = (currentSong as any).id || currentSong._id;
    
    // Optimistically update UI
    setIsLiked(!isLiked);
    
    // Actually toggle the like status
    toggleLikeSong(currentSong);
    
    // Also dispatch a direct event for immediate notification
    document.dispatchEvent(new CustomEvent('songLikeStateChanged', { 
      detail: {
        songId,
        song: currentSong,
        isLiked: !isLiked,
        timestamp: Date.now(),
        source: 'AudioPlayer'
      }
    }));
  };
  
  // Skip back
  const handlePrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    playPrevious();
  };
  
  // Skip forward
  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    playNext();
  };

  if (!currentSong) {
    return (
      <audio
        ref={audioRef}
        preload="auto"
      />
    );
  }

  return (
    <>
      {/* Show SongDetailsView using our existing component */}
      <SongDetailsView 
        isOpen={showSongDetails} 
        onClose={() => setShowSongDetails(false)} 
      />
      
      {/* Mobile mini player (bottom bar) */}
      <div 
        className="fixed bottom-14 left-0 right-0 bg-gradient-to-b from-zinc-900 to-black border-t border-zinc-800/50 h-16 backdrop-blur-md z-40 sm:hidden transition-all duration-300"
        onClick={(e) => {
          e.preventDefault();
          setShowSongDetails(true);
        }}
      >
        <div className="relative h-full flex items-center justify-between px-3">
          {/* Song info / left side */}
          <div className="flex items-center gap-2 flex-1 min-w-0 max-w-[45%]">
            {currentSong && (
              <>
                <div className="h-10 w-10 flex-shrink-0 rounded overflow-hidden cursor-pointer">
                  <img
                    src={currentSong.imageUrl}
                    alt={currentSong.title}
                    className="h-full w-full object-cover bg-zinc-800"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://cdn.iconscout.com/icon/free/png-256/free-music-1779799-1513951.png';
                    }}
                  />
                </div>

                {/* Song info */}
                <div className="truncate min-w-0 flex-1">
                  <h4 className="text-xs font-medium truncate">{currentSong.title || "Unknown Title"}</h4>
                  <p className="text-[10px] text-zinc-400 truncate">{currentSong.artist || "Unknown Artist"}</p>
                </div>
              </>
            )}
          </div>

          {/* Playback controls / right side */}
          <div className="flex items-center gap-1.5">
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 text-white p-0"
              onClick={handlePrevious}
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            <Button
              size="icon"
              className="h-8 w-8 rounded-full bg-white text-black flex items-center justify-center p-0"
              onClick={handlePlayPause}
            >
              {isPlaying ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5 ml-[2px]" />
              )}
            </Button>

            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 text-white p-0"
              onClick={handleNext}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Progress bar for mobile */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
          <div 
            className="h-full bg-green-500" 
            style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
          />
        </div>
      </div>
      
      {/* Desktop mini player (only shows when not visible on mobile) */}
      <div 
        className="fixed bottom-0 left-0 right-0 bg-gradient-to-b from-zinc-900/80 to-black border-t border-zinc-800/50 h-16 backdrop-blur-md z-40 hidden sm:block md:hidden transition-all duration-300"
        onClick={(e) => {
          e.preventDefault();
          setShowSongDetails(true);
        }}
      >
        <div className="relative h-full flex items-center justify-between px-4">
          {/* Song info / left side */}
          <div className="flex items-center gap-3 flex-1 min-w-0 max-w-[45%]">
            {currentSong && (
              <>
                <div className="h-10 w-10 flex-shrink-0 rounded overflow-hidden cursor-pointer">
                  <img
                    src={currentSong.imageUrl}
                    alt={currentSong.title}
                    className="h-full w-full object-cover bg-zinc-800"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://cdn.iconscout.com/icon/free/png-256/free-music-1779799-1513951.png';
                    }}
                  />
                </div>

                {/* Song info */}
                <div className="truncate min-w-0 flex-1">
                  <h4 className="text-sm font-medium truncate">{currentSong.title || "Unknown Title"}</h4>
                  <p className="text-xs text-zinc-400 truncate">{currentSong.artist || "Unknown Artist"}</p>
                </div>
              </>
            )}
          </div>

          {/* Playback controls / right side */}
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 text-white p-0"
              onClick={handlePrevious}
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            <Button
              size="icon"
              className="h-10 w-10 rounded-full bg-white text-black flex items-center justify-center p-0"
              onClick={handlePlayPause}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4 ml-[2px]" />
              )}
            </Button>

            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 text-white p-0"
              onClick={handleNext}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'text-white hover:bg-white/10 h-9 w-9 ml-2',
                isLiked && 'text-green-500'
              )}
              onClick={handleLikeToggle}
            >
              <Heart
                className="h-4 w-4"
                fill={isLiked ? 'currentColor' : 'none'}
              />
            </Button>
          </div>
        </div>
        
        {/* Progress bar for desktop mini */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
          <div 
            className="h-full bg-green-500" 
            style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
          />
        </div>
      </div>
      
      <audio
        ref={audioRef}
        src={currentSong?.audioUrl || ''}
        autoPlay={false} // Never auto-play - we'll handle this manually
        onTimeUpdate={updateAudioMetadata}
        onLoadedMetadata={updateAudioMetadata}
        onError={handleError}
        preload="auto"
        playsInline
        // Add better mobile attributes
        x-webkit-airplay="allow"
        controlsList="nodownload"
        disableRemotePlayback={false}
        crossOrigin="anonymous"
      />
    </>
  );
};

export default AudioPlayer;
