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
    toggleShuffle
  } = usePlayerStore();

  const { likedSongIds, toggleLikeSong } = useLikedSongsStore();

  // These may not exist in the store based on linter errors
  const playerStore = usePlayerStore();
  const setCurrentTime = playerStore.setCurrentTime;
  const setDuration = playerStore.setDuration;
  const playPrevious = playerStore.playPrevious;

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (playTimeoutRef.current) {
        clearTimeout(playTimeoutRef.current);
      }
    };
  }, []);

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
      album: currentSong.albumId ? String(currentSong.albumId) : 'Unknown Album',
      artwork: [
        {
          src: currentSong.imageUrl || 'https://cdn.iconscout.com/icon/free/png-256/free-music-1779799-1513951.png',
          sizes: '512x512',
          type: 'image/jpeg'
        }
      ]
    });

    // Set up media session action handlers with better responsiveness
    navigator.mediaSession.setActionHandler('play', () => {
      setIsPlaying(true);
      // Explicitly attempt to play for more reliable playback
      if (audioRef.current && audioRef.current.paused) {
        audioRef.current.play().catch(() => {
          // Silent error handling, we try once more
          setTimeout(() => {
            if (audioRef.current?.paused) {
              audioRef.current.play().catch(() => {});
            }
          }, 300);
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
      if (playPrevious) {
      playPrevious();
        // Force playing state
        setTimeout(() => {
          usePlayerStore.getState().setIsPlaying(true);
          if (audioRef.current && audioRef.current.paused) {
            audioRef.current.play().catch(() => {});
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
        usePlayerStore.getState().setIsPlaying(true);
        if (audioRef.current && audioRef.current.paused) {
          audioRef.current.play().catch(() => {});
        }
      }, 100);
    });

    // Seeking handlers with better reliability
    try {
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (audioRef.current && details.seekTime !== undefined) {
          audioRef.current.currentTime = details.seekTime;
          setLocalCurrentTime(details.seekTime);
          if (setCurrentTime) {
            setCurrentTime(details.seekTime);
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
        
        // Use a throttled timeupdate listener for better performance
        let lastPositionUpdate = 0;
        const handleTimeUpdate = () => {
          const now = Date.now();
          if (now - lastPositionUpdate > 500) { // Update twice per second for lockscreen
            lastPositionUpdate = now;
            updatePositionState();
          }
        };
        
        audioRef.current?.addEventListener('timeupdate', handleTimeUpdate);
        
        // Also update position on play/pause to ensure lock screen is in sync
        audioRef.current?.addEventListener('play', updatePositionState);
        audioRef.current?.addEventListener('pause', updatePositionState);
        
        return () => {
          audioRef.current?.removeEventListener('timeupdate', handleTimeUpdate);
          audioRef.current?.removeEventListener('play', updatePositionState);
          audioRef.current?.removeEventListener('pause', updatePositionState);
        };
      }
    } catch (error) {
      // Silent error handling
    }

    // Make sure we have proper initialization for lock screen controls
    if (currentSong.audioUrl && isPlaying) {
      setTimeout(() => {
        if (audioRef.current && !isNaN(audioRef.current.duration) && 'setPositionState' in navigator.mediaSession) {
          navigator.mediaSession.setPositionState({
            duration: audioRef.current.duration,
            playbackRate: audioRef.current.playbackRate,
            position: audioRef.current.currentTime
          });
        }
      }, 300);
    }
    
    // Set playback state
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    
    // Preload next track for smoother transitions
    const preloadNextTrack = () => {
      if (!currentSong || !queue.length) return;
      
      const currentIndex = queue.findIndex(song => song._id === currentSong._id);
      if (currentIndex === -1) return;
      
      const nextIndex = (currentIndex + 1) % queue.length;
      const nextSong = queue[nextIndex];
      
      if (nextSong && nextSong.audioUrl && isValidUrl(nextSong.audioUrl)) {
        // Create a temporary audio element to preload the next song
        const preloadAudio = new Audio();
        preloadAudio.src = nextSong.audioUrl;
        preloadAudio.load();
        
        // Set up metadata for lock screen to show next track info
        setTimeout(() => {
          // Clean up preload element to avoid memory leaks
          preloadAudio.src = '';
        }, 3000);
      }
    };
    
    // Call preload function with a delay to not interfere with current playback
    const preloadTimeout = setTimeout(preloadNextTrack, 2000);
    
    return () => {
      clearTimeout(preloadTimeout);
    };
  }, [currentSong, setIsPlaying, playNext, playPrevious, setCurrentTime, isPlaying, queue]);

  // Enhanced phone call and audio focus handling
  useEffect(() => {
    // Define handler for audio interruptions
    const handleAudioInterruption = (): (() => void) => {
      // Track if we were playing before interruption
      const wasPlaying = isPlaying;
      
      // Handle when audio is interrupted (likely by a call)
      const handleAudioPause = () => {
        // Store the state so we can resume after the interruption
        if (isPlaying) {
          usePlayerStore.setState({ wasPlayingBeforeInterruption: true });
          
          // Save current playback position for restoration
          if (audioRef.current && currentSong) {
            try {
              localStorage.setItem('audio_interruption_state', JSON.stringify({
                songId: currentSong._id,
                position: audioRef.current.currentTime,
                timestamp: Date.now()
              }));
            } catch (error) {
              // Silent error handling
            }
          }
        }
      };
      
      // Handle resuming audio after interruption ends
      const handleAudioResume = () => {
        // Get the latest state
        const state = usePlayerStore.getState();
        
        // Check if we were playing before the interruption
        if (state.wasPlayingBeforeInterruption) {
          // First try to restore the position if applicable
          try {
            const interruptionState = localStorage.getItem('audio_interruption_state');
            if (interruptionState && audioRef.current && currentSong) {
              const { songId, position, timestamp } = JSON.parse(interruptionState);
              
              // Only restore if we're still on the same song
              if (songId === currentSong._id) {
                // Calculate time elapsed during interruption
                const timeElapsed = (Date.now() - timestamp) / 1000;
                
                // If interruption was brief and we're not near the end of the song
                if (timeElapsed < 120 && position + timeElapsed < audioRef.current.duration - 10) {
                  // Set position with time adjustment
                  audioRef.current.currentTime = Math.min(position + timeElapsed, audioRef.current.duration - 1);
                } else if (position + timeElapsed >= audioRef.current.duration - 10) {
                  // We should have moved to next song
                  setTimeout(() => state.playNext(), 100);
                }
              }
              
              // Clean up saved state
              localStorage.removeItem('audio_interruption_state');
            }
          } catch (error) {
            // Silent error handling
          }
          
          // Resume playback with a slight delay to let the system stabilize
          setTimeout(() => {
            // Make sure user is marked as having interacted to enable autoplay
            state.setUserInteracted();
            
            // Force playing state to be true
            state.setIsPlaying(true);
            
            // Reset the flag
            usePlayerStore.setState({ wasPlayingBeforeInterruption: false });
            
            if (audioRef.current?.paused) {
              audioRef.current.play().catch(err => {
                // Silent error handling - retry once more after a delay
                setTimeout(() => {
                  if (audioRef.current && audioRef.current.paused && state.isPlaying) {
                    audioRef.current.play().catch(() => {
                      // If still fails, we give up but keep the state as playing
                      // so lockscreen controls still show as playing
                    });
                  }
                }, 1000);
              });
            }
          }, 300);
        }
      };
      
      // Add event listeners for various audio interruption events
      document.addEventListener('visibilitychange', () => {
        // When document becomes visible again after being hidden
        if (!document.hidden && usePlayerStore.getState().wasPlayingBeforeInterruption) {
          handleAudioResume();
        } else if (document.hidden && isPlaying) {
          // Mark that we were playing when hidden
          usePlayerStore.setState({ wasPlayingBeforeInterruption: true });
        }
      });
      
      // Handle audio interruptions via the audio event listeners
      if (audioRef.current) {
        audioRef.current.addEventListener('pause', handleAudioPause);
        audioRef.current.addEventListener('play', handleAudioResume);
        
        // Handle phone call interruptions by listening for audio errors
        audioRef.current.addEventListener('error', (event) => {
          if (isPlaying) {
            usePlayerStore.setState({ wasPlayingBeforeInterruption: true });
            // Try to recover after a delay
            setTimeout(handleAudioResume, 3000);
          }
        });
      }
      
      // Return cleanup function
      return () => {
        if (audioRef.current) {
          audioRef.current.removeEventListener('pause', handleAudioPause);
          audioRef.current.removeEventListener('play', handleAudioResume);
        }
        document.removeEventListener('visibilitychange', handleAudioResume);
      };
    };
    
    const cleanup = handleAudioInterruption();
    return cleanup;
  }, [isPlaying, currentSong]);

  // Enhanced song end handling
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      // Get the current state for logging and better control
      const state = usePlayerStore.getState();
      
      // Mark that user has interacted to enable autoplay for next song
      state.setUserInteracted();
      
      // Set the wasPlaying flag to true to ensure we continue playing
      state.wasPlayingBeforeInterruption = true;
      
      // Force a slight delay to ensure proper state updates
      setTimeout(() => {
        // If we're at the end of the queue and set to repeat, restart queue
        if (state.currentIndex === state.queue.length - 1 && state.isRepeating) {
          // Check if setCurrentIndex exists in the store
          if ('setCurrentIndex' in state) {
            (state as any).setCurrentIndex(0);
          } else {
            // Alternative approach to handle queue repetition if setCurrentIndex doesn't exist
            // Start from the beginning of the queue
            state.setCurrentSong(state.queue[0]);
          }
        } else {
          // Call playNext directly from store for more reliable progression
          state.playNext();
        }
        
        // Force playing state to be true
        state.setIsPlaying(true);
        
        // Explicitly attempt to play after state updates to ensure next song starts
        if (audioRef.current) {
          audioRef.current.play().catch(err => {
            // If initial play fails, try again with another slight delay
            setTimeout(() => {
              if (audioRef.current && state.isPlaying) {
                audioRef.current.play().catch(e => {
                  // If it still fails after retry, we set playing to false
                  state.setIsPlaying(false);
                });
              }
            }, 300);
          });
        }
      }, 50); // Reduced delay for faster transitions
    };

    const setupSongEndDetection = () => {
      if (!audio) return;
      
      // Standard ended event
      audio.addEventListener('ended', handleEnded);
      
      // Also set up a time-based check for song end that's more reliable on mobile
      let songEndCheckInterval: ReturnType<typeof setInterval> | null = null;
      
      const startSongEndCheck = () => {
        if (songEndCheckInterval) clearInterval(songEndCheckInterval);
        
        songEndCheckInterval = setInterval(() => {
          // Only check if we're playing and near the end
          if (audio && isPlaying && !audio.paused) {
            const timeRemaining = audio.duration - audio.currentTime;
            
            // If less than 0.3 seconds remaining and not at exactly zero
            // (to avoid duplicate end handling with the 'ended' event)
            if (timeRemaining < 0.3 && timeRemaining > 0) {
              handleEnded();
            }
          }
        }, 100); // Check frequently
      };
      
      const stopSongEndCheck = () => {
        if (songEndCheckInterval) {
          clearInterval(songEndCheckInterval);
          songEndCheckInterval = null;
        }
      };
      
      // Start checking when playing, stop when paused
      audio.addEventListener('play', startSongEndCheck);
      audio.addEventListener('pause', stopSongEndCheck);
      audio.addEventListener('ended', stopSongEndCheck);
      
      // Start immediately if already playing
      if (isPlaying && !audio.paused) {
        startSongEndCheck();
      }
      
      return () => {
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('play', startSongEndCheck);
        audio.removeEventListener('pause', stopSongEndCheck);
        audio.removeEventListener('ended', stopSongEndCheck);
        
        if (songEndCheckInterval) {
          clearInterval(songEndCheckInterval);
        }
      };
    };
    
    return setupSongEndDetection();
  }, [isPlaying, playNext, playPrevious, playerStore]);

  // Add a dedicated background playback maintenance system
  useEffect(() => {
    // Only set up if we have an active song
    if (!currentSong || !audioRef.current) return;
    
    // Use service worker techniques to keep audio alive in background
    const keepAliveInterval = setInterval(() => {
      // Only execute when in background
      if (document.hidden && isPlaying) {
        // Get latest state to ensure we're working with current data
        const state = usePlayerStore.getState();
        const audio = audioRef.current;
        
        if (!audio) return;
        
        // Check if audio is playing as expected
        if (audio.paused && state.isPlaying) {
          audio.play().catch(err => {
            // Error handling without logging
          });
        }
        
        // Check if we need to advance to next song
        if (audio.ended || (audio.currentTime >= audio.duration - 0.3 && audio.currentTime > 0)) {
          // Increment to next song
          state.playNext();
          // Ensure playing state is maintained
          state.setIsPlaying(true);
          
          // Actually play the audio
          setTimeout(() => {
            if (audioRef.current) {
              audioRef.current.play().catch(err => {
                // Error handling without logging
              });
            }
          }, 100); // Faster transition
        }
        
        // Preload next song to ensure smooth transition
        if (audio.currentTime > 0 && audio.duration > 0 && audio.currentTime >= audio.duration - 5) {
          // If we're near the end, preload the next song
          const nextIndex = (state.currentIndex + 1) % state.queue.length;
          if (nextIndex !== state.currentIndex && state.queue[nextIndex]) {
            const nextSong = state.queue[nextIndex];
            if (nextSong.audioUrl) {
              const preloadAudio = new Audio();
              preloadAudio.src = nextSong.audioUrl;
              preloadAudio.load();
              // Discard after preloading starts
              setTimeout(() => {
                preloadAudio.src = '';
              }, 2000);
            }
          }
        }
        
        // Send wake-up ping to keep service worker alive
        if (navigator.serviceWorker) {
          navigator.serviceWorker.ready.then(registration => {
            if (registration.active) {
              try {
                registration.active.postMessage({
                  type: 'KEEP_ALIVE',
                  timestamp: Date.now()
                });
              } catch (error) {
                // Ignore errors, this is just a best-effort ping
              }
            }
          }).catch(() => {
            // Ignore errors if service worker isn't available
          });
        }
      }
    }, 3000); // Check more frequently
    
    return () => {
      clearInterval(keepAliveInterval);
    };
  }, [currentSong, isPlaying]);

  // Handle iOS-specific background playback issues 
  useEffect(() => {
    // Only run on iOS devices
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (!isIOS) return;
    
    // The audio session configuration for iOS
    const configureAudioSession = () => {
      // Set up audio to continue in background
      if (audioRef.current) {
        // iOS-specific attributes
        audioRef.current.setAttribute('x-webkit-airplay', 'allow');
        audioRef.current.setAttribute('webkit-playsinline', 'true');
        audioRef.current.setAttribute('playsinline', '');
        
        // Force iOS to keep audio session active
        document.addEventListener('touchstart', function iosTouchHandler() {
          // Play and immediately pause to activate audio session
          const silentPlay = audioRef.current?.play();
          if (silentPlay) {
            silentPlay.then(() => {
              if (!isPlaying) {
                audioRef.current?.pause();
              }
              // Remove the handler after first touch
              document.removeEventListener('touchstart', iosTouchHandler);
            }).catch(() => {
              // Just ignore errors here
            });
          }
        }, { once: true });
      }
    };
    
    configureAudioSession();
    
    // Special handling for iOS background audio session
    const handleIOSVisibilityChange = () => {
      if (document.hidden) {
        // App going to background
        
        // Force update media session before going to background
        if (isMediaSessionSupported() && currentSong && audioRef.current) {
          try {
            navigator.mediaSession.metadata = new MediaMetadata({
              title: currentSong.title || 'Unknown Title',
              artist: currentSong.artist || 'Unknown Artist',
              album: currentSong.albumId ? String(currentSong.albumId) : 'Unknown Album',
              artwork: [
                {
                  src: currentSong.imageUrl || 'https://cdn.iconscout.com/icon/free/png-256/free-music-1779799-1513951.png',
                  sizes: '512x512',
                  type: 'image/jpeg'
                }
              ]
            });
            
            // Update position state
            if ('setPositionState' in navigator.mediaSession) {
              navigator.mediaSession.setPositionState({
                duration: audioRef.current.duration || 0,
                playbackRate: audioRef.current.playbackRate,
                position: audioRef.current.currentTime
              });
            }
          } catch (e) {
            // Ignore errors
          }
        }
        
        // Save the current time and song for restoration
        if (audioRef.current && currentSong) {
          const restorationData = {
            song: currentSong,
            position: audioRef.current.currentTime,
            isPlaying: isPlaying,
            timestamp: Date.now()
          };
          
          try {
            localStorage.setItem('ios_audio_restoration', JSON.stringify(restorationData));
          } catch (e) {
            // Error handling without logging
          }
          
          // Keep playback alive by using audio focus techniques
          if (isPlaying && audioRef.current.paused) {
            audioRef.current.play().catch(() => {});
          }
        }
      } else {
        // App coming to foreground
        
        // Check if we need to restore or advance
        try {
          const savedData = localStorage.getItem('ios_audio_restoration');
          if (savedData && audioRef.current) {
            const { song, position, isPlaying: wasPlaying, timestamp } = JSON.parse(savedData);
            const currentTime = Date.now();
            const timePassed = (currentTime - timestamp) / 1000; // in seconds
            
            // If we have the same song still
            if (song._id === currentSong?._id) {
              // Calculate where we should be now
              const expectedPosition = position + timePassed;
              
              // If expected position exceeds song duration, we should have advanced
              if (expectedPosition >= audioRef.current.duration - 1) {
                // Need to advance to next song
                const state = usePlayerStore.getState();
                state.playNext();
                if (wasPlaying) {
                  state.setIsPlaying(true);
                  
                  // Force play attempt after a short delay
                  setTimeout(() => {
                    if (audioRef.current && audioRef.current.paused) {
                      audioRef.current.play().catch(() => {});
                    }
                  }, 100);
                }
              } else {
                // Otherwise just ensure we're at the right position
                audioRef.current.currentTime = expectedPosition;
                if (wasPlaying && audioRef.current.paused) {
                  audioRef.current.play().catch(() => {});
                }
              }
            } else if (wasPlaying) {
              // Different song - ensure it's playing if it should be
              usePlayerStore.getState().setIsPlaying(true);
              if (audioRef.current.paused) {
                audioRef.current.play().catch(() => {});
              }
            }
            
            // Clean up
            localStorage.removeItem('ios_audio_restoration');
          }
        } catch (e) {
          // Error handling without logging
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleIOSVisibilityChange);
    
    // Set up a backup wakeup timer for iOS
    let wakeupInterval: NodeJS.Timeout | null = null;
    
    if (isPlaying) {
      wakeupInterval = setInterval(() => {
        if (document.hidden && audioRef.current) {
          // If in background and we should be playing
          if (isPlaying && audioRef.current.paused) {
            audioRef.current.play().catch(() => {});
          }
          
          // If near the end of the song, prepare to advance
          if (audioRef.current.currentTime > 0 && 
              audioRef.current.duration > 0 && 
              !isNaN(audioRef.current.duration) &&
              audioRef.current.currentTime >= audioRef.current.duration - 0.5) {
            
            const state = usePlayerStore.getState();
            state.playNext();
            state.setIsPlaying(true);
            
            // Try to play the next song
            setTimeout(() => {
              if (audioRef.current) {
                audioRef.current.play().catch(() => {});
              }
            }, 100);
          }
        }
      }, 1000);
    }
    
    return () => {
      document.removeEventListener('visibilitychange', handleIOSVisibilityChange);
      if (wakeupInterval) {
        clearInterval(wakeupInterval);
      }
    };
  }, [currentSong, isPlaying]);

  // Update audio element configuration for better mobile support
  useEffect(() => {
    if (audioRef.current) {
      // Configure audio element for better mobile background playback
      audioRef.current.setAttribute('playsinline', '');
      audioRef.current.setAttribute('webkit-playsinline', '');
      audioRef.current.setAttribute('preload', 'auto');
      audioRef.current.setAttribute('x-webkit-airplay', 'allow'); // iOS airplay support
      audioRef.current.setAttribute('disableRemotePlayback', 'false'); // Enable casting
      
      // Improve audio priority to reduce interruptions
      try {
        if ('AudioContext' in window) {
          const audioContext = new AudioContext();
          const mediaElementSource = audioContext.createMediaElementSource(audioRef.current);
          mediaElementSource.connect(audioContext.destination);
        }
      } catch (error) {
        // Silent error handling
      }
      
      // Ensure audio continues to play when locked and mixed with other sounds
      if ('mozAudioChannelType' in audioRef.current) {
        // Firefox OS
        (audioRef.current as any).mozAudioChannelType = 'content';
      }

      // Set up error handling
      const handleError = (e: Event) => {
        const audio = e.target as HTMLAudioElement;
        
        // Log error details for debugging
        console.error('Audio error:', {
          error: audio.error,
          networkState: audio.networkState,
          readyState: audio.readyState,
          src: audio.src
        });

        // Handle different error types
        if (audio.error) {
          switch (audio.error.code) {
            case MediaError.MEDIA_ERR_ABORTED:
              // User aborted the audio
              break;
            case MediaError.MEDIA_ERR_NETWORK:
              // Network error - try to recover
              setTimeout(() => {
                if (audioRef.current && isPlaying) {
                  audioRef.current.load();
                  audioRef.current.play().catch(() => {
                    // If still fails, skip to next song
                    playNext();
                  });
                }
              }, 1000);
              break;
            case MediaError.MEDIA_ERR_DECODE:
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
              // Unrecoverable error - skip to next song
              playNext();
              break;
          }
        }
      };

      // Set up stalled handling
      const handleStalled = () => {
        if (isPlaying && audioRef.current) {
          // Try to recover from stalled state
          setTimeout(() => {
            if (audioRef.current && isPlaying) {
              const currentTime = audioRef.current.currentTime;
              audioRef.current.currentTime = currentTime;
              audioRef.current.play().catch(() => {
                // If still fails, skip to next song
                playNext();
              });
            }
          }, 2000);
        }
      };

      // Set up waiting handling
      const handleWaiting = () => {
        setIsLoading(true);
      };

      const handlePlaying = () => {
        setIsLoading(false);
      };

      // Add event listeners
      audioRef.current.addEventListener('error', handleError);
      audioRef.current.addEventListener('stalled', handleStalled);
      audioRef.current.addEventListener('waiting', handleWaiting);
      audioRef.current.addEventListener('playing', handlePlaying);

      // Cleanup
      return () => {
        if (audioRef.current) {
          audioRef.current.removeEventListener('error', handleError);
          audioRef.current.removeEventListener('stalled', handleStalled);
          audioRef.current.removeEventListener('waiting', handleWaiting);
          audioRef.current.removeEventListener('playing', handlePlaying);
        }
      };
    }
  }, []);

  // Handle audio focus changes on mobile
  useEffect(() => {
    // Function to request audio focus and handle focus change events
    const setupAudioFocus = () => {
      // Ensure we run only in browser environments
      if (!window || !navigator) return;
      
      // Register to handle phone call interruptions (iOS)
      document.addEventListener('pause', () => {
        // App going to background (iOS only event - different from audio pause)
        if (isPlaying) {
          usePlayerStore.setState({ wasPlayingBeforeInterruption: true });
        }
      });
      
      document.addEventListener('resume', () => {
        // App resuming from background (iOS only event)
        if (usePlayerStore.getState().wasPlayingBeforeInterruption) {
          setTimeout(() => {
            usePlayerStore.getState().setUserInteracted();
            usePlayerStore.getState().setIsPlaying(true);
            usePlayerStore.setState({ wasPlayingBeforeInterruption: false });
          }, 500);
        }
      });
    };
    
    setupAudioFocus();
    
    // No cleanup needed for these global event listeners (they're app-level)
  }, [isPlaying]);
  
  // Add buffering state detection
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const handleWaiting = () => {
      setIsLoading(true);
    };
    
    const handlePlaying = () => {
      setIsLoading(false);
    };
    
    // Handle stalled playback
    const handleStalled = () => {
      // If we're supposed to be playing but stalled
      if (isPlaying) {
        setTimeout(() => {
          // Try to restart the current song
          const currentTime = audio.currentTime;
          audio.currentTime = currentTime;
          audio.play().catch(err => {
            // Error handling without logging
          });
        }, 2000);
      }
    };
    
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('stalled', handleStalled);
    
    return () => {
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('stalled', handleStalled);
    };
  }, [isPlaying]);

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

  // Listen for like updates from other components
  useEffect(() => {
    const handleLikeUpdate = (e: Event) => {
      if (!currentSong) return;
      
      const songId = (currentSong as any).id || currentSong._id;
      
      // Check if this event includes details about which song was updated
      if (e instanceof CustomEvent && e.detail) {
        // If we have details and it's not for our current song, ignore
        if (e.detail.songId && e.detail.songId !== songId) {
          return;
        }
        
        // If we have explicit like state in the event, use it
        if (typeof e.detail.isLiked === 'boolean') {
          setIsLiked(e.detail.isLiked);
          return;
        }
      }
      
      // Otherwise do a fresh check from the store
      const freshCheck = songId ? likedSongIds?.has(songId) : false;
      setIsLiked(freshCheck);
    };
    
    document.addEventListener('likedSongsUpdated', handleLikeUpdate);
    document.addEventListener('songLikeStateChanged', handleLikeUpdate);
    
    return () => {
      document.removeEventListener('likedSongsUpdated', handleLikeUpdate);
      document.removeEventListener('songLikeStateChanged', handleLikeUpdate);
    };
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

  // handle play/pause logic
  useEffect(() => {
    if (!audioRef.current || isLoading || isHandlingPlayback.current) return;

    const handlePlayback = async () => {
      try {
        if (isPlaying) {
          // Clear any existing timeout
          if (playTimeoutRef.current) {
            clearTimeout(playTimeoutRef.current);
          }

          // Use a flag to prevent concurrent play/pause operations
          isHandlingPlayback.current = true;

          // Small delay to ensure any previous pause operation is complete
          playTimeoutRef.current = setTimeout(async () => {
            if (!audioRef.current) return;

            try {
              // Ensure audio is loaded before playing
              if (audioRef.current.readyState < 2) {
                await new Promise((resolve) => {
                  audioRef.current!.addEventListener('canplay', resolve, { once: true });
                  audioRef.current!.load();
                });
              }

              // Attempt to play
              await audioRef.current.play();
              
              // Update MediaSession state
              if (isMediaSessionSupported()) {
                navigator.mediaSession.playbackState = 'playing';
              }
            } catch (error) {
              // If play fails, try one more time after a short delay
              setTimeout(async () => {
                if (audioRef.current && isPlaying) {
                  try {
                    await audioRef.current.play();
                  } catch (retryError) {
                    setIsPlaying(false);
                  }
                }
              }, 300);
            } finally {
              isHandlingPlayback.current = false;
            }
          }, 100);
        } else {
          // Handle pause
          if (audioRef.current && !audioRef.current.paused) {
            audioRef.current.pause();
            
            // Update MediaSession state
            if (isMediaSessionSupported()) {
              navigator.mediaSession.playbackState = 'paused';
            }
          }
        }
      } catch (error) {
        // Silent error handling
        isHandlingPlayback.current = false;
      }
    };

    handlePlayback();
  }, [isPlaying, isLoading, setIsPlaying]);

  // handle song changes
  useEffect(() => {
    if (!audioRef.current || !currentSong) return;

    const audio = audioRef.current;
    const songUrl = currentSong.audioUrl;

    // Validate the URL
    if (!isValidUrl(songUrl)) {
      // Try to find audio for this song
      const searchAndLoadSong = async () => {
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
            
            // Load and play the new audio
            if (audioRef.current) {
              audioRef.current.src = updatedSong.audioUrl;
              audioRef.current.load();
              
              // Wait for the audio to be ready
              await new Promise((resolve) => {
                audioRef.current!.addEventListener('canplay', resolve, { once: true });
              });
              
              // Play if we should be playing
              if (isPlaying) {
                await audioRef.current.play();
              }
            }
          } else {
            // No results found, skip to next song
            playNext();
          }
        } catch (error) {
          // Error handling - skip to next song
          playNext();
        }
      };

      searchAndLoadSong();
      return;
    }

    // Check if this is actually a new song
    const isSongChange = prevSongRef.current !== songUrl;
    if (isSongChange) {
      const loadNewSong = async () => {
        try {
          // Use a loading lock to prevent race conditions
          const loadingLock = Date.now();
          const currentLoadingOperation = loadingLock;
          
          // Store the current loading operation to check for conflicts
          (audioRef.current as any)._currentLoadingOperation = loadingLock;
          
          // Indicate loading state
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
            // Check if this is still the current loading operation
            if ((audioRef.current as any)._currentLoadingOperation !== currentLoadingOperation) {
              return;
            }
            
            // Update state
            setIsLoading(false);
            prevSongRef.current = songUrl;

            if (isPlaying) {
              // Play the audio
              audioRef.current?.play().catch(error => {
                // If play fails, try one more time
                setTimeout(() => {
                  if (audioRef.current && isPlaying) {
                    audioRef.current.play().catch(() => {
                      setIsPlaying(false);
                    });
                  }
                }, 300);
              });
            }
            
            isHandlingPlayback.current = false;
          };

          // Listen for the canplay event
          audio.addEventListener('canplay', handleCanPlay, { once: true });

          // Set the new source and load
          audio.src = songUrl;
          audio.load();
          
          // Preload the next song
          const nextIndex = (usePlayerStore.getState().currentIndex + 1) % usePlayerStore.getState().queue.length;
          const nextSong = usePlayerStore.getState().queue[nextIndex];
          if (nextSong && nextSong.audioUrl) {
            const preloadAudio = new Audio();
            preloadAudio.src = nextSong.audioUrl;
            preloadAudio.load();
            setTimeout(() => {
              preloadAudio.src = '';
            }, 2000);
          }
        } catch (error) {
          setIsLoading(false);
          isHandlingPlayback.current = false;
          playNext(); // Skip to next song on error
        }
      };

      loadNewSong();
    }
  }, [currentSong, isPlaying, setIsPlaying, playNext, setCurrentSong]);

  // Handle audio errors
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleError = (e: ErrorEvent) => {
      setIsLoading(false);
      setIsPlaying(false);
      isHandlingPlayback.current = false;
    };

    audio.addEventListener('error', handleError as any);
    return () => audio.removeEventListener('error', handleError as any);
  }, [setIsPlaying]);

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
          }
        }
      } catch (error) {
        // Error handling without logging
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
        // Error handling without logging
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
          // Error handling without logging
        }
      }
    };
  }, [currentSong]);

  // Handle audio element errors
  const handleError = (e: any) => {
    // If the current song fails to load, try to play the next song
    if (currentSong) {
      setTimeout(() => playNext(), 1000);
    }
  };

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
  
  // Toggle play/pause
  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    playerStore.togglePlay();
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
                <Play className="h-4 w-4 translate-x-0.5" />
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
        src={currentSong?.audioUrl}
        autoPlay={isPlaying}
        onTimeUpdate={updateAudioMetadata}
        onLoadedMetadata={updateAudioMetadata}
        onError={handleError}
        preload="auto"
        playsInline
        webkit-playsinline="true"
        x-webkit-airplay="allow"
        controls={false}
      />
    </>
  );
};

export default AudioPlayer;
