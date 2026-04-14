import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Music, Play, Pause, Clock, MoreHorizontal, ArrowDownUp, Search, ListPlus, User, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ShuffleButton } from '@/components/ShuffleButton';
import { Input } from '@/components/ui/input';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { usePlayerSync } from '@/hooks/usePlayerSync';
import { useAuthStore } from '@/stores/useAuthStore';
import { useLikedSongsStore } from '@/stores/useLikedSongsStore';
import { Song } from '@/types';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { getHighestQualityAudioUrl } from '@/utils/jiosaavnAudio';
import './liked-songs.css';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LikeButton } from '@/components/LikeButton';

// Format time
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const INVALID_TEXT_VALUES = new Set(['', 'null', 'undefined', '[object object]']);
const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

const getSafeText = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  const normalized = String(value).trim();
  if (INVALID_TEXT_VALUES.has(normalized.toLowerCase())) {
    return '';
  }
  return normalized;
};

const getSongAlbumLabel = (song: Song): string => {
  const songWithAlbum = song as Song & { album?: unknown };
  const album = getSafeText(songWithAlbum.album);
  if (album) return album;

  const albumId = getSafeText(song.albumId);
  if (albumId && !OBJECT_ID_PATTERN.test(albumId)) return albumId;

  return 'Unknown Album';
};

const parseSongDate = (value: unknown): Date | null => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === 'object') {
    const timestampLike = value as {
      toDate?: () => Date;
      seconds?: number;
      _seconds?: number;
    };

    if (typeof timestampLike.toDate === 'function') {
      return parseSongDate(timestampLike.toDate());
    }

    const seconds = typeof timestampLike.seconds === 'number'
      ? timestampLike.seconds
      : timestampLike._seconds;
    if (typeof seconds === 'number') {
      return parseSongDate(seconds * 1000);
    }
  }

  return null;
};

const getSongDateForDisplay = (song: Song): string => {
  const date = parseSongDate(song.likedAt) ?? parseSongDate(song.createdAt);
  if (!date) return 'Recently added';

  const currentYear = new Date().getFullYear();
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: currentYear !== date.getFullYear() ? 'numeric' : undefined,
  });
};

const getSongTimestamp = (song: Song): number => {
  const date = parseSongDate(song.likedAt) ?? parseSongDate(song.createdAt);
  return date ? date.getTime() : 0;
};

