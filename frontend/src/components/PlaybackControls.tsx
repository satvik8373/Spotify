import { useEffect, useState, useRef } from 'react';
import { Heart, SkipBack, SkipForward, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { isSongLiked, addLikedSong, removeLikedSong } from '@/services/likedSongsService';

const PlaybackControls = () => {
  // Get player state and methods
  const { 
    currentSong, 
    isPlaying, 
    currentTime,
    duration,
    togglePlay,
    playNext,
    playPrevious,
    setCurrentTime,
  } = usePlayerStore();
  
  // Local state
  const [isLiked, setIsLiked] = useState(false);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Effect to get audio element reference
  useEffect(() => {
    audioRef.current = document.querySelector('audio');
  }, []);
  
  // Format time for display (mm:ss)
  const formatTime = (seconds: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  // Handle volume change
  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
    }
    setIsMuted(newVolume === 0);
  };
  
  // Handle seeking
  const handleSeek = (value: number[]) => {
    const newTime = value[0];
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };
  
  // Toggle mute
  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume / 100;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };
  
  useEffect(() => {
    if (currentSong) {
      // Check if the song is liked
      const checkLikedStatus = async () => {
        try {
          const liked = await isSongLiked(currentSong._id);
          setIsLiked(liked);
        } catch (error) {
          console.error("Error checking liked status:", error);
          setIsLiked(false);
        }
      };
      
      checkLikedStatus();
      
      const handleLikedSongsUpdated = () => {
        checkLikedStatus();
      };
      
      document.addEventListener('likedSongsUpdated', handleLikedSongsUpdated);
      return () => {
        document.removeEventListener('likedSongsUpdated', handleLikedSongsUpdated);
      };
    }
  }, [currentSong]);

  const toggleLike = async () => {
    if (!currentSong) return;
    
    try {
      // Get the song ID consistently
      const songId = currentSong._id;
      
      // Optimistically update UI
      setIsLiked(!isLiked);
      
      if (isLiked) {
        await removeLikedSong(songId);
      } else {
        await addLikedSong({
          id: songId,
          title: currentSong.title,
          artist: currentSong.artist,
          imageUrl: currentSong.imageUrl || '', 
          audioUrl: currentSong.audioUrl,
          duration: currentSong.duration || 0,
          albumName: currentSong.albumId || ''
        });
      }
      
      // Dispatch events to update all components
      document.dispatchEvent(new Event('likedSongsUpdated'));
      document.dispatchEvent(new CustomEvent('songLikeStateChanged', { 
        detail: {
          songId,
          song: currentSong,
          isLiked: !isLiked,
          timestamp: Date.now(),
          source: 'PlaybackControls'
        }
      }));
    } catch (error) {
      console.error("Error toggling like status:", error);
    }
  };

  return (
    <div className="px-2 py-2 playback-controls-glass flex flex-col">
      <div className="w-full px-2 pb-1">
        <div className="relative py-1">
          <div
            className="relative w-full group/pc-progress"
            role="slider"
            aria-label="Seek position"
            aria-valuemin={0}
            aria-valuemax={isNaN(duration) ? 0 : duration}
            aria-valuenow={isNaN(currentTime) ? 0 : currentTime}
            onClick={(e) => {
              const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
              const offsetX = e.clientX - rect.left;
              const percentage = Math.max(0, Math.min(1, offsetX / rect.width));
              const newTime = percentage * (isNaN(duration) ? 0 : duration);
              handleSeek([newTime]);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
              const touch = e.touches[0];
              if (!touch) return;
              const offsetX = touch.clientX - rect.left;
              const percentage = Math.max(0, Math.min(1, offsetX / rect.width));
              const newTime = percentage * (isNaN(duration) ? 0 : duration);
              handleSeek([newTime]);
            }}
            onTouchMove={(e) => {
              const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
              const touch = e.touches[0];
              if (!touch) return;
              const offsetX = Math.max(0, Math.min(rect.width, touch.clientX - rect.left));
              const percentage = offsetX / rect.width;
              const newTime = percentage * (isNaN(duration) ? 0 : duration);
              handleSeek([newTime]);
            }}
          >
            <div className="absolute left-0 right-0 -top-3 -bottom-3" />
            <div className="h-[3px] w-full bg-white/25 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1ed760] rounded-full"
                style={{ width: `${(isNaN(duration) || duration === 0) ? 0 : (currentTime / duration) * 100}%` }}
              />
            </div>
            <div
              className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full bg-white shadow-md ring-2 ring-[#1ed760] transition-transform duration-150 ease-out group-hover/pc-progress:scale-100 scale-95 cursor-pointer"
              style={{ left: `calc(${(isNaN(duration) || duration === 0) ? 0 : (currentTime / duration) * 100}% - 6px)` }}
              onMouseDown={(e) => {
                e.stopPropagation();
                const containerEl = (e.currentTarget as HTMLDivElement).parentElement as HTMLDivElement | null;
                const handleMouseMove = (moveEvent: MouseEvent) => {
                  const rect = containerEl?.getBoundingClientRect();
                  if (!rect) return;
                  const offsetX = Math.max(0, Math.min(rect.width, moveEvent.clientX - rect.left));
                  const percentage = offsetX / rect.width;
                  const newTime = percentage * (isNaN(duration) ? 0 : duration);
                  handleSeek([newTime]);
                };
                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                const containerEl = (e.currentTarget as HTMLDivElement).parentElement as HTMLDivElement | null;
                const handleTouchMove = (touchEvent: TouchEvent) => {
                  if (touchEvent.cancelable) touchEvent.preventDefault();
                  const rect = containerEl?.getBoundingClientRect();
                  if (!rect || touchEvent.touches.length === 0) return;
                  const touch = touchEvent.touches[0];
                  const offsetX = Math.max(0, Math.min(rect.width, touch.clientX - rect.left));
                  const percentage = offsetX / rect.width;
                  const newTime = percentage * (isNaN(duration) ? 0 : duration);
                  handleSeek([newTime]);
                };
                const handleTouchEnd = () => {
                  document.removeEventListener('touchmove', handleTouchMove as any);
                  document.removeEventListener('touchend', handleTouchEnd as any);
                };
                document.addEventListener('touchmove', handleTouchMove as any, { passive: false });
                document.addEventListener('touchend', handleTouchEnd as any);
              }}
            />
          </div>
          <div className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-b from-green-500/20 to-transparent pointer-events-none"></div>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <button
          onClick={toggleLike}
          className={`p-2 rounded-full ${isLiked ? 'text-green-500' : 'text-zinc-400 hover:text-white'}`}
          aria-label={isLiked ? "Unlike song" : "Like song"}
        >
          <Heart className={isLiked ? "fill-green-500" : ""} size={20} />
        </button>
        
        <div className="flex items-center gap-4">
          <button
            onClick={playPrevious}
            className="p-2 rounded-full text-zinc-400 hover:text-white"
            aria-label="Previous track"
          >
            <SkipBack size={20} />
          </button>
          
          <button
            onClick={togglePlay}
            className="p-3 rounded-full bg-green-500 hover:bg-green-400 text-black transition"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
          </button>
          
          <button
            onClick={playNext}
            className="p-2 rounded-full text-zinc-400 hover:text-white"
            aria-label="Next track"
          >
            <SkipForward size={20} />
          </button>
        </div>
        
        <div className="flex items-center">
          <button
            onClick={toggleMute}
            className="p-2 rounded-full text-zinc-400 hover:text-white"
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          
          <div className="relative w-24">
            <Slider
              value={[isMuted ? 0 : volume]}
              max={100}
              step={1}
              onValueChange={handleVolumeChange}
              className="w-24"
            />
            <div className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-b from-green-500/20 to-transparent pointer-events-none"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaybackControls; 