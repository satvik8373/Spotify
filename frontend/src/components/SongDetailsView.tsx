import React, { useEffect, useState, useRef } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { Button } from './ui/button';
import { useAlbumColors } from '@/hooks/useAlbumColors';
import { 
  ChevronDown, 
  Heart, 
  MoreHorizontal, 
  Share2, 
  SkipBack, 
  Play, 
  Pause, 
  SkipForward, 
  ListMusic,
  Plus,
  Trash2,
  User,
  Radio,
  X
} from 'lucide-react';
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

// Create a new component for marquee text animation with automatic scrolling
const AutoScrollMarquee = ({ text, className }: { text: string, className?: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [shouldScroll, setShouldScroll] = useState(false);
  const [scrollDistance, setScrollDistance] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  
  // Detect mobile devices
  useEffect(() => {
    const checkMobile = () => {
      // Check for mobile devices based on screen width and touch capability
      const isMobileDevice = window.innerWidth < 768 || 
        ('ontouchstart' in window) || 
        (navigator.maxTouchPoints > 0);
      setIsMobile(isMobileDevice);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Check if text is overflowing and needs animation
  useEffect(() => {
    if (containerRef.current && textRef.current) {
      const container = containerRef.current;
      const textEl = textRef.current;
      
      // Check if text overflows its container
      const isOverflowing = textEl.scrollWidth > container.clientWidth;
      
      // Calculate scroll distance if needed
      if (isOverflowing) {
        const distance = -(textEl.scrollWidth - container.clientWidth);
        setScrollDistance(distance);
        setShouldScroll(true);
      } else {
        setShouldScroll(false);
      }
    }
  }, [text]);
  
  return (
    <div 
      ref={containerRef}
      className={cn("text-auto-scroll", className)}
    >
      <div
        ref={textRef}
        className={cn(
          "text-auto-scroll-inner",
          shouldScroll && (isMobile ? true : "hover:scrolling") && "scrolling"
        )}
        style={
          shouldScroll ? {
            '--max-scroll': `${scrollDistance}px`
          } as React.CSSProperties : 
          undefined
        }
      >
        {text}
      </div>
    </div>
  );
};

const SongDetailsView = ({ isOpen, onClose }: SongDetailsViewProps) => {
  const { 
    currentSong, 
    isPlaying, 
    togglePlay, 
    playNext, 
    playPrevious,
    currentTime: storeCurrentTime,
    duration: storeDuration,
    setCurrentTime: setStoreCurrentTime
  } = usePlayerStore();
  
  const { likedSongIds, toggleLikeSong, loadLikedSongs } = useLikedSongsStore();
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [albumArtLoaded, setAlbumArtLoaded] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const albumColors = useAlbumColors(currentSong?.imageUrl);
  
  // Swipe handling
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const albumArtRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [swipingDirection, setSwipingDirection] = useState<'none' | 'vertical' | 'horizontal'>('none');
  const [swipeOffset, setSwipeOffset] = useState({ x: 0, y: 0 });
  const [swipeSource, setSwipeSource] = useState<'albumArt' | 'container' | 'progressBar'>('container');
  
  // Options menu state
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Close options menu when song details view closes
  useEffect(() => {
    if (!isOpen) {
      setShowOptionsMenu(false);
    }
  }, [isOpen]);
  
  // Handle click outside to close the menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowOptionsMenu(false);
      }
    };
    
    if (showOptionsMenu) {
      // Delay the event listener to prevent immediate closing
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 10);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showOptionsMenu]);
  
  // Handle touch start for swipe detection
  const handleTouchStart = (e: React.TouchEvent, source: 'albumArt' | 'container' | 'progressBar') => {
    if (!isOpen) return;
    
    // Store the touch source to handle different behaviors
    setSwipeSource(source);
    
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
    setSwipingDirection('none');
    
    // If touch starting on progress bar, don't prevent default to allow seeking
    if (source !== 'progressBar') {
      e.preventDefault();
    }
  };
  
  // Handle touch move for swipe detection
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isOpen || touchStartY.current === null || touchStartX.current === null) return;
    
    const touchY = e.touches[0].clientY;
    const touchX = e.touches[0].clientX;
    const deltaY = touchY - touchStartY.current;
    const deltaX = touchX - touchStartX.current;
    
    // For progress bar, don't handle horizontal swipes
    if (swipeSource === 'progressBar') {
      return;
    }
    
    // Determine swipe direction if not already set
    if (swipingDirection === 'none') {
      if (Math.abs(deltaY) > Math.abs(deltaX) + 10) {
        setSwipingDirection('vertical');
      } else if (Math.abs(deltaX) > Math.abs(deltaY) + 10) {
        setSwipingDirection('horizontal');
      }
    }
    
    // Apply appropriate transformations based on swipe direction and source
    if (swipingDirection === 'vertical') {
      // Only allow downward swipes to close
      if (deltaY > 0) {
        setSwipeOffset({ x: 0, y: deltaY });
      }
    } else if (swipingDirection === 'horizontal') {
      // Only allow horizontal swipes on the album art
      if (swipeSource === 'albumArt') {
        setSwipeOffset({ x: deltaX, y: 0 });
      }
    }
  };
  
  // Handle touch end for swipe completion
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isOpen || touchStartY.current === null || touchStartX.current === null) return;
    
    if (swipingDirection === 'vertical') {
      // If swiped down more than 150px, close the view
      if (swipeOffset.y > 150) {
        onClose();
      }
    } else if (swipingDirection === 'horizontal' && swipeSource === 'albumArt') {
      // If swiped left/right more than a threshold, change the song
      if (swipeOffset.x < -80) {
        playNext();
      } else if (swipeOffset.x > 80) {
        playPrevious();
      }
    }
    
    // Reset swipe state
    touchStartY.current = null;
    touchStartX.current = null;
    setSwipeOffset({ x: 0, y: 0 });
    setSwipingDirection('none');
  };

  // Make sure liked songs are loaded
  useEffect(() => {
    loadLikedSongs();
  }, [loadLikedSongs]);
  
  // Update like status whenever the current song or likedSongIds changes
  useEffect(() => {
    if (!currentSong) return;
    
    // Check if the song is liked by checking both possible ID formats
    const songId = (currentSong as any).id || currentSong._id;
    const liked = songId ? likedSongIds?.has(songId) : false;
    
    setIsLiked(liked);
  }, [currentSong, likedSongIds]);

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

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
      if (setStoreCurrentTime) setStoreCurrentTime(value[0]);
    }
  };

  const handleLikeToggle = () => {
    if (!currentSong) return;
    
    // Get the song ID consistently
    const songId = (currentSong as any).id || currentSong._id;
    
    // Optimistically update the UI immediately
    setIsLiked(!isLiked);
    
    // Perform the actual toggle with the correct song format
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
    
    // Also dispatch a direct event for immediate notification
    document.dispatchEvent(new CustomEvent('songLikeStateChanged', { 
      detail: {
        songId,
        song: currentSong,
        isLiked: !isLiked,
        timestamp: Date.now(),
        source: 'SongDetails'
      }
    }));
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
        // Silent error handling
      });
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(`${shareText} - ${window.location.href}`);
      toast.success('Link copied to clipboard');
    }
  };

  if (!currentSong) return null;

  const progress = (currentTime / duration) * 100 || 0;
  const vibrantColor = 'rgba(22, 163, 74, 0.9)'; // Green color

  return (
    <div
      ref={containerRef}
      className={cn(
        'fixed inset-0 z-50 transition-transform duration-500 flex flex-col',
        isOpen ? 'translate-y-0' : 'translate-y-full'
      )}
      style={{ 
        transform: isOpen 
          ? `translateY(${swipeOffset.y}px)` 
          : 'translateY(100%)',
        background: albumColors.isLight
          ? `linear-gradient(to bottom, ${albumColors.primary}, ${albumColors.secondary})`
          : `linear-gradient(to bottom, ${albumColors.primary}, ${albumColors.secondary})`,
      }}
      onTouchStart={(e) => handleTouchStart(e, 'container')}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="safe-area-top flex items-center justify-between p-4 pt-6 relative z-20">
        <Button
          variant="ghost"
          size="icon"
          className="liquid-glass-button text-white/70 hover:text-white"
          onClick={onClose}
        >
          <ChevronDown className="h-6 w-6" />
        </Button>
        <span className="text-[13px] font-medium text-white/80 uppercase tracking-wide">Now Playing</span>
        <Button 
          variant="ghost" 
          size="icon" 
          className="liquid-glass-button text-white/70 hover:text-white"
          onClick={(e) => {
            e.stopPropagation();
            setShowOptionsMenu(!showOptionsMenu);
          }}
        >
          <MoreHorizontal className="h-5 w-5" />
        </Button>
        
        {/* Options Menu */}
        {showOptionsMenu && (
          <div 
            ref={menuRef}
            className="absolute top-16 right-4 w-64 bg-[#282828] rounded-md shadow-xl z-50 overflow-hidden"
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            {/* Song info at top of menu */}
            <div className="flex items-center gap-3 p-3 border-b border-white/10">
              <img 
                src={currentSong.imageUrl} 
                alt={currentSong.title}
                className="h-10 w-10 object-cover rounded-sm" 
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-white truncate">{currentSong.title}</h4>
                <p className="text-xs text-white/60 truncate">{currentSong.artist}</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-white/60 hover:bg-white/10"
                onClick={() => setShowOptionsMenu(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-1">
              <button
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-white hover:bg-white/10 text-left rounded-sm"
                onClick={() => {
                  setShowOptionsMenu(false);
                }}
              >
                <Plus className="h-5 w-5 text-white/60" />
                <span>Add to playlist</span>
              </button>
              
              <button
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-white hover:bg-white/10 text-left rounded-sm"
                onClick={() => {
                  setShowOptionsMenu(false);
                }}
              >
                <Trash2 className="h-5 w-5 text-white/60" />
                <span>Remove from this playlist</span>
              </button>
              
              <button
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-white hover:bg-white/10 text-left rounded-sm"
                onClick={() => {
                  setShowOptionsMenu(false);
                }}
              >
                <ListMusic className="h-5 w-5 text-white/60" />
                <span>Add to queue</span>
              </button>
              
              <button
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-white hover:bg-white/10 text-left rounded-sm"
                onClick={() => {
                  setShowOptionsMenu(false);
                }}
              >
                <User className="h-5 w-5 text-white/60" />
                <span>Go to artist</span>
              </button>
              
              <button
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-white hover:bg-white/10 text-left rounded-sm"
                onClick={() => {
                  handleShare();
                  setShowOptionsMenu(false);
                }}
              >
                <Share2 className="h-5 w-5 text-white/60" />
                <span>Share</span>
              </button>
              
              <button
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-white hover:bg-white/10 text-left rounded-sm"
                onClick={() => {
                  setShowOptionsMenu(false);
                }}
              >
                <Radio className="h-5 w-5 text-white/60" />
                <span>Start radio</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content area with flex to ensure proper spacing */}
      <div className="flex-1 flex flex-col px-6 overflow-hidden">
        {/* Album Art with swipe gestures */}
        <div className="mt-2 flex-shrink-0">
          <div 
            ref={albumArtRef}
            className={cn(
              "liquid-glass-album aspect-square w-full overflow-hidden shadow-2xl relative transition-all duration-300 touch-none",
              albumArtLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95"
            )}
            style={{
              transform: swipingDirection === 'horizontal' && swipeSource === 'albumArt'
                ? `translateX(${swipeOffset.x}px)` 
                : 'translateX(0)'
            }}
            onTouchStart={(e) => {
              // Stop propagation to prevent container's touch handler
              e.stopPropagation();
              handleTouchStart(e, 'albumArt');
            }}
            onTouchMove={(e) => {
              e.stopPropagation();
              handleTouchMove(e);
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              handleTouchEnd(e);
            }}
          >
            {/* Left/Right swipe indicators */}
            {swipingDirection === 'horizontal' && swipeSource === 'albumArt' && (
              <>
                {swipeOffset.x > 50 && (
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 liquid-glass-button p-3 z-10">
                    <SkipBack className="h-6 w-6 text-white" />
                  </div>
                )}
                {swipeOffset.x < -50 && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 liquid-glass-button p-3 z-10">
                    <SkipForward className="h-6 w-6 text-white" />
                  </div>
                )}
              </>
            )}

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
            
            {/* Down swipe indicator */}
            {swipingDirection === 'vertical' && swipeOffset.y > 30 && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 liquid-glass-button p-3 z-10">
                <ChevronDown className="h-6 w-6 text-white" />
              </div>
            )}
          </div>
        </div>

        {/* Song Info */}
        <div className="mt-6 flex-1 flex flex-col min-h-0">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              {/* Song title with marquee effect for long titles */}
              <AutoScrollMarquee
                text={currentSong.title || 'Unknown Title'}
                className="text-2xl md:text-3xl font-bold mb-1"
              />
              
              {/* Artist name with marquee effect */}
              <AutoScrollMarquee
                text={currentSong.artist || 'Unknown Artist'}
                className="text-lg text-white/70"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="liquid-glass-button text-white/80 hover:text-white"
              onClick={handleLikeToggle}
            >
              <Heart
                className="h-5 w-5"
                fill={isLiked ? '#1ed760' : 'none'}
                color={isLiked ? '#1ed760' : 'white'}
              />
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div 
              ref={progressBarRef}
              className="h-1 w-full bg-white/20 rounded-full overflow-hidden relative"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const offsetX = e.clientX - rect.left;
                const percentage = offsetX / rect.width;
                const newTime = percentage * duration;
                handleSeek([newTime]);
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                // Mark this as progress bar touch to prevent song change
                handleTouchStart(e, 'progressBar');
                
                const rect = e.currentTarget.getBoundingClientRect();
                const touch = e.touches[0];
                if (!touch) return;
                
                const offsetX = touch.clientX - rect.left;
                const percentage = Math.max(0, Math.min(1, offsetX / rect.width));
                const newTime = percentage * duration;
                handleSeek([newTime]);
              }}
            >
              <div 
                className="h-full bg-[#1ed760] rounded-full"
                style={{ width: `${progress}%` }}
              ></div>
              <div 
                className="absolute top-1/2 -translate-y-1/2 h-3 w-3 bg-white rounded-full shadow-md cursor-pointer" 
                style={{ left: `calc(${progress}% - 6px)` }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  
                  // Drag handling logic
                  const handleMouseMove = (moveEvent: MouseEvent) => {
                    const rect = e.currentTarget.parentElement?.getBoundingClientRect();
                    if (!rect) return;
                    
                    const offsetX = moveEvent.clientX - rect.left;
                    const percentage = Math.max(0, Math.min(1, offsetX / rect.width));
                    const newTime = percentage * duration;
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
                  
                  // Touch handling logic
                  const handleTouchMove = (touchEvent: TouchEvent) => {
                    touchEvent.preventDefault();
                    
                    const rect = e.currentTarget.parentElement?.getBoundingClientRect();
                    if (!rect || !touchEvent.touches[0]) return;
                    
                    const touch = touchEvent.touches[0];
                    const offsetX = touch.clientX - rect.left;
                    const percentage = Math.max(0, Math.min(1, offsetX / rect.width));
                    const newTime = percentage * duration;
                    handleSeek([newTime]);
                  };
                  
                  const handleTouchEnd = () => {
                    document.removeEventListener('touchmove', handleTouchMove);
                    document.removeEventListener('touchend', handleTouchEnd);
                  };
                  
                  document.addEventListener('touchmove', handleTouchMove, { passive: false });
                  document.addEventListener('touchend', handleTouchEnd);
                }}
              ></div>
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-xs text-white/60">{formatTime(currentTime)}</span>
              <span className="text-xs text-white/60">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="mt-6">
            <div className="flex items-center justify-center gap-10">
              <Button
                variant="ghost"
                size="icon"
                className="liquid-glass-button text-white"
                onClick={playPrevious}
              >
                <SkipBack className="h-7 w-7" />
              </Button>
              <Button
                size="icon"
                className="liquid-glass-primary h-14 w-14 transition-transform active:scale-95 flex items-center justify-center"
                onClick={togglePlay}
              >
                {isPlaying ? (
                  <Pause className="h-7 w-7" />
                ) : (
                  <Play className="h-7 w-7 translate-x-0.5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="liquid-glass-button text-white"
                onClick={playNext}
              >
                <SkipForward className="h-7 w-7" />
              </Button>
            </div>
          </div>
          
          {/* Spacer to push bottom controls down */}
          <div className="flex-1 min-h-[60px]"></div>
          
          {/* Additional Controls - Fixed to bottom */}
          <div className="flex justify-around pb-8 pt-4 w-full">
            <Button
              variant="ghost"
              size="sm"
              className="liquid-glass-button text-white/70 hover:text-white flex flex-col items-center gap-1"
              onClick={handleShare}
            >
              <Share2 className="h-5 w-5" />
              <span className="text-[11px] font-medium">Share</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm" 
              className="liquid-glass-button text-white/70 hover:text-white flex flex-col items-center gap-1"
            >
              <ListMusic className="h-5 w-5" />
              <span className="text-[11px] font-medium">Queue</span>
            </Button>
          </div>

          {/* Safe Area for iOS devices */}
          <div className="h-safe-area-bottom"></div>
        </div>
      </div>
    </div>
  );
};

export default SongDetailsView; 