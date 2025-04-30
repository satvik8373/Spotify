import React, { useEffect, useState } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { Button } from './ui/button';
import { ChevronDown, Heart, MoreHorizontal, Share2, Shuffle, SkipBack, Play, Pause, SkipForward, Repeat, ListMusic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Slider } from './ui/slider';
import { useLikedSongsStore } from '@/stores/useLikedSongsStore';
import { toast } from 'sonner';

interface SongDetailsViewProps {
  isOpen: boolean;
  onClose: () => void;
}

const formatTime = (seconds: number) => {
  if (isNaN(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const SongDetailsView = ({ isOpen, onClose }: SongDetailsViewProps) => {
  const { 
    currentSong, 
    isPlaying, 
    togglePlay, 
    playNext, 
    playPrevious,
    toggleShuffle,
    isShuffled,
    currentTime: storeCurrentTime,
    duration: storeDuration,
    setCurrentTime: setStoreCurrentTime
  } = usePlayerStore();
  
  const { likedSongIds, toggleLikeSong, loadLikedSongs } = useLikedSongsStore();
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isRepeating, setIsRepeating] = useState(false);
  const [albumArtLoaded, setAlbumArtLoaded] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  // Make sure liked songs are loaded
  useEffect(() => {
    loadLikedSongs();
  }, [loadLikedSongs]);
  
  // Get liked state from the liked songs store if possible
  const songId = currentSong ? ((currentSong as any).id || currentSong._id) : null;
  const isLiked = songId ? likedSongIds?.has(songId) : false;

  useEffect(() => {
    audioRef.current = document.querySelector("audio");
    
    const audio = audioRef.current;
    if (!audio) return;

    // Initial values
    setCurrentTime(storeCurrentTime || audio.currentTime);
    setDuration(storeDuration || audio.duration);

    const updateTime = () => {
      setCurrentTime(audio.currentTime);
      if (setStoreCurrentTime) setStoreCurrentTime(audio.currentTime);
    };
    
    const updateDuration = () => {
      if (!isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
    };
  }, [currentSong, storeCurrentTime, storeDuration, setStoreCurrentTime]);

  // Listen for like updates from other components
  useEffect(() => {
    const handleLikeUpdate = () => {
      // Force re-render to reflect updated like status
      setCurrentTime(prev => prev);
    };
    
    document.addEventListener('likedSongsUpdated', handleLikeUpdate);
    return () => {
      document.removeEventListener('likedSongsUpdated', handleLikeUpdate);
    };
  }, []);

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
      if (setStoreCurrentTime) setStoreCurrentTime(value[0]);
    }
  };

  const handleLikeToggle = () => {
    if (currentSong) {
      toggleLikeSong(currentSong);
    }
  };

  const handleShare = () => {
    if (!currentSong) return;
    
    const shareText = `Check out ${currentSong.title} by ${currentSong.artist}`;
    
    if (navigator.share) {
      navigator.share({
        title: currentSong.title,
        text: shareText,
        url: window.location.href,
      }).catch(error => {
        console.error('Error sharing:', error);
      });
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(`${shareText} - ${window.location.href}`);
      toast.success('Link copied to clipboard');
    }
  };

  const toggleRepeat = () => {
    setIsRepeating(!isRepeating);
  };

  if (!currentSong) return null;

  const progress = (currentTime / duration) * 100 || 0;
  const vibrantColor = 'rgba(22, 163, 74, 0.9)'; // Green color

  return (
    <div
      className={cn(
        'fixed inset-0 bg-gradient-to-b from-black via-zinc-900/90 to-black z-50 transition-transform duration-500 flex flex-col',
        isOpen ? 'translate-y-0' : 'translate-y-full'
      )}
    >
      {/* Header */}
      <div className="safe-area-top flex items-center justify-between p-4 pt-8">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10"
          onClick={onClose}
        >
          <ChevronDown className="h-6 w-6" />
        </Button>
        <span className="text-sm font-medium text-white">Now Playing</span>
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
          <MoreHorizontal className="h-6 w-6" />
        </Button>
      </div>

      {/* Album Art */}
      <div className="px-8 mt-4 flex-shrink-0">
        <div className={cn(
          "aspect-square w-full rounded-lg overflow-hidden shadow-2xl relative transition-all duration-700",
          albumArtLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95"
        )}>
          <img
            src={currentSong.imageUrl}
            alt={currentSong.title}
            className="w-full h-full object-cover"
            onLoad={() => setAlbumArtLoaded(true)}
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://cdn.iconscout.com/icon/free/png-256/free-music-1779799-1513951.png';
              setAlbumArtLoaded(true);
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20"></div>
        </div>
      </div>

      {/* Song Info */}
      <div className="px-6 mt-8 flex-1">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h1 className="text-2xl font-bold truncate text-white">{currentSong.title}</h1>
            <p className="text-sm text-zinc-300 mt-1">{currentSong.artist}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'text-white hover:bg-white/10',
              isLiked && 'text-green-500'
            )}
            onClick={handleLikeToggle}
          >
            <Heart
              className="h-6 w-6"
              fill={isLiked ? 'currentColor' : 'none'}
            />
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="mt-8">
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={1}
            className="w-full cursor-pointer"
            onValueChange={handleSeek}
          />
          <div className="flex justify-between mt-2">
            <span className="text-xs text-zinc-400">{formatTime(currentTime)}</span>
            <span className="text-xs text-zinc-400">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="mt-6">
          <div className="flex items-center justify-center gap-6">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "hover:bg-white/10",
                isShuffled ? "text-green-500" : "text-zinc-400"
              )}
              onClick={toggleShuffle}
            >
              <Shuffle className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={playPrevious}
            >
              <SkipBack className="h-6 w-6" />
            </Button>
            <Button
              size="icon"
              className="bg-white hover:bg-white/90 text-black rounded-full h-16 w-16 transition-transform hover:scale-105"
              onClick={togglePlay}
            >
              {isPlaying ? (
                <Pause className="h-8 w-8" />
              ) : (
                <Play className="h-8 w-8 ml-1" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={playNext}
            >
              <SkipForward className="h-6 w-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "hover:bg-white/10",
                isRepeating ? "text-green-500" : "text-zinc-400"
              )}
              onClick={toggleRepeat}
            >
              <Repeat className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {/* Additional Controls */}
        <div className="flex justify-around mt-8 mb-6">
          <Button
            variant="ghost"
            size="sm"
            className="text-zinc-400 hover:text-white hover:bg-white/10 flex flex-col items-center gap-1"
            onClick={handleShare}
          >
            <Share2 className="h-5 w-5" />
            <span className="text-xs">Share</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-zinc-400 hover:text-white hover:bg-white/10 flex flex-col items-center gap-1"
          >
            <ListMusic className="h-5 w-5" />
            <span className="text-xs">Queue</span>
          </Button>
        </div>

        {/* Safe Area for iOS devices */}
        <div className="h-safe-area-bottom"></div>
      </div>
    </div>
  );
};

export default SongDetailsView; 