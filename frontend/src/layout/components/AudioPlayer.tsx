import React from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';

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

const AudioPlayer = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const prevSongRef = useRef<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const playTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isHandlingPlayback = useRef(false);
  const loadStarted = useRef<boolean>(false);

  const { currentSong, isPlaying, queue, playNext, setCurrentSong, setIsPlaying } =
    usePlayerStore();

  // These may not exist in the store based on linter errors
  const playerStore = usePlayerStore();
  const setCurrentTime = playerStore.setCurrentTime;
  const setDuration = playerStore.setDuration;

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (playTimeoutRef.current) {
        clearTimeout(playTimeoutRef.current);
      }
    };
  }, []);

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
      playNext();
    };

    audio?.addEventListener('ended', handleEnded);

    return () => audio?.removeEventListener('ended', handleEnded);
  }, [playNext]);

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
          if (playerState.currentSong && !currentSong) {
            setCurrentSong(playerState.currentSong);

            // Don't autoplay immediately on page refresh
            setIsPlaying(false);
          }
        }
      } catch (error) {
        console.error('Error restoring player state in AudioPlayer:', error);
      }
    }
  }, [setCurrentSong, currentSong, setIsPlaying]);

  // Handle audio element errors
  const handleError = (e: any) => {
    console.error('AudioPlayer error:', e);
    // If the current song fails to load, try to play the next song
    if (currentSong) {
      setTimeout(() => playNext(), 1000);
    }
  };

  // Share audio time with other components
  const updateAudioMetadata = () => {
    if (audioRef.current) {
      // Only call these functions if they exist in the store
      if (setCurrentTime) {
        setCurrentTime(audioRef.current.currentTime);
      }
      if (setDuration && !isNaN(audioRef.current.duration)) {
        setDuration(audioRef.current.duration);
      }
    }
  };

  return (
    <div className="hidden">
      {currentSong && (
        <audio
          ref={audioRef}
          src={currentSong.audioUrl}
          autoPlay={isPlaying}
          onTimeUpdate={updateAudioMetadata}
          onLoadedMetadata={updateAudioMetadata}
          onError={handleError}
          preload="auto"
        />
      )}
    </div>
  );
};

export default AudioPlayer;
