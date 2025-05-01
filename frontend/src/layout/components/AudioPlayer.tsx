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

// Add a cache for preloaded audio sources
const audioSourceCache = new Map();

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

// Helper to preload the next song in the queue
const preloadNextSong = (nextSong: any) => {
  if (!nextSong || !nextSong.audioUrl || !isValidUrl(nextSong.audioUrl)) return;
  
  // Skip if already in cache
  if (audioSourceCache.has(nextSong.audioUrl)) return;
  
  try {
    const audio = new Audio();
    audio.src = nextSong.audioUrl;
    audio.preload = 'metadata';
    
    // Add to cache
    audioSourceCache.set(nextSong.audioUrl, {
      preloaded: true,
      timestamp: Date.now()
    });
    
    // Clean cache if it gets too big (keep only 5 most recent)
    if (audioSourceCache.size > 5) {
      const oldestKey = [...audioSourceCache.entries()]
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
      audioSourceCache.delete(oldestKey);
    }
  } catch (error) {
    console.warn('Error preloading next song:', error);
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

  // Handle song change, set up preloading, and reload audio
  useEffect(() => {
    if (!audioRef.current || !currentSong || !currentSong.audioUrl) return;
    
    const audio = audioRef.current;
    const songUrl = currentSong.audioUrl;
    
    // Validate the URL
    if (!isValidUrl(songUrl)) {
      console.error('Invalid audio URL:', songUrl);
      toast.error('Cannot play this song: Invalid audio source');
      return;
    }
    
    // Reset loading states
    setIsLoading(true);
    loadStarted.current = false;
    
    // Check if this is actually a new song
    const isSongChange = prevSongRef.current !== songUrl;
    
    if (isSongChange) {
      console.log('Loading audio source:', songUrl);
      
      try {
        // Indicate loading state to prevent play attempts during load
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
    
    // Keep track of previous song to detect changes
    prevSongRef.current = currentSong.audioUrl;
    
    // Log for debugging lock screen controls
    console.log('Song changed to:', currentSong.title, '- URL:', currentSong.audioUrl);
    
    // Preload the next song in queue for smoother transitions
    if (queue && queue.length > 0) {
      const currentIndex = queue.findIndex(song => {
        // Handle both _id and id properties safely with type checking
        const currentSongId = (currentSong as any)._id || (currentSong as any).id;
        const queueSongId = (song as any)._id || (song as any).id;
        return currentSongId === queueSongId;
      });
      
      if (currentIndex !== -1 && currentIndex < queue.length - 1) {
        // Preload next track in sequence
        const nextSong = queue[currentIndex + 1];
        console.log('Preloading next song:', nextSong.title);
        preloadNextSong(nextSong);
      }
    }
  }, [currentSong, isPlaying, setIsPlaying, queue]);

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

  // Set up MediaSession API for lock screen controls
  useEffect(() => {
    // Check if the browser supports Media Session API
    if (!('mediaSession' in navigator)) {
      console.log('MediaSession API not supported in this browser');
      return;
    }

    // Only proceed if we have a current song
    if (!currentSong) return;

    // Track if metadata has been set to prevent flickering
    let metadataHasBeenSet = false;

    try {
      // Create image cache to prevent flickering
      const artworkUrl = currentSong.imageUrl || '';
      const loadArtworkAndSetMetadata = async () => {
        // Pre-cache the image before setting the metadata
        if (artworkUrl) {
          try {
            // Attempt to preload the image
            const response = await fetch(artworkUrl, { method: 'HEAD' });
            if (!response.ok) throw new Error('Artwork not available');
          } catch (err) {
            console.warn('Could not preload artwork, using fallback', err);
          }
        }

        // Only update metadata if component is still mounted and image has loaded
        if (!metadataHasBeenSet) {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: currentSong.title || 'Unknown Title',
            artist: currentSong.artist || 'Unknown Artist',
            album: 'Music',  // Use a generic album name since Song doesn't have album title
            artwork: [
              {
                src: artworkUrl || 'https://cdn.iconscout.com/icon/free/png-256/free-music-1779799-1513951.png',
                sizes: '512x512',
                type: 'image/jpeg',
              }
            ]
          });
          metadataHasBeenSet = true;
        }
      };

      // Start the image loading and metadata setting process
      loadArtworkAndSetMetadata();

      // Set action handlers for media keys and lock screen controls
      navigator.mediaSession.setActionHandler('play', () => {
        console.log('MediaSession: play action');
        if (!isPlaying) {
          playerStore.setIsPlaying(true);
          playerStore.setUserInteracted();
        }
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        console.log('MediaSession: pause action');
        if (isPlaying) {
          playerStore.setIsPlaying(false);
        }
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        console.log('MediaSession: previous track action');
        playPrevious();
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        console.log('MediaSession: next track action');
        playNext();
      });

      // Update playback state
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

    } catch (error) {
      console.error('Error setting up MediaSession:', error);
    }

    // Clean up function
    return () => {
      try {
        // Remove action handlers when component unmounts
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
      } catch (error) {
        console.error('Error cleaning up MediaSession:', error);
      }
    };
  }, [currentSong, isPlaying, playNext, playPrevious, playerStore]);

  // Update MediaSession playback state when playing state changes
  useEffect(() => {
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
      } catch (error) {
        console.error('Error updating MediaSession playback state:', error);
      }
    }
  }, [isPlaying]);

  // Update MediaSession position state for lock screen progress bar
  useEffect(() => {
    if (!('mediaSession' in navigator) || !audioRef.current) return;
    
    try {
      if ('setPositionState' in navigator.mediaSession) {
        // Throttle position state updates to reduce flickering
        const updatePositionState = () => {
          navigator.mediaSession.setPositionState({
            duration: duration || 0,
            position: currentTime || 0,
            playbackRate: 1.0,
          });
        };
        
        // Use requestAnimationFrame for smoother updates
        const frameId = requestAnimationFrame(updatePositionState);
        return () => cancelAnimationFrame(frameId);
      }
    } catch (error) {
      console.error('Error updating MediaSession position state:', error);
    }
  }, [currentTime, duration]);

  // Handle wake lock to prevent screen from turning off during playback on mobile
  useEffect(() => {
    let wakeLock: any = null;
    
    const requestWakeLock = async () => {
      if (isPlaying && 'wakeLock' in navigator) {
        try {
          wakeLock = await (navigator as any).wakeLock.request('screen');
          console.log('Wake Lock activated');
          
          wakeLock.addEventListener('release', () => {
            console.log('Wake Lock released');
          });
        } catch (err) {
          console.error('Wake Lock error:', err);
        }
      }
    };
    
    const releaseWakeLock = () => {
      if (wakeLock) {
        wakeLock.release()
          .then(() => {
            wakeLock = null;
          })
          .catch((err: any) => {
            console.error('Error releasing Wake Lock:', err);
          });
      }
    };
    
    // Request wake lock when playing, release when paused
    if (isPlaying) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
    
    // Clean up on unmount
    return () => {
      releaseWakeLock();
    };
  }, [isPlaying]);

  // Listen for visibility change to handle background play state
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Update UI state when tab becomes visible again
        if (audioRef.current) {
          setLocalCurrentTime(audioRef.current.currentTime);
          if (!isNaN(audioRef.current.duration)) {
            setLocalDuration(audioRef.current.duration);
          }
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Add audio focus handling for Android
  useEffect(() => {
    // Handle audio focus for Android with AudioFocus API (if available)
    const handleAudioFocus = () => {
      if ('AudioFocus' in window) {
        const audioFocus = (window as any).AudioFocus;
        
        if (isPlaying) {
          audioFocus.request(() => {
            console.log('Audio focus granted');
          }, () => {
            console.log('Audio focus lost, pausing playback');
            playerStore.setIsPlaying(false);
          });
        } else {
          audioFocus.abandon();
        }
      }
    };
    
    // Try to use the AudioFocus API if available
    try {
      handleAudioFocus();
    } catch (error) {
      console.error('AudioFocus API error:', error);
    }
    
  }, [isPlaying, playerStore]);

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
    
    // More detailed error logging
    if (audioRef.current) {
      const errorCode = audioRef.current.error ? audioRef.current.error.code : 'unknown';
      const errorMessage = audioRef.current.error ? audioRef.current.error.message : 'Unknown error';
      console.error(`Audio error details: Code ${errorCode}, Message: ${errorMessage}`);
    }
    
    // If the current song fails to load, try to play the next song
    if (currentSong) {
      // Show toast notification
      toast.error('Unable to play this track. Trying next song...');
      
      // Just move to the next song after a short delay
      setTimeout(() => playNext(), 500);
    }
  };

  // Share audio time with other components
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
      />
    </>
  );
};

export default AudioPlayer;
