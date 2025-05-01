import { useEffect, useState, useRef } from 'react';
import { SkipBack, SkipForward, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { LikeButton } from '@/components/LikeButton';

const PlaybackControls = () => {
  // Get player state and methods
  const { 
    currentSong, 
    isPlaying, 
    currentTime,
    duration,
    togglePlay,
    nextSong: skipToNext,
    previousSong: skipToPrevious,
    setCurrentTime,
  } = usePlayerStore();
  
  // Local state
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

  return (
    <div className="px-2 py-2 bg-zinc-900 border-t border-zinc-800 flex flex-col">
      <div className="w-full px-2 pb-1">
        <Slider
          value={[currentTime]}
          max={duration}
          step={1}
          onValueChange={handleSeek}
          className="cursor-pointer"
        />
        <div className="flex justify-between text-xs text-zinc-400 mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        {currentSong && (
          <LikeButton 
            songId={currentSong._id} 
            song={currentSong}
            className="p-2 rounded-full" 
            fillColor="text-green-500"
            size="icon"
            showToasts={false}
          />
        )}
        
        <div className="flex items-center gap-4">
          <button
            onClick={skipToPrevious}
            className="p-2 text-zinc-400 hover:text-white"
            aria-label="Previous track"
          >
            <SkipBack size={20} />
          </button>
          
          <button
            onClick={togglePlay}
            className="p-3 bg-white rounded-full text-black hover:scale-105 transition"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
          </button>
          
          <button
            onClick={() => skipToNext()}
            className="p-2 text-zinc-400 hover:text-white"
            aria-label="Next track"
          >
            <SkipForward size={20} />
          </button>
        </div>
        
        <div className="flex items-center">
          <button
            onClick={toggleMute}
            className="p-2 text-zinc-400 hover:text-white"
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          
          <Slider
            value={[isMuted ? 0 : volume]}
            max={100}
            step={1}
            onValueChange={handleVolumeChange}
            className="w-24"
          />
        </div>
      </div>
    </div>
  );
};

export default PlaybackControls; 