// Memoized song item component to prevent unnecessary re-renders
const MemoizedSongItem = React.memo(({
  song,
  index,
  isMobile,
  isSongPlaying,
  onPlay,
  onTogglePlay,
  onAddToQueue,
  onUnlike
}: {
  song: Song;
  index: number;
  isMobile: boolean;
  isSongPlaying: boolean;
  onPlay: () => void;
  onTogglePlay: () => void;
  onAddToQueue: () => void;
  onUnlike: () => void;
}) => {
  // Use CSS transforms instead of layout changes to prevent reflows
  const itemStyle = {
    transform: 'translateZ(0)', // Force hardware acceleration
    willChange: 'auto' // Let browser optimize
  };

  return (
    <div
      onClick={onPlay}
      style={itemStyle}
      className={cn(
        "group relative rounded-md cursor-pointer items-center",
        isMobile
          ? "flex gap-3 p-3 py-2 active:bg-muted/30"
          : "grid grid-cols-[16px_4fr_3fr_2fr_40px_1fr_48px] gap-4 p-2 px-4 hover:bg-muted/50 transition-colors"
      )}
    >
      {/* Desktop Index/Play button */}
      {!isMobile && (
        <div className="flex items-center justify-center text-sm text-muted-foreground group-hover:text-foreground">
          {isSongPlaying ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary hover:text-primary/80"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePlay();
              }}
            >
              <Pause className="h-4 w-4 fill-current" />
            </Button>
          ) : (
            <>
              <span className="group-hover:hidden">{index + 1}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hidden group-hover:flex"
                onClick={(e) => {
                  e.stopPropagation();
                  onPlay();
                }}
              >
                <Play className="h-4 w-4 fill-current" />
              </Button>
            </>
          )}
        </div>
      )}

      {/* Song info - Spotify-style with better album artwork */}
      <div className="flex items-center min-w-0 flex-1">
        <div className={cn(
          "flex-shrink-0 overflow-hidden rounded shadow-md relative",
          isMobile ? "w-14 h-14 mr-3" : "w-12 h-12 mr-3"
        )}>
          <img
            src={song.imageUrl || '/placeholder-song.jpg'}
            alt={song.title}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
            style={{ 
              contentVisibility: 'auto',
              containIntrinsicSize: isMobile ? '56px 56px' : '48px 48px'
            }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/placeholder-song.jpg';
            }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className={cn(
            "font-medium text-base",
            isSongPlaying ? "text-green-500" : "text-foreground",
            isMobile ? "leading-tight" : "truncate"
          )}>
            {song.title}
          </div>
          <div className={cn(
            "text-muted-foreground text-sm truncate whitespace-nowrap overflow-hidden",
            isMobile ? "leading-tight" : ""
          )}>
            {song.artist}
          </div>
        </div>
      </div>

      {/* Mobile actions - positioned on the right */}
      {isMobile && (
        <div className="flex-shrink-0 flex items-center gap-2">
          <LikeButton
            isLiked={true}
            onToggle={(e) => {
              e.stopPropagation();
              onUnlike();
            }}
            iconSize={24}
            className="mr-1"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-60 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToQueue();
                }}
              >
                <ListPlus className="h-4 w-4 mr-2" />
                Add to Queue
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onUnlike();
                }}
                className="text-red-400"
              >
                <Heart className="h-4 w-4 mr-2" />
                Remove from Liked Songs
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Desktop album */}
      {!isMobile && (
        <div className="flex items-center text-muted-foreground truncate">
          {getSongAlbumLabel(song)}
        </div>
      )}

      {/* Desktop date added */}
      {!isMobile && (
        <div className="flex items-center text-muted-foreground text-sm">
          {getSongDateForDisplay(song)}
        </div>
      )}

      {/* Desktop Like Button */}
      {!isMobile && (
        <div className="flex items-center justify-center">
          <LikeButton
            isLiked={true}
            onToggle={(e) => {
              e.stopPropagation();
              onUnlike();
            }}
            iconSize={20}
          />
        </div>
      )}

      {/* Duration */}
      {!isMobile && (
        <div className="flex items-center text-muted-foreground text-sm justify-end">
          {formatTime(song.duration || 0)}
        </div>
      )}

      {/* Desktop actions - simple dropdown */}
      {!isMobile && (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToQueue();
                }}
              >
                <ListPlus className="h-4 w-4 mr-2" />
                Add to Queue
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onUnlike();
                }}
                className="text-red-400"
              >
                <Heart className="h-4 w-4 mr-2" />
                Remove from Liked Songs
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // More stable comparison to prevent excessive re-renders
  const prevId = prevProps.song._id;
  const nextId = nextProps.song._id;

  // Only re-render if the song ID changed or playing state changed
  // Don't check other props to reduce sensitivity to changes
  return (
    prevId === nextId &&
    prevProps.isSongPlaying === nextProps.isSongPlaying
  );
});

MemoizedSongItem.displayName = 'MemoizedSongItem';

