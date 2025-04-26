import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader, Play, Pause, Heart, RefreshCcw, ChevronDown, Clock, Music, X, Share2, Download, MoreHorizontal, ArrowLeft, Volume2 } from "lucide-react";
import toast from "react-hot-toast";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { useMusicStore } from "@/stores/useMusicStore";
import { useAuth } from "../contexts/AuthContext";
import { useAuthStore } from "@/stores/useAuthStore";
import { loadLikedSongs, addLikedSong, removeLikedSong, Song as LikedSong } from "@/services/likedSongsService";
import { useLocation, useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getGoogleAuthUrl } from "../services/auth.service";
import { cn } from "@/lib/utils";
import EqualiserAnimation from "./EqualiserAnimation";

// Interface definitions aligned with useMusicStore
interface Song {
  id: string;
  title: string;
  artist?: string;
  album?: string;
  year?: string;
  duration?: string;
  image: string;
  url?: string;
  _id?: string;  // For compatibility with backend songs
  songId?: string;  // For compatibility with different song formats
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

  // Define loadLikedSongsDebounced outside useEffect
  const loadLikedSongsDebounced = useCallback(() => {
    try {
      const likedSongs = loadLikedSongs();
      if (Array.isArray(likedSongs)) {
        setLikedSongIds(new Set(likedSongs.map(song => getSongId(song))));
      } else {
        console.warn('likedSongs is not an array:', likedSongs);
        setLikedSongIds(new Set());
      }
    } catch (error) {
      console.error('Error loading liked songs:', error);
      setLikedSongIds(new Set());
    }
  }, []);

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
    const initialLoadTimeout = setTimeout(() => {
      loadLikedSongsDebounced();
    }, 500);
    
    const handleLikedSongsUpdated = () => loadLikedSongsDebounced();
    document.addEventListener('likedSongsUpdated', handleLikedSongsUpdated);
    
