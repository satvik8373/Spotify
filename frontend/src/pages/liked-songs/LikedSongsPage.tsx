import { useEffect, useState, useMemo, startTransition } from 'react';
import { Heart, Play, Pause, Clock, MoreHorizontal, ArrowDownUp, Shuffle, Search, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { loadLikedSongs } from '@/services/likedSongsService';
import { isAuthenticated as isSpotifyAuthenticated } from '@/services/spotifyService';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useLikedSongsStore } from '@/stores/useLikedSongsStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { Song } from '@/types';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import SpotifyLogin from '@/components/SpotifyLogin';
import { SpotifyImportDialog } from '@/components/SpotifyImportDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { TouchRipple } from '@/components/ui/touch-ripple';

// Add CSS for desktop view
import './liked-songs.css';
import SwipeableSongItem from '@/components/SwipeableSongItem';

// Convert liked song format to player song format (same as playlist logic)
const adaptToPlayerSong = (likedSong: any): Song => {
  return {
    _id: likedSong._id || likedSong.id,
    title: likedSong.title || 'Unknown Title',
    artist: likedSong.artist || 'Unknown Artist',
    audioUrl: likedSong.audioUrl || '',
    imageUrl: likedSong.imageUrl || '',
    duration: likedSong.duration || 0,
    albumId: likedSong.albumId || null,
    createdAt: likedSong.createdAt || new Date().toISOString(),
    updatedAt: likedSong.updatedAt || new Date().toISOString()
  };
};

// Format time
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

// Skeleton loader component
const SkeletonLoader = () => (
  <div className="space-y-3 p-4">
    {[...Array(8)].map((_, i) => (
      <div key={i} className="flex items-center gap-3">
        <div className="h-12 w-12 bg-gray-700 rounded-md animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-700 rounded animate-pulse w-3/4" />
          <div className="h-3 bg-gray-700 rounded animate-pulse w-1/2" />
        </div>
        <div className="h-4 bg-gray-700 rounded animate-pulse w-12" />
      </div>
    ))}
  </div>
);