const LikedSongsPage = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sortMethod, setSortMethod] = useState<'recent' | 'title' | 'artist'>('recent');
  const [filterQuery, setFilterQuery] = useState('');
  const navigate = useNavigate();

  // Sticky header — shown when the hero scrolls out of view
  const heroRef = useRef<HTMLDivElement>(null);
  const [showStickyHeader, setShowStickyHeader] = useState(false);

  const { togglePlay, playAlbum, setIsPlaying, setUserInteracted } = usePlayerStore();
  const { currentSong, isPlaying } = usePlayerSync();
  const { isAuthenticated } = useAuthStore();

  // Use the store instead of local state for liked songs
  const { likedSongs, loadLikedSongs: loadLikedSongsFromStore, removeLikedSong: removeLikedSongFromStore } = useLikedSongsStore();

  // Force re-render when liked songs change
  const [, forceUpdate] = useState({});

  // Subscribe to store changes to force re-renders
  useEffect(() => {
    // Use a simpler approach - just subscribe to the store directly
    const unsubscribe = useLikedSongsStore.subscribe(() => {
      // Force re-render when the store state changes
      forceUpdate({});
    });

    return unsubscribe;
  }, []);

  // Load liked songs on mount
  useEffect(() => {
    loadAndSetLikedSongs();
  }, [isAuthenticated]);

  // Sticky header — show only after the controls row scrolls out of view.
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero || !isMobile) return;

    // Find the nearest scrollable ancestor (CustomScrollbar's inner div)
    const getScrollParent = (el: HTMLElement): HTMLElement => {
      let node: HTMLElement | null = el.parentElement;
      while (node) {
        const { overflowY } = window.getComputedStyle(node);
        if (overflowY === 'auto' || overflowY === 'scroll') return node;
        node = node.parentElement;
      }
      return document.documentElement;
    };

    const scrollParent = getScrollParent(hero);

    const check = () => {
      // Both rects are in viewport coordinates — their difference is scroll-independent
      const heroBottom = hero.getBoundingClientRect().bottom;
      const containerTop = scrollParent.getBoundingClientRect().top;
      // Hero has scrolled away when its bottom is above the container's top edge
      setShowStickyHeader(heroBottom < containerTop);
    };

    scrollParent.addEventListener('scroll', check, { passive: true });
    check(); // run once for restored scroll position

    return () => scrollParent.removeEventListener('scroll', check);
  }, [isMobile]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadAndSetLikedSongs = async () => {
    if (!isAuthenticated) {
      return;
    }

    try {
      // Use the store method instead of direct service call
      await loadLikedSongsFromStore();
    } catch (error) {
      // Error loading liked songs
      toast.error('Failed to load liked songs');
    }
  };

  // Optimized sort function with memoization
  const sortSongs = useCallback((songs: Song[], method: 'recent' | 'title' | 'artist') => {
    if (!songs || songs.length === 0) return [];

    // Use a more efficient sorting approach
    switch (method) {
      case 'recent':
        // Sort by likedAt timestamp (most recent first)
        return [...songs].sort((a, b) => getSongTimestamp(b) - getSongTimestamp(a));
      case 'title':
        return [...songs].sort((a, b) => a.title.localeCompare(b.title));
      case 'artist':
        return [...songs].sort((a, b) => a.artist.localeCompare(b.artist));
      default:
        return songs;
    }
  }, []);

  // Optimized filtered and sorted songs with better memoization
  const visibleSongs = useMemo(() => {
    if (!likedSongs.length) return [];

    const q = filterQuery.trim().toLowerCase();
    let filtered = likedSongs;

    // Only filter if there's a query to avoid unnecessary work
    if (q) {
      filtered = likedSongs.filter((s) =>
        `${s.title} ${s.artist}`.toLowerCase().includes(q)
      );
    }

    return sortSongs(filtered, sortMethod);
  }, [likedSongs, filterQuery, sortMethod, sortSongs]);

  // Define isSongPlaying first since it's used by other functions
  const isSongPlaying = useCallback((song: Song) => {
    if (!isPlaying || !currentSong) return false;

    // Get primary IDs for comparison - be more strict about ID matching
    const currentSongId = currentSong._id;
    const songId = song._id;

    // Only return true if we have valid IDs and they match exactly
    if (currentSongId && songId) {
      return currentSongId === songId;
    }

    // If no IDs available, fall back to exact title and artist match
    // But be very strict to avoid false positives
    if (currentSong.title && song.title && currentSong.artist && song.artist) {
      return (
        currentSong.title.trim().toLowerCase() === song.title.trim().toLowerCase() &&
        currentSong.artist.trim().toLowerCase() === song.artist.trim().toLowerCase()
      );
    }

    return false;
  }, [isPlaying, currentSong]);

  // Memoized callbacks to prevent child re-renders
  const handlePlaySong = useCallback(async (song: Song, index: number) => {
    // Use the same comparison logic as isSongPlaying
    if (currentSong && isSongPlaying(song)) {
      togglePlay();
      return;
    }

    // Check if song has audioUrl, if not, try to fetch it
    let songToPlay = song;
    if (!song.audioUrl) {
      // Try to extract the song ID from the _id field
      // The _id might be in format like "indian-song-..." or "liked-..."
      const songId = song._id?.includes('indian-song-') 
        ? song._id.split('indian-song-')[1]?.split('-')[0]
        : song._id?.includes('liked-')
        ? song._id.split('liked-')[1]?.split('-')[0]
        : song._id;
      
      if (songId && songId.length > 5) {
        try {
          toast.loading('Loading song...', { id: 'loading-song' });
          const response = await fetch(`/api/jiosaavn/songs/${songId}`);
          const data = await response.json();
          
          if (data.success && data.data && data.data.downloadUrl) {
            const audioUrl = getHighestQualityAudioUrl(data.data.downloadUrl);
            
            if (audioUrl) {
              // Create updated song with audioUrl
              songToPlay = { ...song, audioUrl };
            }
          }
          toast.dismiss('loading-song');
        } catch (error) {
          toast.dismiss('loading-song');
          toast.error('Failed to load song');
          return;
        }
      } else {
        toast.error('Cannot play this song - invalid ID');
        return;
      }
    }

    // Verify we have a valid audioUrl
    if (!songToPlay.audioUrl) {
      toast.error('This song is not available for playback');
      return;
    }

    // Update visibleSongs with the fetched URL
    const updatedVisibleSongs = visibleSongs.map(s => 
      s._id === songToPlay._id ? songToPlay : s
    );

    playAlbum(updatedVisibleSongs, index);
    // Remove setTimeout to prevent performance violations
    setIsPlaying(true);
    setUserInteracted();
  }, [currentSong, togglePlay, playAlbum, visibleSongs, setIsPlaying, setUserInteracted, isSongPlaying]);

  const handleAddToQueue = useCallback((song: Song) => {
    const { addToQueue: addSongToQueue } = usePlayerStore.getState();
    addSongToQueue(song);
    toast.success(`Added "${song.title}" to queue`, {
      duration: 2000,
    });
  }, []);

  const handleUnlikeSong = useCallback(async (songId: string) => {
    if (!songId || songId === 'undefined' || songId === 'null') {
      toast.error('Cannot remove song: Invalid ID');
      return;
    }
    
    try {
      // Use the store method instead of direct service call
      await removeLikedSongFromStore(songId);
      toast.success('Removed from Liked Songs');
    } catch (error) {
      toast.error('Failed to remove song');
    }
  }, [removeLikedSongFromStore]);

  // Update sort method and re-sort songs
  const handleSortChange = useCallback((method: 'recent' | 'title' | 'artist') => {
    setSortMethod(method);
  }, []);

  const openImportTool = useCallback(() => {
    navigate('/liked-songs/import');
  }, [navigate]);

  // Play all liked songs
  const playAllSongs = useCallback(() => {
    if (likedSongs.length > 0) {
      playAlbum(likedSongs, 0);
      // Remove setTimeout to prevent performance violations
      setIsPlaying(true);
      setUserInteracted();
    }
  }, [likedSongs, playAlbum, setIsPlaying, setUserInteracted]);

  // Check if the current liked songs playlist is playing
  const isCurrentPlaylistPlaying = useMemo(() => {
    if (!isPlaying || !currentSong || likedSongs.length === 0) return false;
    
    // Check if the current song is in the liked songs list
    return likedSongs.some(song => {
      const currentSongId = currentSong._id;
      const songId = song._id;
      
      if (currentSongId && songId) {
        return currentSongId === songId;
      }
      
      // Fallback to title and artist match
      return (
        currentSong.title?.trim().toLowerCase() === song.title?.trim().toLowerCase() &&
        currentSong.artist?.trim().toLowerCase() === song.artist?.trim().toLowerCase()
      );
    });
  }, [isPlaying, currentSong, likedSongs]);

  // Handle pause playlist functionality
  const handlePausePlaylist = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
    }
  }, [isPlaying, setIsPlaying]);

  // Handle main play/pause button
  const handleMainPlayPause = useCallback(() => {
    if (isCurrentPlaylistPlaying) {
      handlePausePlaylist();
    } else {
      playAllSongs();
    }
  }, [isCurrentPlaylistPlaying, handlePausePlaylist, playAllSongs]);

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Heart className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Sign in to see your liked songs</h2>
        <p className="text-muted-foreground">Create an account to save your favorite music</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground liked-songs-page">

      {/* Sticky header — appears when controls row scrolls out of view (mobile only) */}
      {isMobile && (
        <AnimatePresence>
          {showStickyHeader && (
            <motion.div
              key="sticky-header"
              initial={{ opacity: 0, y: -56 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -56 }}
              transition={{ type: 'spring', stiffness: 500, damping: 40, mass: 0.7 }}
              className="fixed left-0 right-0 z-50 flex items-center justify-between px-4 bg-[#1a0a2e] backdrop-blur-xl border-b border-white/[0.07] shadow-lg"
              style={{
                top: 0,
                paddingTop: 'calc(env(safe-area-inset-top, 0px) + 10px)',
                paddingBottom: '10px',
              }}
            >
              {/* Left: heart icon + title */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-md bg-gradient-to-br from-purple-400 to-purple-700 flex items-center justify-center flex-shrink-0 shadow-md">
                  <Heart className="h-3.5 w-3.5 text-white fill-white" />
                </div>
                <span className="text-[15px] font-bold text-white truncate tracking-tight">
                  Liked Songs
                </span>
              </div>

              {/* Right: shuffle + play */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <ShuffleButton
                  size="sm"
                  className="h-8 w-8 text-white/70 hover:text-white"
                  accentColor="#1ed760"
                />
                <button
                  onClick={handleMainPlayPause}
                  disabled={likedSongs.length === 0}
                  className="h-9 w-9 rounded-full bg-green-500 hover:bg-green-400 active:scale-95 transition-all flex items-center justify-center shadow-lg disabled:opacity-40"
                  aria-label={isCurrentPlaylistPlaying ? 'Pause' : 'Play'}
                >
                  {isCurrentPlaylistPlaying ? (
                    <Pause className="h-4 w-4 fill-black text-black" />
                  ) : (
                    <Play className="h-4 w-4 fill-black text-black ml-0.5" />
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Mobile Header */}
      {isMobile ? (
        <div className="relative">
          {/* Mobile gradient header - Spotify-like */}
          <div className="bg-gradient-to-b from-purple-600/80 via-purple-700/60 to-background px-4 pb-6"
            style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
          >
            <div className="flex items-center gap-4">
              {/* Spotify-style heart icon for mobile */}
              <div className="w-20 h-20 bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 rounded-md flex items-center justify-center shadow-2xl relative overflow-hidden flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/30"></div>
                <Heart className="h-10 w-10 text-white fill-white relative z-10 drop-shadow-lg" />
                <div className="absolute top-2 left-2 w-6 h-6 bg-white/30 rounded-full blur-md"></div>
              </div>

              {/* Mobile title section - Spotify style */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/80 mb-1">Playlist</p>
                <h1 className="text-3xl font-bold text-white drop-shadow-sm mb-2 leading-tight">Liked Songs</h1>
                <div className="flex items-center gap-1 text-sm text-white/70">
                  <User className="h-4 w-4" />
                  <span>Satvik patel • {likedSongs.length} songs</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile controls row — heroRef watches this: sticky appears when it scrolls away */}
          <div ref={heroRef} className="px-4 pb-4 flex items-center justify-between bg-gradient-to-b from-background/20 to-background">
            <div className="flex items-center gap-4">
              <Button
                size="icon"
                className="h-14 w-14 rounded-full bg-green-500 hover:bg-green-400 shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-105"
                onClick={handleMainPlayPause}
                disabled={likedSongs.length === 0}
              >
                {isCurrentPlaylistPlaying ? (
                  <Pause className="h-6 w-6 fill-current text-black" />
                ) : (
                  <Play className="h-6 w-6 fill-current ml-0.5 text-black" />
                )}
              </Button>

              <ShuffleButton
                size="md"
                className="h-10 w-10 text-white/80 hover:text-white hover:bg-white/10 hover:scale-105 transition-all duration-200"
                accentColor="#1ed760"
              />

            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 text-white/70 hover:text-white hover:bg-white/10">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleSortChange('recent')}>
                  <Clock className="h-4 w-4 mr-2" />
                  Recently Added
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortChange('title')}>
                  <ArrowDownUp className="h-4 w-4 mr-2" />
                  Title
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortChange('artist')}>
                  <Music className="h-4 w-4 mr-2" />
                  Artist
                </DropdownMenuItem>
                <DropdownMenuItem onClick={openImportTool}>
                  <Upload className="h-4 w-4 mr-2" />
                  Open Import Tool
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ) : (
        /* Desktop Header - Spotify-style */
        <div className="relative">
          <div className="bg-gradient-to-b from-purple-600/60 via-purple-700/40 to-background p-8 pb-6">
            <div className="flex items-end gap-6">
              <div className="w-56 h-56 bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 rounded-md flex items-center justify-center shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/25"></div>
                <Heart className="h-24 w-24 text-white fill-white relative z-10 drop-shadow-lg" />
                <div className="absolute top-6 left-6 w-20 h-20 bg-white/25 rounded-full blur-xl"></div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/90 mb-3">Playlist</p>
                <h1 className="text-5xl md:text-7xl font-black mb-6 text-white drop-shadow-sm tracking-tight">Liked Songs</h1>
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <User className="h-4 w-4" />
                  <span className="font-medium">Satvik patel</span>
                  <span>•</span>
                  <span>{likedSongs.length} songs</span>
                </div>
              </div>
            </div>
          </div>

          <div className="px-8 pb-6 flex items-center justify-between bg-gradient-to-b from-background/20 to-background">
            <div className="flex items-center gap-6">
              <Button
                size="icon"
                className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-400 shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-105"
                onClick={handleMainPlayPause}
                disabled={likedSongs.length === 0}
              >
                {isCurrentPlaylistPlaying ? (
                  <Pause className="h-7 w-7 fill-current text-black" />
                ) : (
                  <Play className="h-7 w-7 fill-current ml-0.5 text-black" />
                )}
              </Button>

              <ShuffleButton
                size="lg"
                className="h-12 w-12 text-white/80 hover:text-white hover:bg-white/10 hover:scale-105 transition-all duration-200"
                accentColor="#1ed760"
              />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-12 w-12 text-white/70 hover:text-white hover:bg-white/10">
                    <MoreHorizontal className="h-6 w-6" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => handleSortChange('recent')}>
                    <Clock className="h-4 w-4 mr-2" />
                    Recently Added
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSortChange('title')}>
                    <ArrowDownUp className="h-4 w-4 mr-2" />
                    Title
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSortChange('artist')}>
                    <Music className="h-4 w-4 mr-2" />
                    Artist
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={openImportTool}>
                    <Upload className="h-4 w-4 mr-2" />
                    Open Import Tool
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      )}

      {/* Search - Spotify-style */}
      {likedSongs.length > 0 && (
        <div className={cn("pb-4", isMobile ? "px-4" : "px-8")}>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
            <Input
              placeholder="Search in liked songs"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className={cn(
                "pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/15 focus:border-white/30 transition-all duration-200",
                isMobile ? "h-10 text-sm" : "h-11"
              )}
            />
          </div>
        </div>
      )}

      {/* Songs List - Spotify-style */}
      <div className={cn(isMobile ? "px-4 pb-32" : "px-8 pb-8")}>
        {likedSongs.length > 0 ? (
          <div className={cn("pb-8", isMobile ? "pb-32" : "")}>
            {/* Desktop header */}
            {!isMobile && (
              <div className="grid grid-cols-[16px_4fr_3fr_2fr_40px_1fr_48px] gap-4 px-4 py-2 text-sm text-muted-foreground border-b mb-2">
                <div>#</div>
                <div>Title</div>
                <div>Album</div>
                <div>Date added</div>
                <div></div>
                <div><Clock className="h-4 w-4" /></div>
                <div></div>
              </div>
            )}

            {visibleSongs.map((song, index) => {
              // Create a unique key using the Firestore document ID
              const uniqueKey = song._id || `${song.title}-${song.artist}-${index}`;

              return (
                <MemoizedSongItem
                  key={uniqueKey}
                  song={song}
                  index={index}
                  isMobile={isMobile}
                  isSongPlaying={isSongPlaying(song)}
                  onPlay={() => handlePlaySong(song, index)}
                  onTogglePlay={togglePlay}
                  onAddToQueue={() => handleAddToQueue(song)}
                  onUnlike={() => {
                    const songId = song._id;
                    if (songId) {
                      handleUnlikeSong(songId);
                    } else {
                      toast.error('Cannot remove song: No valid ID found');
                    }
                  }}
                />
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Heart className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No liked songs yet</h3>
            <p className="text-muted-foreground mb-5">Songs you like will appear here</p>
            <Button onClick={openImportTool}>
              <Upload className="h-4 w-4 mr-2" />
              Open Import Tool
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LikedSongsPage;