    return () => {
      clearTimeout(initialLoadTimeout);
      document.removeEventListener('likedSongsUpdated', handleLikedSongsUpdated);
    };
  }, [isAuthenticated, loadLikedSongsDebounced]);

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
      await fetchSongDetails(getSongId(song));
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
    try {
      setSelectedSong(indianSearchResults.find(song => getSongId(song) === songId) || null);
      setShowSongDetails(true);
    } catch (error) {
      console.error('Error fetching song details:', error);
      toast.error('Failed to load song details');
    }
  };

  // Helper function to get song ID consistently
  const getSongId = (song: any): string => {
    return song.id || song._id || song.songId || '';
  };

  const isSongPlaying = (song: Song) => {
    const songId = getSongId(song);
    return isPlaying && currentSong && getSongId(currentSong) === songId;
  };

  const toggleLikeSong = (song: Song, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    
    if (!isAuthenticated) {
      setShowLoginDialog(true);
      return;
    }
    
    try {
      const songId = getSongId(song);
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
        // Add to liked songs
        addLikedSong({
          id: songId,
          title: song.title,
          artist: song.artist || 'Unknown Artist',
          imageUrl: song.image,
          audioUrl: song.url || '',
          duration: parseInt(song.duration || '0')
        });
        setLikedSongIds(prev => new Set([...prev, songId]));
        toast.success(`Added "${song.title}" to Liked Songs`);
      }
    } catch (error) {
      console.error("Error toggling like status:", error);
      toast.error("Failed to update liked songs");
    }
  };

  const handleGoogleSignIn = () => {
    window.location.href = getGoogleAuthUrl();
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

  // UI Components
  const SectionHeader = ({ title }: { title: string }) => (
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-xl font-bold">{title}</h2>
    </div>
  );

  const renderSongCard = (song: Song) => {
    const songId = getSongId(song);
    return (
      <div 
        key={songId}
        className="p-4 bg-zinc-800 rounded-md hover:bg-zinc-700 transition cursor-pointer group relative flex flex-col"
        onClick={() => {
          playSong(song);
        }}
      >
        <div className="relative mb-3 aspect-square overflow-hidden rounded-md">
          <img 
            src={song.image || '/default-album.png'} 
            alt={song.title} 
            className="object-cover w-full h-full" 
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50">
            <Button 
              size="icon" 
              className="size-12 rounded-full bg-green-500 hover:bg-green-600 transition shadow-lg"
              onClick={(e) => {
                e.stopPropagation();
                playSong(song);
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
            variant={likedSongIds.has(songId) ? "default" : "ghost"} 
            size="icon" 
            className={`size-9 rounded-full ${likedSongIds.has(songId) ? 'bg-green-500 hover:bg-green-600' : ''}`}
            onClick={(e) => toggleLikeSong(song, e)}
          >
            <Heart className={`size-5 ${likedSongIds.has(songId) ? 'fill-white' : ''}`} />
          </Button>
          {song.duration && (
            <span className="text-xs text-zinc-400">{song.duration}</span>
          )}
        </div>
      </div>
    );
  };

  const renderSongRow = (song: Song, index: number) => {
    const songId = getSongId(song);
    
    return (
      <div
        key={songId}
        className={cn(
          'flex items-center space-x-4 py-2 px-4 hover:bg-white/5 rounded transition-colors group relative',
          isSongPlaying(song) && 'bg-white/10'
        )}
      >
        <div className="relative size-12 flex-shrink-0 mr-3">
          <img 
            src={song.image || '/default-album.png'} 
            alt={song.title} 
            className="size-full object-cover rounded" 
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded">
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
        <div className="flex-1 truncate">
          <div className="flex items-center">
            {isPlaying && currentSong && getSongId(currentSong) === songId && (
              <EqualiserAnimation className="h-3 w-3 mr-2" />
            )}
            <h3 className="font-medium truncate">{song.title}</h3>
          </div>
          <p className="text-sm text-zinc-400 truncate">{song.artist || 'Unknown Artist'}</p>
        </div>
        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button 
            variant="ghost" 
            size="icon" 
            className="size-8 rounded-full"
            onClick={(e) => toggleLikeSong(song, e)}
          >
            <Heart className={`size-4 ${likedSongIds.has(songId) ? 'fill-green-500 text-green-500' : ''}`} />
          </Button>
          <span className="text-xs text-zinc-400 w-12 text-right">
            {song.duration || '--:--'}
          </span>
        </div>
      </div>
    );
  };

  const SongDetailView = () => {
    if (!selectedSong) return null;
    
    const songId = getSongId(selectedSong);
    
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
                variant={likedSongIds.has(songId) ? "default" : "ghost"} 
                size="icon"
                className={`size-10 rounded-full ${likedSongIds.has(songId) ? 'bg-green-500 hover:bg-green-600' : ''}`}
                onClick={(e) => toggleLikeSong(selectedSong, e)}
              >
                <Heart className={`size-5 ${likedSongIds.has(songId) ? 'fill-white' : ''}`} />
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
            
            {isPlaying && currentSong && getSongId(currentSong) === songId && (
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
            onClick={handleGoogleSignIn}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Sign in with Google
          </Button>
          
          <Button
            variant="ghost"
            className="text-zinc-400 hover:text-white"
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
      
      {/* Search and Refresh Section */}
      <div className="flex justify-between items-center gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search for songs, artists, or albums..."
            className="w-full p-2 pl-10 bg-white/5 border border-white/10 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const query = e.currentTarget.value;
                if (query.trim()) {
                  searchIndianSongs(query);
                  if (!location.pathname.includes('/search')) {
                    navigate('/search?q=' + encodeURIComponent(query));
                  }
                }
              }
            }}
            defaultValue={new URLSearchParams(location.search).get('q') || ''}
            id="song-search-input"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 rounded-full"
            onClick={() => {
              const input = document.getElementById('song-search-input') as HTMLInputElement;
              const query = input?.value;
              if (query?.trim()) {
                searchIndianSongs(query);
                if (!location.pathname.includes('/search')) {
                  navigate('/search?q=' + encodeURIComponent(query));
                }
              }
            }}
          >
            Search
          </Button>
        </div>
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
      
      {/* Example Search Button For Pal Pal */}
      {!location.pathname.includes('/search') && (
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              const query = "Pal Pal by Afusic, AliSoomroMusic";
              searchIndianSongs(query);
              navigate('/search?q=' + encodeURIComponent(query));
            }}
            className="bg-white/5 border-white/10 hover:bg-white/10"
          >
            Search "Pal Pal"
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              const query = "latest hindi songs 2024";
              searchIndianSongs(query);
              navigate('/search?q=' + encodeURIComponent(query));
            }}
            className="bg-white/5 border-white/10 hover:bg-white/10"
          >
            Latest Hindi 2024
          </Button>
        </div>
      )}
      
      {/* Search Results */}
      {location.pathname.includes('/search') && (
        <div className="mb-8">
          <SectionHeader title={indianSearchResults.length > 0 ? 
            `Search Results (${indianSearchResults.length})` : 
            "Search Results"} />
          
          {isIndianMusicLoading ? (
            <div className="py-8 flex justify-center">
              <Loader className="size-8 animate-spin text-zinc-500" />
            </div>
          ) : indianSearchResults.length > 0 ? (
            <div className="space-y-1">
              {indianSearchResults.map((song, index) => renderSongRow(song, index))}
            </div>
          ) : (
            <div className="py-8 flex flex-col items-center justify-center text-zinc-400">
              <Music className="size-12 mb-2 opacity-50" />
              <p className="text-center">No results found. Try a different search term.</p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => refreshSongs()}
                className="mt-4 bg-white/5 border-white/10 hover:bg-white/10"
              >
                Refresh Music Library
              </Button>
            </div>
          )}
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
            {bollywoodSongs.slice(0, visibleCounts.bollywood).map((song, index) => renderSongRow(song, index))}
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
            {hollywoodSongs.slice(0, visibleCounts.hollywood).map((song, index) => renderSongRow(song, index))}
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