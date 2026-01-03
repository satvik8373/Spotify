import React, { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  Shuffle,
} from 'lucide-react';
import { cn, formatTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function Player() {
  const {
    currentSong,
    isPlaying,
    togglePlay,
    playNext,
    playPrevious,
    currentTime,
    duration,
    setCurrentTime,
    setDuration,
    hasUserInteracted,
    setUserInteracted,
    autoplayBlocked,
  } = usePlayerStore();

  const [volume, setVolume] = useState(0.7);
  const [previousVolume, setPreviousVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPlaybackError, setShowPlaybackError] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  // Set up document-wide interaction listener
  useEffect(() => {
    const handleInteraction = () => {
      setUserInteracted();
      // Once the user has interacted, we don't need the listener anymore
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };

    // Add listeners for common user interactions
    document.addEventListener('click', handleInteraction);
    document.addEventListener('keydown', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);

    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
  }, [setUserInteracted]);

  // Handle playing and pausing
  useEffect(() => {
    if (!audioRef.current) return;

    const playAudio = async () => {
      if (isPlaying && audioRef.current?.paused) {
        setIsLoading(true);
        try {
          await audioRef.current?.play();
          setShowPlaybackError(false);
        } catch (err: any) {
          // Silent error handling
        } finally {
          setIsLoading(false);
        }
      } else if (!isPlaying && audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
    };

    playAudio();
  }, [isPlaying, currentSong, togglePlay, toast]);

  // Update audio source when song changes
  useEffect(() => {
    if (currentSong && audioRef.current) {
      const audioSrc = (currentSong as any).audioUrl || (currentSong as any).url;

      if (audioRef.current.src !== audioSrc && audioSrc) {
        setIsLoading(true);
        setError(null);
        audioRef.current.src = audioSrc;
        audioRef.current.volume = volume;

        // If user has interacted and isPlaying is true, try to play
        if (isPlaying && hasUserInteracted) {
          audioRef.current.play().catch(err => {
            // Silent error handling
          });
        }
      }
    }
  }, [currentSong, volume, isPlaying, hasUserInteracted]);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      setIsLoading(false);
    }
  };

  const handleEnded = () => {
    // This component is not the main audio player, so we don't handle song end here
    // The main AudioPlayer component handles song transitions
    return;
  };

  const handleSeek = (newPosition: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = newPosition[0];
      setCurrentTime(newPosition[0]);
    }
  };

  const handleVolumeChange = (newVolume: number[]) => {
    const volumeValue = newVolume[0];
    setVolume(volumeValue);

    if (volumeValue === 0) {
      setIsMuted(true);
    } else {
      setIsMuted(false);
      setPreviousVolume(volumeValue);
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      setVolume(previousVolume);
      setIsMuted(false);
    } else {
      setPreviousVolume(volume);
      setVolume(0);
      setIsMuted(true);
    }
  };

  const toggleRepeat = () => {
    setRepeat(prev => !prev);
  };

  const toggleShuffle = () => {
    setShuffle(prev => !prev);
  };

  if (!currentSong) return null;

  const song = currentSong as any;
  const title = song.title || song.name || 'Unknown';
  const artist = song.artist || song.primaryArtists || song.artistName || 'Unknown Artist';
  const coverImage = song.imageUrl || song.image || song.coverImageUrl || '/placeholder-image.jpg';

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-zinc-900/90 backdrop-blur-lg border-t border-zinc-800 p-2 pb-3 md:p-4 z-50">
      {showPlaybackError && (
        <Alert className="mb-2 bg-amber-900/20 border-amber-800 text-amber-400">
          <AlertDescription className="flex items-center text-sm">
            <span>⚠️ Click any button first to enable playback (browser autoplay restriction)</span>
            <Button
              variant="ghost"
              size="sm"
              className="text-amber-400 hover:text-amber-300 ml-auto"
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
          <div className="h-12 w-12 md:h-14 md:w-14 flex-shrink-0 rounded overflow-hidden">
            <img
              src={coverImage}
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

        {/* Playback controls */}
        <div className="flex flex-col items-center gap-1 flex-1 max-w-md">
          <div className="flex items-center gap-2 md:gap-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 md:h-9 md:w-9 text-zinc-400 hover:text-white"
                    onClick={toggleShuffle}
                  >
                    <Shuffle
                      className={cn('h-4 w-4 md:h-5 md:w-5', shuffle ? 'text-green-500' : '')}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Shuffle</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 md:h-9 md:w-9 text-zinc-400 hover:text-white"
                    onClick={() => playPrevious()}
                  >
                    <SkipBack className="h-4 w-4 md:h-5 md:w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Previous</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button
              variant="default"
              size="icon"
              className={cn(
                'h-8 w-8 md:h-10 md:w-10 rounded-full bg-white text-black hover:bg-zinc-200',
                isLoading && 'opacity-50 cursor-wait'
              )}
              onClick={togglePlay}
              disabled={isLoading}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4 md:h-5 md:w-5" />
              ) : (
                <Play className="h-4 w-4 md:h-5 md:w-5 ml-0.5" />
              )}
            </Button>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 md:h-9 md:w-9 text-zinc-400 hover:text-white"
                    onClick={() => playNext()}
                  >
                    <SkipForward className="h-4 w-4 md:h-5 md:w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Next</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 md:h-9 md:w-9 text-zinc-400 hover:text-white"
                    onClick={toggleRepeat}
                  >
                    <Repeat
                      className={cn('h-4 w-4 md:h-5 md:w-5', repeat ? 'text-green-500' : '')}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Repeat</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="w-full flex items-center gap-2 px-2">
            <span className="text-xs text-zinc-500 w-8 text-right">{formatTime(currentTime)}</span>
            <Slider
              value={[currentTime]}
              min={0}
              max={duration || 100}
              step={0.1}
              className="flex-1"
              onValueChange={handleSeek}
            />
            <span className="text-xs text-zinc-500 w-8">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume control */}
        <div className="hidden md:flex items-center gap-2 w-32">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-400 hover:text-white"
            onClick={toggleMute}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <Slider
            value={[volume]}
            min={0}
            max={1}
            step={0.01}
            className="flex-1"
            onValueChange={handleVolumeChange}
          />
        </div>
      </div>

      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onLoadedMetadata={handleLoadedMetadata}
        onError={e => {
          // Silent error handling
        }}
      />
    </div>
  );
}
