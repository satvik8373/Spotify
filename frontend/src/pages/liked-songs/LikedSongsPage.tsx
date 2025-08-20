import { useEffect, useState, useRef, useCallback } from 'react';
import { Heart, Music, Play, Clock, MoreHorizontal, ArrowDownUp, Calendar, Shuffle, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { loadLikedSongs, removeLikedSong, syncWithServer } from '@/services/likedSongsService';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { Song } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { TouchRipple } from '@/components/ui/touch-ripple';

// Add CSS for desktop view
import './liked-songs.css';

// Convert liked song format to player song format
const adaptToPlayerSong = (likedSong: any): Song => {
  return {
    _id: likedSong.id,
    title: likedSong.title,
    artist: likedSong.artist,
    audioUrl: likedSong.audioUrl,
    imageUrl: likedSong.imageUrl,
    duration: likedSong.duration || 0,
    albumId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
};

// Format time
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const LikedSongsPage = () => {
  const [likedSongs, setLikedSongs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [syncedWithServer, setSyncedWithServer] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  // Removed fixed header; opacity state no longer needed
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sortMethod, setSortMethod] = useState<'recent' | 'title' | 'artist'>('recent');
  const [filterQuery, setFilterQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { currentSong, isPlaying, togglePlay } = usePlayerStore();
  const { isAuthenticated } = useAuthStore();

  // Load liked songs on mount
  useEffect(() => {
    loadAndSetLikedSongs();

    // Subscribe to liked songs updates
    const handleLikedSongsUpdated = () => {
      loadAndSetLikedSongs();
    };

    document.addEventListener('likedSongsUpdated', handleLikedSongsUpdated);
    
    return () => {
      document.removeEventListener('likedSongsUpdated', handleLikedSongsUpdated);
    };
  }, [isAuthenticated]);

  // Ensure player has proper queue setup when this page is active
  useEffect(() => {
    // This effect runs when component mounts and ensures proper queue setup
    const setupQueueOnFocus = () => {
      const playerStore = usePlayerStore.getState();
      // If we have songs but queue is empty or very small, set it up
      if (likedSongs.length > 0 && (playerStore.queue.length === 0 || playerStore.queue.length < likedSongs.length / 2)) {
        const playerSongs = likedSongs.map(adaptToPlayerSong);
         
        // If there's a current song playing, try to find its index
        let startIndex = 0;
        if (playerStore.currentSong) {
          const currentId = (playerStore.currentSong as any).id || playerStore.currentSong._id;
          const matchingIndex = likedSongs.findIndex(song => song.id === currentId);
          if (matchingIndex >= 0) {
            startIndex = matchingIndex;
          }
        }
         
        // Use playAlbum with correct index to ensure queue is set up
        playerStore.playAlbum(playerSongs, startIndex);
         
        // If already playing, make sure it stays playing
        if (playerStore.isPlaying) {
          setTimeout(() => {
            playerStore.setIsPlaying(true);
          }, 50);
        }
      }
    };
    
    // Run on mount
    setupQueueOnFocus();
    
    // Also run when window gets focus
    window.addEventListener('focus', setupQueueOnFocus);
    
    return () => {
      window.removeEventListener('focus', setupQueueOnFocus);
    };
  }, [likedSongs]);
  
  // Load and set liked songs
  const loadAndSetLikedSongs = async () => {
    setIsLoading(true);
    setSyncError(null);
    
    try {
      // First load from local storage
      const localSongs = loadLikedSongs();
      const sortedSongs = sortSongs(localSongs, sortMethod);
      setLikedSongs(sortedSongs);
      
      // Then sync with server if authenticated
      if (isAuthenticated) {
        try {
          const serverSongs = await syncWithServer(localSongs);
          const sortedServerSongs = sortSongs(serverSongs, sortMethod);
          setLikedSongs(sortedServerSongs);
          setSyncedWithServer(true);
        } catch (syncErr) {
          console.error('Error syncing with server:', syncErr);
          setSyncError('Using local data - server sync unavailable');
          // Still mark as synced to prevent continuous retries
          setSyncedWithServer(true);
          
          // Show informational toast instead of error
          toast.info('Using locally stored liked songs', {
            description: 'Server synchronization is currently unavailable.'
          });
        }
      }
    } catch (error) {
      console.error('Error loading liked songs:', error);
      setSyncError('Failed to load liked songs');
      toast.error('Failed to load liked songs', {
        description: 'Please try again later.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Sort songs based on selected method
  const sortSongs = (songs: any[], method: 'recent' | 'title' | 'artist') => {
    if (!songs || songs.length === 0) return [];
    
    const sortedSongs = [...songs];
    
    switch (method) {
      case 'recent':
        // In Firebase, newer songs are already at the beginning of array by default
        return sortedSongs;
      case 'title':
        return sortedSongs.sort((a, b) => a.title.localeCompare(b.title));
      case 'artist':
        return sortedSongs.sort((a, b) => a.artist.localeCompare(b.artist));
      default:
        return sortedSongs;
    }
  };

  // Update sort method and re-sort songs
  const handleSortChange = (method: 'recent' | 'title' | 'artist') => {
    setSortMethod(method);
    setLikedSongs(prev => sortSongs([...prev], method));
  };

  // Filtered view for display
  const visibleSongs = filterQuery.trim()
    ? likedSongs.filter((s) =>
        `${s.title} ${s.artist}`.toLowerCase().includes(filterQuery.toLowerCase())
      )
    : likedSongs;

  // Manual sync function for retry button
  // Removed unused manual sync helper

  // Debug function to log player state
  // Removed unused debugPlayerState to reduce noise

  // Play all liked songs function - remove debugPlayerState() call  
  const playAllSongs = () => {
    if (likedSongs.length > 0) {
      const playerSongs = likedSongs.map(adaptToPlayerSong);
      
      // Use playAlbum directly with an index of 0
      usePlayerStore.getState().playAlbum(playerSongs, 0);
      
      // Force play state immediately to true regardless of autoplay setting
      setTimeout(() => {
        const store = usePlayerStore.getState();
        store.setIsPlaying(true);
        store.setUserInteracted(); // Ensure user is marked as interacted
      }, 100);
    }
  };
  
  // Smart shuffle function - remove debugPlayerState() call
  const smartShuffle = () => {
    if (likedSongs.length > 0) {
      // Create a copy of the songs array to shuffle
      const songsToShuffle = [...likedSongs];
      
      // Fisher-Yates shuffle algorithm
      for (let i = songsToShuffle.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [songsToShuffle[i], songsToShuffle[j]] = [songsToShuffle[j], songsToShuffle[i]];
      }
      
      const shuffledPlayerSongs = songsToShuffle.map(adaptToPlayerSong);
      
      // Play the shuffled songs
      usePlayerStore.getState().playAlbum(shuffledPlayerSongs, 0);
      
      // Force play state
      setTimeout(() => {
        const store = usePlayerStore.getState();
        store.setIsPlaying(true);
        store.setUserInteracted();
        toast.success("Shuffling your liked songs");
      }, 100);
    }
  };

  // Handle playing a specific song - remove debugPlayerState() call
  const playSong = (song: any, index: number) => {
    const playerSongs = likedSongs.map(adaptToPlayerSong);
    
    if (currentSong && currentSong._id === song.id) {
      togglePlay();
    } else {
      // Use playAlbum directly with the specific index
      usePlayerStore.getState().playAlbum(playerSongs, index);
      
      // Force play state immediately to true regardless of autoplay setting
      setTimeout(() => {
        const store = usePlayerStore.getState();
        store.setIsPlaying(true);
        store.setUserInteracted(); // Ensure user is marked as interacted
      }, 100);
    }
  };

  // Check if a song is currently playing
  const isSongPlaying = (song: any) => {
    return isPlaying && currentSong && currentSong._id === song.id;
  };

  // Unlike a song
  const unlikeSong = (id: string) => {
    // Call the service to remove the song from liked songs
    removeLikedSong(id);
    
    // Update local state immediately for instant UI feedback
    setLikedSongs(prev => prev.filter(song => song.id !== id));
    
    // Dispatch detailed events for better listener handling
    document.dispatchEvent(new CustomEvent('likedSongsUpdated', { 
      detail: {
        songId: id,
        isLiked: false,
        timestamp: Date.now(),
        source: 'LikedSongsPage'
      }
    }));
    
    document.dispatchEvent(new CustomEvent('songLikeStateChanged', { 
      detail: {
        songId: id,
        isLiked: false,
        timestamp: Date.now(),
        source: 'LikedSongsPage'
      }
    }));
    
    toast.success('Removed from Liked Songs');
  };

  // Removed header opacity tracking
  const handleScroll = useCallback(() => {
    // no-op
  }, []);

  // Add touch handlers for pull-to-refresh
  const handleTouchStart = (e: React.TouchEvent) => {
    if (scrollRef.current?.scrollTop === 0) {
      setTouchStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY !== null && scrollRef.current?.scrollTop === 0) {
      const touchDiff = e.touches[0].clientY - touchStartY;
      if (touchDiff > 70 && !refreshing) {
        setRefreshing(true);
        loadAndSetLikedSongs().then(() => {
          setTimeout(() => setRefreshing(false), 1000);
        });
      }
    }
  };

  const handleTouchEnd = () => {
    setTouchStartY(null);
  };

  // Check for mobile viewport
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Empty state component when no liked songs
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center h-[50vh]">
      <div className="w-24 h-24 bg-gradient-to-br from-indigo-600 to-blue-400 rounded-full flex items-center justify-center mb-6">
        <Heart className="w-12 h-12 text-white" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Songs you like will appear here</h2>
      <p className="text-zinc-400 max-w-md mb-6">
        Save songs by tapping the heart icon.
      </p>
      <Button 
        variant="outline" 
        className="bg-white/10 text-white hover:bg-white/20 border-0"
        onClick={() => window.location.href = '/search'}
      >
        Find songs
      </Button>
    </div>
  );

  // Skeleton loader for songs
  const SkeletonLoader = () => (
    <div className="space-y-2 animate-pulse pb-8">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="grid grid-cols-[16px_1fr_auto] md:grid-cols-[16px_4fr_2fr_1fr_auto] gap-4 p-2 hover:bg-white/5 group relative">
          <div className="w-4 h-4 bg-zinc-800 rounded-sm mx-auto self-center"></div>
          <div className="flex items-center min-w-0">
            <div className="w-10 h-10 bg-zinc-800 rounded mr-3"></div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="h-4 bg-zinc-800 rounded w-36"></div>
              <div className="h-3 bg-zinc-800/70 rounded w-24"></div>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="h-4 bg-zinc-800 rounded w-24"></div>
          </div>
          <div className="hidden md:flex justify-end">
            <div className="h-4 bg-zinc-800 rounded w-10"></div>
          </div>
          <div className="flex justify-end gap-2">
            <div className="h-8 w-8 rounded-full bg-zinc-800/40"></div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <main className="h-full bg-background">
      {/* Removed fixed header bar to avoid overlap with top mobile nav; back button added inline above */}

      {/* Pull to refresh indicator */}
      {refreshing && (
        <div className="absolute top-0 left-0 right-0 z-20 flex justify-center items-center py-2 bg-indigo-900/80 text-white text-sm">
          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
          Refreshing...
        </div>
      )}

      {/* Scrollable content */}
      <ScrollArea 
        className="h-full no-scrollbar" 
        ref={scrollRef}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className={cn("pt-0", isMobile ? "px-0" : "px-4 sm:px-6")}>
          {/* Header with gradient background */}
          <div className={cn(
            "relative z-0 py-4 mb-3 spotify-mobile-liked-header",
            isMobile ? "px-4 pt-0" : "rounded-t-lg px-4 sm:px-6"
          )}>
            <div className={cn(
              "flex flex-col mb-6 gap-3",
              isMobile ? "items-start" : "sm:flex-row sm:items-end"
            )}>
              {isMobile ? (
                <>
                  {/* Search and Sort row */}
                  <div className="w-full mb-3 flex items-center gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        value={filterQuery}
                        onChange={(e) => setFilterQuery(e.target.value)}
                        placeholder="Find in Liked Songs"
                        className="w-full h-10 rounded-lg pl-10 pr-3 text-[15px] bg-card text-foreground placeholder:text-muted-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-10 px-4 rounded-lg bg-card text-foreground hover:bg-accent border border-border"
                        >
                          Sort
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 bg-popover text-popover-foreground border border-border">
                        <DropdownMenuItem onClick={() => handleSortChange('recent')}>Recent</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSortChange('title')}>Title</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSortChange('artist')}>Artist</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="w-full mb-1">
                    <h1 className="text-3xl font-bold mb-1 text-foreground">Liked Songs</h1>
                    <p className="text-sm text-muted-foreground">{likedSongs.length} songs</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex-shrink-0 bg-gradient-to-br from-indigo-600 to-blue-400 rounded-lg shadow-xl flex items-center justify-center w-48 h-48">
                    <Heart className="text-white w-24 h-24" />
                  </div>
                  <div className="flex-1 min-w-0 text-center sm:text-left">
                    <p className="text-xs uppercase font-medium mb-2 text-muted-foreground">Playlist</p>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 text-foreground">Liked Songs</h1>
                    <div className="flex-col sm:flex-row sm:items-center">
                      <p className="text-muted-foreground">
                        {isLoading 
                          ? 'Loading songs...' 
                          : `${likedSongs.length} songs${isAuthenticated && syncedWithServer && !syncError ? ' · Synced' : ''}`
                        }
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
            
            {likedSongs.length > 0 && isMobile && (
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs px-6 py-1 h-9 border border-border text-foreground hover:bg-accent"
                  onClick={smartShuffle}
                >
                  <Shuffle className="h-3.5 w-3.5 mr-2" />
                  <span className="font-normal">Shuffle</span>
                </Button>
                <Button 
                  onClick={playAllSongs}
                  className="bg-green-500 hover:bg-green-400 text-black rounded-full h-14 w-14 flex items-center justify-center shadow-lg"
                >
                  <Play className="h-7 w-7 ml-0.5" />
                </Button>
              </div>
            )}
          </div>
          
          {/* Table Header - show only on desktop */}
          {likedSongs.length > 0 && !isLoading && !isMobile && (
            <div className="grid grid-cols-[16px_1fr_auto] md:grid-cols-[16px_4fr_2fr_1fr_auto] gap-4 py-2 px-4 text-sm font-medium text-zinc-400 border-b border-zinc-800">
              <div className="text-center">#</div>
              <div className="flex items-center gap-2">
                TITLE
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={`h-6 w-6 ${sortMethod === 'title' ? 'text-green-500' : 'text-zinc-400'}`}
                  onClick={() => handleSortChange('title')}
                >
                  <ArrowDownUp className="h-3 w-3" />
                </Button>
              </div>
              <div className="hidden md:flex items-center gap-2">
                DATE ADDED
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={`h-6 w-6 ${sortMethod === 'recent' ? 'text-green-500' : 'text-zinc-400'}`}
                  onClick={() => handleSortChange('recent')}
                >
                  <ArrowDownUp className="h-3 w-3" />
                </Button>
              </div>
              <div className="hidden md:flex justify-end items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={`h-6 w-6 ${sortMethod === 'recent' ? 'text-green-500' : 'text-zinc-400'}`}
                  onClick={() => handleSortChange('recent')}
                  title="Sort by recently liked"
                >
                  <Calendar className="h-3 w-3" />
                </Button>
                <Clock className="h-4 w-4 inline" />
              </div>
              <div></div>
            </div>
          )}
          
          {/* Song list or empty state */}
          {isLoading ? (
            <SkeletonLoader />
          ) : likedSongs.length > 0 ? (
            <div className={cn("pb-4", isMobile ? "pt-3 px-3" : "")}>
              {visibleSongs.map((song, index) => (
                <div 
                  key={song.id}
                  onClick={() => playSong(song, index)}
                  className="cursor-pointer"
                >
                  <TouchRipple 
                    color="rgba(255, 255, 255, 0.05)"
                    className="rounded-md"
                  >
                    <div className={cn(
                      "group relative hover:bg-white/5 rounded-md",
                      isMobile 
                        ? "grid grid-cols-[1fr_auto] gap-3 p-2 spotify-liked-song-row" 
                        : "grid grid-cols-[16px_4fr_2fr_1fr_auto] gap-4 p-2 px-4 spotify-desktop-song-row"
                    )}>
                      {/* Index number - desktop only */}
                      {!isMobile && (
                        <div className="flex items-center justify-center text-sm text-zinc-400 group-hover:text-white">
                          {isSongPlaying(song) ? (
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          ) : (
                            index + 1
                          )}
                        </div>
                      )}
                      
                      {/* Title and artist column */}
                      <div className="flex items-center min-w-0">
                        <div className={cn(
                          "flex-shrink-0 overflow-hidden mr-3 rounded-md shadow",
                          isMobile ? "w-12 h-12" : "w-10 h-10"
                        )}>
                          {song.imageUrl ? (
                            <img 
                              src={song.imageUrl} 
                              alt={song.title} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = '';
                                e.currentTarget.style.background = 'linear-gradient(135deg, #8a2387, #e94057, #f27121)';
                                e.currentTarget.parentElement!.innerHTML = `<div class="w-full h-full flex items-center justify-center">
                                  <Music class="h-5 w-5 text-zinc-400" />
                                </div>`;
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center">
                              <Music className="h-5 w-5 text-zinc-100" />
                            </div>
                          )}
                        </div>
                        
                        <div className="min-w-0 pr-2">
                          <p className={`font-medium truncate ${isSongPlaying(song) ? 'text-green-500' : 'text-foreground'}`}>
                            {song.title}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                        </div>
                      </div>
                      
                      {/* Date added column - desktop only */}
                      {!isMobile && (
                        <div className="hidden md:flex items-center text-zinc-400 text-sm desktop-date-column">
                          <span className="truncate">
                            {song.dateAdded 
                              ? new Date(song.dateAdded).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                              : new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                            }
                          </span>
                        </div>
                      )}
                      
                      {/* Duration column - desktop only */}
                      {!isMobile && (
                        <div className="hidden md:flex items-center justify-end text-zinc-400 text-sm desktop-duration-column">
                          {song.duration ? formatTime(song.duration) : "--:--"}
                        </div>
                      )}
                      
                      {/* Actions column */}
                      <div className="flex items-center justify-end">
                        {!isMobile && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600 dark:hover:text-red-400"
                            onClick={(e) => {
                              e.stopPropagation();
                              unlikeSong(song.id);
                            }}
                            aria-label="Unlike song"
                          >
                            <Heart className="fill-current h-4 w-4" />
                          </Button>
                        )}
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "text-muted-foreground hover:text-foreground",
                                isMobile ? "h-8 w-8" : "h-8 w-8"
                              )}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className={isMobile ? "h-5 w-5" : "h-4 w-4"} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              unlikeSong(song.id);
                            }}>
                              Remove from Liked Songs
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              if (navigator.clipboard) {
                                navigator.clipboard.writeText(`${song.title} by ${song.artist}`);
                                toast.success('Copied to clipboard');
                              }
                            }}>
                              Copy song info
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              playSong(song, index);
                            }}>
                              {isSongPlaying(song) ? 'Pause' : 'Play'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {isMobile && isSongPlaying(song) && (
                        <div className="absolute right-12 flex items-center">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        </div>
                      )}
                    </div>
                  </TouchRipple>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
        </div>
      </ScrollArea>
    </main>
  );
};

export default LikedSongsPage; 