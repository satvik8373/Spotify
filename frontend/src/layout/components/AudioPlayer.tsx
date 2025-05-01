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
              console.error('Error playing audio:', error);
              if (error.message.includes('interrupted')) {
                // If the error was due to interruption, try again after a short delay
                setTimeout(() => {
                  audioRef.current?.play().catch(e => {
                    toast.error('Playback error: ' + e.message);
                    setIsPlaying(false);
                  });
                }, 300);
              } else {
                toast.error('Playback error: ' + error.message);
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

  // handle song ends
  useEffect(() => {
    const audio = audioRef.current;

    const handleEnded = () => {
      // Get the current state for logging and better control
      const state = usePlayerStore.getState();
      console.log("Song ended, current queue:", state.queue.length, "items, index:", state.currentIndex);
      
      // Make sure user is marked as having interacted to enable autoplay
      state.setUserInteracted();
      
      // Force a slight delay to ensure proper state updates
      setTimeout(() => {
        // Call playNext directly from store for more reliable progression
        state.playNext();
        // Force playing state to be true
        state.setIsPlaying(true);
        console.log("Playing next song, new index:", usePlayerStore.getState().currentIndex);
      }, 100);
    };

    audio?.addEventListener('ended', handleEnded);

    return () => audio?.removeEventListener('ended', handleEnded);
  }, []);

  // handle song changes
  useEffect(() => {
    if (!audioRef.current || !currentSong) return;

    const audio = audioRef.current;
    const songUrl = currentSong.audioUrl;

    // Validate the URL
    if (!isValidUrl(songUrl)) {
      console.error('Invalid audio URL:', songUrl);
      toast.error('Cannot play this song: Invalid audio source');
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

  // Handle audio errors
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleError = (e: ErrorEvent) => {
      console.error('Audio element error:', e);
      toast.error('Error playing song - please try another');
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

  // Handle audio element errors
  const handleError = (e: any) => {
    console.error('AudioPlayer error:', e);
    // If the current song fails to load, try to play the next song
    if (currentSong) {
      setTimeout(() => playNext(), 1000);
    }
  };

  // Update position state periodically (for seekbar on lock screen)
  useEffect(() => {
    let positionUpdateTimeout: NodeJS.Timeout | null = null;
    let lastReportedTime = -1;
    
    // Only run if MediaSession API is available with position state
    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
      
      const updatePositionState = () => {
        if (!audioRef.current) return;
        
        // Only update if time has changed by at least 1 second to reduce updates
        if (Math.abs(audioRef.current.currentTime - lastReportedTime) < 1) {
          positionUpdateTimeout = setTimeout(updatePositionState, 1000);
          return;
        }
        
        try {
          lastReportedTime = audioRef.current.currentTime;
          
          navigator.mediaSession.setPositionState({
            duration: audioRef.current.duration || 0,
            playbackRate: audioRef.current.playbackRate,
            position: audioRef.current.currentTime || 0
          });
        } catch (e) {
          console.warn('Error updating position state:', e);
        }
        
        positionUpdateTimeout = setTimeout(updatePositionState, 1000);
      };
      
      // Start the update cycle
      positionUpdateTimeout = setTimeout(updatePositionState, 1000);
      
      // Also update immediately when playback state changes
      const handlePlayPause = () => {
        if (audioRef.current) {
          try {
            navigator.mediaSession.setPositionState({
              duration: audioRef.current.duration || 0,
              playbackRate: audioRef.current.playbackRate,
              position: audioRef.current.currentTime || 0
            });
          } catch (e) {
            console.warn('Error updating position state:', e);
          }
        }
      };
      
      audioRef.current?.addEventListener('play', handlePlayPause);
      audioRef.current?.addEventListener('pause', handlePlayPause);
      
      return () => {
        if (positionUpdateTimeout) {
          clearTimeout(positionUpdateTimeout);
        }
        audioRef.current?.removeEventListener('play', handlePlayPause);
        audioRef.current?.removeEventListener('pause', handlePlayPause);
      };
    }
  }, []);

  // Replace existing MediaSession effect with an improved version
  useEffect(() => {
    // Only run if MediaSession API is available
    if (!('mediaSession' in navigator)) return;

    let metadataUpdateTimeout: NodeJS.Timeout | null = null;
    
    // Function to update metadata with debouncing
    const updateMediaSessionMetadata = () => {
      if (metadataUpdateTimeout) {
        clearTimeout(metadataUpdateTimeout);
      }
      
      metadataUpdateTimeout = setTimeout(() => {
        if (!currentSong) return;
        
        try {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: currentSong.title || 'Unknown Title',
            artist: currentSong.artist || 'Unknown Artist',
            album: (currentSong as any).album || currentSong.albumId?.toString() || '',
            artwork: [
              {
                src: currentSong.imageUrl || '',
                sizes: '512x512',
                type: 'image/jpeg'
              }
            ]
          });
          
          // Update playback state in the same operation
          navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
        } catch (e) {
          console.warn('Error updating media session metadata:', e);
        }
      }, 50);
    };
    
    // Set media session action handlers
    try {
      navigator.mediaSession.setActionHandler('play', () => {
        console.log('MediaSession: play action');
        playerStore.setIsPlaying(true);
      });
      
      navigator.mediaSession.setActionHandler('pause', () => {
        console.log('MediaSession: pause action');
        playerStore.setIsPlaying(false);
      });
      
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        console.log('MediaSession: previous track action');
        playPrevious();
      });
      
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        console.log('MediaSession: next track action');
        playNext();
      });
      
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (audioRef.current && details.seekTime !== undefined) {
          audioRef.current.currentTime = details.seekTime;
          setLocalCurrentTime(details.seekTime);
          if (setCurrentTime) {
            setCurrentTime(details.seekTime);
          }
        }
      });
    } catch (e) {
      console.warn('Error setting media session handlers:', e);
    }
    
    // Update metadata when current song changes
    updateMediaSessionMetadata();
    
    // Clean up on unmount
    return () => {
      if (metadataUpdateTimeout) {
        clearTimeout(metadataUpdateTimeout);
      }
      
      // Clear action handlers
      try {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('seekto', null);
      } catch (e) {
        console.warn('Error clearing media session handlers:', e);
      }
    };
  }, [currentSong, playNext, playPrevious, playerStore, setCurrentTime, isPlaying]);
  
  // Update the audio time update handler for smoother updates
  const updateAudioMetadata = () => {
    if (!audioRef.current) return;
    
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
    
    // Update lock screen position if playing (reduces updates when paused)
    if (isPlaying && 'mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
      try {
        navigator.mediaSession.setPositionState({
          duration: duration || 0,
          playbackRate: audioRef.current.playbackRate,
          position: currentTime || 0
        });
      } catch (e) {
        // Silently fail - we'll update in the regular interval
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

  // Global keyboard shortcuts for media control
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if no input is focused (avoid interfering with typing)
      if (document.activeElement instanceof HTMLInputElement || 
          document.activeElement instanceof HTMLTextAreaElement) {
        return;
      }
      
      switch (e.code) {
        case 'Space':
          // Prevent page scrolling
          e.preventDefault();
          playerStore.togglePlay();
          break;
        case 'ArrowRight':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            playNext();
          }
          break;
        case 'ArrowLeft':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            playPrevious();
          }
          break;
        case 'KeyM':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            // Mute/unmute
            if (audioRef.current) {
              audioRef.current.muted = !audioRef.current.muted;
            }
          }
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playNext, playPrevious, playerStore]);

  // Try to get audio focus on iOS by playing silent audio on user interaction
  useEffect(() => {
    // This effect only needs to run once on mount
    const unlockAudio = () => {
      // Create a silent audio context
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          const audioCtx = new AudioContext();
          const silentBuffer = audioCtx.createBuffer(1, 1, 22050);
          const source = audioCtx.createBufferSource();
          source.buffer = silentBuffer;
          source.connect(audioCtx.destination);
          source.start();
          console.log('Audio context unlocked');
        }
        
        // Also try to play the actual audio element if it exists
        if (audioRef.current) {
          const playPromise = audioRef.current.play();
          if (playPromise) {
            playPromise
              .then(() => {
                // Immediately pause if we're not supposed to be playing
                if (!isPlaying) {
                  audioRef.current?.pause();
                }
                console.log('Audio element unlocked');
              })
              .catch(e => {
                console.log('Failed to unlock audio element:', e);
              });
          }
        }
      } catch (e) {
        console.warn('Could not unlock audio:', e);
      }
      
      // Remove the event listeners once audio is unlocked
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('touchend', unlockAudio);
      document.removeEventListener('click', unlockAudio);
    };
    
    // Add event listeners to unlock audio on user interaction
    document.addEventListener('touchstart', unlockAudio);
    document.addEventListener('touchend', unlockAudio);
    document.addEventListener('click', unlockAudio);
    
    return () => {
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('touchend', unlockAudio);
      document.removeEventListener('click', unlockAudio);
    };
  }, [isPlaying]);

  // Additional function for cross-device playback - detect when audio 
  // is played by another device through Bluetooth or other means
  useEffect(() => {
    const handleExternalPlay = () => {
      console.log('Audio played by external device');
      if (!isPlaying) {
        playerStore.setIsPlaying(true);
      }
    };
    
    const handleExternalPause = () => {
      console.log('Audio paused by external device');
      if (isPlaying) {
        playerStore.setIsPlaying(false);
      }
    };
    
    const audio = audioRef.current;
    if (audio) {
      audio.addEventListener('play', handleExternalPlay);
      audio.addEventListener('pause', handleExternalPause);
      
      return () => {
        audio.removeEventListener('play', handleExternalPlay);
        audio.removeEventListener('pause', handleExternalPause);
      };
    }
  }, [isPlaying, playerStore]);

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
        src={currentSong.audioUrl}
        autoPlay={isPlaying}
        onTimeUpdate={updateAudioMetadata}
        onLoadedMetadata={updateAudioMetadata}
        onError={handleError}
        preload="auto"
        // Add these attributes for better mobile support
        playsInline
        controls={false} // Hide native controls
        id="main-audio-player" // Add ID for easier debugging
        // Add data attributes for PWA and lock screen support
        data-testid="audio-element"
        data-mediasession="true"
        // Fix for iOS flickering issues - use data attributes for non-standard props
        x-webkit-airplay="allow"
        data-webkit-playsinline="true"
        data-controlslist="nodownload"
      />
    </>
  );
};

export default AudioPlayer;
