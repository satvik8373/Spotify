import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Heart, Music, Play, Pause, Clock, MoreHorizontal, ArrowDownUp, Shuffle, Search, Plus, FileText, ListPlus, User, RefreshCw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { loadLikedSongs, removeLikedSong } from '@/services/likedSongsService';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { Song } from '@/types';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { LikedSongsFileUploader } from '@/components/liked-songs/LikedSongsFileUploader';
import { SpotifyLikedSongsSync } from '@/components/liked-songs/SpotifyLikedSongsSync';
import { useSpotify } from '@/contexts/SpotifyContext';
import './liked-songs.css';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ContentLoading } from '@/components/ui/loading';

// Format time
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
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
  return (
    <div
      onClick={onPlay}
      className={cn(
        "group relative rounded-md cursor-pointer items-center",
        isMobile
          ? "flex gap-3 p-3 py-2 active:bg-muted/30"
          : "grid grid-cols-[16px_4fr_3fr_2fr_1fr_48px] gap-4 p-2 px-4 hover:bg-muted/50 transition-colors"
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
          "flex-shrink-0 overflow-hidden rounded shadow-md relative group/artwork",
          isMobile ? "w-14 h-14 mr-3" : "w-12 h-12 mr-3"
        )}>
          <img
            src={song.imageUrl || '/placeholder-song.jpg'}
            alt={song.title}
            className="w-full h-full object-cover transition-transform duration-200 group-hover/artwork:scale-105"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/placeholder-song.jpg';
            }}
          />
          {/* Source indicator - show Spotify icon for Spotify-synced songs */}
          {(song as any).source === 'spotify' && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center border-2 border-background">
              <Music className="h-2 w-2 text-white" />
            </div>
          )}
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
        <div className="flex-shrink-0">
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
          {song.albumId || 'Unknown Album'}
        </div>
      )}

      {/* Desktop date added */}
      {!isMobile && (
        <div className="flex items-center text-muted-foreground text-sm">
          {(song as any).likedAt ? 
            new Date((song as any).likedAt.toDate ? (song as any).likedAt.toDate() : (song as any).likedAt).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
              year: new Date().getFullYear() !== new Date((song as any).likedAt.toDate ? (song as any).likedAt.toDate() : (song as any).likedAt).getFullYear() ? 'numeric' : undefined
            }) :
            new Date().toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric'
            })
          }
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
});

MemoizedSongItem.displayName = 'MemoizedSongItem';

