import React from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Heart, SkipBack, SkipForward, Play, Pause, Shuffle, Repeat, Bluetooth, Speaker, X } from 'lucide-react';
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
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDevice, setCurrentDevice] = useState<string>('');
  const deviceSelectorRef = useRef<HTMLDivElement>(null);

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

    // Function to update metadata that we can reuse
    const updateMediaSessionMetadata = () => {
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
      // Important: explicitly set the playback state to make lock screen controls more reliable
      if (navigator.mediaSession) {
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
      }
    };
    
    // Listen for events that might indicate song changes
    audioRef.current?.addEventListener('loadedmetadata', handleAudioChange);
    audioRef.current?.addEventListener('play', handleAudioChange);
    audioRef.current?.addEventListener('pause', handleAudioChange);

    // Set up media session action handlers with better responsiveness
    navigator.mediaSession.setActionHandler('play', () => {
      // Mark as user-interacted to allow autoplay
      usePlayerStore.getState().setUserInteracted();
      
      setIsPlaying(true);
      
      // Explicitly attempt to play for more reliable playback
      if (audioRef.current && audioRef.current.paused) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // If play fails due to auto-play restrictions, try again with a short delay
            setTimeout(() => {
              if (audioRef.current) {
                audioRef.current.play().catch(() => {});
              }
            }, 300);
          });
        }
      }
      
      // Force update the media session state to keep UI in sync
      navigator.mediaSession.playbackState = 'playing';
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      setIsPlaying(false);
      
      // Explicitly pause to ensure state consistency
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
      
      // Force update the media session state
      navigator.mediaSession.playbackState = 'paused';
    });

    navigator.mediaSession.setActionHandler('previoustrack', () => {
      // Mark user interaction to allow autoplay
      usePlayerStore.getState().setUserInteracted();
      
      // Call previous from store directly for better state handling
      if (playPrevious) {
        playPrevious();
        
        // Force playing state - multiple attempts to ensure reliability in car/lock screen
        const playWithRetry = () => {
          if (audioRef.current && audioRef.current.paused) {
            audioRef.current.play().catch(() => {
              // If play fails, try again
              setTimeout(playWithRetry, 300);
            });
          }
        };
        
        // Start retry attempts
        setTimeout(playWithRetry, 100);
        
        // Update metadata after track change
        setTimeout(updateMediaSessionMetadata, 300);
      }
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      // Mark user interaction to allow autoplay
      usePlayerStore.getState().setUserInteracted();
      
      // Call next from store directly
      playNext();
      
      // Force playing state with multiple retry attempts for reliability
      const playWithRetry = () => {
        if (audioRef.current && audioRef.current.paused) {
          audioRef.current.play().catch(() => {
            // If play fails, try again
            setTimeout(playWithRetry, 300);
          });
        }
      };
      
      // Start retry attempts
      setTimeout(playWithRetry, 100);
      
      // Update metadata after track change
      setTimeout(updateMediaSessionMetadata, 300);
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
              duration: audioRef.current.duration || 0,
              playbackRate: audioRef.current.playbackRate || 1.0,
              position: details.seekTime
            });
          }
        }
      });
      
      // Add seekforward and seekbackward handlers for better car control
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        if (audioRef.current) {
          const skipTime = details.seekOffset || 10; // Default to 10 seconds
          const newTime = Math.min(audioRef.current.duration || 0, 
                                  audioRef.current.currentTime + skipTime);
          audioRef.current.currentTime = newTime;
          
          // Update position state
          if ('setPositionState' in navigator.mediaSession) {
            navigator.mediaSession.setPositionState({
              duration: audioRef.current.duration || 0,
              playbackRate: audioRef.current.playbackRate || 1.0,
              position: newTime
            });
          }
        }
      });
      
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        if (audioRef.current) {
          const skipTime = details.seekOffset || 10; // Default to 10 seconds
          const newTime = Math.max(0, audioRef.current.currentTime - skipTime);
          audioRef.current.currentTime = newTime;
          
          // Update position state
          if ('setPositionState' in navigator.mediaSession) {
            navigator.mediaSession.setPositionState({
              duration: audioRef.current.duration || 0,
              playbackRate: audioRef.current.playbackRate || 1.0,
              position: newTime
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
              duration: audioRef.current.duration || 0,
              playbackRate: audioRef.current.playbackRate || 1.0,
              position: audioRef.current.currentTime || 0
            });
          }
        };
        
        // Update position state initially and on time update
        updatePositionState();
        
        // Update position state more frequently for car displays
        let lastPositionUpdate = 0;
        const carModeUpdateInterval = 250; // Update faster (250ms) when connected to car
        const normalUpdateInterval = 1000; // Otherwise 1s is fine
        
        const handleTimeUpdate = () => {
          const now = Date.now();
          const updateInterval = (window as any).__carConnected ? 
                                carModeUpdateInterval : normalUpdateInterval;
                              
          if (now - lastPositionUpdate > updateInterval) {
            lastPositionUpdate = now;
            updatePositionState();
          }
        };
        
        audioRef.current?.addEventListener('timeupdate', handleTimeUpdate);
        
        // Create a backup interval to ensure position state updates even when timeupdate events are suppressed
        const positionUpdateInterval = setInterval(() => {
          // Only update if we're playing and browser is in background or screen is locked
          if (isPlaying && audioRef.current && document.hidden) {
            updatePositionState();
          }
        }, 1000);
        
        return () => {
          audioRef.current?.removeEventListener('timeupdate', handleTimeUpdate);
          clearInterval(positionUpdateInterval);
        };
      }
    } catch (error) {
      // Silent error handling
    }
  }, [currentSong, setIsPlaying, playNext, playPrevious, setCurrentTime, isPlaying, queue]);

  // Enhanced song end handling
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      // Get the current state for better control
      const state = usePlayerStore.getState();
      
      // Mark that user has interacted to enable autoplay for next song
      state.setUserInteracted();
      
      // Check if we should repeat the current song
      if (state.isRepeating) {
        // Just restart the current song
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
      }
      
      // Force a slight delay to ensure proper state updates
      setTimeout(() => {
        // Call playNext directly from store for more reliable progression
        state.playNext();
        
        // Ensure playing state is maintained
        state.setIsPlaying(true);
        
        // Get the updated audio element reference since it might have changed
        const updatedAudio = audioRef.current || document.querySelector('audio');
        
        // Explicitly attempt to play after state updates to ensure next song starts
        if (updatedAudio) {
          const playPromise = updatedAudio.play();
          
          if (playPromise !== undefined) {
            playPromise.catch(err => {
              // If initial play fails, try again with another delay
              setTimeout(() => {
                const audio = audioRef.current || document.querySelector('audio');
                if (audio) {
                  audio.play().catch(() => {
                    // If it still fails, try one more time with longer delay
                    setTimeout(() => {
                      const finalAudio = audioRef.current || document.querySelector('audio');
                      finalAudio?.play().catch(() => {});
                    }, 1000);
                  });
                }
              }, 300);
            });
          }
        }
      }, 50);
    };

    // Set up multiple event listeners for song end detection
    audio.addEventListener('ended', handleEnded);
    
    // Special fix for Firefox and some mobile browsers that don't reliably fire ended event
    let lastTime = 0;
    let endingDetectionInterval: NodeJS.Timeout | null = null;
    
    // Additional protection: monitor for song completion via timeupdate
    const handleTimeUpdate = () => {
      if (!audio) return;
      
      // Don't continue if duration is invalid
      if (isNaN(audio.duration) || audio.duration <= 0) return;
      
      // Track last time for end detection
      if (audio.currentTime < audio.duration - 0.5) {
        lastTime = audio.currentTime;
      }
      
      // Detect if we're very close to the end (within 0.3 seconds)
      // This helps when the ended event doesn't fire properly
      if (audio.currentTime > 0 && 
          audio.duration > 0 && 
          audio.currentTime >= audio.duration - 0.3 && 
          audio.currentTime > lastTime && // Ensure we're actually progressing
          !audio.paused) { // Only trigger for playing audio to avoid duplicate triggers
        
        // Only trigger if we haven't reached the actual end yet (to avoid duplicates)
        if (audio.currentTime < audio.duration) {
          // Since we're not actually at the end, we need to handle specially
          handleEnded();
          
          // Ensure we don't trigger again by pausing
          audio.pause();
        }
      }
    };
    
    // Add a throttled timeupdate listener
    let lastCheck = 0;
    audio.addEventListener('timeupdate', () => {
      const now = Date.now();
      // Check every 250ms to improve responsiveness for end detection
      if (now - lastCheck > 250) {
        lastCheck = now;
        handleTimeUpdate();
      }
    });
    
    // Add an extra background checker for lock screen / background mode
    endingDetectionInterval = setInterval(() => {
      // Only check if we're supposed to be playing
      if (isPlaying && audio) {
        // Check for stalled playback (no movement for over 2 seconds)
        const playbackStalled = (!audio.paused && !isNaN(audio.duration) && 
                                Math.abs(audio.currentTime - lastTime) < 0.05 &&
                                audio.currentTime < audio.duration - 1);
                                
        // Special check for song completion when in background or locked screen
        if ((document.hidden || navigator.userActivation?.hasBeenActive === false) && 
            audio.currentTime > 0 && audio.duration > 0 &&
            !isNaN(audio.duration) && audio.currentTime >= audio.duration - 1) {
          // Force song transition when very close to end in background
          handleEnded();
        }
        
        // Check if audio is paused but should be playing (autopaused by browser)
        if (audio.paused && isPlaying && !isNaN(audio.duration) && 
            audio.currentTime < audio.duration - 1) {
          // Try to resume playback
          audio.play().catch(() => {});
        }
        
        // Handle stalled playback
        if (playbackStalled) {
          // Count consecutive stall detections
          const stallCount = (audio as any)._stallCount || 0;
          (audio as any)._stallCount = stallCount + 1;
          
          // If stalled for too long (2 checks = ~2s), try to recover
          if (stallCount >= 2) {
            // Try to unstick by seeking slightly forward
            audio.currentTime += 0.1;
            
            // If critically stalled, advance to next song
            if (stallCount > 4) {
              handleEnded();
              (audio as any)._stallCount = 0;
            }
          }
        } else {
          // Reset stall counter when playback is moving normally
          (audio as any)._stallCount = 0;
        }
        
        // Update last time for stall detection
        lastTime = audio.currentTime;
      }
    }, 1000);
    
    return () => {
      audio.removeEventListener('ended', handleEnded);
      if (endingDetectionInterval) clearInterval(endingDetectionInterval);
    };
  }, [isPlaying]);

  // Enhanced phone call and audio focus handling
  useEffect(() => {
    // Define handler for audio interruptions
    const handleAudioInterruption = () => {
      // Handle when audio is interrupted (likely by a call)
      const handleAudioPause = () => {
        // Only track interruptions when we were actually playing
        if (isPlaying && !audioRef.current?.ended) {
          console.log("Audio interrupted while playing, marking for restoration");
          usePlayerStore.setState({ 
            wasPlayingBeforeInterruption: true 
          });
        }
      };
      
      // Handle resuming audio after interruption ends
      const handleAudioResume = () => {
        // Get the latest state
        const state = usePlayerStore.getState();
        
        // Check if we were playing before the interruption
        if (state.wasPlayingBeforeInterruption) {
          console.log("Resuming audio after interruption");
          // Resume playback with a delay to let the system stabilize
          setTimeout(() => {
            // Make sure user is marked as having interacted to enable autoplay
            state.setUserInteracted();
            
            // Force playing state to be true
            state.setIsPlaying(true);
            
            // Reset the flag
            usePlayerStore.setState({ wasPlayingBeforeInterruption: false });
            
            if (audioRef.current && audioRef.current.paused) {
              // Try playing with multiple attempts in case of race conditions
              const playAttempt = audioRef.current.play();
              if (playAttempt) {
                playAttempt.catch(() => {
                  // Try again after a slight delay
                  setTimeout(() => {
                    if (audioRef.current) {
                      audioRef.current.play().catch(() => {
                        // If still failing, try one last time with current song reset
                        const currentState = usePlayerStore.getState();
                        const song = currentState.currentSong;
                        if (song) {
                          currentState.setCurrentSong(song);
                          setTimeout(() => {
                            if (audioRef.current) audioRef.current.play().catch(() => {});
                          }, 200);
                        }
                      });
                    }
                  }, 500);
                });
              }
            }
          }, 300);
        }
      };
      
      // Both visibilitychange and focus events can indicate interruption end
      const handleVisibilityChange = () => {
        // When document becomes visible again after being hidden
        if (!document.hidden && usePlayerStore.getState().wasPlayingBeforeInterruption) {
          handleAudioResume();
        }
      };
      
      const handleFocusChange = () => {
        // When window regains focus
        if (document.hasFocus() && usePlayerStore.getState().wasPlayingBeforeInterruption) {
          handleAudioResume();
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleFocusChange);
      
      // Handle audio interruptions via the audio event listeners
      if (audioRef.current) {
        audioRef.current.addEventListener('pause', handleAudioPause);
        audioRef.current.addEventListener('play', handleAudioResume);
      }
      
      // Additional handlers for mobile device events
      if ('onpageshow' in window) {
        window.addEventListener('pageshow', (e) => {
          // The persisted property indicates if the page is loaded from cache
          if (e.persisted && usePlayerStore.getState().wasPlayingBeforeInterruption) {
            handleAudioResume();
          }
        });
      }
      
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleFocusChange);
        
        if (audioRef.current) {
          audioRef.current.removeEventListener('pause', handleAudioPause);
          audioRef.current.removeEventListener('play', handleAudioResume);
        }
        
        if ('onpageshow' in window) {
          window.removeEventListener('pageshow', (e) => {
            if (e.persisted && usePlayerStore.getState().wasPlayingBeforeInterruption) {
              handleAudioResume();
            }
          });
        }
      };
    };
    
    const cleanup = handleAudioInterruption();
    return cleanup;
  }, [isPlaying]);

  // Add a dedicated background playback maintenance system
  useEffect(() => {
    // Only set up if we have an active song
    if (!currentSong || !audioRef.current) return;
    
    // Create a more reliable background check mechanism
    const backgroundPlaybackMonitor = setInterval(() => {
      // Always run this check, regardless of visibility state
      // This ensures reliable playback in all conditions including lock screen
      const state = usePlayerStore.getState();
      const audio = audioRef.current;
      
      if (!audio) return;
      
      // Get actual audio duration
      const audioDuration = audio.duration;
      
      // 1. Check if audio is paused but should be playing
      if (audio.paused && state.isPlaying && !audio.ended) {
        audio.play().catch(() => {});
      }
      
      // 2. Check if we need to advance to next song
      if (!isNaN(audioDuration) && audioDuration > 0) {
        // Use a more aggressive threshold when screen is off (0.1 seconds)
        // Regular threshold (0.3 seconds) when screen is on
        const endThreshold = document.hidden ? 0.1 : 0.3;
        
        // If the song is actually ended OR if we're close to the end
        if (audio.ended || (audio.currentTime >= audioDuration - endThreshold && audio.currentTime > 0)) {
          // Ensure we don't trigger multiple times for the same ending
          // This is crucial for car connectivity where events may fire unreliably
          if (!audio.ended && Math.abs(audio.currentTime - audioDuration) <= endThreshold + 0.1) {
            // Store current song info before transitioning
            const currentSongInfo = {
              id: state.currentSong?._id,
              position: audio.currentTime,
              duration: audio.duration
            };
            
            // Set a flag to indicate transition is in progress
            (window as any).__songTransitionInProgress = true;
            
            // Log for debugging
            try {
              localStorage.setItem('last_song_transition', JSON.stringify({
                from: currentSongInfo.id,
                position: currentSongInfo.position,
                duration: currentSongInfo.duration, 
                timestamp: new Date().toISOString(),
                isLocked: document.hidden,
                type: 'background_monitor',
                remainingTime: audioDuration - audio.currentTime
              }));
            } catch (e) {
              // Ignore storage errors
            }
            
            // Explicitly mark the current song as ended to prevent duplicate triggers
            audio.pause();
            
            // Increment to next song with proper state handling
            state.playNext();
            
            // Ensure playback continues
            state.setIsPlaying(true);
            state.setUserInteracted();
            
            // Actually play the audio with multiple fallback attempts
            setTimeout(() => {
              if (audioRef.current) {
                audioRef.current.play().catch(() => {
                  // If initial attempt fails, try again after a delay
                  setTimeout(() => {
                    // Get fresh reference in case it changed
                    const freshAudio = audioRef.current || document.querySelector('audio');
                    if (freshAudio) {
                      freshAudio.play().catch(() => {
                        // One final attempt with longer delay
                        setTimeout(() => {
                          const finalAudio = audioRef.current || document.querySelector('audio');
                          if (finalAudio) {
                            finalAudio.play().catch(() => {});
                          }
                          // Clear transition flag
                          (window as any).__songTransitionInProgress = false;
                        }, 1000);
                      });
                    }
                  }, 500);
                });
              }
            }, 100);
          }
        }
      }
    }, document.hidden ? 100 : 200); // Run more frequently when screen is off
    
    return () => {
      clearInterval(backgroundPlaybackMonitor);
    };
  }, [currentSong, isPlaying]);
  
  // Wake lock API to prevent device from sleeping and stopping audio
  useEffect(() => {
    let wakeLock: any = null;
    
    // Check if Wake Lock API is available
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && isPlaying && currentSong) {
        try {
          // Request a screen wake lock
          wakeLock = await (navigator as any).wakeLock.request('screen');
          
          // Listen for wake lock release
          wakeLock.addEventListener('release', () => {
            // If we're still playing, request it again
            if (isPlaying && currentSong) {
              requestWakeLock();
            }
          });
          
          // Store wake lock for debugging
          (window as any).__wakeLock = wakeLock;
          
          return true;
        } catch (error) {
          console.error('Failed to acquire wake lock:', error);
          return false;
        }
      }
      return false;
    };
    
    // Release the wake lock
    const releaseWakeLock = () => {
      if (wakeLock) {
        try {
          wakeLock.release();
          wakeLock = null;
          (window as any).__wakeLock = null;
        } catch (error) {
          console.error('Failed to release wake lock:', error);
        }
      }
    };
    
    // Request wake lock when playing starts
    if (isPlaying && currentSong) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
    
    // Re-request wake lock when visibility changes (user returns to app)
    const handleVisibilityChange = () => {
      if (!document.hidden && isPlaying && currentSong) {
        // When the page becomes visible again, refresh the wake lock
        releaseWakeLock();
        requestWakeLock();
        
        // Also check if we need to refresh media session state
        if (isMediaSessionSupported() && navigator.mediaSession) {
          navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
          
          if ('setPositionState' in navigator.mediaSession && audioRef.current) {
            try {
              navigator.mediaSession.setPositionState({
                duration: audioRef.current.duration || 0,
                playbackRate: audioRef.current.playbackRate || 1.0,
                position: audioRef.current.currentTime || 0
              });
            } catch (e) {
              // Silent error handling
            }
          }
        }
        
        // Ensure audio is playing if it should be
        if (isPlaying && audioRef.current && audioRef.current.paused) {
          audioRef.current.play().catch(() => {});
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      releaseWakeLock();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPlaying, currentSong]);

  // Add a special effect for screen state and device locks
  useEffect(() => {
    if (!currentSong || !isPlaying) return;
    
    // Background-specific check interval
    let backgroundCheckInterval: NodeJS.Timeout | null = null;
    
    // Special check for song advancement in background/lock screen
    const backgroundPlaybackCheck = () => {
      const audio = audioRef.current;
      if (!audio || !isPlaying) return;
      
      // Handle end-of-song detection when in background
      if (document.hidden && !isNaN(audio.duration) && audio.duration > 0) {
        // Use a more aggressive threshold when in background mode
        // If very close to the end or should have ended already
        if (audio.currentTime >= audio.duration - 0.2) {
          // Get state directly to avoid closure issues
          const store = usePlayerStore.getState();
          
          // Only advance if not already transitioning
          if (!(window as any).__songTransitionInProgress) {
            // Set flag to prevent duplicate triggers
            (window as any).__songTransitionInProgress = true;
            
            // Force song to next
            store.playNext();
            store.setIsPlaying(true);
            store.setUserInteracted();
            
            // Track this transition
            try {
              localStorage.setItem('screen_off_transition', JSON.stringify({
                timestamp: new Date().toISOString(),
                songId: store.currentSong?._id,
                currentTime: audio.currentTime,
                duration: audio.duration
              }));
            } catch (e) {}
            
            // Attempt to start playing with retry mechanism
            setTimeout(() => {
              const retryPlay = () => {
                if (audioRef.current) {
                  audioRef.current.play().catch(() => {
                    // Retry once more after a delay
                    setTimeout(() => {
                      if (audioRef.current) audioRef.current.play().catch(() => {});
                      // Clear transition flag
                      (window as any).__songTransitionInProgress = false;
                    }, 1000);
                  });
                } else {
                  // Clear transition flag if audio element not available
                  (window as any).__songTransitionInProgress = false;
                }
              };
              
              retryPlay();
            }, 100);
          }
        }
      }
    };
    
    // Create the interval - only active when document is hidden
    const setupBackgroundCheck = () => {
      if (document.hidden) {
        // More frequent checks when hidden/locked to ensure songs advance properly
        backgroundCheckInterval = setInterval(backgroundPlaybackCheck, 150); // Increase frequency for screen off
      }
    };
    
    // Clean up check when becoming visible again
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Set up checks when hidden
        setupBackgroundCheck();
      } else {
        // Clear checks when visible again
        if (backgroundCheckInterval) {
          clearInterval(backgroundCheckInterval);
          backgroundCheckInterval = null;
        }
        
        // Reset flag when becoming visible
        (window as any).__songTransitionInProgress = false;
      }
    };
    
    // Run initially and add listener
    handleVisibilityChange();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      if (backgroundCheckInterval) {
        clearInterval(backgroundCheckInterval);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentSong, isPlaying]);

  // Add screen-off specific track advancement monitor
  useEffect(() => {
    // Only run when playing and we have a song
    if (!isPlaying || !currentSong || !audioRef.current) return;
    
    // Additional dedicated monitor specifically for screen-off state
    let screenOffMonitor: NodeJS.Timeout | null = null;
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Screen turned off - create an aggressive check interval
        screenOffMonitor = setInterval(() => {
          const audio = audioRef.current;
          if (!audio) return;
          
          // Check if playback has stalled or needs to advance
          if (!isNaN(audio.duration) && audio.duration > 0) {
            // Use a very tight threshold for detecting end of track
            if (audio.currentTime > 0 && audio.currentTime >= audio.duration - 0.15) {
              // Clear any existing flag and force advance to next track
              (window as any).__songTransitionInProgress = false;
              
              // Explicitly pause current audio
              audio.pause();
              
              // Get fresh state reference
              const store = usePlayerStore.getState();
              store.playNext();
              store.setIsPlaying(true);
              
              // Force playback to start with multiple retries
              setTimeout(() => {
                // Get the updated audio reference
                const currentAudio = audioRef.current || document.querySelector('audio');
                if (currentAudio) {
                  currentAudio.play().catch(() => {
                    // Very aggressive retry logic for screen-off state
                    setTimeout(() => {
                      const audio = audioRef.current || document.querySelector('audio');
                      if (audio) audio.play().catch(() => {});
                    }, 300);
                  });
                }
              }, 50);
            }
          }
        }, 100);
      } else if (screenOffMonitor) {
        // Screen turned on - clear the monitor
        clearInterval(screenOffMonitor);
        screenOffMonitor = null;
      }
    };
    
    // Run the check on visibility change
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Run immediately in case screen is already off
    if (document.hidden) {
      handleVisibilityChange();
    }
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (screenOffMonitor) {
        clearInterval(screenOffMonitor);
      }
    };
  }, [currentSong, isPlaying]);

  // Handle iOS-specific background playback issues 
  useEffect(() => {
    // Only run on iOS devices
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (!isIOS) return;
    
    // Set up a dedicated iOS background continuation timer
    // This is critical for iOS which has stricter background restrictions
    const iosBackgroundTimer = setInterval(() => {
      if (document.hidden && isPlaying && audioRef.current) {
        const audio = audioRef.current;
        const audioDuration = audio.duration;
        
        // Check if audio should be playing but isn't
        if (audio.paused && !audio.ended) {
          audio.play().catch(() => {});
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
                freshAudio.play().catch(() => {});
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

  // Update audio element configuration for better mobile support
  useEffect(() => {
    if (audioRef.current) {
      // Configure audio element for better mobile background playback
      audioRef.current.setAttribute('playsinline', '');
      audioRef.current.setAttribute('webkit-playsinline', '');
      audioRef.current.setAttribute('preload', 'auto');
      
      // Critical for audio focus handling in iOS Safari
      audioRef.current.setAttribute('x-webkit-airplay', 'allow');
      
      // Set up remote commands early
      if (isMediaSessionSupported()) {
        navigator.mediaSession.setActionHandler('play', () => {
          setIsPlaying(true);
          if (audioRef.current && audioRef.current.paused) {
            audioRef.current.play().catch(() => {});
          }
        });
  
        navigator.mediaSession.setActionHandler('pause', () => {
          setIsPlaying(false);
          if (audioRef.current && !audioRef.current.paused) {
            audioRef.current.pause();
          }
        });
  
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          if (playPrevious) playPrevious();
        });
  
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          playNext();
        });
      }
      
      // Ensure audio continues to play when locked and mixed with other sounds
      if ('mozAudioChannelType' in audioRef.current) {
        // Firefox OS
        (audioRef.current as any).mozAudioChannelType = 'content';
      }
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
      
      // Enhanced MediaSession control for better lock screen support
      // Re-register nexttrack handler to ensure it's always available
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        // Mark user interaction to allow autoplay
        usePlayerStore.getState().setUserInteracted();
        // Call next from store directly
        usePlayerStore.getState().playNext();
        // Force playing state
        usePlayerStore.getState().setIsPlaying(true);
        
        // Attempt to play with multiple retries for reliability
        setTimeout(() => {
          if (audioRef.current && audioRef.current.paused) {
            const playPromise = audioRef.current.play();
            if (playPromise) {
              playPromise.catch(() => {
                // Try again if first attempt fails
                setTimeout(() => {
                  if (audioRef.current) {
                    audioRef.current.play().catch(() => {});
                  }
                }, 300);
              });
            }
          }
        }, 100);
      });
      
      // Maintain position state for lock screen display
      if ('setPositionState' in navigator.mediaSession && audioRef.current) {
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
    }
  }, [isPlaying]);

  // Lock screen specific MediaSession update interval
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
            .catch(error => {
              if (error.message.includes('interrupted')) {
                // If the error was due to interruption, try again after a short delay
                setTimeout(() => {
                  audioRef.current?.play().catch(e => {
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

  // handle song changes
  useEffect(() => {
    if (!audioRef.current || !currentSong) return;

    const audio = audioRef.current;
    const songUrl = currentSong.audioUrl;

    // Validate the URL
    if (!isValidUrl(songUrl)) {
      // Try to find audio for this song
      
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
            
            // Give a small delay for the state to update
            setTimeout(() => {
              // Force a play attempt with the new URL
              if (isPlaying) {
                audioRef.current?.load();
                audioRef.current?.play().catch(err => {
                  // Error handling without toast
                });
              }
            }, 100); // Faster loading
          } else {
            // No results found
            // Skip to the next song after a short delay
            setTimeout(() => {
              playNext();
            }, 500); // Faster skipping
          }
        } catch (error) {
          // Skip to the next song after a short delay
          setTimeout(() => {
            playNext();
          }, 500); // Faster skipping
        }
      }, 50); // Faster processing
      
      return;
    }

    // Check if this is actually a new song
    const isSongChange = prevSongRef.current !== songUrl;
    if (isSongChange) {
      try {
        // Use a loading lock to prevent race conditions
        const loadingLock = Date.now();
        const currentLoadingOperation = loadingLock;
        
        // Store the current loading operation to check for conflicts
        (audioRef.current as any)._currentLoadingOperation = loadingLock;
        
        // Indicate loading state to prevent play attempts during load
        setIsLoading(true);
        isHandlingPlayback.current = true;

        // Clear any existing timeout
        if (playTimeoutRef.current) {
          clearTimeout(playTimeoutRef.current);
        }

        // Pause current playback before changing source to prevent conflicts
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
            // Wait a bit before playing to avoid interruption errors
            const playDelayMs = 150; // Reduced delay for faster transitions
            
            playTimeoutRef.current = setTimeout(() => {
              if (!audioRef.current) return;
              
              // Check again if loading operation is still current
              if ((audioRef.current as any)._currentLoadingOperation !== currentLoadingOperation) {
                return;
              }
              
              const playPromise = audioRef.current.play();
              
              if (playPromise !== undefined) {
              playPromise
                .then(() => {
                  isHandlingPlayback.current = false;
                      
                      // Set up position state for lock screen again
                      if ('setPositionState' in navigator.mediaSession) {
                        try {
                          navigator.mediaSession.setPositionState({
                            duration: audioRef.current?.duration || 0,
                            playbackRate: audioRef.current?.playbackRate || 1,
                            position: audioRef.current?.currentTime || 0
                          });
                        } catch (e) {
                          // Ignore any errors with position state
                        }
                      }
                })
                .catch(error => {
                      // Handle AbortError specifically
                      if (error.name === 'AbortError') {
                        // Wait for any pending operations to complete
                        setTimeout(() => {
                          // Only attempt retry if we're still supposed to be playing
                          if (isPlaying && audioRef.current) {
                            audioRef.current.play().catch(retryError => {
                  setIsPlaying(false);
                            });
                          }
                        }, 250); // Faster retry
                      } else {
                        setIsPlaying(false);
                      }
                      
                  isHandlingPlayback.current = false;
                });
              } else {
                isHandlingPlayback.current = false;
              }
            }, playDelayMs);
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
        
        // Preload the next song if available
        const nextIndex = (usePlayerStore.getState().currentIndex + 1) % usePlayerStore.getState().queue.length;
        const nextSong = usePlayerStore.getState().queue[nextIndex];
        if (nextSong && nextSong.audioUrl) {
          const preloadAudio = new Audio();
          preloadAudio.src = nextSong.audioUrl;
          preloadAudio.load();
          // Discard after preloading starts
          setTimeout(() => {
            preloadAudio.src = '';
          }, 2000);
        }
      } catch (error) {
        setIsLoading(false);
        isHandlingPlayback.current = false;
      }
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

  // Function to handle device selection
  const handleDeviceSelection = async (deviceId: string) => {
    try {
      if (!audioRef.current) return;
      
      // Store current playback state
      const wasPlaying = !audioRef.current.paused;
      const currentTime = audioRef.current.currentTime;
      
      // Pause current playback
      if (wasPlaying) {
        audioRef.current.pause();
      }
      
      // Set the audio output device if browser supports it
      if ('setSinkId' in HTMLMediaElement.prototype) {
        await (audioRef.current as any).setSinkId(deviceId);
        setCurrentDevice(deviceId);
        
        // Create custom event to notify the system about device change
        document.dispatchEvent(new CustomEvent('audioDeviceChanged', {
          detail: { deviceId }
        }));
        
        // Resume playback if it was playing
        if (wasPlaying) {
          audioRef.current.currentTime = currentTime;
          audioRef.current.play().catch(() => {});
        }
        
        // Show success toast
        toast.success('Connected to audio device');
      } else {
        toast.error('Your browser does not support audio output device selection');
      }
      
      // Close the device selector
      setShowDeviceSelector(false);
    } catch (error) {
      console.error('Error setting audio output device:', error);
      toast.error('Failed to connect to device');
    }
  };
  
  // Handle fetching available devices
  const fetchAvailableDevices = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        toast.error('Media devices not supported by your browser');
        return;
      }
      
      // Get user permission if needed
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Get all devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      // Filter to only audio output devices
      const audioOutputDevices = devices.filter(device => 
        device.kind === 'audiooutput' && device.deviceId !== 'default'
      );
      
      if (audioOutputDevices.length === 0) {
        toast('No external audio devices found');
      }
      
      setAvailableDevices(audioOutputDevices);
      
      // Get current device
      if (audioRef.current && 'sinkId' in audioRef.current) {
        setCurrentDevice((audioRef.current as any).sinkId);
      }
    } catch (error) {
      console.error('Error enumerating audio devices:', error);
      toast.error('Could not access audio devices');
    }
  };
  
  // Toggle device selector visibility
  const toggleDeviceSelector = () => {
    if (!showDeviceSelector) {
      fetchAvailableDevices();
    }
    setShowDeviceSelector(prev => !prev);
  };
  
  // Close device selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (deviceSelectorRef.current && !deviceSelectorRef.current.contains(e.target as Node)) {
        setShowDeviceSelector(false);
      }
    };
    
    if (showDeviceSelector) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDeviceSelector]);
  
  // Listen for device changes
  useEffect(() => {
    const handleDeviceChange = () => {
      if (showDeviceSelector) {
        fetchAvailableDevices();
      }
    };
    
    navigator.mediaDevices?.addEventListener('devicechange', handleDeviceChange);
    
    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [showDeviceSelector]);

  // Add enhanced background playback support
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
            } catch (e) {}
          }
        }
      } else {
        // Page is visible again
        console.log("Page visible, checking playback state");
        
        // If we're supposed to be playing but audio is paused, restart it
        if (isPlaying && audioRef.current?.paused && !audioRef.current?.ended) {
          console.log("Restarting paused audio after visibility change");
          audioRef.current.play().catch(() => {});
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
        wakeLock.release().catch(() => {});
      }
    };
  }, [currentSong, isPlaying]);

  // Add special handling for car connectivity
  useEffect(() => {
    if (!audioRef.current || !currentSong) return;
    
    // Car connectivity detection
    const detectCarConnection = () => {
      // Car connection can be detected via several means:
      // 1. Bluetooth connected
      // 2. WebAudio destination changed to car
      let isCarConnected = false;
      
      // Try to check if connected to external audio device
      if (navigator.mediaDevices && 'enumerateDevices' in navigator.mediaDevices) {
        navigator.mediaDevices.enumerateDevices().then(devices => {
          // Check for Bluetooth audio output devices
          const hasBluetooth = devices.some(device => 
            device.kind === 'audiooutput' && 
            (device.label.toLowerCase().includes('bluetooth') ||
             device.label.toLowerCase().includes('car') ||
             device.label.toLowerCase().includes('vehicle') ||
             // Many car systems appear as external or hands-free devices
             device.label.toLowerCase().includes('external') ||
             device.label.toLowerCase().includes('hands-free'))
          );
          
          if (hasBluetooth) {
            // We might be connected to a car system
            isCarConnected = true;
            // Store this state for use in other effects
            (window as any).__carConnected = true;
            
            // When connected to car, enable more aggressive end detection
            // to ensure songs always advance properly
            if (audioRef.current) {
              // Set a special property to mark car connectivity
              (audioRef.current as any).__carMode = true;
            }
          } else {
            (window as any).__carConnected = false;
            if (audioRef.current) {
              (audioRef.current as any).__carMode = false;
            }
          }
        }).catch(() => {
          // If we can't check devices, assume we're not in car mode
          (window as any).__carConnected = false;
        });
      }
    };
    
    // Run detection initially and on changes
    detectCarConnection();
    
    // Set up device change monitoring
    const handleDeviceChange = () => {
      detectCarConnection();
    };
    
    // Add device change listener
    if (navigator.mediaDevices) {
      try {
        navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
      } catch (e) {
        // Some browsers may not support this event
      }
    }
    
    // Clean up
    return () => {
      if (navigator.mediaDevices) {
        try {
          navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
        } catch (e) {
          // Some browsers may not support this event
        }
      }
    };
  }, [currentSong]);

  // Add Android-specific background playback handling
  useEffect(() => {
    // Only run if we're playing and have a current song
    if (!isPlaying || !currentSong || !audioRef.current) return;
    
    // Detect if we're on Android
    const isAndroid = /Android/.test(navigator.userAgent);
    if (!isAndroid) return; // Skip if not Android
    
    // This aggressive checker is specific to Android devices
    // Android aggressively suspends JavaScript timers when the screen is off
    // We need to use all available methods to detect song end
    
    let androidScreenOffMonitor: NodeJS.Timeout | null = null;
    let lastKnownPosition = 0;
    let stationaryCount = 0;
    
    const checkAndroidPlayback = () => {
      const audio = audioRef.current;
      if (!audio) return;
      
      const store = usePlayerStore.getState();
      
      // Early return if audio isn't playing
      if (audio.paused || audio.ended) return;

      // Save current position for stall detection
      const currentPosition = audio.currentTime;
      
      // Detect if audio has stalled (same position after multiple checks)
      if (Math.abs(currentPosition - lastKnownPosition) < 0.05) {
        stationaryCount++;
        
        // If playback has stalled for multiple checks but we're not at the end
        if (stationaryCount >= 3 && currentPosition < audio.duration - 1) {
          // Try to unstick it first
          audio.currentTime += 0.1;
        }
        
        // If stalled near the end, likely the ended event didn't fire
        // This is common on Android when screen is off
        if (stationaryCount >= 2 && currentPosition >= audio.duration - 0.5) {
          // Track this transition
          try {
            localStorage.setItem('android_forced_next', JSON.stringify({
              timestamp: new Date().toISOString(),
              lastPosition: currentPosition,
              duration: audio.duration,
              stationaryCount
            }));
          } catch (e) {}
          
          // Force next track
          audio.pause();
          store.playNext();
          store.setIsPlaying(true);
          
          // Reset stall counter
          stationaryCount = 0;
          
          // Try to play with retries
          setTimeout(() => {
            if (audioRef.current) {
              audioRef.current.play().catch(() => {
                setTimeout(() => {
                  if (audioRef.current) audioRef.current.play().catch(() => {});
                }, 500);
              });
            }
          }, 100);
        }
      } else {
        // Reset stall counter if position changed
        stationaryCount = 0;
      }
      
      // Use a time-based approximation when close to the end
      // On Android, we might miss the normal ended event, so check manually
      const remainingTime = audio.duration - currentPosition;
      if (remainingTime <= 0.2 && remainingTime > 0 && currentPosition > 0) {
        // Track this transition
        try {
          localStorage.setItem('android_approximated_end', JSON.stringify({
            timestamp: new Date().toISOString(),
            position: currentPosition,
            duration: audio.duration,
            remaining: remainingTime
          }));
        } catch (e) {}
        
        // Force next track
        audio.pause();
        store.playNext();
        store.setIsPlaying(true);
        
        // Try to play with retries
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.play().catch(() => {
              setTimeout(() => {
                if (audioRef.current) audioRef.current.play().catch(() => {});
              }, 500);
            });
          }
        }, 100);
      }
      
      // Update lastKnownPosition for next check
      lastKnownPosition = currentPosition;
    };
    
    // Set up the monitor with very frequent checks on Android
    androidScreenOffMonitor = setInterval(checkAndroidPlayback, 150);
    
    // Enhanced visibility change handler for Android
    const handleAndroidVisibilityChange = () => {
      // When screen turns off on Android, pre-load the next track
      // This helps ensure it's ready to play when the current one ends
      if (document.hidden) {
        // Pre-fetch the next track when screen turns off
        const queue = usePlayerStore.getState().queue;
        const currentIndex = usePlayerStore.getState().currentIndex;
        
        if (queue && queue.length > 0 && typeof currentIndex === 'number') {
          const nextIndex = (currentIndex + 1) % queue.length;
          const nextSong = queue[nextIndex];
          
          if (nextSong && nextSong.audioUrl) {
            // Create a temporary audio element to preload the next track
            const preloadAudio = new Audio();
            preloadAudio.src = nextSong.audioUrl;
            preloadAudio.load();
            
            // Clean up after preloading
            setTimeout(() => {
              preloadAudio.src = '';
            }, 3000);
          }
        }
      }
    };
    
    // Add event listener for Android visibility changes
    document.addEventListener('visibilitychange', handleAndroidVisibilityChange);
    
    return () => {
      if (androidScreenOffMonitor) clearInterval(androidScreenOffMonitor);
      document.removeEventListener('visibilitychange', handleAndroidVisibilityChange);
    };
  }, [currentSong, isPlaying]);

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
      
      {/* Device selector dropdown */}
      {showDeviceSelector && (
        <div
          ref={deviceSelectorRef}
          className="fixed bottom-16 right-4 sm:bottom-16 sm:right-4 z-50 bg-zinc-900 rounded-md shadow-lg border border-zinc-800 w-72 overflow-hidden"
        >
          <div className="flex items-center justify-between p-3 border-b border-zinc-800">
            <h3 className="text-sm font-medium">Connect to a device</h3>
            <button 
              onClick={() => setShowDeviceSelector(false)}
              className="text-zinc-400 hover:text-white"
            >
              <X size={18} />
            </button>
                </div>

          <div className="max-h-64 overflow-y-auto">
            {availableDevices.length === 0 ? (
              <div className="p-4 text-sm text-zinc-400 text-center">
                No devices found. Make sure your Bluetooth is on.
                </div>
            ) : (
              <ul className="py-1">
                {/* Default device (this device) */}
                <li 
                  className={`px-4 py-2 flex items-center hover:bg-zinc-800 cursor-pointer ${currentDevice === '' ? 'bg-zinc-800/50 text-green-500' : 'text-white'}`}
                  onClick={() => handleDeviceSelection('')}
                >
                  <Speaker size={16} className="mr-2" />
                  <span className="text-sm">This device</span>
                  {currentDevice === '' && (
                    <span className="ml-auto text-xs text-green-500">Connected</span>
                  )}
                </li>
                
                {/* List of other devices */}
                {availableDevices.map((device) => (
                  <li 
                    key={device.deviceId}
                    className={`px-4 py-2 flex items-center hover:bg-zinc-800 cursor-pointer ${currentDevice === device.deviceId ? 'bg-zinc-800/50 text-green-500' : 'text-white'}`}
                    onClick={() => handleDeviceSelection(device.deviceId)}
                  >
                    <Bluetooth size={16} className="mr-2" />
                    <span className="text-sm truncate max-w-[180px]">
                      {device.label || `Device (${device.deviceId.slice(0, 8)}...)`}
                    </span>
                    {currentDevice === device.deviceId && (
                      <span className="ml-auto text-xs text-green-500">Connected</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <div className="border-t border-zinc-800 p-3">
            <button 
              onClick={fetchAvailableDevices}
              className="w-full bg-green-600 hover:bg-green-700 text-white text-xs font-medium py-1.5 px-3 rounded-full"
            >
              Refresh Devices
            </button>
          </div>
        </div>
      )}
      
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
                'text-white hover:bg-white/10 h-9 w-9',
                isLiked && 'text-green-500'
              )}
              onClick={handleLikeToggle}
            >
              <Heart
                className="h-4 w-4"
                fill={isLiked ? 'currentColor' : 'none'}
              />
            </Button>
            
            {/* Bluetooth/Device Connection Button */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'text-white hover:bg-white/10 h-9 w-9 ml-1',
                showDeviceSelector && 'text-green-500 bg-white/10'
              )}
              onClick={(e) => {
                e.stopPropagation();
                toggleDeviceSelector();
              }}
            >
              <Bluetooth className="h-4 w-4" />
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
      
      {/* Audio element with enhanced Android support */}
      <audio
        ref={audioRef}
        src={currentSong?.audioUrl}
        autoPlay={isPlaying}
        onTimeUpdate={(e) => {
          // Call the original metadata update function
          updateAudioMetadata();
          
          // Additional check for "almost ended" when screen is off 
          // (especially important on Android)
          const audio = e.currentTarget;
          if (document.hidden && 
              !isNaN(audio.duration) && 
              audio.currentTime > 0 && 
              audio.duration > 0 && 
              audio.currentTime >= audio.duration - 0.3) {
            
            // If we're very close to the end, and screen is off, 
            // force advancement to handle cases where ended event doesn't fire
            if (!audio) return;
            
            // Mark this audio as processed to avoid duplicate triggers
            if ((audio as any)._endProcessed) return;
            (audio as any)._endProcessed = true;
            
            // Explicitly pause current audio
            audio.pause();
            
            // Force next track
            const store = usePlayerStore.getState();
            store.playNext();
            store.setIsPlaying(true);
            
            // Try to start playing with retries
            setTimeout(() => {
              const updatedAudio = audioRef.current;
              if (updatedAudio) {
                updatedAudio.play().catch(() => {
                  setTimeout(() => {
                    if (audioRef.current) audioRef.current.play().catch(() => {});
                  }, 500);
                });
              }
            }, 100);
          }
        }}
        onLoadedMetadata={updateAudioMetadata}
        onError={handleError}
        preload="auto"
        playsInline
        webkit-playsinline="true"
        x-webkit-airplay="allow"
        loop={usePlayerStore.getState().isRepeating}
        data-testid="audio-element"
        // Enhanced onEnded handler with direct retry mechanism
        onEnded={() => {
          // Store information about this ended event
          try {
            localStorage.setItem('audio_ended_event', JSON.stringify({
              timestamp: new Date().toISOString(),
              songId: currentSong._id,
              isScreenOff: document.hidden,
              isAndroid: /Android/.test(navigator.userAgent)
            }));
          } catch (e) {}
          
          // Get fresh state to avoid closure issues
          const state = usePlayerStore.getState();
          state.setUserInteracted();
          
          // Check for repeat mode first
          if (state.isRepeating) {
            if (audioRef.current) {
              audioRef.current.currentTime = 0;
              audioRef.current.play().catch(() => {});
            }
            return;
          }
          
          // Otherwise advance to next track
          state.playNext();
          state.setIsPlaying(true);
          
          // Aggressive play retry mechanism
          setTimeout(() => {
            if (audioRef.current) {
              const playPromise = audioRef.current.play();
              if (playPromise) {
                playPromise.catch(() => {
                  // First retry
                  setTimeout(() => {
                    if (audioRef.current) {
                      audioRef.current.play().catch(() => {
                        // Second retry with longer delay
                        setTimeout(() => {
                          if (audioRef.current) {
                            // Final attempt
                            audioRef.current.play().catch(() => {});
                          }
                        }, 1000);
                      });
                    }
                  }, 300);
                });
              }
            }
          }, 50);
        }}
        onPause={() => {
          // Check if this is an unintended pause (like system-initiated)
          // but only if we're supposed to be playing
          if (isPlaying && !document.hidden) {
            // Try to resume playback after a short delay
            setTimeout(() => {
              const audio = audioRef.current;
              if (audio && audio.paused && isPlaying && !audio.ended) {
                audio.play().catch(() => {});
              }
            }, 500);
          }
        }}
        onPlay={() => {
          // Ensure store state is in sync with actual audio element state
          if (!isPlaying) {
            usePlayerStore.getState().setIsPlaying(true);
          }
        }}
        onWaiting={() => {
          // Handle waiting/buffering state
          setIsLoading(true);
        }}
        onCanPlay={() => {
          // Handle ready state
          setIsLoading(false);
          // Try to play if we're supposed to be playing
          if (isPlaying && audioRef.current?.paused) {
            audioRef.current.play().catch(() => {});
          }
          // Reset the end processed flag
          if (audioRef.current) {
            (audioRef.current as any)._endProcessed = false;
          }
        }}
        controls={false}
      />
    </>
  );
};

export default AudioPlayer;
