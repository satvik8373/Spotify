import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePlaylistStore } from '../../stores/usePlaylistStore';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { useMusicStore } from '../../stores/useMusicStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useAlbumColors } from '../../hooks/useAlbumColors';
import { Button } from '../../components/ui/button';
import '../../styles/playlist-page.css';
import {
  Play,
  Pencil,
  MoreHorizontal,
  Share2,
  Clock,
  Plus,
  Search,
  Heart,
  Shuffle,
  FileText,
  Trash,
  Pause,
  Music2,
  Image as ImageIcon,
  ChevronLeft
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
// import { SongMenu } from '../../components/SongMenu';
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
import { updatePlaylistCoverFromSongs } from '../../services/playlistService';

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
  // Removed unused addSongToPlaylist
  const {
    indianSearchResults,
    searchIndianSongs,
    isIndianMusicLoading,
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
      await usePlaylistStore.getState().addSongToPlaylist(playlistId, song._id);
    } catch (error) {
      // Silent error handling
    }
  };

  const handleAddIndianSong = async (song: any) => {
    try {
      // Convert Indian song to app song format directly
      const convertedSong = useMusicStore.getState().convertIndianSongToAppSong(song);
      
      // Add converted song directly to playlist without validation notification
      await usePlaylistStore.getState().addSongToPlaylist(playlistId, convertedSong);
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
// Note: PlaylistSongMenu component is unused on this page and intentionally removed to reduce bundle size

export function PlaylistPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userId, isAuthenticated } = useAuthStore();
  const { currentPlaylist, fetchPlaylistById, deletePlaylist, isLoading, removeSongFromPlaylist } =
    usePlaylistStore();
  const { playAlbum, isPlaying: playerIsPlaying, currentSong } = usePlayerStore();
  // Removed unused addSongToPlaylist from store
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddSongsDialog, setShowAddSongsDialog] = useState(false);
  const [addSongsDialogTab, setAddSongsDialogTab] = useState<'search' | 'upload'>('search');
  const [isLiked, setIsLiked] = useState(false);
  const [metrics, setMetrics] = useState({ likes: 0, shares: 0, plays: 0 });
  const [hasPlayed, setHasPlayed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Removed unused playingSongId state to avoid warnings

  // Removed scroll position tracking for toolbar behavior
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Get colors from album cover
  const albumColors = useAlbumColors(currentPlaylist?.imageUrl);

  // Check if the current playlist is playing
  const isCurrentPlaylistPlaying = playerIsPlaying && 
    currentPlaylist?.songs.some(song => song._id === currentSong?._id);

  // Track shuffle state
  const [isShuffleOn, setIsShuffleOn] = useState(false);
  
  // Determine if we've scrolled enough to hide other buttons
  // Removed scroll-based UI changes for toolbar; keep state for potential future use
  
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

  // Hide mobile navigation when on playlist page
  useEffect(() => {
    // Add class to hide mobile nav
    document.body.classList.add('hide-mobile-nav');
    
    // Cleanup function to remove class when leaving page
    return () => {
      document.body.classList.remove('hide-mobile-nav');
    };
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

  // Removed scroll listener; toolbar no longer depends on scroll

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

    // If already playing, just return
    if (isPlaying) return;

    try {
      setIsPlaying(true);

      // Update play count only if user hasn't played this playlist before
      if (!hasPlayed) {
        updateMetrics('plays');
      }

        // Make sure shuffle is off before playing in order
        const playerStore = usePlayerStore.getState();
        if (playerStore.isShuffled) {
          playerStore.toggleShuffle();
        }
        
        // Play the playlist from the beginning
        playAlbum(currentPlaylist.songs, 0);
        
        // Force playback to start
          usePlayerStore.getState().setUserInteracted();
          usePlayerStore.getState().setIsPlaying(true);
        
      // Reset isPlaying state after a delay
      setTimeout(() => {
        setIsPlaying(false);
      }, 300);
    } catch (error) {
      // Silent error handling
      setIsPlaying(false);
    }
  };

  // Removed unused handleShufflePlaylist

  const handlePlaySong = async (song: Song, index: number, e?: React.MouseEvent) => {
    // Prevent event propagation if event exists
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    if (!currentPlaylist) {
      return;
    }

    // Check if this is the currently playing song
    const playerStore = usePlayerStore.getState();
    const isThisSongPlaying = playerStore.currentSong?._id === song._id && playerStore.isPlaying;
    
    // If this song is already playing, pause it instead of replaying
    if (isThisSongPlaying) {
      playerStore.setIsPlaying(false);
      return;
    }

    // Set loading state
    setIsPlaying(true);

    try {
      // If song has no audio URL, try to find it
      if (!song.audioUrl) {
        toast.loading("Finding audio for this song...");
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
            toast.dismiss();
            
            // Force playback to start
            usePlayerStore.getState().setUserInteracted();
            usePlayerStore.getState().setIsPlaying(true);
            
            // Reset states
            setIsPlaying(false);
            return;
          } else {
            toast.dismiss();
            toast.error("Couldn't find audio for this song");
            setIsPlaying(false);
            return;
          }
        } catch (error) {
          toast.dismiss();
          toast.error("Error finding audio");
          setIsPlaying(false);
          return;
        }
      }

      // Disable shuffle to ensure we play the selected song
        if (playerStore.isShuffled) {
          playerStore.toggleShuffle();
        }
        
      // Play the selected song
        playAlbum(currentPlaylist.songs, index);
        
      // Start playback
          usePlayerStore.getState().setUserInteracted();
          usePlayerStore.getState().setIsPlaying(true);
      
      // Vibrate on mobile devices for tactile feedback (if supported)
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    } catch (error) {
      toast.error("Error playing song");
    } finally {
      // Always reset states
      setIsPlaying(false);
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

  // Add a state for the regenerate cover dialog
  const [showRegenerateCoverDialog, setShowRegenerateCoverDialog] = useState(false);
  const [isRegeneratingCover, setIsRegeneratingCover] = useState(false);
  
  // Add a function to handle regenerating the cover
  const handleRegenerateCover = async () => {
    if (!currentPlaylist || !currentPlaylist.songs || currentPlaylist.songs.length === 0) {
      toast.error('Playlist needs songs to generate a cover');
      return;
    }
    
    setIsRegeneratingCover(true);
    try {
      const updatedPlaylist = await updatePlaylistCoverFromSongs(
        currentPlaylist._id, 
        currentPlaylist.songs
      );
      
      // Update the playlist in the local state
      if (updatedPlaylist) {
        // Update the playlist in our store
        usePlaylistStore.getState().updatePlaylist(
          currentPlaylist._id,
          { imageUrl: updatedPlaylist.imageUrl }
        );
        
        // Fetch the updated playlist to refresh our local state
        if (id) {
          await usePlaylistStore.getState().fetchPlaylistById(id);
        }
        
        toast.success('Playlist cover updated');
      }
    } catch (error) {
      console.error('Error regenerating cover:', error);
      toast.error('Failed to update cover');
    } finally {
      setIsRegeneratingCover(false);
      setShowRegenerateCoverDialog(false);
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
  
  // Removed unused headerOpacity
  
  // Removed unused headerBgColor

  // Handle back button click
  const handleBackClick = () => {
    navigate(-1);
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground playlist-fullscreen">
      {/* Main scrollable container */}
      <div ref={containerRef} className="h-full overflow-y-auto playlist-content">
        {/* Back button - visible only when not scrolled */}
        <div className={`absolute top-3 left-3 z-30`}>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 rounded-full text-white"
            onClick={handleBackClick}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Spotify-style gradient header */}
        <div
          className="relative pt-12 pb-6 px-4 sm:px-6" 
          style={{
            background: `linear-gradient(180deg, ${albumColors.primary} 0%, hsl(var(--background) / 0.85) 90%)`,
          }}
        >
          <div className="flex flex-col md:flex-row items-start md:items-end gap-6 relative z-10 pb-4">
            {/* Playlist cover image - shadow styling like Spotify - ENLARGED */}
            <div className="w-64 h-64 sm:w-72 sm:h-72 md:w-80 md:h-80 flex-shrink-0 shadow-xl mx-auto md:mx-0 relative group">
              <div className="absolute inset-0 shadow-[0_8px_24px_rgba(0,0,0,0.5)] rounded"></div>
              <img
                src={currentPlaylist.imageUrl || '/default-playlist.jpg'}
                alt={currentPlaylist.name}
                className="w-full h-full object-cover relative z-10"
              />
              
              {/* Regenerate cover overlay - only for playlist owners */}
              {isOwner && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                  <Button 
                    variant="ghost" 
                    className="text-white hover:bg-white/20"
                    onClick={() => setShowRegenerateCoverDialog(true)}
                  >
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Update Cover
                  </Button>
            </div>
              )}
              </div>

            {/* Playlist info */}
            <div className="flex flex-col justify-end text-foreground text-center md:text-left w-full">
              <p className="text-xs sm:text-sm uppercase font-medium mt-2">Playlist</p>
              <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold mt-2 mb-2 sm:mb-4 drop-shadow-md tracking-tight">
                {currentPlaylist.name}
              </h1>
              
              {/* Description and metadata */}
              {currentPlaylist.description && (
                <p className="text-sm text-muted-foreground mb-4 max-w-xl mx-auto md:mx-0">{currentPlaylist.description}</p>
              )}
              
              <div className="flex items-center gap-1 text-sm text-muted-foreground justify-center md:justify-start flex-wrap">
                <span className="font-medium text-foreground">{currentPlaylist.createdBy.fullName}</span>
                <span className="mx-1">•</span>
                <span>{metrics.likes} likes</span>
                <span className="mx-1">•</span>
                <span>{totalSongs} songs,</span>
                <span className="text-muted-foreground ml-1">{formattedTotalDuration}</span>
              </div>
            </div>
          </div>
              </div>

        {/* Action buttons - sticky header without background color */}
        <div 
          className="sticky top-0 z-20 transition-colors duration-300 px-4 sm:px-6 py-4"
        >
          <div className="flex items-center justify-between">
            {/* Left side tools - hidden when scrolled */}
            <div className="flex items-center gap-3 sm:gap-4">
              {isOwner && (
                <>
                <Button
                    variant="ghost"
                    size="icon"
                    className="w-12 h-12 rounded-full text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowEditDialog(true)}
                  >
                    <Pencil className="h-6 w-6" />
                </Button>

                {/* Import action moved into 3-dots menu for all viewports */}
                </>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                  size="icon"
                    className="w-12 h-12 rounded-full text-muted-foreground hover:text-foreground transition-colors"
                >
                    <MoreHorizontal className="h-6 w-6" />
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover text-popover-foreground border-border">
                  <DropdownMenuItem onClick={() => openAddSongsDialog('search')} className="hover:bg-accent">
                    <Plus className="h-4 w-4 mr-2" />
                    Add songs
                  </DropdownMenuItem>
                  {isOwner && (
                    <DropdownMenuItem 
                      onClick={() => setShowRegenerateCoverDialog(true)} 
                      className="hover:bg-accent"
                    >
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Generate cover
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => openAddSongsDialog('upload')} className="hover:bg-accent">
                    <FileText className="h-4 w-4 mr-2" />
                    Import from File
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSharePlaylist} className="hover:bg-accent">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </DropdownMenuItem>
                {isOwner && (
                  <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleDeletePlaylist} className="text-red-500 hover:text-red-500/90 hover:bg-accent">
                        <Trash className="h-4 w-4 mr-2" />
                        Delete playlist
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Right side play button */}
            <div className={`flex items-center gap-3 sm:gap-5`}>
              {/* Heart button */}
                    <Button
                variant="ghost"
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full text-muted-foreground hover:text-foreground transition-all duration-300 flex items-center justify-center`}
                onClick={handleLike}
              >
                <Heart 
                  className="h-6 w-6 sm:h-7 sm:w-7" 
                  fill={isLiked ? 'currentColor' : 'none'} 
                  stroke={isLiked ? 'none' : 'currentColor'}
                  color={isLiked ? '#1DB954' : 'currentColor'} 
                />
                    </Button>

              {/* Shuffle button */}
                    <Button
                variant="ghost"
                className={cn(
                  'w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-300',
                  isShuffleOn ? 'text-green-500' : 'text-muted-foreground hover:text-foreground'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  // Toggle shuffle first
                  usePlayerStore.getState().toggleShuffle();
                }}
              >
                <Shuffle className="h-6 w-6 sm:h-7 sm:w-7" />
                    </Button>

              {/* Play/Pause button - always visible */}
              <Button
                onClick={isCurrentPlaylistPlaying ? handlePausePlaylist : handlePlayPlaylist}
                disabled={totalSongs === 0 || isPlaying}
                className={cn(
                  "w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all shadow-lg",
                  "bg-green-500 text-black hover:scale-105 hover:bg-green-400 disabled:opacity-70"
                )}
                variant="default"
              >
                {isCurrentPlaylistPlaying ? (
                  <Pause className="h-7 w-7 sm:h-8 sm:w-8" />
                ) : (
                  <Play className="h-7 w-7 sm:h-8 sm:w-8 ml-1" />
                )}
                <span className="sr-only">{isCurrentPlaylistPlaying ? 'Pause' : 'Play'}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Songs list with Spotify-style design */}
        <div className="px-4 sm:px-6 pb-24">
          {currentPlaylist.songs.length > 0 ? (
            <div className="mt-4">
              {/* Spotify-style header row */}
              <div className="grid grid-cols-[24px_4fr_minmax(120px,1fr)] md:grid-cols-[24px_4fr_3fr_minmax(120px,1fr)] border-b border-border text-sm text-muted-foreground py-2 px-4 mb-2">
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
                const isThisSongPlaying = isCurrentSong && playerIsPlaying;
                
                return (
                <div
                  key={song._id}
                  className={cn(
                      'grid grid-cols-[40px_4fr_minmax(120px,1fr)] md:grid-cols-[40px_4fr_3fr_minmax(120px,1fr)] items-center py-2 px-4 mx-[-16px] rounded-md group',
                      'hover:bg-white/10 transition-colors duration-200',
                      isCurrentSong && 'bg-white/10',
                      !song.audioUrl && 'opacity-60'
                    )}
                    onClick={() => handlePlaySong(song, index)}
                  >
                    {/* Track number/play button */}
                    <div className="flex items-center justify-center">
                      {isThisSongPlaying ? (
                        <div className="w-8 h-8 flex items-center justify-center">
                          <div className="w-3 h-3 bg-green-500 rounded-sm animate-pulse"></div>
                        </div>
                      ) : (
                        <>
                          <span className="text-gray-400 group-hover:hidden flex items-center justify-center w-8">{index + 1}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white p-0 hidden group-hover:flex"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlaySong(song, index);
                          }}
                        >
                            <Play className="h-4 w-4 ml-0.5" />
                        </Button>
                        </>
                    )}
                  </div>
                    
                    {/* Song info with image */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        "h-10 w-10 flex-shrink-0 overflow-hidden rounded",
                        isCurrentSong && "shadow-md"
                      )}>
                        <img
                          src={song.imageUrl || '/default-song.jpg'}
                        alt={song.title}
                          className="h-full w-full object-cover"
                      />
                        </div>
                      <div className="flex flex-col min-w-0">
                        <span className={cn(
                          "font-medium truncate text-base",
                          isCurrentSong && "text-green-500"
                        )}>
                          {song.title}
                        </span>
                        <span className="text-sm text-muted-foreground truncate">
                        {song.artist}
                      </span>
                    </div>
                  </div>
                    
                    {/* Album info (placeholder) */}
                    <div className="text-muted-foreground text-sm truncate hidden md:block">
                      {/* Empty for now, would show album name */}
                  </div>
                    
                    {/* Duration and actions */}
                    <div className="flex items-center justify-end gap-2 sm:gap-4 text-muted-foreground">
                    {isOwner && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground p-0"
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
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground p-0"
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
              <div className="mb-6 rounded-full bg-muted p-8">
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
              <h2 className="text-2xl font-bold text-foreground">It's pretty quiet here</h2>
              <p className="mt-3 text-muted-foreground max-w-md">
                Add some songs to your playlist by clicking the "Add songs" button.
              </p>
              <Button 
                onClick={() => openAddSongsDialog('search')}
                className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
              >
                Add songs
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Fixed position Add Songs button - only shown when playlist is empty */}
      {currentPlaylist && currentPlaylist.songs.length === 0 && (
        <div className="fixed bottom-20 right-6 z-30">
          <Button
            onClick={() => openAddSongsDialog('search')}
            className="bg-green-500 text-black rounded-full shadow-lg flex items-center gap-2 px-4 sm:px-6 py-4 sm:py-6 h-auto hover:scale-105 transition-all hover:bg-green-400"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-sm sm:text-base">Add Songs</span>
          </Button>
        </div>
      )}

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

      {/* New dialog for regenerating cover image */}
      <Dialog open={showRegenerateCoverDialog} onOpenChange={setShowRegenerateCoverDialog}>
        <DialogContent className="bg-zinc-900 text-white border-zinc-800 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Cover Art</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Create a new cover art from your playlist's songs
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Preview of existing songs for the collage */}
              {currentPlaylist.songs.slice(0, 4).map((song, index) => (
                <div key={index} className="aspect-square bg-zinc-800 rounded overflow-hidden">
                  <img
                    src={song.imageUrl || '/default-song.jpg'}
                    alt={song.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
              
              {/* Fill empty slots with placeholder if needed */}
              {Array.from({ length: Math.max(0, 4 - currentPlaylist.songs.length) }).map((_, index) => (
                <div 
                  key={`empty-${index}`} 
                  className="aspect-square bg-zinc-800 rounded flex items-center justify-center"
                >
                  <Music2 className="h-8 w-8 text-zinc-600" />
                </div>
              ))}
            </div>
            
            <p className="text-sm text-zinc-400">
              {currentPlaylist.songs.length > 0
                ? 'This will create a 4-grid collage using your playlist songs as cover art.'
                : 'Add songs to your playlist first to generate a cover.'}
            </p>
          </div>
          
          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => setShowRegenerateCoverDialog(false)}
              className="bg-transparent border-zinc-700 text-white hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleRegenerateCover} 
              disabled={isRegeneratingCover || currentPlaylist.songs.length === 0}
              className="bg-green-500 text-black hover:bg-green-600"
            >
              {isRegeneratingCover ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                  Processing...
                </>
              ) : (
                'Generate Cover'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