const LikedSongsPage = () => {
  const [likedSongs, setLikedSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sortMethod, setSortMethod] = useState<'recent' | 'title' | 'artist'>('recent');
  const [filterQuery, setFilterQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'spotify'>('upload');

  const { currentSong, isPlaying, togglePlay, playAlbum, setIsPlaying, setUserInteracted } = usePlayerStore();
  const { isAuthenticated } = useAuthStore();
  const { isAuthenticated: isSpotifyConnected, fetchSavedTracks } = useSpotify();

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
      setLikedSongs([]);
      return;
    }

    try {
      // Show content immediately, load data in background
      setIsLoading(false);
      const songs = await loadLikedSongs();
      setLikedSongs(songs);
    } catch (error) {
      console.error('Error loading liked songs:', error);
      toast.error('Failed to load liked songs');
      setIsLoading(false);
    }
  };

  // Optimized sort function with memoization
  const sortSongs = useCallback((songs: Song[], method: 'recent' | 'title' | 'artist') => {
    if (!songs || songs.length === 0) return [];

    // Use a more efficient sorting approach
    switch (method) {
      case 'recent':
        // Songs are already ordered by likedAt desc from Firestore
        return songs;
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

  // Memoized callbacks to prevent child re-renders
  const handlePlaySong = useCallback((song: Song, index: number) => {
    const songId = song._id;

    if (currentSong && currentSong._id === songId) {
      togglePlay();
      return;
    }

    playAlbum(visibleSongs, index);
    setTimeout(() => {
      setIsPlaying(true);
      setUserInteracted();
    }, 50);
  }, [currentSong, togglePlay, playAlbum, visibleSongs, setIsPlaying, setUserInteracted]);

  const handleAddToQueue = useCallback((song: Song) => {
    const { addToQueue: addSongToQueue } = usePlayerStore.getState();
    addSongToQueue(song);
    toast.success(`Added "${song.title}" to queue`, {
      duration: 2000,
    });
  }, []);

  const handleUnlikeSong = useCallback(async (songId: string) => {
    try {
      await removeLikedSong(songId);
      setLikedSongs(prev => prev.filter(song => song._id !== songId));
      toast.success('Removed from Liked Songs');
    } catch (error) {
      toast.error('Failed to remove song');
    }
  }, []);

  const isSongPlaying = useCallback((song: Song) => {
    if (!isPlaying || !currentSong) return false;
    return currentSong._id === song._id;
  }, [isPlaying, currentSong]);

  // Update sort method and re-sort songs
  const handleSortChange = useCallback((method: 'recent' | 'title' | 'artist') => {
    setSortMethod(method);
  }, []);

  // Play all liked songs
  const playAllSongs = useCallback(() => {
    if (likedSongs.length > 0) {
      playAlbum(likedSongs, 0);
      setTimeout(() => {
        setIsPlaying(true);
        setUserInteracted();
      }, 100);
    }
  }, [likedSongs, playAlbum, setIsPlaying, setUserInteracted]);

  // Smart shuffle function
  const smartShuffle = useCallback(() => {
    if (likedSongs.length > 0) {
      const songsToShuffle = [...likedSongs];
      
      // Fisher-Yates shuffle algorithm
      for (let i = songsToShuffle.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [songsToShuffle[i], songsToShuffle[j]] = [songsToShuffle[j], songsToShuffle[i]];
      }

      playAlbum(songsToShuffle, 0);
      setTimeout(() => {
        setIsPlaying(true);
        setUserInteracted();
        toast.success("Shuffling your liked songs");
      }, 100);
    }
  }, [likedSongs, playAlbum, setIsPlaying, setUserInteracted]);

  // Manual Spotify sync
  const handleManualSync = useCallback(async () => {
    if (!isSpotifyConnected) {
      toast.error('Please connect to Spotify first');
      return;
    }

    try {
      setIsLoading(true);
      toast.loading('Syncing with Spotify...', { id: 'manual-sync' });
      
      // Fetch saved tracks from Spotify
      const spotifyTracks = await fetchSavedTracks(50); // Get recent 50 tracks
      
      if (spotifyTracks.length === 0) {
        toast.success('No new tracks to sync', { id: 'manual-sync' });
        return;
      }

      // Process and add tracks (this would use the existing SpotifyLikedSongsSync logic)
      // For now, just show success message
      toast.success(`Found ${spotifyTracks.length} tracks from Spotify!`, { id: 'manual-sync' });
      
      // Open the dialog to the Spotify tab for detailed sync
      setActiveTab('spotify');
      setShowAddDialog(true);
      
    } catch (error) {
      console.error('Manual sync error:', error);
      toast.error('Failed to sync with Spotify', { id: 'manual-sync' });
    } finally {
      setIsLoading(false);
    }
  }, [isSpotifyConnected, fetchSavedTracks]);

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
    <div className="min-h-screen bg-background text-foreground">
      {/* Mobile Header */}
      {isMobile ? (
        <div className="relative">
          {/* Mobile gradient header - Spotify-like */}
          <div className="bg-gradient-to-b from-purple-600/80 via-purple-700/60 to-background px-4 pt-16 pb-6">
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

          {/* Mobile controls - Spotify-style */}
          <div className="px-4 pb-4 flex items-center justify-between bg-gradient-to-b from-background/20 to-background">
            <div className="flex items-center gap-4">
              <Button
                size="icon"
                className="h-14 w-14 rounded-full bg-green-500 hover:bg-green-400 shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-105"
                onClick={playAllSongs}
                disabled={likedSongs.length === 0}
              >
                <Play className="h-6 w-6 fill-current ml-0.5 text-black" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-white/80 hover:text-white hover:bg-white/10 hover:scale-105 transition-all duration-200"
                onClick={smartShuffle}
                disabled={likedSongs.length === 0}
              >
                <Shuffle className="h-5 w-5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-white/80 hover:text-white hover:bg-white/10 hover:scale-105 transition-all duration-200"
                onClick={() => {
                  setActiveTab('upload');
                  setShowAddDialog(true);
                }}
              >
                <Plus className="h-5 w-5" />
              </Button>

              {isSpotifyConnected && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 text-white/80 hover:text-white hover:bg-white/10 hover:scale-105 transition-all duration-200"
                  onClick={handleManualSync}
                  disabled={isLoading}
                  title="Sync with Spotify"
                >
                  <RefreshCw className={cn("h-5 w-5", isLoading && "animate-spin")} />
                </Button>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-white/70 hover:text-white hover:bg-white/10">
                  <MoreHorizontal className="h-4 w-4" />
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
                onClick={playAllSongs}
                disabled={likedSongs.length === 0}
              >
                <Play className="h-7 w-7 fill-current ml-1 text-black" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 text-white/80 hover:text-white hover:bg-white/10 hover:scale-105 transition-all duration-200"
                onClick={smartShuffle}
                disabled={likedSongs.length === 0}
              >
                <Shuffle className="h-6 w-6" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 text-white/80 hover:text-white hover:bg-white/10 hover:scale-105 transition-all duration-200"
                onClick={() => {
                  setActiveTab('upload');
                  setShowAddDialog(true);
                }}
              >
                <Plus className="h-6 w-6" />
              </Button>

              {isSpotifyConnected && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 text-white/70 hover:text-white hover:bg-white/10"
                  onClick={handleManualSync}
                  disabled={isLoading}
                  title="Sync with Spotify"
                >
                  <RefreshCw className={cn("h-5 w-5", isLoading && "animate-spin")} />
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10 text-white/70 hover:text-white hover:bg-white/10">
                    <MoreHorizontal className="h-5 w-5" />
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
        {isLoading ? (
          <div className="py-12"></div>
        ) : likedSongs.length > 0 ? (
          <div className={cn("pb-8", isMobile ? "pb-32" : "")}>
            {/* Desktop header */}
            {!isMobile && (
              <div className="grid grid-cols-[16px_4fr_3fr_2fr_1fr_48px] gap-4 px-4 py-2 text-sm text-muted-foreground border-b mb-2">
                <div>#</div>
                <div>Title</div>
                <div>Album</div>
                <div>Date added</div>
                <div><Clock className="h-4 w-4" /></div>
                <div></div>
              </div>
            )}

            {visibleSongs.map((song, index) => (
              <MemoizedSongItem
                key={song._id}
                song={song}
                index={index}
                isMobile={isMobile}
                isSongPlaying={isSongPlaying(song)}
                onPlay={() => handlePlaySong(song, index)}
                onTogglePlay={togglePlay}
                onAddToQueue={() => handleAddToQueue(song)}
                onUnlike={() => handleUnlikeSong(song._id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Heart className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No liked songs yet</h3>
            <p className="text-muted-foreground mb-6">Songs you like will appear here</p>
            <Button onClick={() => {
              setActiveTab('upload');
              setShowAddDialog(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Songs
            </Button>
          </div>
        )}
      </div>

      {/* Add Songs Dialog - Mobile optimized */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className={cn(
          "overflow-hidden",
          isMobile 
            ? "max-w-[95vw] max-h-[85vh] w-full h-full rounded-t-xl rounded-b-none fixed bottom-0 left-0 right-0 top-auto transform-none"
            : "max-w-4xl max-h-[80vh]"
        )}>
          <DialogHeader className={cn(isMobile ? "px-4 pt-4 pb-2" : "")}>
            <DialogTitle className={cn(isMobile ? "text-lg" : "")}>Add Songs to Liked Songs</DialogTitle>
            <DialogDescription className={cn(isMobile ? "text-sm" : "")}>
              Upload a file or sync from Spotify to add songs to your liked songs
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'upload' | 'spotify')} className="h-full flex flex-col">
              <TabsList className={cn(
                "grid w-full grid-cols-2",
                isMobile ? "mx-4 mb-2" : ""
              )}>
                <TabsTrigger value="upload" className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  <span>Upload File</span>
                </TabsTrigger>
                <TabsTrigger value="spotify" className="flex items-center gap-1">
                  <Music className="h-4 w-4" />
                  <span>Spotify Sync</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="upload" className="flex-1 overflow-auto">
                <ScrollArea className={cn("h-full", isMobile ? "px-4" : "")}>
                  <LikedSongsFileUploader onClose={() => setShowAddDialog(false)} />
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="spotify" className="flex-1 overflow-auto">
                <ScrollArea className={cn("h-full", isMobile ? "px-4" : "")}>
                  <SpotifyLikedSongsSync onClose={() => setShowAddDialog(false)} />
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LikedSongsPage;