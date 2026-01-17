import React, { useEffect, useState, useRef } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useAlbumColors } from '@/hooks/useAlbumColors';
import { ShareSong } from './ShareSong';
import {
  ChevronDown,
  MoreHorizontal,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  ListMusic,
  Shuffle,
  Repeat
} from 'lucide-react';
import { LikeButton } from './LikeButton';
import { PingPongScroll } from './PingPongScroll';
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
  const [showQueue, setShowQueue] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const albumColors = useAlbumColors(currentSong?.imageUrl);

  // Update like status
  useEffect(() => {
    if (!currentSong) return;
    const id = (currentSong as any).id;
    const _id = currentSong._id;
    const liked = (id && likedSongIds?.has(id)) || (_id && likedSongIds?.has(_id));
    setIsLiked(!!liked);
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

  const handleSeek = (clientX: number, rect: DOMRect) => {
    const offsetX = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, offsetX / rect.width));
    const newTime = percentage * duration;

    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      if (setStoreCurrentTime) setStoreCurrentTime(newTime);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    handleSeek(e.clientX, rect);
  };

  const handleProgressMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    handleSeek(e.clientX, rect);
  };

  const handleProgressTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    handleSeek(touch.clientX, rect);
  };

  // Handle dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !progressRef.current) return;
      const rect = progressRef.current.getBoundingClientRect();
      handleSeek(e.clientX, rect);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || !progressRef.current) return;
      const touch = e.touches[0];
      const rect = progressRef.current.getBoundingClientRect();
      handleSeek(touch.clientX, rect);
    };

    const handleEnd = () => setIsDragging(false);

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleEnd);
      document.addEventListener('touchcancel', handleEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
      document.removeEventListener('touchcancel', handleEnd);
    };
  }, [isDragging]);

  const handleLikeToggle = () => {
    if (!currentSong) return;
    const songId = (currentSong as any).id || currentSong._id;
    
    // Optimistically update the UI immediately
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
      updatedAt: new Date().toISOString(),
      likedAt: new Date().toISOString()
    });
  };

  if (!currentSong) return null;

  const progress = (currentTime / duration) * 100 || 0;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 transition-transform duration-300 ease-out flex flex-col',
        isOpen ? 'translate-y-0' : 'translate-y-full'
      )}
      style={{
        background: `linear-gradient(180deg, ${albumColors.primary} 0%, ${albumColors.secondary} 100%)`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 pt-6 sm:pt-8 relative flex-shrink-0">
        <button
          onClick={onClose}
          className="p-2 -ml-2 text-white/90 hover:text-white active:scale-95 transition-transform"
        >
          <ChevronDown className="h-6 w-6 sm:h-7 sm:w-7" />
        </button>
        <span className="text-xs sm:text-sm font-semibold text-white/70 uppercase tracking-widest">
          Now Playing
        </span>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-2 -mr-2 text-white/90 hover:text-white active:scale-95 transition-transform"
        >
          <MoreHorizontal className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>

        {/* Dropdown Menu */}
        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute top-14 right-4 w-56 bg-[#282828] rounded-lg shadow-2xl z-50 overflow-hidden">
              <div className="py-2">
                <button className="w-full px-4 py-3 text-left text-sm text-white hover:bg-white/10 transition-colors flex items-center gap-3">
                  <ListMusic className="h-5 w-5" />
                  Add to queue
                </button>
                <ShareSong
                  song={currentSong}
                  trigger={
                    <button className="w-full px-4 py-3 text-left text-sm text-white hover:bg-white/10 transition-colors flex items-center gap-3">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      Share
                    </button>
                  }
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* Album Art */}
        <div className="px-4 sm:px-6 mt-4 sm:mt-6 md:mt-8">
          <div className="aspect-square w-full max-w-md mx-auto rounded-lg overflow-hidden shadow-2xl">
            <img
              src={currentSong.imageUrl}
              alt={currentSong.title}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Song Info */}
        <div className="px-4 sm:px-6 mt-6 sm:mt-8">
          <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
            <div className="flex-1 min-w-0 overflow-hidden mr-3">
              {/* Title - PingPong Scroll */}
              <PingPongScroll
                text={currentSong.title}
                className="text-xl sm:text-2xl font-black text-white mb-0.5 leading-normal tracking-tight py-1"
                velocity={10}
              />

              {/* Artist - PingPong Scroll */}
              <PingPongScroll
                text={currentSong.artist}
                className="text-sm sm:text-base text-white/70 font-medium"
                velocity={8}
              />
            </div>
            <LikeButton
              isLiked={isLiked}
              onToggle={handleLikeToggle}
              className="p-2 -mr-2 active:scale-90 transition-transform flex-shrink-0"
              iconSize={window.innerWidth < 640 ? 32 : 40}
            />
          </div>
        </div>

        {/* Progress Bar - Enhanced with Drag Support */}
        <div className="px-4 sm:px-6 mt-6 sm:mt-8">
          <div className="max-w-md mx-auto">
            <div
              ref={progressRef}
              className="relative w-full py-3 sm:py-4 cursor-pointer group"
              onClick={handleProgressClick}
              onMouseDown={handleProgressMouseDown}
              onTouchStart={handleProgressTouchStart}
            >
              <div className={cn(
                "relative w-full bg-white/30 rounded-full transition-all",
                isDragging ? "h-1.5" : "h-1 group-hover:h-1.5"
              )}>
                <div
                  className="absolute h-full bg-white rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
                {/* Draggable thumb - shows on hover or drag */}
                <div
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg transition-opacity",
                    isDragging ? "opacity-100 scale-110" : "opacity-0 group-hover:opacity-100"
                  )}
                  style={{ left: `${progress}%`, marginLeft: '-6px' }}
                />
              </div>
            </div>
            <div className="flex justify-between mt-1 text-xs sm:text-sm text-white/60">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="px-4 sm:px-6 mt-6 sm:mt-8">
          <div className="max-w-md mx-auto flex items-center justify-between mb-6 sm:mb-8">
            <button
              onClick={toggleShuffle}
              className={cn(
                "p-2 active:scale-90 transition-all flex-shrink-0",
                isShuffled ? "text-[#1ed760]" : "text-white/70"
              )}
            >
              <Shuffle className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>

            <button
              onClick={playPrevious}
              className="p-2 text-white active:scale-90 transition-transform flex-shrink-0"
            >
              <SkipBack className="h-7 w-7 sm:h-8 sm:w-8" fill="white" />
            </button>

            <button
              onClick={togglePlay}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white flex items-center justify-center active:scale-95 transition-transform shadow-xl flex-shrink-0"
            >
              {isPlaying ? (
                <Pause className="h-7 w-7 sm:h-8 sm:w-8 text-black" fill="black" />
              ) : (
                <Play className="h-7 w-7 sm:h-8 sm:w-8 text-black ml-1" fill="black" />
              )}
            </button>

            <button
              onClick={playNext}
              className="p-2 text-white active:scale-90 transition-transform flex-shrink-0"
            >
              <SkipForward className="h-7 w-7 sm:h-8 sm:w-8" fill="white" />
            </button>

            <button
              onClick={() => setIsRepeating(!isRepeating)}
              className={cn(
                "p-2 active:scale-90 transition-all flex-shrink-0",
                isRepeating ? "text-[#1ed760]" : "text-white/70"
              )}
            >
              <Repeat className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Actions - Fixed */}
      <div className="px-4 sm:px-6 pb-6 sm:pb-8 flex items-center justify-between flex-shrink-0">
        <div className="max-w-md mx-auto w-full flex items-center justify-between">
          <button
            onClick={() => setShowQueue(!showQueue)}
            className="flex flex-col items-center gap-1 text-white/70 hover:text-white active:scale-95 transition-all"
          >
            <ListMusic className="h-5 w-5 sm:h-6 sm:w-6" />
            <span className="text-xs font-medium">Queue</span>
          </button>

          <ShareSong
            song={currentSong}
            trigger={
              <button className="flex flex-col items-center gap-1 text-white/70 hover:text-white active:scale-95 transition-all">
                <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span className="text-xs font-medium">Share</span>
              </button>
            }
          />
        </div>
      </div>
    </div >
  );
};

export default SongDetailsView;
