import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePlaylistStore } from '../../stores/usePlaylistStore';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { useMusicStore } from '../../stores/useMusicStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { Button } from '../../components/ui/button';
import {
  Play,
  Pencil,
  MoreHorizontal,
  Share2,
  Clock,
  Plus,
  Search,
  Heart,
  ThumbsUp,
  Shuffle,
  Upload,
  FileText,
  Trash,
  Pause,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../../components/ui/dropdown-menu';
import { toast } from 'sonner';
import { EditPlaylistDialog } from '../../components/playlist/EditPlaylistDialog';
import { formatTime } from '../../utils/formatTime';
import { SongMenu } from '../../components/SongMenu';
import { Song } from '../../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { SongFileUploader } from '../../components/playlist/SongFileUploader';

function AddSongsDialog({
  isOpen,
  onClose,
  playlistId,
  initialTab,
}: {
  isOpen: boolean;
  onClose: () => void;
  playlistId: string;
  initialTab: 'search' | 'upload';
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'upload'>(initialTab);
  const { addSongToPlaylist } = usePlaylistStore();
  const {
    indianSearchResults,
    searchIndianSongs,
    isIndianMusicLoading,
    songs,
    convertIndianSongToAppSong,
  } = useMusicStore();

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setIsSearching(true);
      
      // Store the query for potential fallback use
      const query = searchQuery;
      
      searchIndianSongs(query)
        .then(() => {
          // Check if we got any results
          const results = useMusicStore.getState().indianSearchResults;
          if (results.length === 0) {
            // Create a fallback search result if no results found
            handleSearchFallback(query);
          }
        })
        .catch(() => {
          // Use fallback when search API fails
          handleSearchFallback(query);
        });
    }
  };

  // Provide fallback results when search fails
  const handleSearchFallback = (query: string) => {
    const fallbackResults = [
      {
        id: `fallback-${Date.now()}-1`,
        title: query,
        artist: 'Search Result',
        image: '/placeholder-song.jpg',
        url: '',
        duration: '180'
      }
    ];
    
    // Update the search results with fallback data
    useMusicStore.setState({ 
      indianSearchResults: fallbackResults,
      isIndianMusicLoading: false
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleAddSong = async (song: Song) => {
    try {
      await addSongToPlaylist(playlistId, song._id);
    } catch (error) {
      // Silent error handling
    }
  };

  const handleAddIndianSong = async (song: any) => {
    try {
      // Convert Indian song to app song format directly
      const convertedSong = useMusicStore.getState().convertIndianSongToAppSong(song);
      
      // Add converted song directly to playlist without validation notification
      await addSongToPlaylist(playlistId, convertedSong);
    } catch (error) {
      // Silent error handling
    }
  };

  const renderSongItem = (song: any, isIndian = false) => (
    <div
      key={song.id || song._id}
      className="flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors cursor-pointer group"
      onClick={() => (isIndian ? handleAddIndianSong(song) : handleAddSong(song))}
    >
      <div className="h-12 w-12 overflow-hidden rounded-md">
        <img
          src={song.imageUrl || song.image}
          alt={song.title}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex-1 flex flex-col">
        <span className="font-medium truncate">{song.title}</span>
        <span className="text-xs text-muted-foreground truncate">{song.artist}</span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Songs to Playlist</DialogTitle>
          <DialogDescription>
            Search for songs or upload a file to add them to your playlist
          </DialogDescription>
        </DialogHeader>

        <Tabs 
          defaultValue="search" 
          value={activeTab} 
          onValueChange={(value: string) => setActiveTab(value as 'search' | 'upload')}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search" className="flex items-center gap-1">
              <Search className="h-4 w-4" />
              <span>Search</span>
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span>Upload File</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="search" className="mt-4">
            <div className="relative">
              <Input
                placeholder="Search for songs..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pr-10"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={handleSearch}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="h-[400px] pr-4 mt-4">
              {isIndianMusicLoading ? (
                <div className="flex justify-center p-4">
                  <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
                </div>
              ) : (
                <>
                  {isSearching && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Search Results</h3>
                      {indianSearchResults.length > 0 ? (
                        indianSearchResults.map(song => renderSongItem(song, true))
                      ) : (
                        <p className="text-sm text-muted-foreground py-2">No results found</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="upload" className="mt-4">
            <SongFileUploader playlistId={playlistId} onClose={onClose} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Create a custom song context menu component that supports the "Find Audio" action
function PlaylistSongMenu({ song, onRemove, onFindAudio }: { 
  song: Song; 
  onRemove: (e: React.MouseEvent) => void;
  onFindAudio: (e: React.MouseEvent) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 p-0 rounded-full"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {!song.audioUrl && (
          <DropdownMenuItem onClick={onFindAudio}>
            <Search className="h-4 w-4 mr-2" />
            Find audio
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={onRemove} className="text-destructive focus:text-destructive-foreground">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2"
          >
            <path d="M3 6h18"></path>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
          </svg>
          Remove from playlist
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PlaylistPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userId, isAuthenticated } = useAuthStore();
  const { currentPlaylist, fetchPlaylistById, deletePlaylist, isLoading, removeSongFromPlaylist } =
    usePlaylistStore();
  const { playAlbum, isPlaying: playerIsPlaying, currentSong } = usePlayerStore();
  const { addSongToPlaylist } = usePlaylistStore();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddSongsDialog, setShowAddSongsDialog] = useState(false);
  const [addSongsDialogTab, setAddSongsDialogTab] = useState<'search' | 'upload'>('search');
  const [isLiked, setIsLiked] = useState(false);
  const [metrics, setMetrics] = useState({ likes: 0, shares: 0, plays: 0 });
  const [hasPlayed, setHasPlayed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [playingSongId, setPlayingSongId] = useState<string | null>(null);

  // New state for scroll behavior
  const [scrollPosition, setScrollPosition] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check if the current playlist is playing
  const isCurrentPlaylistPlaying = playerIsPlaying && 
    currentPlaylist?.songs.some(song => song._id === currentSong?._id);

  // Track shuffle state
  const [isShuffleOn, setIsShuffleOn] = useState(false);
  
  // Keep shuffle state in sync with player store
  useEffect(() => {
    // Initial state
    setIsShuffleOn(usePlayerStore.getState().isShuffled);
    
    // Subscribe to changes
    const unsubscribe = usePlayerStore.subscribe((state) => {
      setIsShuffleOn(state.isShuffled);
    });
    
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (id) {
      fetchPlaylistById(id);
      // Load metrics from localStorage
      try {
        const saved = localStorage.getItem('playlist_metrics') || '{}';
        const allMetrics = JSON.parse(saved);
        const playlistMetrics = allMetrics[id] || { likes: 0, shares: 0, plays: 0 };
        setMetrics(playlistMetrics);

        // Check if user has liked this playlist
        const likedPlaylists = JSON.parse(localStorage.getItem('liked_playlists') || '[]');
        setIsLiked(likedPlaylists.includes(id));

        // Check if user has already played this playlist
        const playedPlaylists = JSON.parse(localStorage.getItem('user_played_playlists') || '[]');
        setHasPlayed(playedPlaylists.includes(id));
      } catch (error) {
        // Silent error handling
      }
    }

    // Cleanup function
    return () => {
      if (playTimeoutRef.current) {
        clearTimeout(playTimeoutRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [id, fetchPlaylistById]);

  const updateMetrics = (metric: 'likes' | 'shares' | 'plays') => {
    if (!id) return;

    try {
      const saved = localStorage.getItem('playlist_metrics') || '{}';
      const allMetrics = JSON.parse(saved);

      allMetrics[id] = allMetrics[id] || { likes: 0, shares: 0, plays: 0 };

      // For plays, only count if user hasn't played this playlist before
      if (metric === 'plays') {
        const playedPlaylists = JSON.parse(localStorage.getItem('user_played_playlists') || '[]');
        if (playedPlaylists.includes(id)) {
          return; // Don't count if already played
        }

        // Add to played playlists
        playedPlaylists.push(id);
        localStorage.setItem('user_played_playlists', JSON.stringify(playedPlaylists));
        setHasPlayed(true);
      }

      // For likes, we don't increment if it's an unlike action
      if (metric === 'likes' && isLiked) {
        return;
      }

      allMetrics[id][metric]++;
      localStorage.setItem('playlist_metrics', JSON.stringify(allMetrics));

      setMetrics(prev => ({
        ...prev,
        [metric]: prev[metric] + 1,
      }));
    } catch (error) {
      // Silent error handling
    }
  };

  const handleLike = (e?: React.MouseEvent) => {
    // Prevent event propagation if event exists
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    if (!isAuthenticated) {
      return;
    }

    try {
      const likedPlaylists = JSON.parse(localStorage.getItem('liked_playlists') || '[]');

      if (isLiked) {
        // Unlike - don't decrease the counter, just remove from liked list
        const updatedLikes = likedPlaylists.filter((playlistId: string) => playlistId !== id);
        localStorage.setItem('liked_playlists', JSON.stringify(updatedLikes));
        setIsLiked(false);
      } else {
        // Like - only increment if not previously liked
        if (!likedPlaylists.includes(id)) {
          likedPlaylists.push(id);
          localStorage.setItem('liked_playlists', JSON.stringify(likedPlaylists));
          setIsLiked(true);
          updateMetrics('likes');
        }
      }
    } catch (error) {
      // Silent error handling
    }
  };

  const handleSharePlaylist = async (e?: React.MouseEvent) => {
    // Prevent event propagation if event exists
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    if (!currentPlaylist) return;

    try {
      const shareUrl = window.location.href;
      await navigator.share({
        title: currentPlaylist.name,
        text: `Check out this playlist: ${currentPlaylist.name}`,
        url: shareUrl,
      });
      updateMetrics('shares');
    } catch (error) {
      // Fallback to clipboard
      const shareUrl = window.location.href;
      navigator.clipboard.writeText(shareUrl);
    }
  };

  // Track scroll position
  useEffect(() => {
    const handleScroll = () => {
      if (containerRef.current) {
        setScrollPosition(containerRef.current.scrollTop);
      }
    };

    const currentContainer = containerRef.current;
    if (currentContainer) {
      currentContainer.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (currentContainer) {
        currentContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  // Add pause playlist functionality
  const handlePausePlaylist = () => {
    if (isPlaying) return;
    
    // Access the player store directly to toggle play state
    const playerStore = usePlayerStore.getState();
    if (playerStore.isPlaying) {
      playerStore.setIsPlaying(false);
    }
  };

  // Previous handle play functionality remains
  const handlePlayPlaylist = async (e?: React.MouseEvent) => {
    // Prevent event propagation if event exists
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    if (!currentPlaylist || currentPlaylist.songs.length === 0) {
      return;
    }

    try {
      setIsPlaying(true);

      // Clear any existing timeout
      if (playTimeoutRef.current) {
        clearTimeout(playTimeoutRef.current);
      }

      // Update play count only if user hasn't played this playlist before
      if (!hasPlayed) {
        updateMetrics('plays');
      }

      // Make sure shuffle is off before playing in order
      const playerStore = usePlayerStore.getState();
      if (playerStore.isShuffled) {
        playerStore.toggleShuffle();
      }
      
      // Play the playlist from the beginning immediately
      playAlbum(currentPlaylist.songs, 0);
      
      // Force playback to start right away
      usePlayerStore.getState().setUserInteracted();
      usePlayerStore.getState().setIsPlaying(true);
      
      setIsPlaying(false);
    } catch (error) {
      // Silent error handling
      setIsPlaying(false);
    }
  };

  // New function to handle shuffle play
  const handleShufflePlaylist = (e?: React.MouseEvent) => {
    // Prevent event propagation if event exists
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    if (!currentPlaylist || currentPlaylist.songs.length === 0) {
      return;
    }

    try {
      setIsPlaying(true);

      // Clear any existing timeout
      if (playTimeoutRef.current) {
        clearTimeout(playTimeoutRef.current);
      }

      // Update play count only if user hasn't played this playlist before
      if (!hasPlayed) {
        updateMetrics('plays');
      }

      // Enable shuffle mode before playing
      const playerStore = usePlayerStore.getState();
      if (!playerStore.isShuffled) {
        playerStore.toggleShuffle();
      }
      
      // Play the playlist immediately
      playAlbum(currentPlaylist.songs, 0);
      
      // Force playback to start right away
      usePlayerStore.getState().setUserInteracted();
      usePlayerStore.getState().setIsPlaying(true);
      
      setIsPlaying(false);
    } catch (error) {
      // Silent error handling
      setIsPlaying(false);
    }
  };

  const handlePlaySong = async (song: Song, index: number, e?: React.MouseEvent) => {
    // Prevent event propagation if event exists
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    if (!currentPlaylist) {
      return;
    }

    // Track which song is playing
    setPlayingSongId(song._id);

    try {
      setIsPlaying(true);

      // Clear any existing timeout
      if (playTimeoutRef.current) {
        clearTimeout(playTimeoutRef.current);
      }

      // Check if the song has a valid audio URL
      if (!song.audioUrl) {
        // Try to search for the song to get its audio URL
        try {
          const searchQuery = `${song.title} ${song.artist}`.trim();
          await useMusicStore.getState().searchIndianSongs(searchQuery);
          
          const results = useMusicStore.getState().indianSearchResults;
          if (results && results.length > 0) {
            // Found a match, update the song with the audio URL
            const foundSong = results[0];
            const updatedSong = {
              ...song,
              audioUrl: foundSong.url || '',
              imageUrl: song.imageUrl || foundSong.image
            };
            
            // Update the song in the playlist
            const updatedSongs = currentPlaylist.songs.map((s, idx) => 
              idx === index ? updatedSong : s
            );
            
            // Play the updated song
            playAlbum(updatedSongs, index);
            
            // Force playback to start
            usePlayerStore.getState().setUserInteracted();
            usePlayerStore.getState().setIsPlaying(true);
            
            setIsPlaying(false);
            // Reset playingSongId after a delay
            setTimeout(() => setPlayingSongId(null), 300);
            return;
          } else {
            setIsPlaying(false);
            setPlayingSongId(null);
            return;
          }
        } catch (error) {
          // Silent error handling
          setIsPlaying(false);
          setPlayingSongId(null);
          return;
        }
      }

      // Make sure shuffle is off to play the chosen song
      const playerStore = usePlayerStore.getState();
      if (playerStore.isShuffled) {
        playerStore.toggleShuffle();
      }
      
      // Play the selected song from the playlist immediately
      playAlbum(currentPlaylist.songs, index);
      
      // Force playback to start
      usePlayerStore.getState().setUserInteracted();
      usePlayerStore.getState().setIsPlaying(true);
      
      setIsPlaying(false);
      // Reset playingSongId after a delay
      setTimeout(() => setPlayingSongId(null), 300);
    } catch (error) {
      // Silent error handling
      setIsPlaying(false);
      setPlayingSongId(null);
    }
  };

  // Add a function to open the AddSongsDialog with a specific tab
  const openAddSongsDialog = (tab: 'search' | 'upload' = 'search') => {
    setAddSongsDialogTab(tab);
    setShowAddSongsDialog(true);
  };

  // Add this function to the PlaylistPage component
  const handleFindAudio = async (song: Song, index: number, e?: React.MouseEvent) => {
    // Prevent event propagation if event exists
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    if (!currentPlaylist) {
      return;
    }

    try {
      // Search for the song to get its audio URL
      const searchQuery = `${song.title} ${song.artist}`.trim();
      await useMusicStore.getState().searchIndianSongs(searchQuery);
      
      const results = useMusicStore.getState().indianSearchResults;
      if (results && results.length > 0) {
        // Found a match, update the song with the audio URL
        const foundSong = results[0];
        const updatedSong = {
          ...song,
          audioUrl: foundSong.url || '',
          imageUrl: song.imageUrl || foundSong.image
        };
        
        // Update the song in the playlist
        const updatedSongs = currentPlaylist.songs.map((s, idx) => 
          idx === index ? updatedSong : s
        );
        
        // Update the playlist with the new songs array
        // This is a simplified approach - in a real app, you would want to
        // persist this change to your backend storage
        usePlaylistStore.setState({
          currentPlaylist: {
            ...currentPlaylist,
            songs: updatedSongs
          }
        });
      } else {
        // Silent error handling
      }
    } catch (error) {
      // Silent error handling
    }
  };

  // Add handleDeletePlaylist function
  const handleDeletePlaylist = async () => {
    if (confirm('Are you sure you want to delete this playlist?')) {
      try {
        await deletePlaylist(currentPlaylist!._id);
        navigate('/library');
      } catch (error) {
        // Silent error handling
      }
    }
  };

  // Add handleRemoveSong function
  const handleRemoveSong = async (songId: string, e?: React.MouseEvent) => {
    // Prevent event propagation if event exists
    if (e) e.stopPropagation();

    // Remove song directly without confirmation
    try {
      await removeSongFromPlaylist(currentPlaylist!._id, songId);
    } catch (error) {
      // Silent error handling
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
      </div>
    );
  }

  if (!currentPlaylist) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Playlist not found</h1>
        <Button onClick={() => navigate('/library')}>Go to Library</Button>
      </div>
    );
  }

  const isOwner = userId === currentPlaylist.createdBy.clerkId;
  const totalDuration = currentPlaylist.songs.reduce((acc, song) => acc + song.duration, 0);
  const formattedTotalDuration = formatTime(totalDuration);
  const totalSongs = currentPlaylist.songs.length;
  
  // Calculate dominant color for gradient based on playlist name (simulated)
  const dominantColor = `hsl(${currentPlaylist.name.length * 10 % 360}, 70%, 50%)`;

  return (
    <div className="flex flex-col h-full bg-[#121212] text-white">
      {/* Main scrollable container */}
      <div ref={containerRef} className="h-full overflow-y-auto">
        {/* Spotify-style gradient header */}
        <div 
          className="relative pt-14 pb-6 px-4 sm:px-6" 
          style={{
            background: `linear-gradient(180deg, ${dominantColor} 0%, rgba(18, 18, 18, 0.8) 90%)`,
          }}
        >
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 relative z-10 pb-4">
            {/* Playlist cover image - larger on desktop */}
            <div className="w-40 h-40 sm:w-56 sm:h-56 md:w-60 md:h-60 flex-shrink-0 shadow-2xl mx-auto md:mx-0">
              <img
                src={currentPlaylist.imageUrl || '/default-playlist.jpg'}
                alt={currentPlaylist.name}
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Playlist info */}
            <div className="flex flex-col justify-end text-white text-center md:text-left w-full">
              <p className="text-xs sm:text-sm uppercase font-medium mt-2">Playlist</p>
              <h1 className="text-2xl sm:text-4xl md:text-7xl font-bold mt-2 mb-2 sm:mb-4 drop-shadow-md">
                {currentPlaylist.name}
              </h1>
              
              {/* Description and metadata */}
              {currentPlaylist.description && (
                <p className="text-sm text-gray-200 mb-4 max-w-xl mx-auto md:mx-0">{currentPlaylist.description}</p>
              )}
              
              <div className="flex items-center gap-1 text-sm text-gray-300 justify-center md:justify-start flex-wrap">
                <span className="font-medium text-white">{currentPlaylist.createdBy.fullName}</span>
                <span>•</span>
                <span>{metrics.likes} likes</span>
                <span>•</span>
                <span>{totalSongs} songs,</span>
                <span className="text-gray-400">{formattedTotalDuration}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Action buttons - sticky header */}
        <div className="sticky top-0 z-20 bg-gradient-to-b from-[#121212] to-[#121212]/95 px-4 sm:px-6 py-4 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            {/* Left side tools */}
            <div className="flex items-center gap-2 sm:gap-4">
              {isOwner && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-10 h-10 rounded-full text-gray-400 hover:text-white"
                    onClick={() => setShowEditDialog(true)}
                  >
                    <Pencil className="h-5 w-5" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-10 h-10 rounded-full text-gray-400 hover:text-white sm:hidden"
                    onClick={() => openAddSongsDialog('upload')}
                  >
                    <FileText className="h-5 w-5" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    className="rounded-full text-gray-400 hover:text-white hidden sm:flex items-center gap-1.5"
                    onClick={() => openAddSongsDialog('upload')}
                  >
                    <FileText className="h-4 w-4" />
                    <span>Import from File</span>
                  </Button>
                </>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-10 h-10 rounded-full text-gray-400 hover:text-white"
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[#282828] text-white border-[#3E3E3E]">
                  <DropdownMenuItem onClick={() => openAddSongsDialog('search')} className="hover:bg-[#3E3E3E]">
                    <Plus className="h-4 w-4 mr-2" />
                    Add songs
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSharePlaylist} className="hover:bg-[#3E3E3E]">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </DropdownMenuItem>
                  {isOwner && (
                    <>
                      <DropdownMenuSeparator className="bg-[#3E3E3E]" />
                      <DropdownMenuItem onClick={handleDeletePlaylist} className="text-red-400 hover:text-red-300 hover:bg-[#3E3E3E]">
                        <Trash className="h-4 w-4 mr-2" />
                        Delete playlist
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Right side play button */}
            <div className="flex items-center gap-2 sm:gap-4">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'w-10 h-10 rounded-full text-gray-400 hover:text-white',
                  isLiked && 'text-green-500'
                )}
                onClick={handleLike}
              >
                <Heart className="h-5 w-5" fill={isLiked ? 'currentColor' : 'none'} />
              </Button>

              <Button
                variant="ghost"
                size="icon" 
                className={cn(
                  'w-10 h-10 rounded-full text-gray-400 hover:text-white',
                  isShuffleOn && 'text-green-500'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  // Toggle shuffle first
                  usePlayerStore.getState().toggleShuffle();
                  // Then get the new state after toggling
                  const newShuffleState = !isShuffleOn;
                }}
              >
                <Shuffle className="h-5 w-5" />
              </Button>

              <Button
                onClick={isCurrentPlaylistPlaying ? handlePausePlaylist : handlePlayPlaylist}
                disabled={totalSongs === 0 || isPlaying}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-green-500 hover:bg-green-400 hover:scale-105 transition-all shadow-lg text-black flex items-center justify-center"
                variant="default"
              >
                {isCurrentPlaylistPlaying ? (
                  <Pause className="h-6 w-6 sm:h-7 sm:w-7" />
                ) : (
                  <Play className="h-6 w-6 sm:h-7 sm:w-7 ml-1" />
                )}
                <span className="sr-only">{isCurrentPlaylistPlaying ? 'Pause' : 'Play'}</span>
              </Button>
            </div>
          </div>
        </div>
        
        {/* Songs list with Spotify-style design */}
        <div className="px-4 sm:px-6 pb-24">
          {currentPlaylist.songs.length > 0 ? (
            <div className="mt-2">
              {/* Spotify-style header row */}
              <div className="grid grid-cols-[24px_4fr_minmax(120px,1fr)] md:grid-cols-[24px_4fr_3fr_minmax(120px,1fr)] border-b border-[#2A2A2A] text-sm text-gray-400 py-2 px-4 mb-2">
                <div className="flex items-center justify-center">#</div>
                <div>Title</div>
                <div className="hidden md:block">Album</div>
                <div className="flex justify-end pr-8">
                  <Clock className="h-4 w-4" />
                </div>
              </div>

              {/* Songs list */}
              {currentPlaylist.songs.map((song, index) => {
                const isCurrentSong = currentSong?._id === song._id;
                
                return (
                  <div
                    key={song._id}
                    className={cn(
                      'grid grid-cols-[24px_4fr_minmax(120px,1fr)] md:grid-cols-[24px_4fr_3fr_minmax(120px,1fr)] items-center py-3 px-4 mx-[-16px] rounded-md group',
                      'hover:bg-zinc-800/70 active:bg-zinc-700/70 transition-colors duration-150',
                      isCurrentSong && 'bg-zinc-800/80',
                      !song.audioUrl && 'opacity-60'
                    )}
                    onClick={e => handlePlaySong(song, index, e)}
                  >
                    {/* Track number/playing indicator */}
                    <div className="flex items-center justify-center w-6">
                      <div className="w-4 h-4 flex items-center justify-center text-gray-400 group-hover:hidden">
                        {isCurrentSong ? (
                          <div className="w-2 h-2 bg-green-500 rounded-sm"></div>
                        ) : (
                          <span className="text-sm">{index + 1}</span>
                        )}
                      </div>
                      <div className="hidden group-hover:flex items-center justify-center text-white">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlaySong(song, index);
                          }}
                        >
                          {isCurrentSong && isPlaying ? (
                            <Pause className="h-3 w-3" />
                          ) : (
                            <Play className="h-3 w-3 ml-0.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    {/* Song info with image */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 flex-shrink-0 bg-zinc-800 rounded overflow-hidden">
                        <img
                          src={song.imageUrl || '/default-song.jpg'}
                          alt={song.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className={cn("font-medium truncate text-base", isCurrentSong && "text-green-500")}>
                          {song.title}
                        </span>
                        <span className="text-sm text-gray-400 truncate">
                          {song.artist}
                        </span>
                      </div>
                    </div>
                    
                    {/* Album info (placeholder) */}
                    <div className="text-gray-400 text-sm truncate hidden md:block">
                      {/* Empty for now, would show album name */}
                    </div>
                    
                    {/* Duration and actions */}
                    <div className="flex items-center justify-end gap-2 sm:gap-4 text-gray-400">
                      {isOwner && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveSong(song._id, e);
                            }}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      
                      {!song.audioUrl && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFindAudio(song, index, e);
                          }}
                        >
                          <Search className="h-4 w-4" />
                        </Button>
                      )}
                      
                      <span className="text-sm">{formatTime(song.duration)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-6 rounded-full bg-[#2A2A2A] p-8">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-gray-400"
                >
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white">It's pretty quiet here</h2>
              <p className="mt-3 text-gray-400 max-w-md">
                Add some songs to your playlist by clicking the "Add songs" button.
              </p>
              <Button 
                onClick={() => openAddSongsDialog('search')}
                className="mt-6 bg-white text-black hover:bg-gray-200 font-medium"
              >
                Add songs
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      {showEditDialog && (
        <EditPlaylistDialog
          playlist={currentPlaylist}
          isOpen={showEditDialog}
          onClose={() => setShowEditDialog(false)}
        />
      )}

      {showAddSongsDialog && (
        <AddSongsDialog
          isOpen={showAddSongsDialog}
          onClose={() => setShowAddSongsDialog(false)}
          playlistId={currentPlaylist._id}
          initialTab={addSongsDialogTab}
        />
      )}

      {/* Fixed position Add Songs button - only shown when playlist is empty */}
      {currentPlaylist && currentPlaylist.songs.length === 0 && (
        <div className="fixed bottom-20 right-6 z-30">
          <Button
            onClick={() => openAddSongsDialog('search')}
            className="rounded-full shadow-lg flex items-center gap-2 px-4 sm:px-6 py-4 sm:py-6 h-auto bg-green-500 hover:bg-green-400 hover:scale-105 transition-all"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-sm sm:text-base">Add Songs</span>
          </Button>
        </div>
      )}
    </div>
  );
}
