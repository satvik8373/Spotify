import React, { useEffect, useState, useRef } from 'react';

import { usePlayerStore } from '@/stores/usePlayerStore';
import { usePlayerSync } from '@/hooks/usePlayerSync';
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
import './SongDetailsView.css';

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
    togglePlay,
    playNext,
    playPrevious,
    toggleShuffle,
    isShuffled,
    currentTime: storeCurrentTime,
    duration: storeDuration,
    setCurrentTime: setStoreCurrentTime
  } = usePlayerStore();

  const { currentSong, isPlaying } = usePlayerSync();

  const { likedSongIds, toggleLikeSong } = useLikedSongsStore();
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isRepeating, setIsRepeating] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [screenSize, setScreenSize] = useState({
    height: window.innerHeight,
    width: window.innerWidth,
    isLandscape: window.innerWidth > window.innerHeight
  });
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const albumColors = useAlbumColors(currentSong?.imageUrl);

  // Handle screen size changes for responsive design
  useEffect(() => {
    const handleResize = () => {
      setScreenSize({
        height: window.innerHeight,
        width: window.innerWidth,
        isLandscape: window.innerWidth > window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', () => {
      // Delay to get accurate dimensions after orientation change
      setTimeout(handleResize, 100);
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Determine responsive classes based on screen size
  const getResponsiveClasses = () => {
    const { height, isLandscape } = screenSize;
    
    if (isLandscape && height <= 500) {
      return {
        container: 'landscape-compact',
        albumArt: 'album-art-landscape',
        spacing: 'spacing-landscape',
        header: 'header-landscape',
        bottom: 'bottom-landscape',
        title: 'text-sm',
        artist: 'text-xs',
        controls: 'controls-xs',
        playButton: 'play-button-xs'
      };
    } else if (height <= 568) {
      return {
        container: '',
        albumArt: 'album-art-xs',
        spacing: 'spacing-xs',
        header: '',
        bottom: '',
        title: 'song-title-xs',
        artist: 'artist-text-xs',
        controls: 'controls-xs',
        playButton: 'play-button-xs'
      };
    } else if (height <= 600) {
      return {
        container: '',
        albumArt: 'album-art-small',
        spacing: '',
        header: '',
        bottom: '',
        title: 'song-title-small',
        artist: 'text-sm',
        controls: 'controls-small',
        playButton: 'play-button-small'
      };
    } else if (height <= 700) {
      return {
        container: '',
        albumArt: 'album-art-medium',
        spacing: '',
        header: '',
        bottom: '',
        title: 'text-lg',
        artist: 'text-sm',
        controls: '',
        playButton: ''
      };
    } else {
      return {
        container: '',
        albumArt: '',
        spacing: '',
        header: '',
        bottom: '',
        title: 'text-xl',
        artist: 'text-base',
        controls: '',
        playButton: ''
      };
    }
  };

  const responsiveClasses = getResponsiveClasses();

  // Calculate optimal album art size based on screen dimensions (Spotify-like)
  const getAlbumArtSize = () => {
    const { height, width, isLandscape } = screenSize;
    
    // Fallback for initial render or edge cases
    if (!height || !width) {
      return {
        maxWidth: '280px',
        maxHeight: '280px',
        size: 280
      };
    }
    
    // Calculate available space after UI elements
    const headerHeight = 64; // Header space
    const bottomHeight = 64; // Bottom actions space
    const songInfoHeight = isLandscape ? 60 : 80; // Song title/artist space
    const progressHeight = 60; // Progress bar space
    const controlsHeight = isLandscape ? 60 : 80; // Controls space
    const padding = 32; // Total padding
    
    const availableHeight = height - headerHeight - bottomHeight - songInfoHeight - progressHeight - controlsHeight - padding;
    const availableWidth = width - padding;
    
    // Professional sizing like Spotify - use more screen real estate on larger devices
    let maxSize;
    
    if (isLandscape && height <= 500) {
      // Compact landscape mode
      maxSize = Math.min(availableHeight * 0.8, availableWidth * 0.4, 180);
    } else if (height <= 568) {
      // iPhone SE and similar small screens
      maxSize = Math.min(availableHeight * 0.7, availableWidth * 0.75, 200);
    } else if (height <= 667) {
      // iPhone 8 and similar
      maxSize = Math.min(availableHeight * 0.8, availableWidth * 0.8, 280);
    } else if (height <= 736) {
      // iPhone 8 Plus and similar
      maxSize = Math.min(availableHeight * 0.85, availableWidth * 0.85, 320);
    } else if (height <= 812) {
      // iPhone X and similar
      maxSize = Math.min(availableHeight * 0.9, availableWidth * 0.9, 360);
    } else {
      // Large screens - use more space like Spotify
      maxSize = Math.min(availableHeight * 0.95, availableWidth * 0.9, 400);
    }
    
    // Ensure minimum size for usability
    maxSize = Math.max(maxSize, 160);
    
    return {
      maxWidth: `${maxSize}px`,
      maxHeight: `${maxSize}px`,
      size: maxSize
    };
  };

  // Get dynamic spacing based on screen size
  const getDynamicSpacing = () => {
    const { height, isLandscape } = screenSize;
    
    if (isLandscape && height <= 500) {
      return 'mb-2';
    } else if (height <= 568) {
      return 'mb-3';
    } else if (height <= 667) {
      return 'mb-4';
    } else {
      return 'mb-6';
    }
  };

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
        'fixed inset-0 z-50 transition-transform duration-300 ease-out flex flex-col song-details-view ios-height-fix',
        responsiveClasses.container,
        isOpen ? 'translate-y-0' : 'translate-y-full'
      )}
      style={{
        background: `linear-gradient(180deg, ${albumColors.primary} 0%, ${albumColors.secondary} 100%)`,
        height: screenSize.height ? `${screenSize.height}px` : '100vh',
      }}
    >
      {/* Header - Fixed height */}
      <div className={cn(
        "flex items-center justify-between p-4 pt-safe-top relative flex-shrink-0",
        responsiveClasses.header || "h-16"
      )}>
        <button
          onClick={onClose}
          className="p-2 -ml-2 text-white/90 hover:text-white active:scale-95 transition-transform touch-target"
        >
          <ChevronDown className="h-6 w-6" />
        </button>
        <span className="text-xs font-semibold text-white/70 uppercase tracking-widest">
          Now Playing
        </span>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-2 -mr-2 text-white/90 hover:text-white active:scale-95 transition-transform touch-target"
        >
          <MoreHorizontal className="h-5 w-5" />
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
                <button className="w-full px-4 py-3 text-left text-sm text-white hover:bg-white/10 transition-colors flex items-center gap-3 touch-target">
                  <ListMusic className="h-5 w-5" />
                  Add to queue
                </button>
                <ShareSong
                  song={currentSong}
                  trigger={
                    <button className="w-full px-4 py-3 text-left text-sm text-white hover:bg-white/10 transition-colors flex items-center gap-3 touch-target">
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

      {/* Main Content - Flexible layout that adapts to screen size */}
      <div className="flex-1 flex flex-col justify-center px-4 min-h-0">
        {/* Album Art - Professional responsive sizing like Spotify */}
        <div className={cn("flex-shrink-0 flex justify-center", getDynamicSpacing())}>
          <div 
            className="relative"
            style={{
              filter: `drop-shadow(0 25px 50px rgba(0,0,0,0.6))`,
            }}
          >
            <img
              src={currentSong.imageUrl}
              alt={currentSong.title}
              className="rounded-lg responsive-transition album-art-responsive"
              style={{
                maxWidth: getAlbumArtSize().maxWidth,
                maxHeight: getAlbumArtSize().maxHeight,
                width: 'auto',
                height: 'auto',
                backgroundColor: 'transparent',
                // Enhanced solid color glow effect
                boxShadow: `
                  0 0 0 2px ${albumColors.vibrant},
                  0 8px 32px rgba(0,0,0,0.4),
                  0 0 80px ${albumColors.primary}
                `,
              }}
            />
          </div>
        </div>

        {/* Song Info - Compact */}
        <div className={cn("flex-shrink-0", getDynamicSpacing())}>
          <div className="flex items-center justify-between gap-3 max-w-sm mx-auto">
            <div className="flex-1 min-w-0 overflow-hidden mr-3">
              {/* Title - PingPong Scroll */}
              <div style={{ textShadow: `0 2px 8px rgba(0,0,0,0.8), 0 0 16px ${albumColors.primary}` }}>
                <PingPongScroll
                  text={currentSong.title}
                  className={cn(
                    "font-black text-white mb-0.5 leading-tight tracking-tight py-1 responsive-transition",
                    responsiveClasses.title
                  )}
                  velocity={10}
                />
              </div>

              {/* Artist - PingPong Scroll */}
              <div style={{ textShadow: `0 1px 4px rgba(0,0,0,0.6), 0 0 8px ${albumColors.primary}` }}>
                <PingPongScroll
                  text={currentSong.artist}
                  className={cn(
                    "text-white font-medium responsive-transition",
                    responsiveClasses.artist
                  )}
                  velocity={8}
                />
              </div>
            </div>
            <LikeButton
              isLiked={isLiked}
              onToggle={handleLikeToggle}
              className="p-2 -mr-2 active:scale-90 transition-transform flex-shrink-0 touch-target"
              iconSize={screenSize.height <= 568 ? 24 : 28}
            />
          </div>
        </div>

        {/* Progress Bar - Enhanced with solid vibrant colors */}
        <div className={cn("flex-shrink-0", getDynamicSpacing())}>
          <div className="max-w-sm mx-auto">
            <div
              ref={progressRef}
              className="relative w-full py-2 cursor-pointer group touch-target"
              onClick={handleProgressClick}
              onMouseDown={handleProgressMouseDown}
              onTouchStart={handleProgressTouchStart}
            >
              <div className={cn(
                "relative w-full rounded-full transition-all",
                isDragging ? "h-1.5" : "h-1 group-hover:h-1.5"
              )}
              style={{
                backgroundColor: albumColors.muted,
              }}
              >
                <div
                  className="absolute h-full rounded-full transition-all"
                  style={{ 
                    width: `${progress}%`,
                    background: `linear-gradient(90deg, ${albumColors.lightVibrant} 0%, ${albumColors.accent} 100%)`,
                    boxShadow: `0 0 12px ${albumColors.accent}`,
                  }}
                />
                {/* Enhanced solid draggable thumb */}
                <div
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full shadow-lg transition-all",
                    isDragging ? "opacity-100 scale-110" : "opacity-0 group-hover:opacity-100"
                  )}
                  style={{ 
                    left: `${progress}%`, 
                    marginLeft: '-6px',
                    background: albumColors.lightVibrant,
                    boxShadow: `0 2px 8px rgba(0,0,0,0.4), 0 0 0 2px ${albumColors.accent}`,
                  }}
                />
              </div>
            </div>
            <div className="flex justify-between mt-1 text-xs text-white">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>

        {/* Controls - Enhanced with professional colors */}
        <div className={cn("flex-shrink-0", getDynamicSpacing())}>
          <div className={cn("max-w-sm mx-auto flex items-center justify-between", responsiveClasses.controls)}>
            <button
              onClick={toggleShuffle}
              className={cn(
                "p-2 active:scale-90 transition-all flex-shrink-0 touch-target control-button rounded-full",
                isShuffled ? "text-white" : "text-white/70"
              )}
              style={{
                backgroundColor: isShuffled ? `${albumColors.accent}40` : 'transparent',
                boxShadow: isShuffled ? `0 0 12px ${albumColors.accent}30` : 'none',
              }}
            >
              <Shuffle className="h-5 w-5" />
            </button>

            <button
              onClick={playPrevious}
              className="p-2 text-white active:scale-90 transition-all flex-shrink-0 touch-target control-button rounded-full"
              style={{ backgroundColor: albumColors.muted }}
            >
              <SkipBack className="h-6 w-6" fill="white" />
            </button>

            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Ensure user interaction is registered
                const store = usePlayerStore.getState();
                store.setUserInteracted();
                togglePlay();
              }}
              onTouchStart={(e) => {
                e.preventDefault();
              }}
              className={cn(
                "rounded-full flex items-center justify-center active:scale-95 transition-all shadow-xl flex-shrink-0 touch-target",
                responsiveClasses.playButton || "w-12 h-12"
              )}
              style={{
                background: albumColors.lightVibrant && albumColors.accent 
                  ? `linear-gradient(135deg, ${albumColors.lightVibrant} 0%, ${albumColors.accent} 100%)`
                  : 'linear-gradient(135deg, #1ed760 0%, #1db954 100%)', // Spotify green fallback
                boxShadow: albumColors.accent 
                  ? `0 4px 16px rgba(0,0,0,0.4), 0 0 24px ${albumColors.accent}`
                  : '0 4px 16px rgba(0,0,0,0.4), 0 0 24px #1ed760',
                position: 'relative',
                zIndex: 10,
              }}
            >
              {isPlaying ? (
                <Pause className="h-6 w-6 text-black" fill="black" />
              ) : (
                <Play className="h-6 w-6 text-black ml-0.5" fill="black" />
              )}
            </button>

            <button
              onClick={playNext}
              className="p-2 text-white active:scale-90 transition-all flex-shrink-0 touch-target control-button rounded-full hover:bg-white/10"
            >
              <SkipForward className="h-6 w-6" fill="white" />
            </button>

            <button
              onClick={() => setIsRepeating(!isRepeating)}
              className={cn(
                "p-2 active:scale-90 transition-all flex-shrink-0 touch-target control-button rounded-full",
                isRepeating ? "text-white" : "text-white/70"
              )}
              style={{
                backgroundColor: isRepeating ? `${albumColors.accent}40` : 'transparent',
                boxShadow: isRepeating ? `0 0 12px ${albumColors.accent}30` : 'none',
              }}
            >
              <Repeat className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Actions - Fixed height */}
      <div className={cn(
        "px-4 pb-safe-bottom flex items-center justify-center flex-shrink-0",
        responsiveClasses.bottom || "h-16"
      )}>
        <div className="flex items-center justify-center gap-12">
          <button
            onClick={() => setShowQueue(!showQueue)}
            className="flex flex-col items-center gap-1 text-white/70 hover:text-white active:scale-95 transition-all touch-target"
          >
            <ListMusic className="h-5 w-5" />
            <span className="text-xs font-medium">Queue</span>
          </button>

          <ShareSong
            song={currentSong}
            trigger={
              <button className="flex flex-col items-center gap-1 text-white/70 hover:text-white active:scale-95 transition-all touch-target">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span className="text-xs font-medium">Share</span>
              </button>
            }
          />
        </div>
      </div>
    </div>
  );
};

export default SongDetailsView;
