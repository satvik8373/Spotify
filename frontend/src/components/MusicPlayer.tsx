import { useState, useRef, useEffect } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { formatTime } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Play, Pause, SkipBack, SkipForward, Volume, VolumeX, Repeat, Shuffle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';

const MusicPlayer = () => {
  // Get player state and methods
  const {
    currentSong,
    isPlaying,
    togglePlay,
    queue,
    currentIndex,
    isShuffled,
    playNext,
    playPrevious,
    toggleShuffle,
    setCurrentTime,
    setDuration,
    currentTime,
    duration,
    hasUserInteracted,
    setUserInteracted,
    autoplayBlocked,
  } = usePlayerStore();

  // Component state
  const [volume, setVolume] = useState(0.7);
  const [previousVolume, setPreviousVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [showPlaybackError, setShowPlaybackError] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Track user interaction across the whole document
  useEffect(() => {
    const handleInteraction = () => {
      setUserInteracted();
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };

    document.addEventListener('click', handleInteraction);
    document.addEventListener('keydown', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);

    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
  }, [setUserInteracted]);

  // Handle playing and pausing the audio
  useEffect(() => {
    if (!audioRef.current || !currentSong) return;

    async function playOrPause() {
      if (isPlaying && audioRef.current?.paused) {
        try {
          await audioRef.current.play();
          setShowPlaybackError(false);
        } catch (err: any) {
          // Silent error handling
          togglePlay(); // Revert to paused state since playback failed
        }
      } else if (!isPlaying && audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
    }

    playOrPause();
  }, [isPlaying, currentSong, togglePlay]);

  // Update audio source when the song changes
  useEffect(() => {
    if (!currentSong || !audioRef.current) return;

    // Handle different object structures
    const audioUrl =
      typeof currentSong === 'string'
        ? currentSong
        : (currentSong as any).url || (currentSong as any).audioUrl;

    if (audioUrl && audioRef.current.src !== audioUrl) {
      audioRef.current.src = audioUrl;
      audioRef.current.load();

      // Try to autoplay if user has interacted
      if (isPlaying && hasUserInteracted) {
        audioRef.current.play().catch(err => {
          // Silent error handling
        });
      }
    }
  }, [currentSong, isPlaying, hasUserInteracted]);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Handle time update
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  // Handle song end
  const handleSongEnd = () => {
    if (isRepeat) {
      // Repeat current song
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(err => {
          // Silent error handling
        });
      }
    } else {
      // Play next song
      playNext();
    }
  };

  // Handle metadata loaded (song duration)
  const handleMetadataLoaded = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  // Handle time seek by user
  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  // Toggle mute status
  const handleToggleMute = () => {
    if (isMuted) {
      setVolume(previousVolume);
      setIsMuted(false);
    } else {
      setPreviousVolume(volume);
      setVolume(0);
      setIsMuted(true);
    }
  };

  // Toggle repeat status
  const handleToggleRepeat = () => {
    setIsRepeat(!isRepeat);
  };

  // Add this useEffect for background playback handling
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // When going to background, ensure audio continues playing
        if (isPlaying && audioRef.current?.paused) {
          audioRef.current.play().catch(err => {
            // Silent error handling
          });
        }
      }
    };

    const handlePause = () => {
      // If paused by system, try to resume if we should be playing
      if (isPlaying && audioRef.current?.paused) {
        audioRef.current.play().catch(err => {
          // Silent error handling
        });
      }
    };

    // Add event listeners for background playback
    document.addEventListener('visibilitychange', handleVisibilityChange);
    if (audioRef.current) {
      audioRef.current.addEventListener('pause', handlePause);
    }

    // Handle audio element setup
    if (audioRef.current) {
      audioRef.current.setAttribute('playsinline', '');
      audioRef.current.setAttribute('webkit-playsinline', '');
      audioRef.current.setAttribute('x5-playsinline', '');
      audioRef.current.setAttribute('x5-video-player-type', 'h5');
      audioRef.current.setAttribute('x5-video-player-fullscreen', 'false');
      audioRef.current.setAttribute('preload', 'auto');
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (audioRef.current) {
        audioRef.current.removeEventListener('pause', handlePause);
      }
    };
  }, [isPlaying]);

  // No song selected
  if (!currentSong) {
    return null;
  }

  // Extract song details, handling different object structures
  const song = currentSong as any;
  const title = song.title || song.name || 'Unknown Title';
  const artist = song.artist || song.artistName || 'Unknown Artist';
  const image =
    song.coverImageUrl ||
    song.imageUrl ||
    song.image ||
    'https://placehold.co/400x400/1f1f1f/959595?text=No+Image';

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 playback-controls-glass p-2 pb-3 md:p-4 z-50">
        {showPlaybackError && (
          <Alert className="mb-2 bg-amber-900/20 border-amber-800 text-amber-500">
            <AlertDescription className="flex items-center text-sm">
              <span>
                ⚠️ Click any button first to enable playback (browser autoplay restriction)
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-amber-500 hover:text-amber-400 ml-auto"
                onClick={() => setShowPlaybackError(false)}
              >
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center gap-3 md:gap-4">
          {/* Song info */}
          <div className="flex items-center flex-1 min-w-0 gap-3">
            <div className="liquid-glass-album h-12 w-12 md:h-14 md:w-14 flex-shrink-0 overflow-hidden">
              <img
                src={image}
                alt={title}
                className="h-full w-full object-cover"
                onError={e => {
                  (e.target as HTMLImageElement).src =
                    'https://placehold.co/400x400/1f1f1f/959595?text=No+Image';
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm font-medium">{title}</div>
              <div className="truncate text-xs text-zinc-400">{artist}</div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col items-center gap-1 flex-1 max-w-md">
            <div className="flex items-center gap-2 md:gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="liquid-glass-button h-8 w-8 md:h-9 md:w-9 text-zinc-400 hover:text-white"
                onClick={() => toggleShuffle()}
                title="Shuffle"
              >
                <Shuffle
                  className={cn('h-4 w-4 md:h-5 md:w-5', isShuffled ? 'text-green-500' : '')}
                />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="liquid-glass-button h-8 w-8 md:h-9 md:w-9 text-zinc-400 hover:text-white"
                onClick={playPrevious}
                title="Previous"
                disabled={queue.length <= 1}
              >
                <SkipBack className="h-4 w-4 md:h-5 md:w-5" />
              </Button>

              <Button
                variant="default"
                size="icon"
                onClick={togglePlay}
                className="liquid-glass-primary h-8 w-8 md:h-10 md:w-10 text-white hover:scale-105 transition"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4 md:h-5 md:w-5" />
                ) : (
                  <Play className="h-4 w-4 md:h-5 md:w-5 ml-0.5" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="liquid-glass-button h-8 w-8 md:h-9 md:w-9 text-zinc-400 hover:text-white"
                onClick={() => playNext()}
                title="Next"
                disabled={queue.length <= 1}
              >
                <SkipForward className="h-4 w-4 md:h-5 md:w-5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="liquid-glass-button h-8 w-8 md:h-9 md:w-9 text-zinc-400 hover:text-white"
                onClick={handleToggleRepeat}
                title="Repeat"
              >
                <Repeat className={cn('h-4 w-4 md:h-5 md:w-5', isRepeat ? 'text-green-500' : '')} />
              </Button>
            </div>

            {/* Seek bar */}
            <div className="w-full flex items-center gap-2 px-2">
              <span className="text-xs text-zinc-500 w-8 text-right">
                {formatTime(currentTime)}
              </span>
              <div className="flex-1 relative py-1">
                <Slider
                  value={[currentTime]}
                  min={0}
                  max={duration || 1}
                  step={0.1}
                  className="flex-1"
                  onValueChange={handleSeek}
                />
                <div className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-b from-green-500/20 to-transparent pointer-events-none"></div>
              </div>
              <span className="text-xs text-zinc-500 w-8">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Volume */}
          <div className="hidden md:flex items-center gap-2 w-32">
            <Button
              variant="ghost"
              size="icon"
              className="liquid-glass-button h-8 w-8 text-zinc-400 hover:text-white"
              onClick={handleToggleMute}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume className="h-4 w-4" />}
            </Button>
            <div className="flex-1 relative py-1">
              <Slider
                value={[volume]}
                min={0}
                max={1}
                step={0.01}
                className="flex-1"
                onValueChange={value => setVolume(value[0])}
              />
              <div className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-b from-green-500/20 to-transparent pointer-events-none"></div>
            </div>
          </div>
        </div>

        {/* Hidden audio element */}
        <audio
          ref={audioRef}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleSongEnd}
          onLoadedMetadata={handleMetadataLoaded}
        />
      </div>
    </>
  );
};

export default MusicPlayer;
