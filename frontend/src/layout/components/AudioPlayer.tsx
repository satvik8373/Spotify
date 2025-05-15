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

  // Function to handle like/unlike of current song
  const handleToggleLike = () => {
    if (currentSong) {
      // Create a Song object for toggleLikeSong
      const songForLike = {
        _id: currentSong._id,
        title: currentSong.title,
        artist: currentSong.artist,
        albumId: currentSong.albumId,
        imageUrl: currentSong.imageUrl,
        audioUrl: currentSong.audioUrl,
        duration: currentSong.duration || 0,
        createdAt: currentSong.createdAt,
        updatedAt: currentSong.updatedAt
      };
      toggleLikeSong(songForLike);
      setIsLiked(!isLiked);
    }
  };
  
  // Check if current song is liked
  useEffect(() => {
    if (currentSong && likedSongIds) {
      setIsLiked(likedSongIds.has(currentSong._id));
    }
  }, [currentSong, likedSongIds]);

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
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    };
    
    // Listen for events that might indicate song changes
    audioRef.current?.addEventListener('loadedmetadata', handleAudioChange);
    audioRef.current?.addEventListener('play', handleAudioChange);
    audioRef.current?.addEventListener('pause', handleAudioChange);

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
      if (playPrevious) {
      playPrevious();
        // Force playing state
        setTimeout(() => {
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
          if (now - lastPositionUpdate > 1000) { // Update once per second is enough for lock screen
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
      // Clean up event listeners
      audioRef.current?.removeEventListener('loadedmetadata', handleAudioChange);
      audioRef.current?.removeEventListener('play', handleAudioChange);
      audioRef.current?.removeEventListener('pause', handleAudioChange);
    };
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
      
      // Only update lastTime if we're not at the end
      if (audio.currentTime < audio.duration - 0.5) {
        lastTime = audio.currentTime;
      }
      
      // Detect if we're very close to the end (within 0.3 seconds)
      // This helps when the ended event doesn't fire properly
      if (audio.currentTime > 0 && 
          audio.duration > 0 && 
          audio.currentTime >= audio.duration - 0.3 && 
          audio.currentTime > lastTime) { // Ensure we're actually progressing
        
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
      // Check every 500ms to reduce CPU usage but be responsive enough
      if (now - lastCheck > 500) {
        lastCheck = now;
        handleTimeUpdate();
      }
    });
    
    // Additional interval check for certain browsers/devices that might have unreliable events
    endingDetectionInterval = setInterval(() => {
      // Only check if we're supposed to be playing
      if (isPlaying && audio) {
        // Special check for song completion when in background
        if (document.hidden && audio.currentTime > 0 && audio.duration > 0 &&
            !isNaN(audio.duration) && audio.currentTime >= audio.duration - 0.3) {
          handleEnded();
        }
        
        // Check if audio is paused but should be playing
        if (audio.paused && isPlaying && !isNaN(audio.duration) && 
            audio.currentTime < audio.duration - 0.5) {
          // Try to resume playback
          audio.play().catch(() => {});
        }
      }
    }, 1000);
    
    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
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
          
          // Ensure audio is properly paused during call
          if (audioRef.current && !audioRef.current.paused) {
            audioRef.current.pause();
          }
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
      
      // Audio focus detection for phone calls
      const handleAudioFocusLost = () => {
        if (isPlaying) {
          console.log("Audio focus lost, likely due to phone call");
          usePlayerStore.setState({ wasPlayingBeforeInterruption: true });
          
          // Force pause to ensure audio stops during call
          if (audioRef.current && !audioRef.current.paused) {
            audioRef.current.pause();
          }
        }
      };
      
      // Additional handlers for mobile device events
      if ('onpageshow' in window) {
        window.addEventListener('pageshow', (e) => {
          // The persisted property indicates if the page is loaded from cache
          if (e.persisted && usePlayerStore.getState().wasPlayingBeforeInterruption) {
            handleAudioResume();
          }
        });
      }
      
      // Phone call detection using audio context suspended state
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContext.addEventListener('statechange', () => {
          // When audio context is suspended (like during a call)
          if (audioContext.state === 'suspended' && isPlaying) {
            handleAudioFocusLost();
          }
          
          // When audio context is resumed (like after a call ends)
          if (audioContext.state === 'running' && usePlayerStore.getState().wasPlayingBeforeInterruption) {
            // Short delay to ensure system is ready
            setTimeout(handleAudioResume, 500);
          }
        });
      } catch (e) {
        // Silent error if AudioContext is not supported
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

      const audioDuration = audio.duration;
      
      // 1. Check if audio is paused but should be playing
      if (audio.paused && state.isPlaying && !audio.ended) {
        audio.play().catch(() => {});
      }
      
      // 2. Check if we need to advance to next song (with better duration validation)
      if (!isNaN(audioDuration) && audioDuration > 0) {
        // If the song is actually ended OR if we're within 0.5 seconds of the end
        if (audio.ended || (audio.currentTime >= audioDuration - 0.5 && audio.currentTime > 0)) {
          // Ensure we don't trigger multiple times for the same ending
          if (!audio.ended && Math.abs(audio.currentTime - audioDuration) <= 0.5) {
            // Explicitly mark the current song as ended to prevent duplicate triggers
            audio.pause();
            
            // Store current song info before transitioning
            const currentSongInfo = {
              id: state.currentSong?._id,
              position: audio.currentTime,
              duration: audio.duration
            };
            
            // Increment to next song with proper state handling
            state.playNext();
            
            // Ensure playback continues
            state.setIsPlaying(true);
            
            // Log the transition for debugging
            try {
              localStorage.setItem('last_song_transition', JSON.stringify({
                from: currentSongInfo.id,
                position: currentSongInfo.position,
                duration: currentSongInfo.duration, 
                timestamp: new Date().toISOString(),
                isLocked: document.hidden,
                batteryLevel: (navigator as any).getBattery ? 
                  (navigator as any).getBattery().then((b: any) => b.level) : 'unknown'
              }));
            } catch (e) {
              // Ignore storage errors
            }
            
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
                          finalAudio?.play().catch(() => {});
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
    }, 250); // More frequent checks to ensure we don't miss the end of a song
    
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
        } catch (err) {
          // Silent error handling - not all browsers support this
        }
      }
    };
    
    const releaseWakeLock = () => {
      if (wakeLock) {
        wakeLock.release()
          .then(() => {
            wakeLock = null;
          })
          .catch(() => {});
      }
    };
    
    // Request wake lock when playing, release when paused
    if (isPlaying && currentSong) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
    
    return () => {
      releaseWakeLock();
    };
  }, [isPlaying, currentSong]);

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
      
      // Check for Android device
      const isAndroid = /Android/i.test(navigator.userAgent);
      
      // Register to handle phone call interruptions (iOS)
      document.addEventListener('pause', () => {
        // App going to background (iOS only event - different from audio pause)
        if (isPlaying) {
          usePlayerStore.setState({ wasPlayingBeforeInterruption: true });
          
          // Ensure audio is paused when app goes to background (which happens during calls)
          if (audioRef.current && !audioRef.current.paused) {
            audioRef.current.pause();
          }
        }
      });
      
      document.addEventListener('resume', () => {
        // App resuming from background (iOS only event)
        if (usePlayerStore.getState().wasPlayingBeforeInterruption) {
          setTimeout(() => {
            usePlayerStore.getState().setUserInteracted();
            usePlayerStore.getState().setIsPlaying(true);
            usePlayerStore.setState({ wasPlayingBeforeInterruption: false });
            
            // Try to resume playback
            if (audioRef.current && audioRef.current.paused) {
              audioRef.current.play().catch(() => {
                // If initial attempt fails, try again with a reset
                const currentState = usePlayerStore.getState();
                if (currentState.currentSong) {
                  currentState.setCurrentSong(currentState.currentSong);
                  setTimeout(() => {
                    if (audioRef.current) audioRef.current.play().catch(() => {});
                  }, 200);
                }
              });
            }
          }, 500);
        }
      });
      
      // Android-specific audio focus handling with detection for phone calls
      if (isAndroid) {
        // Use blur event for call detection on Android (more reliable than visibilitychange)
        window.addEventListener('blur', () => {
          if (isPlaying) {
            // This could be a phone call interruption
            console.log("Window blur detected on Android, could be a call");
            usePlayerStore.setState({ wasPlayingBeforeInterruption: true });
            
            if (audioRef.current && !audioRef.current.paused) {
              audioRef.current.pause();
            }
          }
        });
        
        // Listen for hardware volume button events as they can indicate phone calls on Android
        window.addEventListener('volumechange', () => {
          // Check if audio stopped playing unexpectedly (could be call interruption)
          if (isPlaying && audioRef.current && audioRef.current.paused) {
            console.log("Volume change detected while audio paused unexpectedly");
            usePlayerStore.setState({ wasPlayingBeforeInterruption: true });
          }
        });
      }
      
      // Use session storage to detect page reload during call
      try {
        window.addEventListener('beforeunload', () => {
          if (usePlayerStore.getState().wasPlayingBeforeInterruption) {
            // Save that we were interrupted to session storage
            sessionStorage.setItem('audio_was_interrupted', 'true');
            sessionStorage.setItem('last_position', String(audioRef.current?.currentTime || 0));
            sessionStorage.setItem('last_song_id', usePlayerStore.getState().currentSong?._id || '');
          }
        });
        
        // Check on load if we were previously interrupted
        if (sessionStorage.getItem('audio_was_interrupted') === 'true') {
          const lastSongId = sessionStorage.getItem('last_song_id');
          const lastPosition = parseFloat(sessionStorage.getItem('last_position') || '0');
          
          if (lastSongId && usePlayerStore.getState().currentSong?._id === lastSongId) {
            // We have the same song loaded, try to resume from last position
            usePlayerStore.setState({ wasPlayingBeforeInterruption: true });
            
            if (audioRef.current) {
              audioRef.current.currentTime = lastPosition;
            }
            
            // Clear the session storage
            sessionStorage.removeItem('audio_was_interrupted');
            sessionStorage.removeItem('last_position');
            sessionStorage.removeItem('last_song_id');
          }
        }
      } catch (e) {
        // Silent fail for private browsing mode
      }
    };
    
    setupAudioFocus();
  }, [isPlaying]);

  // Monitor phone call state on Android using Page Visibility API
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && isPlaying) {
      // Save state when page becomes hidden (could be due to call on Android)
      usePlayerStore.setState({ wasPlayingBeforeInterruption: true });
    } else if (!document.hidden && usePlayerStore.getState().wasPlayingBeforeInterruption) {
      // Page visible again, check if we need to resume
      setTimeout(() => {
        const state = usePlayerStore.getState();
        if (state.wasPlayingBeforeInterruption) {
          state.setUserInteracted();
          state.setIsPlaying(true);
          usePlayerStore.setState({ wasPlayingBeforeInterruption: false });
          
          if (audioRef.current && audioRef.current.paused) {
            audioRef.current.play().catch(() => {});
          }
        }
      }, 500);
    }
  });

  return (
    <div className="flex flex-col h-full">
      {/* Rest of the component content */}
        </div>
  );
};

export default AudioPlayer;
