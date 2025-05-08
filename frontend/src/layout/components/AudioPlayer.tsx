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

  // Enhanced MediaSession API handling
  useEffect(() => {
    if (!isMediaSessionSupported() || !currentSong) return;

    // Update metadata for lock screen
    const updateMetadata = () => {
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
      } catch (e) {
        // Ignore metadata errors
      }
    };

    // Set up media session action handlers
    const setupMediaSession = () => {
      // Play/pause handler
      navigator.mediaSession.setActionHandler('play', () => {
        usePlayerStore.getState().setUserInteracted();
        usePlayerStore.getState().setIsPlaying(true);
        if (audioRef.current) {
          audioRef.current.play().catch(() => {});
        }
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        usePlayerStore.getState().setIsPlaying(false);
        if (audioRef.current) {
          audioRef.current.pause();
        }
      });

      // Previous/next handlers
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        usePlayerStore.getState().setUserInteracted();
        const state = usePlayerStore.getState();
        if (state.playPrevious) {
          state.playPrevious();
          setTimeout(() => {
            if (audioRef.current && audioRef.current.paused) {
              audioRef.current.play().catch(() => {});
            }
          }, 100);
        }
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        usePlayerStore.getState().setUserInteracted();
        const state = usePlayerStore.getState();
        if (state.playNext) {
          state.playNext();
          setTimeout(() => {
            if (audioRef.current && audioRef.current.paused) {
              audioRef.current.play().catch(() => {});
            }
          }, 100);
        }
      });

      // Seeking handler
      try {
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (audioRef.current && details.seekTime !== undefined) {
            audioRef.current.currentTime = details.seekTime;
            usePlayerStore.getState().setCurrentTime(details.seekTime);
            
            // Update position state
            if ('setPositionState' in navigator.mediaSession) {
              try {
                navigator.mediaSession.setPositionState({
                  duration: audioRef.current.duration,
                  playbackRate: audioRef.current.playbackRate,
                  position: details.seekTime
                });
              } catch (e) {
                // Ignore position state errors
              }
            }
          }
        });
      } catch (e) {
        // Ignore seeking errors
      }
    };

    // Update metadata and set up handlers
    updateMetadata();
    setupMediaSession();

    // Update position state periodically
    const positionUpdateInterval = setInterval(() => {
      if (audioRef.current && !isNaN(audioRef.current.duration)) {
        try {
          navigator.mediaSession.setPositionState({
            duration: audioRef.current.duration,
            playbackRate: audioRef.current.playbackRate,
            position: audioRef.current.currentTime
          });
        } catch (e) {
          // Ignore position state errors
        }
      }
    }, 1000);

    // Clean up
    return () => {
      clearInterval(positionUpdateInterval);
      try {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('seekto', null);
      } catch (e) {
        // Ignore cleanup errors
      }
    };
  }, [currentSong, isPlaying]);

  // Enhanced song end handling
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      // Get the current state
      const state = usePlayerStore.getState();
      
      // Mark user interaction to enable autoplay
      state.setUserInteracted();
      
      // Set wasPlaying flag to ensure continuation
      state.wasPlayingBeforeInterruption = true;
      
      // Call playNext and ensure playing state
      state.playNext();
      state.setIsPlaying(true);
      
      // Force play after state updates
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().catch(() => {
            // If initial play fails, retry once
            setTimeout(() => {
              if (audioRef.current) {
                audioRef.current.play().catch(() => {});
              }
            }, 300);
          });
        }
      }, 50);
    };

    // Set up multiple methods for song end detection
    const setupSongEndDetection = () => {
      // Primary method: ended event
      audio.addEventListener('ended', handleEnded);
      
      // Secondary method: timeupdate for iOS background
      const handleTimeUpdate = () => {
        if (!audio) return;
        
        // Detect end slightly before actual end
        if (audio.currentTime > 0 && 
            audio.duration > 0 && 
            !isNaN(audio.duration) &&
            audio.currentTime >= audio.duration - 0.3) {
          
          if (audio.currentTime < audio.duration) {
            handleEnded();
            audio.pause();
          }
        }
      };
      
      // Throttled timeupdate listener
      let lastCheck = 0;
      audio.addEventListener('timeupdate', () => {
        const now = Date.now();
        if (now - lastCheck > 500) {
          lastCheck = now;
          handleTimeUpdate();
        }
      });
      
      // Background check for locked devices
      const backgroundCheckInterval = setInterval(() => {
        if (document.hidden && audio && isPlaying) {
          if (!audio.paused) {
            handleTimeUpdate();
          } else {
            audio.play().catch(() => {});
          }
        }
      }, 2000);
      
      return () => {
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        clearInterval(backgroundCheckInterval);
      };
    };

    const cleanup = setupSongEndDetection();
    return cleanup;
  }, [isPlaying]);

  // Enhanced phone call and audio focus handling
  useEffect(() => {
    const handleAudioInterruption = () => {
      const wasPlaying = isPlaying;
      
      const handleAudioPause = () => {
        if (isPlaying) {
          usePlayerStore.setState({ wasPlayingBeforeInterruption: true });
        }
      };
      
      const handleAudioResume = () => {
        const state = usePlayerStore.getState();
        
        if (state.wasPlayingBeforeInterruption) {
          setTimeout(() => {
            state.setUserInteracted();
            state.setIsPlaying(true);
            usePlayerStore.setState({ wasPlayingBeforeInterruption: false });
            
            if (audioRef.current) {
              audioRef.current.play().catch(() => {});
            }
          }, 500);
        }
      };
      
      // Handle visibility changes
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && wasPlaying) {
          handleAudioResume();
        } else if (document.hidden && isPlaying) {
          usePlayerStore.setState({ wasPlayingBeforeInterruption: true });
        }
      });
      
      // Handle audio interruptions
      if (audioRef.current) {
        audioRef.current.addEventListener('pause', handleAudioPause);
        audioRef.current.addEventListener('play', handleAudioResume);
      }
      
      // Handle audio focus changes
      if ('AudioContext' in window) {
        try {
          const audioContext = new AudioContext();
          if (audioContext.state === 'suspended') {
            audioContext.addEventListener('statechange', () => {
              if (audioContext.state === 'running' && wasPlaying) {
                handleAudioResume();
              } else if (audioContext.state === 'suspended' && isPlaying) {
                usePlayerStore.setState({ wasPlayingBeforeInterruption: true });
              }
            });
          }
        } catch (e) {
          // AudioContext not supported
        }
      }
      
      return () => {
        if (audioRef.current) {
          audioRef.current.removeEventListener('pause', handleAudioPause);
          audioRef.current.removeEventListener('play', handleAudioResume);
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

  // Handle song changes and playlist transitions
  useEffect(() => {
    if (!audioRef.current || !currentSong) return;

    const audio = audioRef.current;
    const songUrl = currentSong.audioUrl;

    // Validate the URL
    if (!songUrl || !isValidUrl(songUrl)) {
      console.error('Invalid audio URL:', songUrl);
      return;
    }

    // Track loading operation to prevent race conditions
    const currentLoadingOperation = Date.now();
    (audio as any)._currentLoadingOperation = currentLoadingOperation;

    // Set up loading handlers
    const handleCanPlay = () => {
      // Skip if this is no longer the current loading operation
      if ((audio as any)._currentLoadingOperation !== currentLoadingOperation) {
        return;
      }

      setIsLoading(false);
      isHandlingPlayback.current = false;

      // If we should be playing, start playback
      if (isPlaying) {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              // Update MediaSession position state
              if ('setPositionState' in navigator.mediaSession) {
                try {
                  navigator.mediaSession.setPositionState({
                    duration: audio.duration || 0,
                    playbackRate: audio.playbackRate || 1,
                    position: audio.currentTime || 0
                  });
                } catch (e) {
                  // Ignore position state errors
                }
              }
            })
            .catch(error => {
              if (error.name === 'AbortError') {
                // Retry play after a short delay
                setTimeout(() => {
                  if (isPlaying && audio) {
                    audio.play().catch(() => {
                      setIsPlaying(false);
                    });
                  }
                }, 250);
              } else {
                setIsPlaying(false);
              }
            });
        }
      }
    };

    // Set up error handling
    const handleError = () => {
      if ((audio as any)._currentLoadingOperation !== currentLoadingOperation) {
        return;
      }
      setIsLoading(false);
      isHandlingPlayback.current = false;
      
      // Try to play next song on error
      setTimeout(() => {
        const state = usePlayerStore.getState();
        state.playNext();
      }, 1000);
    };

    // Add event listeners
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);

    // Set the new source and start loading
    audio.src = songUrl;
    audio.load();

    // Preload next song if available
    const nextIndex = (usePlayerStore.getState().currentIndex + 1) % usePlayerStore.getState().queue.length;
    const nextSong = usePlayerStore.getState().queue[nextIndex];
    if (nextSong && nextSong.audioUrl) {
      const preloadAudio = new Audio();
      preloadAudio.src = nextSong.audioUrl;
      preloadAudio.load();
      // Clean up preload after a short time
      setTimeout(() => {
        preloadAudio.src = '';
      }, 2000);
    }

    // Clean up
    return () => {
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };
  }, [currentSong, isPlaying, setIsPlaying]);

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
