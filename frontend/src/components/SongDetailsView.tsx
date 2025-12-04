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
        background: `linear-gradient(180deg, ${albumColors.primary} 0%, ${albumColors.secondary} 50%, ${albumColors.accent} 100%)`,
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-4">
        <button
          onClick={onClose}
          className="p-2 -ml-2 text-white/90 active:scale-95 transition-transform"
        >
          <ChevronDown className="h-7 w-7" strokeWidth={2.5} />
        </button>
        <span className="text-sm font-medium text-white/90">
          {currentSong.artist}
        </span>
        <button className="p-2 -mr-2 text-white/90 active:scale-95 transition-transform">
          <MoreHorizontal className="h-6 w-6" strokeWidth={2.5} />
        </button>
      </div>

      {/* Album Art - Large and centered */}
      <div className="px-6 mt-8">
        <div className="aspect-square w-full max-w-[400px] mx-auto rounded-lg overflow-hidden shadow-2xl">
          <img
            src={currentSong.imageUrl}
            alt={currentSong.title}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Song Info */}
      <div className="px-6 mt-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-white mb-2 leading-tight">
              {currentSong.title}
            </h1>
            <p className="text-lg text-white/70 font-medium">
              {currentSong.artist}
            </p>
          </div>
          <button
            onClick={handleLikeToggle}
            className="mt-1 active:scale-90 transition-transform"
          >
            <Heart
              className="h-8 w-8"
              fill={isLiked ? '#1ed760' : 'none'}
              stroke={isLiked ? '#1ed760' : 'white'}
              strokeWidth={2}
            />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-6 mt-8">
        <div
          className="relative w-full h-1.5 bg-white/20 rounded-full cursor-pointer"
          onClick={handleSeek}
          onTouchStart={handleSeek}
        >
          <div
            className="absolute h-full bg-white rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-lg transition-all"
            style={{ left: `calc(${progress}% - 7px)` }}
          />
        </div>
        <div className="flex justify-between mt-3 text-sm text-white/60 font-medium">
          <span>{formatTime(currentTime)}</span>
          <span>-{formatTime(Math.max(0, duration - currentTime))}</span>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="px-6 mt-8">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <button
            onClick={toggleShuffle}
            className={cn(
              "p-2 active:scale-90 transition-all",
              isShuffled ? "text-[#1ed760]" : "text-white/70"
            )}
          >
            <Shuffle className="h-6 w-6" strokeWidth={2} />
          </button>

          <button
            onClick={playPrevious}
            className="p-1 text-white active:scale-90 transition-transform"
          >
            <SkipBack className="h-9 w-9" strokeWidth={2.5} />
          </button>

          <button
            onClick={togglePlay}
            className="w-20 h-20 rounded-full bg-white flex items-center justify-center active:scale-95 transition-transform shadow-2xl"
          >
            {isPlaying ? (
              <Pause className="h-9 w-9 text-black" fill="black" strokeWidth={0} />
            ) : (
              <Play className="h-9 w-9 text-black ml-1" fill="black" strokeWidth={0} />
            )}
          </button>

          <button
            onClick={playNext}
            className="p-1 text-white active:scale-90 transition-transform"
          >
            <SkipForward className="h-9 w-9" strokeWidth={2.5} />
          </button>

          <button
            onClick={() => setIsRepeating(!isRepeating)}
            className={cn(
              "p-2 active:scale-90 transition-all",
              isRepeating ? "text-[#1ed760]" : "text-white/70"
            )}
          >
            <Repeat className="h-6 w-6" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="px-6 mt-10 pb-10 flex items-center justify-center gap-8 max-w-md mx-auto">
        <ShareSong
          song={currentSong}
          trigger={
            <button className="p-2 text-white/70 hover:text-white active:scale-95 transition-all">
              <Share2 className="h-5 w-5" strokeWidth={2} />
            </button>
          }
        />

        <button
          onClick={() => {
            // Open queue drawer
            window.dispatchEvent(new CustomEvent('openQueue'));
          }}
          className="p-2 text-white/70 hover:text-white active:scale-95 transition-all"
        >
          <ListMusic className="h-5 w-5" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
};

export default SongDetailsView;
