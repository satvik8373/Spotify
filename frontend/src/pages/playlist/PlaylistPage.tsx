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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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

function AddSongsDialog({
  isOpen,
  onClose,
  playlistId,
}: {
  isOpen: boolean;
  onClose: () => void;
  playlistId: string;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
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
      searchIndianSongs(searchQuery);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleAddSong = async (song: Song) => {
    try {
      await addSongToPlaylist(playlistId, song._id);
      toast.success(`Added "${song.title}" to playlist`);
    } catch (error) {
      console.error('Error adding song:', error);
      toast.error('Failed to add song to playlist');
    }
  };

  const handleAddIndianSong = async (song: any) => {
    try {
      // First, create the song in our database
      const externalSong = {
        title: song.title,
        artist: song.artist || 'Unknown Artist',
        imageUrl: song.image,
        audioUrl: song.url,
        duration: parseInt(song.duration || '0'),
      };

      // Create the song
      const response = await fetch('/api/songs/external', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(externalSong),
      });

      if (!response.ok) {
        throw new Error('Failed to create song');
      }

      const createdSong = await response.json();

      // Now add the created song to the playlist
      await addSongToPlaylist(playlistId, createdSong._id);
      toast.success(`Added "${song.title}" to playlist`);
    } catch (error) {
      console.error('Error adding Indian song:', error);
      toast.error('Failed to add song to playlist');
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
            Search for songs and click to add them to your playlist
          </DialogDescription>
        </DialogHeader>

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
      </DialogContent>
    </Dialog>
  );
}

export function PlaylistPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userId, isAuthenticated } = useAuthStore();
  const { currentPlaylist, fetchPlaylistById, deletePlaylist, isLoading, removeSongFromPlaylist } =
    usePlaylistStore();
  const { playAlbum } = usePlayerStore();
  const { addSongToPlaylist } = usePlaylistStore();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddSongsDialog, setShowAddSongsDialog] = useState(false);
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
        console.error('Error loading playlist metrics:', error);
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
      console.error('Error updating metrics:', error);
    }
  };

  const handleLike = (e?: React.MouseEvent) => {
    // Prevent event propagation if event exists
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    if (!isAuthenticated) {
      toast.error('Please sign in to like playlists');
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
      console.error('Error updating liked status:', error);
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
      toast.success('Playlist link copied to clipboard');
      updateMetrics('shares');
    }
  };

  const handlePlayPlaylist = async (e?: React.MouseEvent) => {
    // Prevent event propagation if event exists
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    if (!currentPlaylist || currentPlaylist.songs.length === 0) {
      toast.error('This playlist has no songs');
      return;
    }

    // Prevent multiple rapid clicks
    if (isPlaying) return;

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

      // Start playback with a small delay to ensure clean state
      playTimeoutRef.current = setTimeout(() => {
        playAlbum(currentPlaylist.songs);
        setIsPlaying(false);
      }, 300);
    } catch (error) {
      console.error('Error playing playlist:', error);
      toast.error('Failed to play playlist');
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
      toast.error('Playlist not found');
      return;
    }

    // Prevent multiple rapid clicks
    if (isPlaying) return;

    // Track which song is playing
    setPlayingSongId(song._id);

    try {
      setIsPlaying(true);

      // Clear any existing timeout
      if (playTimeoutRef.current) {
        clearTimeout(playTimeoutRef.current);
      }

      // Start playback with a small delay to ensure clean state
      playTimeoutRef.current = setTimeout(() => {
        playAlbum(currentPlaylist.songs, index);
        setIsPlaying(false);
        // Reset playingSongId after a delay
        setTimeout(() => setPlayingSongId(null), 300);
      }, 300);
    } catch (error) {
      console.error('Error playing song:', error);
      toast.error('Failed to play song');
      setIsPlaying(false);
      setPlayingSongId(null);
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

  // Check if we should collapse the header (after scrolling a certain amount)
  const isHeaderCollapsed = scrollPosition > 200;

  const handleDeletePlaylist = async () => {
    if (confirm('Are you sure you want to delete this playlist?')) {
      await deletePlaylist(currentPlaylist._id);
      navigate('/library');
    }
  };

  const handleRemoveSong = async (songId: string, e?: React.MouseEvent) => {
    // Prevent event propagation if event exists
    if (e) e.stopPropagation();

    if (confirm('Are you sure you want to remove this song from the playlist?')) {
      await removeSongFromPlaylist(currentPlaylist._id, songId);
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Collapsed header that appears when scrolling down */}
      <div
        className={cn(
          'fixed top-0 left-0 right-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/50 transition-all duration-300 flex items-center gap-2 px-4 py-2',
          isHeaderCollapsed ? 'translate-y-0 opacity-100' : 'translate-y-[-100%] opacity-0'
        )}
      >
        <div className="h-10 w-10 rounded overflow-hidden flex-shrink-0">
          <img
            src={currentPlaylist.imageUrl}
            alt={currentPlaylist.name}
            className="object-cover w-full h-full"
          />
        </div>
        <div className="flex-1 overflow-hidden">
          <h3 className="font-bold truncate">{currentPlaylist.name}</h3>
          <p className="text-xs text-muted-foreground truncate">
            {currentPlaylist.songs.length} {currentPlaylist.songs.length === 1 ? 'song' : 'songs'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            className="gap-1 rounded-full text-xs px-3 h-8"
            onClick={handlePlayPlaylist}
            disabled={currentPlaylist.songs.length === 0 || isPlaying}
          >
            <Play className="h-3 w-3" />
            Play
          </Button>
          <Button
            variant="outline"
            size="icon"
            className={cn(
              'h-8 w-8 rounded-full',
              isLiked &&
                'text-green-500 border-green-500 hover:text-green-400 hover:border-green-400'
            )}
            onClick={handleLike}
          >
            <ThumbsUp className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={handleSharePlaylist}
          >
            <Share2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Main scrollable container */}
      <div ref={containerRef} className="h-full overflow-y-auto">
        {/* Header with transition effect - scales and fades as you scroll */}
        <div
          className={cn(
            'pt-4 pb-4 px-4 sm:px-6 transition-opacity',
            isHeaderCollapsed ? 'opacity-60' : 'opacity-100'
          )}
          style={{
            transform: `translateY(${scrollPosition * 0.1}px)`,
            transformOrigin: 'center top',
          }}
        >
          <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-center md:items-start">
            <div className="relative aspect-square w-full max-w-[200px] sm:max-w-[250px] overflow-hidden rounded-md shadow-lg">
              <img
                src={currentPlaylist.imageUrl}
                alt={currentPlaylist.name}
                className="object-cover w-full h-full"
              />
            </div>
            <div className="flex flex-col gap-2 text-center md:text-left w-full">
              <p className="text-xs sm:text-sm font-medium uppercase text-muted-foreground">
                {currentPlaylist.isPublic ? 'Public Playlist' : 'Private Playlist'}
              </p>
              <h1 className="text-2xl sm:text-4xl font-bold">{currentPlaylist.name}</h1>
              {currentPlaylist.description && (
                <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base px-2 md:px-0">
                  {currentPlaylist.description}
                </p>
              )}
              <div className="flex items-center justify-center md:justify-start gap-2 mt-1 sm:mt-2 flex-wrap">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Created by{' '}
                  <span className="font-medium text-foreground">
                    {currentPlaylist.createdBy.fullName}
                  </span>
                </p>
                <span className="text-muted-foreground hidden sm:inline">•</span>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {currentPlaylist.songs.length}{' '}
                  {currentPlaylist.songs.length === 1 ? 'song' : 'songs'}
                </p>
                <span className="text-muted-foreground hidden sm:inline">•</span>
                <p className="text-xs sm:text-sm text-muted-foreground">{formattedTotalDuration}</p>
              </div>

              <div className="flex items-center justify-center md:justify-start gap-4 mt-1 text-xs sm:text-sm text-muted-foreground">
                <span>{metrics.plays} plays</span>
                <span>{metrics.likes} likes</span>
                <span>{metrics.shares} shares</span>
              </div>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-4 sm:mt-6">
                <Button
                  variant="default"
                  size="sm"
                  className="gap-2 rounded-full"
                  onClick={handlePlayPlaylist}
                  disabled={currentPlaylist.songs.length === 0 || isPlaying}
                >
                  <Play className="h-4 w-4" />
                  Play
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  className={cn(
                    'transition-colors rounded-full',
                    isLiked &&
                      'text-green-500 border-green-500 hover:text-green-400 hover:border-green-400'
                  )}
                  onClick={handleLike}
                >
                  <ThumbsUp className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                  onClick={handleSharePlaylist}
                >
                  <Share2 className="h-4 w-4" />
                </Button>

                {isOwner && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full"
                      onClick={() => setShowEditDialog(true)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full"
                      onClick={() => setShowAddSongsDialog(true)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className="rounded-full">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={handleDeletePlaylist}
                        >
                          Delete Playlist
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Background gradient that appears during scroll */}
        <div
          className={cn(
            'absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-accent/30 to-transparent z-[-1] transition-opacity duration-300',
            isHeaderCollapsed ? 'opacity-100' : 'opacity-0'
          )}
        />

        {/* Songs list section with sticky header */}
        <div className={cn('px-2 sm:px-6 pb-4 relative', scrollPosition > 0 ? 'pt-2' : 'pt-6')}>
          {currentPlaylist.songs.length > 0 ? (
            <div className="space-y-1">
              {/* Header Row - Hide some columns on mobile */}
              <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-sm grid grid-cols-[16px_1fr_80px] sm:grid-cols-[16px_4fr_3fr_1fr] md:grid-cols-[16px_4fr_3fr_2fr_1fr] gap-4 px-2 sm:px-4 py-2 text-muted-foreground text-xs sm:text-sm font-medium border-b">
                <div>#</div>
                <div>Title</div>
                <div className="hidden sm:block">Artist</div>
                <div className="hidden md:block">Album</div>
                <div className="flex justify-end">
                  <Clock className="h-4 w-4" />
                </div>
              </div>

              {/* Song Rows - Responsive */}
              {currentPlaylist.songs.map((song, index) => (
                <div
                  key={song._id}
                  className={cn(
                    'grid grid-cols-[16px_1fr_80px] sm:grid-cols-[16px_4fr_3fr_1fr] md:grid-cols-[16px_4fr_3fr_2fr_1fr] gap-2 sm:gap-4 px-2 sm:px-4 py-2 rounded-md hover:bg-accent group cursor-pointer',
                    playingSongId === song._id && 'bg-accent/50'
                  )}
                  onClick={e => handlePlaySong(song, index, e)}
                >
                  <div className="flex items-center text-xs sm:text-sm text-muted-foreground">
                    {index + 1}
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
                    <img
                      src={song.imageUrl}
                      alt={song.title}
                      className="h-8 w-8 sm:h-10 sm:w-10 rounded-sm object-cover"
                    />
                    <div className="flex flex-col overflow-hidden">
                      <span className="truncate font-medium text-xs sm:text-sm">{song.title}</span>
                      <span className="sm:hidden text-xs text-muted-foreground truncate">
                        {song.artist}
                      </span>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center text-muted-foreground text-sm truncate">
                    {song.artist}
                  </div>
                  <div className="hidden md:flex items-center text-muted-foreground text-sm truncate">
                    {/* Song album information */}
                  </div>
                  <div className="flex items-center justify-end gap-1 sm:gap-2 text-muted-foreground text-xs sm:text-sm">
                    {isOwner && (
                      <button
                        className="opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity rounded-full p-1 hover:bg-background/80"
                        onClick={e => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleRemoveSong(song._id, e);
                        }}
                      >
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
                          className="hover:text-destructive"
                        >
                          <path d="M3 6h18"></path>
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        </svg>
                      </button>
                    )}
                    <div className="hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity mx-2">
                      <SongMenu song={song} />
                    </div>
                    <div className="flex justify-center items-center">
                      {/* Play button for mobile */}
                      <button
                        className="sm:hidden opacity-70 p-1.5 rounded-full hover:bg-accent/80 mr-1"
                        onClick={e => {
                          e.stopPropagation();
                          e.preventDefault();
                          handlePlaySong(song, index, e);
                        }}
                      >
                        <Play className="h-3 w-3" />
                      </button>
                      {formatTime(song.duration)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-4 rounded-full bg-accent p-6">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-8 w-8 text-muted-foreground"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="16"></line>
                  <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
              </div>
              <h2 className="text-2xl font-bold">No songs yet</h2>
              <p className="mt-2 text-muted-foreground">Start adding songs to your playlist</p>
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
        />
      )}
    </div>
  );
}
