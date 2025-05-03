import React, { useEffect, useState, useRef } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { Button } from './ui/button';
import { ChevronDown, Heart, MoreHorizontal, Share2, SkipBack, Play, Pause, SkipForward, ListMusic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Slider } from './ui/slider';
import { useLikedSongsStore } from '@/stores/useLikedSongsStore';
import { toast } from 'sonner';

interface SongDetailsViewProps {
  isOpen: boolean;
  onClose: () => void;
}

// Helper to format time in mm:ss
const formatTime = (seconds: number) => {
  if (isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
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
  
  // Refs for swipe functionality
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndX = useRef(0);
  const touchEndY = useRef(0);
  const imageRef = useRef<HTMLImageElement>(null);
  const [swipeDirection, setSwipeDirection] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

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
    
    // Log the status for debugging
    console.log(`SongDetails - Checked like status - Song ID: ${songId}, Liked: ${liked}, LikedSongIds size: ${likedSongIds?.size}`);
    
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
          console.log(`SongDetails - Received event with like state: ${e.detail.isLiked}`);
          setIsLiked(e.detail.isLiked);
          return;
        }
      }
      
      // Otherwise do a fresh check from the store
      const freshCheck = songId ? likedSongIds?.has(songId) : false;
      console.log(`SongDetails - Received like update event, fresh check: ${freshCheck}`);
      setIsLiked(freshCheck);
    };
    
    document.addEventListener('likedSongsUpdated', handleLikeUpdate);
    document.addEventListener('songLikeStateChanged', handleLikeUpdate);
    
    return () => {
      document.removeEventListener('likedSongsUpdated', handleLikeUpdate);
      document.removeEventListener('songLikeStateChanged', handleLikeUpdate);
    };
  }, [currentSong, likedSongIds]);

  // Swipe handlers
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    
    const container = containerRef.current;
    const image = imageRef.current;
    
    // Apply hardware acceleration to improve performance
    container.style.willChange = 'transform, opacity';
    if (image) image.style.willChange = 'transform';
    
    let isSwiping = false;
    let lastX = 0;
    let lastY = 0;
    let swipeStartTime = 0;
    
    const handleTouchStart = (e: TouchEvent) => {
      // Prevent default behavior that can cause flickering
      e.preventDefault();
      
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      lastX = touchStartX.current;
      lastY = touchStartY.current;
      swipeStartTime = Date.now();
      isSwiping = true;
      
      // Reset any previous transforms
      if (image) image.style.transform = '';
      container.style.transition = 'none';
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (!isSwiping || !image) return;
      
      // Prevent default to avoid scroll interference
      e.preventDefault();
      
      // Current touch position
      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      
      // Calculate deltas (with smoothing)
      const deltaX = currentX - touchStartX.current;
      const deltaY = currentY - touchStartY.current;
      
      // Calculate velocity to make animations feel more responsive
      const velocity = Math.sqrt(
        Math.pow(currentX - lastX, 2) + 
        Math.pow(currentY - lastY, 2)
      ) / ((Date.now() - swipeStartTime) / 1000);
      
      // Determine primary direction
      const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
      
      if (isHorizontal) {
        // Left/right swipe for changing songs - limit movement to horizontal
        if (deltaX > 30) {
          setSwipeDirection('right');
        } else if (deltaX < -30) {
          setSwipeDirection('left');
        } else {
          setSwipeDirection(null);
        }
        
        // Apply a damping effect as user swipes further
        const dampingFactor = Math.min(1, Math.pow(Math.abs(deltaX), 0.7) / Math.abs(deltaX));
        const transformX = deltaX * 0.15 * dampingFactor;
        
        // Move the image slightly with damping effect to provide visual feedback
        image.style.transform = `translateX(${transformX}px)`;
        
        // Very subtle container movement for song change swipes
        container.style.transform = `translateX(${deltaX * 0.05}px)`;
      } else {
        // Down swipe for closing
        if (deltaY > 30) {
          setSwipeDirection('down');
          
          // Apply non-linear resistance for more natural feel
          const resistance = 0.4 - (deltaY * 0.0005); // Gradually increases resistance
          const transformY = deltaY * Math.max(0.1, resistance);
          
          container.style.transform = `translateY(${transformY}px)`;
          
          // Adjust opacity with easing
          const newOpacity = Math.max(0.5, 1 - (deltaY / 800));
          container.style.opacity = String(newOpacity);
        } else {
          setSwipeDirection(null);
          container.style.transform = '';
          container.style.opacity = '1';
        }
      }
      
      // Update last position for velocity calculation
      lastX = currentX;
      lastY = currentY;
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      if (!isSwiping) return;
      
      // Calculate final position
      touchEndX.current = e.changedTouches[0].clientX;
      touchEndY.current = e.changedTouches[0].clientY;
      
      // Calculate swipe metrics
      const deltaX = touchEndX.current - touchStartX.current;
      const deltaY = touchEndY.current - touchStartY.current;
      const swipeDuration = Date.now() - swipeStartTime;
      const velocity = Math.sqrt(deltaX * deltaX + deltaY * deltaY) / (swipeDuration / 1000);
      
      // Reset styles with smooth transitions
      if (image) {
        image.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
        image.style.transform = '';
      }
      
      // Add transition for smooth movement
      container.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.3s ease-out';
      container.style.opacity = '1';
      
      // Determine if this was a significant swipe (using velocity for better response)
      const isQuickSwipe = velocity > 0.5 && swipeDuration < 300;
      
      if ((Math.abs(deltaX) > 80 || (isQuickSwipe && Math.abs(deltaX) > 40)) && 
          Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        setIsTransitioning(true);
        
        if (deltaX > 0) {
          // Right swipe - play previous
          container.style.transform = 'translateX(100%)';
          setTimeout(() => {
            playPrevious();
            // Delay reset to avoid flickering
            requestAnimationFrame(() => {
              container.style.transition = 'none';
              container.style.transform = 'translateX(-100%)';
              
              // After a frame, animate back in from opposite side
              requestAnimationFrame(() => {
                container.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
                container.style.transform = '';
                setTimeout(() => setIsTransitioning(false), 300);
              });
            });
          }, 200);
        } else {
          // Left swipe - play next
          container.style.transform = 'translateX(-100%)';
          setTimeout(() => {
            playNext();
            // Delay reset to avoid flickering
            requestAnimationFrame(() => {
              container.style.transition = 'none';
              container.style.transform = 'translateX(100%)';
              
              // After a frame, animate back in from opposite side
              requestAnimationFrame(() => {
                container.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
                container.style.transform = '';
                setTimeout(() => setIsTransitioning(false), 300);
              });
            });
          }, 200);
        }
      } else if (deltaY > 120 || (isQuickSwipe && deltaY > 60)) {
        // Downward swipe - close
        container.style.transform = 'translateY(100%)';
        setTimeout(() => {
          onClose();
          
          // Reset after closing is complete
          setTimeout(() => {
            container.style.transition = 'none';
            container.style.transform = '';
          }, 50);
        }, 300);
      } else {
        // Not a significant swipe - reset with spring-like animation
        container.style.transform = '';
      }
      
      // Reset tracking state
      setSwipeDirection(null);
      isSwiping = false;
    };
    
    // Additional handler to prevent flickering on cancel
    const handleTouchCancel = () => {
      if (!isSwiping) return;
      
      // Reset all states and styles smoothly
      if (image) {
        image.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
        image.style.transform = '';
      }
      
      container.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.3s ease-out';
      container.style.transform = '';
      container.style.opacity = '1';
      
      setSwipeDirection(null);
      isSwiping = false;
    };
    
    // Use passive: false to prevent scrolling while swiping
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchCancel);
    
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchCancel);
      
      // Clean up styles
      container.style.willChange = '';
      container.style.transform = '';
      container.style.opacity = '1';
      container.style.transition = '';
      
      if (image) {
        image.style.willChange = '';
        image.style.transform = '';
        image.style.transition = '';
      }
    };
  }, [isOpen, onClose, playNext, playPrevious]);

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
    console.log(`SongDetails - Toggling like for song ID: ${songId}, current status: ${isLiked}`);
    
    // Optimistically update the UI immediately
    setIsLiked(!isLiked);
    
    // Perform the actual toggle
    toggleLikeSong(currentSong);
    
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
        console.error('Error sharing:', error);
      });
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(`${shareText} - ${window.location.href}`);
      toast.success('Link copied to clipboard');
    }
  };

  if (!currentSong) return null;

  const progress = (currentTime / duration) * 100 || 0;
  const vibrantColor = 'rgba(22, 163, 74, 0.9)';

  return (
    <div
      ref={containerRef}
      className={cn(
        'fixed inset-0 bg-gradient-to-b from-black via-zinc-900/90 to-black z-50 transition-transform duration-500 flex flex-col',
        isOpen ? 'translate-y-0' : 'translate-y-full',
        isTransitioning && 'transition-transform duration-300 ease-out'
      )}
    >
      {/* Swipe indicator */}
      <div className="w-12 h-1 bg-zinc-600 rounded-full mx-auto mt-2 mb-2"></div>
      
      {/* Header */}
      <div className="safe-area-top flex items-center justify-between p-4">
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

      {/* Album Art with swipe indicators */}
      <div className="px-8 mt-4 flex-shrink-0 relative">
        {swipeDirection === 'left' && (
          <div className="absolute inset-y-0 right-4 flex items-center justify-center z-10">
            <div className="bg-black/40 rounded-full p-3">
              <SkipForward className="h-8 w-8 text-white" />
            </div>
          </div>
        )}
        
        {swipeDirection === 'right' && (
          <div className="absolute inset-y-0 left-4 flex items-center justify-center z-10">
            <div className="bg-black/40 rounded-full p-3">
              <SkipBack className="h-8 w-8 text-white" />
            </div>
          </div>
        )}
        
        <div className={cn(
          "aspect-square w-full rounded-lg overflow-hidden shadow-2xl relative transition-all duration-700 transform-gpu",
          albumArtLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95"
        )}>
          <img
            ref={imageRef}
            src={currentSong.imageUrl}
            alt={currentSong.title}
            className="w-full h-full object-cover transition-transform duration-200 transform-gpu"
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
          <div className="flex items-center justify-center gap-8">
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

        {/* Swipe instructions for first-time users */}
        <div className="text-center text-xs text-zinc-500 mb-2">
          Swipe left/right to change songs • Swipe down to close
        </div>

        {/* Safe Area for iOS devices */}
        <div className="h-safe-area-bottom"></div>
      </div>
    </div>
  );
};

export default SongDetailsView; 