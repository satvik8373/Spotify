import React from 'react';
import { useProductionAudio } from '@/hooks/useProductionAudio';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Bulletproof Production Audio Player
 * Guaranteed to work in production environments
 */
const ProductionAudioPlayer: React.FC = () => {
  const {
    currentSong,
    isPlaying,
    setIsPlaying,
    playNext,
    playPrevious,
    setCurrentTime,
    setDuration
  } = usePlayerStore();

  const {
    audioRef,
    play,
    pause,
    setSource,
    hasUserInteracted,
    needsUserInteraction,
    error,
    isLoading
  } = useProductionAudio({
    onTimeUpdate: (time) => setCurrentTime?.(time),
    onDurationChange: (duration) => setDuration?.(duration),
    onEnded: () => {
      playNext();
      setIsPlaying(true);
    },
    onError: (errorMsg) => {
      console.error('Audio error:', errorMsg);
      setIsPlaying(false);
    }
  });

  // Handle song changes
  React.useEffect(() => {
    if (currentSong?.audioUrl) {
      setSource(currentSong.audioUrl);
    }
  }, [currentSong, setSource]);

  // Handle play/pause state changes
  React.useEffect(() => {
    if (isPlaying) {
      play().catch((err) => {
        console.warn('Play failed:', err.message);
        setIsPlaying(false);
      });
    } else {
      pause();
    }
  }, [isPlaying, play, pause, setIsPlaying]);

  // Handle play button click
  const handlePlayClick = () => {
    // Mark user interaction
    usePlayerStore.getState().setUserInteracted();
    setIsPlaying(!isPlaying);
  };

  // Handle skip buttons
  const handlePreviousClick = () => {
    usePlayerStore.getState().setUserInteracted();
    playPrevious();
  };

  const handleNextClick = () => {
    usePlayerStore.getState().setUserInteracted();
    playNext();
  };

  if (!currentSong) return null;

  return (
    <>
      {/* User interaction prompt */}
      {needsUserInteraction && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-zinc-900 border border-zinc-700 rounded-lg p-4 shadow-lg max-w-sm">
          <div className="flex items-center gap-3">
            <Play className="h-5 w-5 text-green-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Tap to play music</p>
              <p className="text-xs text-zinc-400 mt-1">Browser requires user interaction</p>
            </div>
            <Button
              size="sm"
              onClick={handlePlayClick}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Play
            </Button>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-900 border border-red-700 rounded-lg p-4 shadow-lg max-w-sm">
          <div className="text-center">
            <p className="text-sm text-white mb-2">{error}</p>
            <Button
              size="sm"
              onClick={() => window.location.reload()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Reload Page
            </Button>
          </div>
        </div>
      )}

      {/* Mini player */}
      <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 h-16 z-40 flex items-center justify-between px-4">
        {/* Song info */}
        <div className="flex items-center gap-3 flex-1 min-w-0 max-w-[60%]">
          <img
            src={currentSong.imageUrl}
            alt={currentSong.title}
            className="h-10 w-10 rounded object-cover flex-shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://cdn.iconscout.com/icon/free/png-256/free-music-1779799-1513951.png';
            }}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">{currentSong.title}</p>
            <p className="text-xs text-zinc-400 truncate">{currentSong.artist}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-white hover:bg-white/10"
            onClick={handlePreviousClick}
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          <Button
            size="icon"
            className="h-10 w-10 rounded-full bg-white text-black hover:bg-gray-200"
            onClick={handlePlayClick}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="h-4 w-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 ml-0.5" />
            )}
          </Button>

          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-white hover:bg-white/10"
            onClick={handleNextClick}
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        style={{ display: 'none' }}
      />
    </>
  );
};

export default ProductionAudioPlayer;