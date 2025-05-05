import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader, Play, Pause, Heart, RefreshCcw, ChevronDown, Clock, Music, X, Share2, Download, MoreHorizontal, ArrowLeft, Volume2 } from "lucide-react";
import toast from "react-hot-toast";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { useMusicStore } from "@/stores/useMusicStore";
import { useAuth } from "../contexts/AuthContext";
import { useAuthStore } from "@/stores/useAuthStore";
import { loadLikedSongs, addLikedSong, removeLikedSong } from "@/services/likedSongsService";
import { useLocation, useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface BaseSong {
  id: string;
  title: string;
  artist?: string;
  album?: string;
  year?: string;
  image: string;
  url?: string;
  lyrics?: string;
}

interface Song extends BaseSong {
  duration?: string;
}

interface AppSong extends BaseSong {
  duration: number;
  audioUrl: string;
}

interface VisibleCounts {
  trending: number;
  newReleases: number;
  bollywood: number;
  hollywood: number;
  official: number;
  hindi: number;
}

interface MusicStoreState {
  indianSearchResults: Song[];
}

const IndianMusicPlayer = () => {
  // State
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [likedSongIds, setLikedSongIds] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [showSongDetails, setShowSongDetails] = useState<boolean>(false);
  const [showLoginDialog, setShowLoginDialog] = useState<boolean>(false);
  const [animationBars, setAnimationBars] = useState<number[]>([]);

  // Visible song counts
  const [visibleCounts, setVisibleCounts] = useState<VisibleCounts>({
    trending: 10,
    newReleases: 10,
    bollywood: 10,
    hollywood: 10,
    official: 10,
    hindi: 10
  });

  // Hooks
  const { setCurrentSong: setAppCurrentSong, isPlaying, currentSong, setUserInteracted } = usePlayerStore();
  const { 
    indianTrendingSongs,
    indianNewReleases,
    indianSearchResults,
    bollywoodSongs,
    hollywoodSongs, 
    officialTrendingSongs,
    hindiSongs,
    isIndianMusicLoading,
    fetchIndianTrendingSongs,
    fetchIndianNewReleases,
    fetchBollywoodSongs,
    fetchHollywoodSongs,
    fetchOfficialTrendingSongs,
    fetchHindiSongs,
    searchIndianSongs,
    convertIndianSongToAppSong
  } = useMusicStore();

  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Effects
  useEffect(() => {
    if (isPlaying) {
      const bars = Array.from({ length: 5 }, () => Math.random() * 100);
      setAnimationBars(bars);
      
      const interval = setInterval(() => {
        setAnimationBars(Array.from({ length: 5 }, () => Math.random() * 100));
      }, 700);
      
      return () => clearInterval(interval);
    }
  }, [isPlaying, currentSong]);

  useEffect(() => {
    const loadAllMusic = async () => {
      try {
        await Promise.all([
          fetchIndianTrendingSongs(),
          fetchIndianNewReleases(),
          fetchBollywoodSongs(),
          fetchHollywoodSongs(),
          fetchOfficialTrendingSongs(),
          fetchHindiSongs()
        ]);
      } catch (error) {
        console.error('Error loading music:', error);
        toast.error('Failed to load music');
      }
    };

    loadAllMusic();

    const queryParams = new URLSearchParams(location.search);
    const q = queryParams.get('q');
    
    if (location.pathname === '/') {
      if (indianSearchResults.length > 0) {
        useMusicStore.setState((state: MusicStoreState) => ({ ...state, indianSearchResults: [] }));
      }
    } else if (q) {
      searchIndianSongs(q);
    }
  }, [location.pathname, location.search, indianSearchResults.length, fetchIndianTrendingSongs, fetchIndianNewReleases, fetchBollywoodSongs, fetchHollywoodSongs, fetchOfficialTrendingSongs, fetchHindiSongs, searchIndianSongs]);

  useEffect(() => {
    // Only update auth status when authentication state changes
    // and when the user object has a valid ID
    if (user?.id) {
      // Use a ref to track if this is the first authentication
      const isFirstAuth = !useAuthStore.getState().isAuthenticated && isAuthenticated;
      
      // Only set auth status if this is the first auth or authentication state changed
      if (isFirstAuth || useAuthStore.getState().userId !== user.id) {
        useAuthStore.getState().setAuthStatus(isAuthenticated, user.id);
      }
    } else if (!isAuthenticated && useAuthStore.getState().isAuthenticated) {
      // Handle logout case
      useAuthStore.getState().setAuthStatus(false, null);
    }
    // This effect should only run when authentication state or user ID changes
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    const loadLikedSongsDebounced = () => {
      const likedSongs = loadLikedSongs();
      setLikedSongIds(new Set(likedSongs.map(song => song.id)));
    };
    
    const initialLoadTimeout = setTimeout(loadLikedSongsDebounced, 500);
    
    const handleLikedSongsUpdated = () => loadLikedSongsDebounced();
    document.addEventListener('likedSongsUpdated', handleLikedSongsUpdated);
    
    return () => {
      clearTimeout(initialLoadTimeout);
      document.removeEventListener('likedSongsUpdated', handleLikedSongsUpdated);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    const handleUserInteraction = () => setUserInteracted();
    
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);
    
    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, [setUserInteracted]);

  // Handlers
  const refreshSongs = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchIndianTrendingSongs(),
        fetchIndianNewReleases(),
        fetchBollywoodSongs(),
        fetchHollywoodSongs(),
        fetchOfficialTrendingSongs(),
        fetchHindiSongs()
      ]);
      
      setVisibleCounts({
        trending: 10,
        newReleases: 10,
        bollywood: 10,
        hollywood: 10,
        official: 10,
        hindi: 10
      });
    } catch (error) {
      console.error("Error refreshing songs:", error);
      toast.error("Failed to refresh songs");
    }
    setIsRefreshing(false);
  };

  const loadMore = (type: keyof VisibleCounts) => {
    setVisibleCounts(prev => ({
      ...prev,
      [type]: prev[type] + 10
    }));
  };

  const ensureHttps = (url: string) => {
    if (!url) return '';
    try {
      const urlObj = new URL(url);
      if (urlObj.protocol === 'http:') {
        return url.replace('http://', 'https://');
      }
      return url;
    } catch (error) {
      console.error('Invalid URL:', url);
      return url;
    }
  };

  const playSong = async (song: Song) => {
    if (!song) return;
    
    if (!song.url) {
      await fetchSongDetails(song.id);
      return;
    }
    
    try {
      const secureUrl = ensureHttps(song.url);
      const appSong = convertIndianSongToAppSong({
        ...song,
        url: secureUrl
      });
      setAppCurrentSong(appSong);
    } catch (error) {
      console.error("Error playing song:", error);
      toast.error("Failed to play song. Please try again.");
    }
  };

  const fetchSongDetails = async (songId: string) => {
    // Get song details logic would go here
    console.log("Fetching details for song:", songId);
    toast.error("Song details not available at the moment");
  };

  const toggleLikeSong = (song: Song, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    
    if (!isAuthenticated) {
      setShowLoginDialog(true);
      return;
    }
    
    try {
      const songId = song.id;
      if (likedSongIds.has(songId)) {
        // Remove from liked songs
        removeLikedSong(songId);
        setLikedSongIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(songId);
          return newSet;
        });
        toast.success(`Removed "${song.title}" from Liked Songs`);
      } else {
        // Add to liked songs - convert to required format
        const likedSong = {
          id: song.id,
          title: song.title,
          artist: song.artist || '',
          albumName: song.album,
          imageUrl: song.image,
          audioUrl: song.url || '',
          duration: song.duration ? parseInt(song.duration) : 0
        };
        addLikedSong(likedSong);
        setLikedSongIds(prev => new Set([...prev, songId]));
        toast.success(`Added "${song.title}" to Liked Songs`);
      }
    } catch (error) {
      console.error("Error toggling like status:", error);
      toast.error("Failed to update liked songs");
    }
  };

  const handleShare = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    
    if (!selectedSong) return;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: selectedSong.title,
          text: `Listen to ${selectedSong.title} by ${selectedSong.artist || 'Unknown Artist'} on Spotify`,
          url: window.location.href
        });
      } else {
        // Fallback for browsers without Web Share API
        toast("Share URL copied to clipboard", {
          icon: "📋",
        });
      }
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const isSongPlaying = (song: Song) => {
    return isPlaying && currentSong && 
           currentSong.id === song.id;
  };

  // UI Components
  const SectionHeader = ({ title }: { title: string }) => (
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-xl font-bold">{title}</h2>
    </div>
  );

  const renderSongCard = (song: Song) => (
    <div 
      key={song.id}
      className="p-4 bg-zinc-800/50 rounded-md hover:bg-zinc-700/70 active:bg-zinc-600/70 
                transition-colors duration-150 cursor-pointer group relative flex flex-col"
      onClick={(e) => {
        e.preventDefault();
        // Play song immediately on single click/tap
        playSong(song);
        // Force immediate playing state
        setTimeout(() => {
          const playerStore = usePlayerStore.getState();
          playerStore.setUserInteracted();
          playerStore.setIsPlaying(true);
        }, 50);
      }}
    >
      <div className="relative mb-3 aspect-square overflow-hidden rounded-md">
        <img 
          src={song.image || '/default-album.png'} 
          alt={song.title} 
          className="object-cover w-full h-full transition-transform duration-200 group-hover:scale-102" 
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <Button 
            size="icon" 
            className="size-12 rounded-full bg-green-500 hover:bg-green-600 transition shadow-md"
            onClick={(e) => {
              e.stopPropagation();
              playSong(song);
              // Force immediate playing state
              setTimeout(() => {
                const playerStore = usePlayerStore.getState();
                playerStore.setUserInteracted();
                playerStore.setIsPlaying(true);
              }, 50);
            }}
          >
            {isSongPlaying(song) ? (
              <Pause className="size-6" />
            ) : (
              <Play className="size-6" />
            )}
          </Button>
        </div>
      </div>
      <div className="flex-1">
        <h3 className="font-semibold truncate">{song.title}</h3>
        <p className="text-sm text-zinc-400 truncate">{song.artist || 'Unknown Artist'}</p>
      </div>
      <div className="mt-3 flex justify-between items-center">
        <Button 
          variant={likedSongIds.has(song.id) ? "default" : "ghost"} 
          size="icon" 
          className={`size-9 rounded-full ${likedSongIds.has(song.id) ? 'bg-green-500 hover:bg-green-600' : ''}`}
          onClick={(e) => toggleLikeSong(song, e)}
        >
          <Heart className={`size-5 ${likedSongIds.has(song.id) ? 'fill-white' : ''}`} />
        </Button>
        {song.duration && (
          <span className="text-xs text-zinc-400">{song.duration}</span>
        )}
      </div>
    </div>
  );

  const renderSongRow = (song: Song) => (
    <div 
      key={song.id}
      className="flex items-center p-2 rounded-md hover:bg-zinc-800/80 active:bg-zinc-700/70 
                 transition-colors duration-150 cursor-pointer group relative"
      onClick={(e) => {
        e.preventDefault();
        // Play song immediately on single click/tap
        playSong(song);
        // Force immediate playing state
        setTimeout(() => {
          const playerStore = usePlayerStore.getState();
          playerStore.setUserInteracted();
          playerStore.setIsPlaying(true);
        }, 50);
      }}
    >
      <div className="relative size-12 flex-shrink-0 mr-3">
        <img 
          src={song.image || '/default-album.png'} 
          alt={song.title} 
          className="size-full object-cover rounded transition-transform duration-200 group-hover:scale-102" 
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 rounded">
          {isSongPlaying(song) ? (
            <div className="flex items-center justify-center space-x-0.5">
              {animationBars.map((height, i) => (
                <div 
                  key={i} 
                  className="w-0.5 bg-white" 
                  style={{ height: `${Math.max(40, height)}%` }}
                ></div>
              ))}
            </div>
          ) : (
            <Play className="size-5" />
          )}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium truncate">{song.title}</h3>
        <p className="text-sm text-zinc-400 truncate">{song.artist || 'Unknown Artist'}</p>
      </div>
      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button 
          variant="ghost" 
          size="icon" 
          className="size-8 rounded-full"
          onClick={(e) => toggleLikeSong(song, e)}
        >
          <Heart className={`size-4 ${likedSongIds.has(song.id) ? 'fill-green-500 text-green-500' : ''}`} />
        </Button>
        <span className="text-xs text-zinc-400 w-12 text-right">
          {song.duration || '--:--'}
        </span>
      </div>
    </div>
  );

  const SongDetailView = () => {
    if (!selectedSong) return null;
    
    return (
      <Dialog open={showSongDetails} onOpenChange={setShowSongDetails}>
        <DialogContent className="bg-gradient-to-b from-zinc-800 to-zinc-900 border-zinc-700 max-w-md">
          <div className="flex flex-col items-center py-4">
            <div className="flex w-full justify-between mb-4">
              <Button variant="ghost" size="icon" onClick={() => setShowSongDetails(false)}>
                <ArrowLeft className="size-5" />
              </Button>
              <h3 className="text-lg font-semibold">Song Details</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowSongDetails(false)}>
                <X className="size-5" />
              </Button>
            </div>
            
            <div className="relative w-64 h-64 mb-6">
              <img 
                src={selectedSong.image || '/default-album.png'} 
                alt={selectedSong.title} 
                className="w-full h-full object-cover rounded-md shadow-lg" 
              />
            </div>
            
            <div className="text-center w-full mb-6">
              <h2 className="text-xl font-bold mb-1">{selectedSong.title}</h2>
              <p className="text-zinc-400">{selectedSong.artist || 'Unknown Artist'}</p>
              {selectedSong.album && (
                <p className="text-zinc-500 text-sm mt-1">{selectedSong.album}</p>
              )}
            </div>
            
            <div className="flex justify-between w-full mb-8">
              <Button 
                variant={likedSongIds.has(selectedSong.id) ? "default" : "ghost"} 
                size="icon"
                className={`size-10 rounded-full ${likedSongIds.has(selectedSong.id) ? 'bg-green-500 hover:bg-green-600' : ''}`}
                onClick={(e) => toggleLikeSong(selectedSong, e)}
              >
                <Heart className={`size-5 ${likedSongIds.has(selectedSong.id) ? 'fill-white' : ''}`} />
              </Button>
              
              <Button variant="ghost" size="icon" className="size-10 rounded-full" onClick={handleShare}>
                <Share2 className="size-5" />
              </Button>
              
              <Button variant="ghost" size="icon" className="size-10 rounded-full">
                <Download className="size-5" />
              </Button>
              
              <Button variant="ghost" size="icon" className="size-10 rounded-full">
                <MoreHorizontal className="size-5" />
              </Button>
            </div>
            
            {isPlaying && currentSong && currentSong.id === selectedSong.id && (
              <div className="w-full mb-6">
                <div className="w-full bg-zinc-700 h-1 rounded-full mb-2">
                  <div 
                    className="bg-green-500 h-full rounded-full" 
                    style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            )}
            
            <Button 
              size="lg" 
              className="w-full bg-green-500 hover:bg-green-600 text-lg font-semibold rounded-full"
              onClick={() => playSong(selectedSong)}
            >
              {isSongPlaying(selectedSong) ? 'Pause' : 'Play'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // Login dialog
  const LoginDialog = () => (
    <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
      <DialogContent className="bg-zinc-800 border-zinc-700 max-w-md">
        <div className="flex flex-col items-center py-6">
          <div className="size-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
            <Music className="size-8 text-black" />
          </div>
          
          <h2 className="text-xl font-bold mb-2">Sign in to continue</h2>
          <p className="text-zinc-400 text-center mb-6">
            Sign in to like songs, create playlists, and access all features.
          </p>
          
          <Button
            className="w-full mb-4 bg-white text-black hover:bg-gray-200 font-medium flex items-center justify-center gap-2"
            onClick={() => setShowLoginDialog(false)}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  // Render
  return (
    <div className="space-y-6">
      {/* Login Dialog */}
      <LoginDialog />
      
      {/* Song Detail View */}
      <SongDetailView />
      
      {/* Refresh Button */}
      <div className="flex justify-end">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={refreshSongs}
                disabled={isRefreshing}
                className="rounded-full"
              >
                <RefreshCcw className={`size-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Refresh songs</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {/* Search Results */}
      {location.pathname.includes('/search') && indianSearchResults.length > 0 && (
        <div className="mb-8">
          <SectionHeader title="Search Results" />
          <div className="space-y-1">
            {indianSearchResults.map(song => renderSongRow(song))}
          </div>
        </div>
      )}
      
      {/* Loading State */}
      {isIndianMusicLoading && (
        <div className="py-8 flex justify-center">
          <Loader className="size-8 animate-spin text-zinc-500" />
        </div>
      )}
      
      {/* Trending Songs Section */}
      {indianTrendingSongs.length > 0 && (
        <div className="mb-8">
          <SectionHeader title="Trending Songs" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {indianTrendingSongs.slice(0, visibleCounts.trending).map(song => renderSongCard(song))}
          </div>
          {indianTrendingSongs.length > visibleCounts.trending && (
            <div className="mt-4 flex justify-center">
              <Button variant="ghost" onClick={() => loadMore('trending')}>
                Load More
              </Button>
            </div>
          )}
        </div>
      )}
      
      {/* New Releases Section */}
      {indianNewReleases.length > 0 && (
        <div className="mb-8">
          <SectionHeader title="New Releases" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {indianNewReleases.slice(0, visibleCounts.newReleases).map(song => renderSongCard(song))}
          </div>
          {indianNewReleases.length > visibleCounts.newReleases && (
            <div className="mt-4 flex justify-center">
              <Button variant="ghost" onClick={() => loadMore('newReleases')}>
                Load More
              </Button>
            </div>
          )}
        </div>
      )}
      
      {/* Bollywood Songs */}
      {bollywoodSongs.length > 0 && (
        <div className="mb-8">
          <SectionHeader title="Bollywood Hits" />
          <div className="space-y-1">
            {bollywoodSongs.slice(0, visibleCounts.bollywood).map(song => renderSongRow(song))}
          </div>
          {bollywoodSongs.length > visibleCounts.bollywood && (
            <div className="mt-4 flex justify-center">
              <Button variant="ghost" onClick={() => loadMore('bollywood')}>
                Load More
              </Button>
            </div>
          )}
        </div>
      )}
      
      {/* Hollywood Songs */}
      {hollywoodSongs.length > 0 && (
        <div className="mb-8">
          <SectionHeader title="International Hits" />
          <div className="space-y-1">
            {hollywoodSongs.slice(0, visibleCounts.hollywood).map(song => renderSongRow(song))}
          </div>
          {hollywoodSongs.length > visibleCounts.hollywood && (
            <div className="mt-4 flex justify-center">
              <Button variant="ghost" onClick={() => loadMore('hollywood')}>
                Load More
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default IndianMusicPlayer;