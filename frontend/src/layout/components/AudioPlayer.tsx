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
import SpotifyConnectView from '@/components/SpotifyConnectView';
import { useAuth } from '@/contexts/AuthContext';
import { useMediaQuery } from '@/hooks/useMediaQuery';

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
  const isMobile = useMediaQuery("(max-width: 768px)");

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

    // Enhanced next track handler for better reliability with Bluetooth
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      // Mark user interaction to allow autoplay
      usePlayerStore.getState().setUserInteracted();
      
      // Store current state before advancing 
      const currentState = usePlayerStore.getState();
      const wasPlaying = currentState.isPlaying;
      
      // If connected to a Bluetooth device, special handling is required
      const isBluetoothConnected = currentDevice && currentDevice !== '';
      
      // Call next from store directly
      playNext();
      
      // Force playing state
      setTimeout(() => {
        // Ensure playing state is set
        usePlayerStore.getState().setIsPlaying(true);
        
        if (audioRef.current && audioRef.current.paused) {
          if (isBluetoothConnected) {
            // For Bluetooth, force a reload before playing
            audioRef.current.load();
          }
          
          // More robust play attempt with better error handling
          const playPromise = audioRef.current.play();
          if (playPromise) {
            playPromise.catch(err => {
              console.error("MediaSession nexttrack play error:", err);
              // If initial play fails, try again with another delay
              setTimeout(() => {
                if (audioRef.current) {
                  // Force reload before retry
                  audioRef.current.load();
                  audioRef.current.play().catch(innerErr => {
                    console.error("MediaSession nexttrack retry error:", innerErr);
                    // If still failed, try one more time with longer delay
                    setTimeout(() => {
                      if (audioRef.current) {
                        audioRef.current.play().catch(() => {
                          // If all attempts fail, at least update state to match reality
                          if (wasPlaying) {
                            usePlayerStore.getState().setIsPlaying(false);
                          }
                        });
                      }
                    }, 1000);
                  });
                }
              }, 300);
            });
          }
        }
      }, 100);
      
      // Special handling for car infotainment systems - update metadata again
      // after a delay as some systems cache the initial metadata
      if (isBluetoothConnected) {
        setTimeout(() => {
          try {
            // Force update the metadata for the now-playing song
            const currentSong = usePlayerStore.getState().currentSong;
            if (currentSong) {
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
            }
          } catch (error) {
            // Ignore errors updating metadata
          }
        }, 500);
      }
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
  }, [currentSong, setIsPlaying, playNext, playPrevious, setCurrentTime, isPlaying, queue, currentDevice]);

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
          console.log("Detected near-end of song via timeupdate, triggering handleEnded");
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
        // Special check for song completion when in background or locked screen
        if ((document.hidden || navigator.userActivation?.hasBeenActive === false) && 
            audio.currentTime > 0 && audio.duration > 0 &&
            !isNaN(audio.duration) && audio.currentTime >= audio.duration - 0.5) {
          console.log("Background/lockscreen song end detected, advancing to next track");
          handleEnded();
        }
        
        // Check if audio is paused but should be playing (autopaused by browser)
        if (audio.paused && isPlaying && !isNaN(audio.duration) && 
            audio.currentTime < audio.duration - 0.5) {
          // Try to resume playback
          audio.play().catch(() => {});
        }
        
        // Check for stalled playback (no movement for over 3 seconds)
        if (!audio.paused && !isNaN(audio.duration) && 
            Math.abs(audio.currentTime - lastTime) < 0.01 && 
            audio.currentTime < audio.duration - 1) {
          // Count consecutive stall detections
          const stallCount = (audio as any)._stallCount || 0;
          (audio as any)._stallCount = stallCount + 1;
          
          // If stalled for too long (3 checks = ~3s), try to recover
          if (stallCount >= 3) {
            console.log("Detected stalled playback, attempting recovery");
            // Try to unstick by seeking slightly forward
            audio.currentTime += 0.1;
            (audio as any)._stallCount = 0;
            
            // If still stalled after seeking, try to play next
            if (audio.paused || stallCount > 5) {
              console.log("Stalled too long, advancing to next track");
              handleEnded();
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
      
      const audioDuration = audio.duration;
      
      // 1. Check if audio is paused but should be playing
      if (audio.paused && state.isPlaying && !audio.ended) {
        // For Bluetooth devices, attempt playback with a slightly different approach
        const isBluetoothConnected = currentDevice && currentDevice !== '';
        
        if (isBluetoothConnected) {
          // For Bluetooth, mark user interaction and try to play with a short delay
          state.setUserInteracted();
          setTimeout(() => {
            if (audioRef.current && audioRef.current.paused && !audioRef.current.ended) {
              audioRef.current.play().catch(() => {});
            }
          }, 50);
        }
        // Else rely on the main isPlaying effect to handle this
      }
      
      // 2. Check if we need to advance to next song (with better duration validation)
      if (!isNaN(audioDuration) && audioDuration > 0) {
        // If the song is actually ended OR if we're within 0.5 seconds of the end
        // and ensure we haven't already processed this end_of_song event
        if ((audio.ended || (audio.currentTime >= audioDuration - 0.5 && audio.currentTime > 0)) && !(audio as any)._songEndedProcessed) {
          
          (audio as any)._songEndedProcessed = true; // Mark as processed for this song instance/load

          // Explicitly mark the current song as ended to prevent duplicate triggers
          audio.pause();
            
          // Store current song info before transitioning
          const currentSongInfo = {
            id: state.currentSong?._id,
            position: audio.currentTime,
            duration: audio.duration
          };
            
          // When connected to Bluetooth, ensure we can reliably advance songs
          const isBluetoothConnected = currentDevice && currentDevice !== '';
          
          if (isBluetoothConnected) {
            console.log("Advancing song with Bluetooth device connected");
            
            // Get the next song info before advancing
            const currentIndex = state.currentIndex;
            const nextIndex = (currentIndex + 1) % state.queue.length;
            const nextSong = state.queue[nextIndex];
            
            // Mark user as having interacted to ensure playback is allowed
            state.setUserInteracted();
            
            // Increment to next song with proper state handling
            state.playNext(); // This updates currentSong in the store
            
            // Ensure playback continues by setting the state
            state.setIsPlaying(true); 
            
            // For Bluetooth connections, give a bit more time before playing
            setTimeout(() => {
              if (audioRef.current) {
                // Force reload the audio element to ensure fresh connection to device
                audioRef.current.load();
                audioRef.current.play().catch(err => {
                  console.error("Failed to play next song on Bluetooth:", err);
                  // Try again with more delay
                  setTimeout(() => {
                    if (audioRef.current) audioRef.current.play().catch(() => {});
                  }, 300);
                });
              }
            }, 200);
          } else {
            // Regular (non-Bluetooth) device flow
            // Increment to next song with proper state handling
            state.playNext(); // This updates currentSong in the store
              
            // Ensure playback continues by setting the state
            state.setIsPlaying(true);
          }
            
          // Log the transition for debugging
          try {
            localStorage.setItem('last_song_transition', JSON.stringify({
              from: currentSongInfo.id,
              position: currentSongInfo.position,
              duration: currentSongInfo.duration, 
              timestamp: new Date().toISOString(),
              isLocked: document.hidden,
              bluetoothConnected: isBluetoothConnected,
              batteryLevel: (navigator as any).getBattery ? 
                (navigator as any).getBattery().then((b: any) => b.level) : 'unknown'
            }));
          } catch (e) {
            // Ignore storage errors
          }
        } else if (audio.currentTime < audioDuration - 0.5) {
          // Reset the flag if we are clearly not at the end of the song
          (audio as any)._songEndedProcessed = false;
        }
        
        // Additional check for Bluetooth devices that might have stalled
        const isBluetoothConnected = currentDevice && currentDevice !== '';
        if (isBluetoothConnected && !audio.paused && !isLoading) {
          // Check if the audio has stalled (no movement for over 1 second)
          const stallCount = (audio as any)._bluetoothStallCount || 0;
          
          // If we haven't moved in playback position for a while, increment stall counter
          if (Math.abs(currentTime - (audio as any)._lastTrackedTime || 0) < 0.05) {
            (audio as any)._bluetoothStallCount = stallCount + 1;
            
            // If stalled for too long (3 checks = ~0.75s with our 250ms interval)
            if (stallCount >= 3) {
              console.log("Detected stalled playback on Bluetooth device");
              // Try to unstick by seeking slightly
              audio.currentTime += 0.1;
              
              // If still stalled after multiple attempts, try to reload
              if (stallCount >= 6) {
                console.log("Attempting to recover stalled Bluetooth playback");
                const currentTime = audio.currentTime;
                audio.load();
                audio.currentTime = currentTime;
                audio.play().catch(() => {});
                (audio as any)._bluetoothStallCount = 0;
              }
            }
          } else {
            // Reset stall counter when playback is moving
            (audio as any)._bluetoothStallCount = 0;
          }
          
          // Track the current time for next stall check
          (audio as any)._lastTrackedTime = currentTime;
        }
      }
    }, 250); // More frequent checks to ensure we don't miss the end of a song
    
    return () => {
      clearInterval(backgroundPlaybackMonitor);
    };
  }, [currentSong, isPlaying, currentDevice, currentTime]); // Added currentDevice as dependency

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
      
      // Toast notification at the beginning to indicate connection attempt
      toast.loading('Connecting to device...');
      
      // Store current playback state
      const wasPlaying = !audioRef.current.paused;
      const currentTime = audioRef.current.currentTime;
      const currentSongUrl = audioRef.current.src;
      
      // Pause current playback
      if (wasPlaying) {
        audioRef.current.pause();
        // Update the global state to show paused in UI immediately
        setIsPlaying(false);
      }
      
      // Check if we're in a PWA environment
      const isPWA = window.matchMedia('(display-mode: standalone)').matches;
      
      // Set the audio output device if browser supports it
      if ('setSinkId' in HTMLMediaElement.prototype) {
        // Try to set the sink ID
        try {
          await (audioRef.current as any).setSinkId(deviceId);
          setCurrentDevice(deviceId);
          
          // Create custom event to notify the system about device change
          document.dispatchEvent(new CustomEvent('audioDeviceChanged', {
            detail: { deviceId, isPWA }
          }));
          
          // Reinitialize audio element to ensure proper event handling
          const audio = audioRef.current;
          
          // Reset the songEndedProcessed flag to ensure next song detection works
          (audio as any)._songEndedProcessed = false;
          
          // Force refresh the audio context by briefly changing the src and restoring it
          // This helps with Bluetooth connectivity issues in some browsers
          const originalSrc = audio.src;
          audio.src = '';
          audio.load();
          
          // Short delay to ensure audio context is reset
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Restore the original source
          audio.src = originalSrc;
          audio.load();
          
          // Save this device as preferred in localStorage for future sessions
          try {
            localStorage.setItem('preferredAudioDevice', deviceId);
          } catch (e) {
            console.warn('Could not save device preference');
          }
          
          // Re-register MediaSession actions to ensure they work with the new device
          // This is particularly important for Bluetooth devices like car systems
          if (isMediaSessionSupported()) {
            registerMediaSessionHandlers();
          }
          
          // Wait for canplay event before resuming playback
          const maxWaitTime = 5000; // 5 seconds max wait time
          const playTimeoutId = setTimeout(() => {
            // If we've waited too long and audio isn't ready, show an error
            audio.removeEventListener('canplay', playAfterDeviceChange);
            toast.dismiss();
            toast.error('Connection timeout. Please try again');
          }, maxWaitTime);
          
          // Setup the canplay handler
          const playAfterDeviceChange = () => {
            // Clear the timeout since we've connected successfully
            clearTimeout(playTimeoutId);
            
            // Update UI to show successful connection
            toast.dismiss();
            toast.success(`Connected to ${deviceId ? (
              availableDevices.find(d => d.deviceId === deviceId)?.label || 'Bluetooth device'
            ) : 'this device'}`);
            
            // Resume playback if it was playing
            if (wasPlaying) {
              audio.currentTime = currentTime;
              const playPromise = audio.play();
              if (playPromise) {
                playPromise.catch(() => {
                  // If play fails, try again after a short delay (common with Bluetooth)
                  setTimeout(() => {
                    if (audio) {
                      audio.play().catch(() => {
                        // If it still fails, mark as not playing
                        setIsPlaying(false);
                        toast.error('Playback failed. Try tapping play');
                      });
                    }
                  }, 500);
                });
              }
              // Update the state to playing
              setIsPlaying(true);
            }
            
            // Make sure we refresh the user interaction state
            usePlayerStore.getState().setUserInteracted();
            
            // Remove this one-time listener
            audio.removeEventListener('canplay', playAfterDeviceChange);
          };
          
          // Listen for the canplay event to know when audio is ready on the new device
          audio.addEventListener('canplay', playAfterDeviceChange);
        } catch (error) {
          console.error('Error setting sink ID:', error);
          toast.dismiss();
          toast.error('Failed to connect to device');
          
          // If there was an error, try to restore playback on the original device
          if (wasPlaying && audioRef.current) {
            audioRef.current.play().catch(() => {});
            setIsPlaying(true);
          }
        }
      } else {
        toast.dismiss();
        toast.error('Your browser does not support Bluetooth connection');
      }
      
      // Close the device selector
      setShowDeviceSelector(false);
    } catch (error) {
      console.error('Error setting audio output device:', error);
      toast.dismiss();
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

  // Register Media Session handlers for lock screen controls
  const registerMediaSessionHandlers = () => {
    if (!isMediaSessionSupported() || !audioRef.current) return;
    
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
    
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      usePlayerStore.getState().setUserInteracted();
      playNext();
      setTimeout(() => {
        if (audioRef.current && audioRef.current.paused) {
          audioRef.current.play().catch(() => {});
        }
      }, 100);
    });
    
    if (playPrevious) {
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        usePlayerStore.getState().setUserInteracted();
        playPrevious();
        setTimeout(() => {
          if (audioRef.current && audioRef.current.paused) {
            audioRef.current.play().catch(() => {});
          }
        }, 100);
      });
    }
    
    if ('setPositionState' in navigator.mediaSession) {
      navigator.mediaSession.setPositionState({
        duration: audioRef.current.duration || 0,
        playbackRate: audioRef.current.playbackRate || 1,
        position: audioRef.current.currentTime || 0
      });
    }
  };

  // Restore the preferred audio device from localStorage
  useEffect(() => {
    const restorePreferredDevice = async () => {
      try {
        // Check if browser supports audio output device selection
        if (!('setSinkId' in HTMLMediaElement.prototype) || !audioRef.current) {
          return;
        }
        
        // Get the preferred device from localStorage
        const preferredDeviceId = localStorage.getItem('preferredAudioDevice');
        if (!preferredDeviceId) {
          return;
        }
        
        // Verify the device exists by enumerating devices
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
          return;
        }
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        const deviceExists = devices.some(device => 
          device.kind === 'audiooutput' && device.deviceId === preferredDeviceId
        );
        
        if (deviceExists) {
          // Set the device without UI notification
          await (audioRef.current as any).setSinkId(preferredDeviceId);
          setCurrentDevice(preferredDeviceId);
          console.log('Restored preferred audio device');
        }
      } catch (error) {
        console.warn('Could not restore preferred audio device', error);
      }
    };
    
    // Only try to restore the device once audio is available
    if (audioRef.current) {
      restorePreferredDevice();
    }
  }, []);

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
      
      {/* Use the new SpotifyConnectView component */}
      <SpotifyConnectView 
        isOpen={showDeviceSelector}
        onClose={() => setShowDeviceSelector(false)}
        currentDevice={currentDevice}
        onSelectDevice={handleDeviceSelection}
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
        loop={usePlayerStore.getState().isRepeating}
        data-testid="audio-element"
        onEnded={() => {
          console.log("Audio onEnded event triggered");
          const state = usePlayerStore.getState();
          state.setUserInteracted();
          
          // Before playing next, explicitly pause the current track to ensure we don't get duplicate playback
          if (audioRef.current) {
            audioRef.current.pause();
          }
          
          // Set a flag to prevent double-triggering from other detection mechanisms
          if (audioRef.current) {
            (audioRef.current as any)._songEndedProcessed = true;
          }
          
          // Play next song
          state.playNext();
          state.setIsPlaying(true);
          
          // Special handling for Bluetooth devices - we need to ensure the new audio loads properly
          setTimeout(() => {
            if (audioRef.current && audioRef.current.paused) {
              audioRef.current.play().catch((err) => {
                console.error("Error playing next track after song end:", err);
                // Try once more if this fails
                setTimeout(() => {
                  if (audioRef.current) {
                    audioRef.current.play().catch(() => {});
                  }
                }, 300);
              });
            }
          }, 150);
        }}
        onPause={() => {
          // Check if this is an unintended pause (like system-initiated)
          // but only if we're supposed to be playing
          if (isPlaying && !document.hidden) {
            console.log("Detected unintended pause, attempting to resume");
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
        }}
        controls={false}
      />
    </>
  );
};

export default AudioPlayer;