const LikedSongsPage = () => {
  const [likedSongs, setLikedSongs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [filterQuery, setFilterQuery] = useState('');
  const [showSpotifyImport, setShowSpotifyImport] = useState(false);

  const { currentSong, isPlaying, togglePlay } = usePlayerStore();
  const { removeLikedSong: removeFromStore } = useLikedSongsStore();
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

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load liked songs from Firestore
  const loadAndSetLikedSongs = async () => {
    setIsLoading(true);
    try {
      const songs = await loadLikedSongs();
      console.log('📥 Loaded liked songs:', songs.length);
      startTransition(() => {
        setLikedSongs(songs);
      });
    } catch (error) {
      console.error('Error loading liked songs:', error);
      toast.error('Failed to load liked songs');
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
        return sortedSongs; // Already sorted by likedAt desc from Firestore
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
    setLikedSongs(prev => sortSongs([...prev], method));
  };

  // Filtered view for display
  const visibleSongs = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    const filtered = !q ? likedSongs : likedSongs.filter((s) => 
      `${s.title} ${s.artist}`.toLowerCase().includes(q)
    );
    return filtered;
  }, [likedSongs, filterQuery]);

  // Play all liked songs function
  const playAllSongs = () => {
    if (likedSongs.length > 0) {
      const playerSongs = likedSongs.map(adaptToPlayerSong);
      usePlayerStore.getState().playAlbum(playerSongs, 0);

      setTimeout(() => {
        const store = usePlayerStore.getState();
        store.setIsPlaying(true);
        store.setUserInteracted();
      }, 100);
    }
  };

  // Smart shuffle function
  const smartShuffle = () => {
    if (likedSongs.length > 0) {
      const songsToShuffle = [...likedSongs];

      // Fisher-Yates shuffle algorithm
      for (let i = songsToShuffle.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [songsToShuffle[i], songsToShuffle[j]] = [songsToShuffle[j], songsToShuffle[i]];
      }

      const shuffledPlayerSongs = songsToShuffle.map(adaptToPlayerSong);
      usePlayerStore.getState().playAlbum(shuffledPlayerSongs, 0);

      setTimeout(() => {
        const store = usePlayerStore.getState();
        store.setIsPlaying(true);
        store.setUserInteracted();
        toast.success("Shuffling your liked songs");
      }, 100);
    }
  };

  // Handle playing a specific song
  const playSong = (song: any, index: number) => {
    const sourceSongs = visibleSongs;
    const songId = song._id || song.id;

    // If clicking the currently playing song, just toggle play/pause
    if (currentSong && currentSong._id === songId) {
      togglePlay();
      return;
    }

    // Convert to player format
    const playerSongs = sourceSongs.map(adaptToPlayerSong);
    usePlayerStore.getState().playAlbum(playerSongs, index);

    setTimeout(() => {
      const store = usePlayerStore.getState();
      store.setIsPlaying(true);
      store.setUserInteracted();
    }, 50);
  };

  // Check if a song is currently playing
  const isSongPlaying = (song: any) => {
    if (!isPlaying || !currentSong) return false;
    const songId = song._id || song.id;
    return currentSong._id === songId;
  };

  // Unlike a song
  const unlikeSong = async (songId: string) => {
    try {
      await removeFromStore(songId);
      setLikedSongs(prev => prev.filter(song => (song._id || song.id) !== songId));
      toast.success('Removed from Liked Songs');
    } catch (error) {
      console.error('Error removing song:', error);
      toast.error('Failed to remove song');
    }
  };

  return (
    <div className={cn(
      "min-h-screen text-white relative",
      isMobile ? "pb-24" : "pb-32"
    )}>
      {/* Header */}
      <div className={cn(
        "sticky top-0 z-10 backdrop-blur-md bg-black/20 border-b border-white/10",
        isMobile ? "px-4 py-3" : "px-8 py-6"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn(
              "bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center",
              isMobile ? "h-12 w-12" : "h-16 w-16"
            )}>
              <Heart className={cn("text-white fill-current", isMobile ? "h-6 w-6" : "h-8 w-8")} />
            </div>
            <div>
              <h1 className={cn("font-bold", isMobile ? "text-xl" : "text-3xl")}>
                Liked Songs
              </h1>
              <p className={cn("text-gray-400", isMobile ? "text-sm" : "text-base")}>
                {likedSongs.length} songs
              </p>
            </div>
          </div>

          {/* Spotify Actions */}
          <div className="flex items-center gap-2">
            {isSpotifyAuthenticated() ? (
              <Button
                onClick={() => setShowSpotifyImport(true)}
                variant="outline"
                size={isMobile ? "sm" : "default"}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                {isMobile ? "Import" : "Import from Spotify"}
              </Button>
            ) : (
              <SpotifyLogin />
            )}
          </div>
        </div>

        {/* Controls */}
        {likedSongs.length > 0 && (
          <div className={cn("flex items-center gap-4 mt-4", isMobile && "flex-wrap")}>
            <Button
              onClick={playAllSongs}
              size={isMobile ? "sm" : "lg"}
              className="bg-green-500 hover:bg-green-600 text-black font-semibold gap-2"
            >
              <Play className="h-4 w-4 fill-current" />
              Play
            </Button>
            
            <Button
              onClick={smartShuffle}
              variant="outline"
              size={isMobile ? "sm" : "default"}
              className="gap-2"
            >
              <Shuffle className="h-4 w-4" />
              Shuffle
            </Button>

            {/* Sort dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size={isMobile ? "sm" : "default"} className="gap-2">
                  <ArrowDownUp className="h-4 w-4" />
                  Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleSortChange('recent')}>
                  Recently Added
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortChange('title')}>
                  Title
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortChange('artist')}>
                  Artist
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Search */}
        {likedSongs.length > 0 && (
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search in liked songs..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-400"
              />
              {filterQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilterQuery('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1">
        {/* Desktop table header */}
        {!isMobile && likedSongs.length > 0 && (
          <div className="grid grid-cols-[16px_4fr_2fr_1fr_auto] gap-4 p-4 px-8 text-sm text-gray-400 border-b border-white/10">
            <div>#</div>
            <div>TITLE</div>
            <div>ARTIST</div>
            <div><Clock className="h-4 w-4" /></div>
            <div></div>
          </div>
        )}

        {/* Song list or empty state */}
        {isLoading ? (
          <SkeletonLoader />
        ) : likedSongs.length > 0 ? (
          <div className={cn("pb-8", isMobile ? "pt-3 px-3" : "")}>
            {visibleSongs.map((song, index) => {
              const songKey = song._id || song.id || `song-${index}`;

              return (
                <SwipeableSongItem
                  key={songKey}
                  onSwipeRight={() => {
                    const playerSong = adaptToPlayerSong(song);
                    usePlayerStore.getState().playNextInQueue(playerSong);
                    toast.success(
                      `Added "${song.title}" to play next`,
                      {
                        duration: 2000,
                        icon: '🎵',
                      }
                    );
                  }}
                >
                  <div
                    onClick={() => playSong(song, index)}
                    className="cursor-pointer"
                  >
                    <TouchRipple
                      color="rgba(255, 255, 255, 0.05)"
                      className="rounded-md"
                    >
                      <div className={cn(
                        "group relative hover:bg-white/5 rounded-md transition-colors",
                        isMobile
                          ? "grid grid-cols-[auto_1fr_auto] gap-2 p-2"
                          : "grid grid-cols-[16px_4fr_2fr_1fr_auto] gap-4 p-2 px-4"
                      )}>
                        {/* Index number / Play button - desktop only */}
                        {!isMobile && (
                          <div className="flex items-center justify-center text-sm text-zinc-400 group-hover:text-white">
                            {isSongPlaying(song) ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-green-500 hover:text-green-400 hover:scale-110 transition-all"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  togglePlay();
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
                                  className="h-8 w-8 hidden group-hover:flex hover:scale-110 transition-all"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    playSong(song, index);
                                  }}
                                >
                                  <Play className="h-4 w-4 fill-current" />
                                </Button>
                              </>
                            )}
                          </div>
                        )}

                        {/* Play/Pause icon for mobile */}
                        {isMobile && (
                          <div className="flex items-center justify-center">
                            {isSongPlaying(song) ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 text-green-500 hover:text-green-400"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  togglePlay();
                                }}
                              >
                                <Pause className="h-5 w-5 fill-current" />
                              </Button>
                            ) : (
                              <div className="h-10 w-10 flex items-center justify-center">
                                <span className="text-sm text-zinc-400">{index + 1}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Title and artist column */}
                        <div className="flex items-center min-w-0">
                          <div className={cn(
                            "flex-shrink-0 overflow-hidden mr-3 rounded-md shadow",
                            isMobile ? "w-12 h-12" : "w-10 h-10"
                          )}>
                            <img
                              src={song.imageUrl || '/placeholder-album.png'}
                              alt={song.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/placeholder-album.png';
                              }}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={cn(
                              "font-medium truncate",
                              isSongPlaying(song) ? "text-green-500" : "text-white",
                              isMobile ? "text-sm" : "text-base"
                            )}>
                              {song.title}
                            </p>
                            {isMobile && (
                              <p className="text-xs text-zinc-400 truncate">
                                {song.artist}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Artist column - desktop only */}
                        {!isMobile && (
                          <div className="flex items-center min-w-0">
                            <p className="text-zinc-400 truncate text-sm">
                              {song.artist}
                            </p>
                          </div>
                        )}

                        {/* Duration column */}
                        <div className="flex items-center justify-end">
                          <span className={cn(
                            "text-zinc-400",
                            isMobile ? "text-xs" : "text-sm"
                          )}>
                            {formatTime(song.duration || 0)}
                          </span>
                        </div>

                        {/* More options */}
                        <div className="flex items-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                  "text-zinc-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity",
                                  isMobile ? "h-8 w-8" : "h-6 w-6"
                                )}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  unlikeSong(song._id || song.id);
                                }}
                                className="text-red-500"
                              >
                                Remove from Liked Songs
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </TouchRipple>
                  </div>
                </SwipeableSongItem>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="text-center max-w-md">
              <Heart className="mx-auto h-16 w-16 text-gray-600 mb-4" />
              <h2 className="text-2xl font-bold mb-2">No liked songs yet</h2>
              <p className="text-gray-400 mb-6">
                Songs you like will appear here. Start exploring music to build your collection!
              </p>
              
              {/* Simple call to action */}
              <p className="text-sm text-gray-500">
                {isSpotifyAuthenticated() 
                  ? "Use the Import button above to add songs from Spotify"
                  : "Connect your Spotify account above to import your liked songs"
                }
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Spotify Import Dialog */}
      <SpotifyImportDialog
        isOpen={showSpotifyImport}
        onClose={() => setShowSpotifyImport(false)}
      />
    </div>
  );
};

export default LikedSongsPage;