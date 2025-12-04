import React, { useEffect, useState, useRef } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useAlbumColors } from '@/hooks/useAlbumColors';
import { ShareSong } from './ShareSong';
import {
  ChevronDown,
  Heart,
  MoreHorizontal,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  ListMusic,
  Shuffle,
  Repeat,
  Share2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLikedSongsStore } from '@/stores/useLikedSongsStore';

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

  const { likedSongIds, toggleLikeSong } = useLikedSongsStore();
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isRepeating, setIsRepeating] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const albumColors = useAlbumColors(currentSong?.imageUrl);

  // Swipe handling
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);

  // Update like status
  useEffect(() => {
    if (!currentSong) return;
    const songId = (currentSong as any).id || currentSong._id;
    const liked = songId ? likedSongIds?.has(songId) : false;
    setIsLiked(liked);
  }, [currentSong, likedSongIds]);

  // Audio element sync
  useEffect(() => {
    audioRef.current = document.querySelector("audio");
    const audio = audioRef.current;
    if (!audio) return;

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

  // Swipe to close
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    if (deltaY > 0) {
      setSwipeOffset(deltaY);
    }
  };

  const handleTouchEnd = () => {
    if (swipeOffset > 150) {
      onClose();
    }
    setSwipeOffset(0);
    touchStartY.current = null;
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const offsetX = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, offsetX / rect.width));
    const newTime = percentage * duration;
    
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      if (setStoreCurrentTime) setStoreCurrentTime(newTime);
    }
  };

  const handleLikeToggle = () => {
    if (!currentSong) return;
    const songId = (currentSong as any).id || currentSong._id;
    setIsLiked(!isLiked);
    
    toggleLikeSong({
      _id: songId,
      title: currentSong.title,
      artist: currentSong.artist,
      albumId: currentSong.albumId || null,
      imageUrl: currentSong.imageUrl || '',
      audioUrl: currentSong.audioUrl,
      duration: currentSong.duration || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  };

  if (!currentSong) return null;

  const progress = (currentTime / duration) * 100 || 0;

  return (
    <div
      ref={containerRef}
      className={cn(
        'fixed inset-0 z-50 transition-transform duration-300',
        isOpen ? 'translate-y-0' : 'translate-y-full'
      )}
      style={{
        transform: isOpen ? `translateY(${swipeOffset}px)` : 'translateY(100%)',
        background: `linear-gradient(180deg, ${albumColors.primary} 0%, ${albumColors.secondary} 100%)`,
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-2">
        <button
          onClick={onClose}
          className="p-2 -ml-2 text-white active:scale-95 transition-transform"
        >
          <ChevronDown className="h-6 w-6" strokeWidth={2.5} />
        </button>
        <span className="text-sm font-semibold text-white">
          Now Playing
        </span>
        <button className="p-2 -mr-2 text-white active:scale-95 transition-transform">
          <MoreHorizontal className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </div>

      {/* Album Art - Compact */}
      <div className="px-8 mt-4">
        <div className="aspect-square w-full max-w-[360px] mx-auto rounded-lg overflow-hidden shadow-2xl">
          <img
            src={currentSong.imageUrl}
            alt={currentSong.title}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Song Info - Compact */}
      <div className="px-6 mt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white mb-1 leading-tight">
              {currentSong.title}
            </h1>
            <p className="text-base text-white/70">
              {currentSong.artist}
            </p>
          </div>
          <button
            onClick={handleLikeToggle}
            className="mt-0.5 active:scale-90 transition-transform"
          >
            <Heart
              className="h-7 w-7"
              fill={isLiked ? '#1ed760' : 'none'}
              stroke={isLiked ? '#1ed760' : 'white'}
              strokeWidth={2}
            />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-6 mt-6">
        <div
          className="relative w-full h-1 bg-white/25 rounded-full cursor-pointer"
          onClick={handleSeek}
          onTouchStart={handleSeek}
        >
          <div
            className="absolute h-full bg-white rounded-full"
            style={{ width: `${progress}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg"
            style={{ left: `calc(${progress}% - 6px)` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-white/60 font-medium">
          <span>{formatTime(currentTime)}</span>
          <span>-{formatTime(Math.max(0, duration - currentTime))}</span>
        </div>
      </div>

      {/* Controls - Compact */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <button
            onClick={toggleShuffle}
            className={cn(
              "p-2 active:scale-90 transition-all",
              isShuffled ? "text-[#1ed760]" : "text-white/70"
            )}
          >
            <Shuffle className="h-5 w-5" strokeWidth={2} />
          </button>

          <button
            onClick={playPrevious}
            className="p-1 text-white active:scale-90 transition-transform"
          >
            <SkipBack className="h-8 w-8" fill="white" strokeWidth={0} />
          </button>

          <button
            onClick={togglePlay}
            className="w-16 h-16 rounded-full bg-white flex items-center justify-center active:scale-95 transition-transform shadow-xl"
          >
            {isPlaying ? (
              <Pause className="h-7 w-7 text-black" fill="black" strokeWidth={0} />
            ) : (
              <Play className="h-7 w-7 text-black ml-0.5" fill="black" strokeWidth={0} />
            )}
          </button>

          <button
            onClick={playNext}
            className="p-1 text-white active:scale-90 transition-transform"
          >
            <SkipForward className="h-8 w-8" fill="white" strokeWidth={0} />
          </button>

          <button
            onClick={() => setIsRepeating(!isRepeating)}
            className={cn(
              "p-2 active:scale-90 transition-all",
              isRepeating ? "text-[#1ed760]" : "text-white/70"
            )}
          >
            <Repeat className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Bottom Actions - Working buttons */}
      <div className="px-8 mt-8 pb-8 flex items-center justify-between max-w-sm mx-auto">
        <button className="p-2 text-white/70 active:scale-95 transition-all">
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
          </svg>
        </button>

        <ShareSong
          song={currentSong}
          trigger={
            <button className="p-2 text-white/70 active:scale-95 transition-all">
              <Share2 className="h-5 w-5" strokeWidth={2} />
            </button>
          }
        />

        <button
          onClick={() => {
            // Open queue drawer
            window.dispatchEvent(new CustomEvent('openQueue'));
          }}
          className="p-2 text-white/70 active:scale-95 transition-all"
        >
          <ListMusic className="h-5 w-5" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
};

export default SongDetailsView;
