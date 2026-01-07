import { useEffect, useState, useMemo } from 'react';
import { Heart, Music, Play, Pause, Clock, MoreHorizontal, ArrowDownUp, Shuffle, Search, Plus, FileText } from 'lucide-react';
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
import './liked-songs.css';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

// Format time
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const LikedSongsPage = () => {
  const [likedSongs, setLikedSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sortMethod, setSortMethod] = useState<'recent' | 'title' | 'artist'>('recent');
  const [filterQuery, setFilterQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);

  const { currentSong, isPlaying, togglePlay, playAlbum, setIsPlaying, setUserInteracted } = usePlayerStore();
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

  const loadAndSetLikedSongs = async () => {
    if (!isAuthenticated) {
      setLikedSongs([]);
      return;
    }

    try {
      setIsLoading(true);
      const songs = await loadLikedSongs();
      setLikedSongs(songs);
    } catch (error) {
      console.error('Error loading liked songs:', error);
      toast.error('Failed to load liked songs');
    } finally {
      setIsLoading(false);
    }
  };

  // Sort songs based on selected method
  const sortSongs = (songs: Song[], method: 'recent' | 'title' | 'artist') => {
    if (!songs || songs.length === 0) return [];

    const sortedSongs = [...songs];

    switch (method) {
      case 'recent':
        // Most recent first (default Firestore order)
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

  // Filtered and sorted songs for display
  const visibleSongs = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    const filtered = !q ? likedSongs : likedSongs.filter((s) => 
      `${s.title} ${s.artist}`.toLowerCase().includes(q)
    );
    return sortSongs(filtered, sortMethod);
  }, [likedSongs, filterQuery, sortMethod]);

  // Play all liked songs
  const playAllSongs = () => {
    if (likedSongs.length > 0) {
      playAlbum(likedSongs, 0);
      setTimeout(() => {
        setIsPlaying(true);
        setUserInteracted();
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

      playAlbum(songsToShuffle, 0);
      setTimeout(() => {
        setIsPlaying(true);
        setUserInteracted();
        toast.success("Shuffling your liked songs");
      }, 100);
    }
  };

  // Handle playing a specific song
  const playSong = (song: Song, index: number) => {
    const songId = song._id;

    // If clicking the currently playing song, just toggle play/pause
    if (currentSong && currentSong._id === songId) {
      togglePlay();
      return;
    }

    // Set up the queue and play from the correct index
    playAlbum(visibleSongs, index);

    setTimeout(() => {
      setIsPlaying(true);
      setUserInteracted();
    }, 50);
  };

  // Check if a song is currently playing
  const isSongPlaying = (song: Song) => {
    if (!isPlaying || !currentSong) return false;
    return currentSong._id === song._id;
  };

  // Unlike a song
  const unlikeSong = async (songId: string) => {
    try {
      await removeLikedSong(songId);
      setLikedSongs(prev => prev.filter(song => song._id !== songId));
      toast.success('Removed from Liked Songs');
    } catch (error) {
      toast.error('Failed to remove song');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Heart className="h-16 w-16 text-zinc-400 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Sign in to see your liked songs</h2>
        <p className="text-zinc-400">Create an account to save your favorite music</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black text-white">
      {/* Header */}
      <div className="relative">
        <div className="bg-gradient-to-b from-purple-800/40 to-transparent p-6 pb-8">
          <div className="flex items-end gap-6">
            <div className="w-48 h-48 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg shadow-2xl flex items-center justify-center">
              <Heart className="h-20 w-20 text-white fill-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white/70 mb-2">Playlist</p>
              <h1 className="text-4xl md:text-6xl font-bold mb-4">Liked Songs</h1>
              <div className="flex items-center gap-2 text-sm text-white/70">
                <span>{likedSongs.length} songs</span>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="px-6 pb-4 flex items-center gap-4">
          <Button
            size="icon"
            className="h-14 w-14 bg-green-500 hover:bg-green-400 rounded-full"
            onClick={playAllSongs}
            disabled={likedSongs.length === 0}
          >
            <Play className="h-6 w-6 fill-current" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            onClick={smartShuffle}
            disabled={likedSongs.length === 0}
          >
            <Shuffle className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="h-5 w-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10">
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

      {/* Search */}
      {likedSongs.length > 0 && (
        <div className="px-6 pb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search in liked songs"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="pl-10 bg-zinc-800/50 border-zinc-700"
            />
          </div>
        </div>
      )}

      {/* Songs List */}
      <div className="px-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : likedSongs.length > 0 ? (
          <div className="pb-8">
            {/* Desktop header */}
            {!isMobile && (
              <div className="grid grid-cols-[16px_4fr_2fr_1fr_auto] gap-4 px-4 py-2 text-sm text-zinc-400 border-b border-zinc-800 mb-2">
                <div>#</div>
                <div>Title</div>
                <div>Artist</div>
                <div><Clock className="h-4 w-4" /></div>
                <div></div>
              </div>
            )}

            {visibleSongs.map((song, index) => (
              <div
                key={song._id}
                onClick={() => playSong(song, index)}
                className={cn(
                  "group relative hover:bg-white/5 rounded-md transition-colors cursor-pointer",
                  isMobile
                    ? "grid grid-cols-[auto_1fr_auto] gap-2 p-2"
                    : "grid grid-cols-[16px_4fr_2fr_1fr_auto] gap-4 p-2 px-4"
                )}
              >
                {/* Index/Play button */}
                {!isMobile && (
                  <div className="flex items-center justify-center text-sm text-zinc-400 group-hover:text-white">
                    {isSongPlaying(song) ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-green-500 hover:text-green-400"
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
                          className="h-8 w-8 hidden group-hover:flex"
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

                {/* Mobile play button */}
                {isMobile && (
                  <div className="flex items-center justify-center">
                    {isSongPlaying(song) ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-green-500"
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

                {/* Song info */}
                <div className="flex items-center min-w-0">
                  <div className={cn(
                    "flex-shrink-0 overflow-hidden mr-3 rounded-md shadow relative",
                    isMobile ? "w-12 h-12" : "w-10 h-10"
                  )}>
                    <img
                      src={song.imageUrl || '/placeholder-song.jpg'}
                      alt={song.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder-song.jpg';
                      }}
                    />
                    {/* Source indicator - show Spotify icon for Spotify-synced songs */}
                    {(song as any).source === 'spotify' && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                        <Music className="h-2 w-2 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={cn(
                      "font-medium truncate",
                      isSongPlaying(song) ? "text-green-500" : "text-white"
                    )}>
                      {song.title}
                    </div>
                    {isMobile && (
                      <div className="text-sm text-zinc-400 truncate">
                        {song.artist}
                      </div>
                    )}
                  </div>
                </div>

                {/* Desktop artist */}
                {!isMobile && (
                  <div className="flex items-center text-zinc-400 truncate">
                    {song.artist}
                  </div>
                )}

                {/* Duration */}
                {!isMobile && (
                  <div className="flex items-center text-zinc-400 text-sm">
                    {formatTime(song.duration || 0)}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          unlikeSong(song._id);
                        }}
                        className="text-red-400"
                      >
                        <Heart className="h-4 w-4 mr-2" />
                        Remove from Liked Songs
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Heart className="h-16 w-16 text-zinc-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No liked songs yet</h3>
            <p className="text-zinc-400 mb-6">Songs you like will appear here</p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Songs
            </Button>
          </div>
        )}
      </div>

      {/* Add Songs Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Add Songs to Liked Songs</DialogTitle>
            <DialogDescription>
              Upload a file or sync from Spotify to add songs to your liked songs
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden">
            <Tabs defaultValue="upload" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-2">
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
                <ScrollArea className="h-full">
                  <LikedSongsFileUploader onClose={() => setShowAddDialog(false)} />
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="spotify" className="flex-1 overflow-auto">
                <ScrollArea className="h-full">
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