import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader, Play, Pause, Heart, RefreshCcw, Music, X, Share2, Download, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { useMusicStore } from "@/stores/useMusicStore";
import { useAuth } from "../contexts/AuthContext";
import { useAuthStore } from "@/stores/useAuthStore";
import { loadLikedSongs, addLikedSong, removeLikedSong } from "@/services/likedSongsService";
import { useLocation } from "react-router-dom";
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
  _id?: string;
}

// AppSong interface not used directly here

interface VisibleCounts {
  trending: number;
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
  // Local playback UI timing not used in this list view
  const [likedSongIds, setLikedSongIds] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [showLoginDialog, setShowLoginDialog] = useState<boolean>(false);
  const [animationBars, setAnimationBars] = useState<number[]>([]);

  // Visible song counts
  const [visibleCounts, setVisibleCounts] = useState<VisibleCounts>({
    trending: 12, // Showing more trending songs initially
    bollywood: 10,
    hollywood: 10,
    official: 10,
    hindi: 10
  });

  // Hooks
  const { setCurrentSong: setAppCurrentSong, isPlaying, currentSong, setUserInteracted } = usePlayerStore();
  const { 
    indianTrendingSongs,
    indianSearchResults,
    bollywoodSongs,
    hollywoodSongs, 
    isIndianMusicLoading,
    fetchIndianTrendingSongs,
    fetchBollywoodSongs,
    fetchHollywoodSongs,
    fetchOfficialTrendingSongs,
    fetchHindiSongs,
    searchIndianSongs,
    convertIndianSongToAppSong
  } = useMusicStore();

  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  // const navigate = useNavigate();

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
  }, [location.pathname, location.search, indianSearchResults.length, fetchIndianTrendingSongs, fetchBollywoodSongs, fetchHollywoodSongs, fetchOfficialTrendingSongs, fetchHindiSongs, searchIndianSongs]);

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
        fetchBollywoodSongs(),
        fetchHollywoodSongs(),
        fetchOfficialTrendingSongs(),
        fetchHindiSongs()
      ]);
      
      setVisibleCounts({
        trending: 12,
        bollywood: 10,
        hollywood: 10,
        official: 10,
        hindi: 10
      });
      
      toast.success("Updated with latest trending songs from the internet");
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
        // Add to liked songs - Convert to required format for addLikedSong
        const likedSong = {
          id: song.id,
          title: song.title,
          artist: song.artist || 'Unknown Artist',
          imageUrl: song.image,
          audioUrl: song.url || '',
          duration: song.duration ? parseInt(song.duration) : undefined
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
    return isPlaying && currentSong && currentSong._id === song.id;
  };

  // UI Components
  const SectionHeader = ({ title }: { title: string }) => (
    <div className="flex justify-between items-center mb-3">
      <h2 className="text-lg font-bold">{title}</h2>
    </div>
  );

  // Generate fallback image for broken image URLs
  const generateFallbackImage = (title: string): string => {
    const colors = ['#1DB954', '#3D91F4', '#E13300', '#FFA42B', '#8B2AC2'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    const safeText = (title || 'Music').replace(/['&<>]/g, '').substring(0, 15);
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="300" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="300" height="300" fill="${color}"/>
        <text x="150" y="150" font-family="Arial" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle">${safeText}</text>
        <path d="M200,150 C200,177.614 177.614,200 150,200 C122.386,200 100,177.614 100,150 C100,122.386 122.386,100 150,100 C177.614,100 200,122.386 200,150 Z" fill="rgba(255,255,255,0.2)"/>
        <path d="M165,140 L140,125 L140,175 L165,160 Z" fill="white"/>
      </svg>
    `)}`;
  };

  const renderSongCard = (song: Song) => (
    <div 
      key={song.id}
      className="relative rounded-md overflow-hidden hover:bg-accent transition-colors p-4 group flex flex-col"
    >
      <div 
                    className="relative aspect-square w-full overflow-hidden rounded-md mb-4 bg-muted"
        onClick={() => playSong(song)}
      >
        {song.image ? (
          <img 
            src={song.image} 
            alt={song.title}
            className="object-cover w-full h-full transition-all"
            onError={(e) => {
              // Set a default placeholder image if the original URL fails to load
              e.currentTarget.src = generateFallbackImage(song.title);
              // Remove the error handler to prevent infinite loops if the fallback also fails
              e.currentTarget.onerror = null;
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <img 
              src={generateFallbackImage(song.title)}
              alt={song.title}
              className="object-cover w-full h-full"
            />
          </div>
        )}
        <div 
          className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        >
          {isSongPlaying(song) ? (
            <button 
              className="h-10 w-10 rounded-full bg-white flex items-center justify-center"
              aria-label="Pause"
              onClick={(e) => {
                e.stopPropagation();
                usePlayerStore.getState().togglePlay();
              }}
            >
              <Pause className="h-5 w-5 text-black" />
              <span className="sr-only">Pause</span>
            </button>
          ) : (
            <button 
              className="h-10 w-10 rounded-full bg-white flex items-center justify-center"
              aria-label="Play"
              onClick={(e) => {
                e.stopPropagation();
                playSong(song);
              }}
            >
              <Play className="h-5 w-5 text-black ml-0.5" />
              <span className="sr-only">Play</span>
            </button>
          )}
        </div>
      </div>
      <h3 
        className="text-[13px] font-medium leading-snug line-clamp-2 cursor-pointer text-foreground"
        onClick={() => playSong(song)}
      >
        {song.title}
      </h3>
      <p className="text-[11px] text-muted-foreground truncate">{song.artist || 'Unknown Artist'}</p>
    </div>
  );

  const renderSongRow = (song: Song) => (
    <div 
      key={song.id}
      className="grid grid-cols-[auto_1fr_auto] gap-4 p-2 hover:bg-accent rounded-md group cursor-pointer"
      onClick={() => playSong(song)}
    >
                      <div className="w-10 h-10 rounded-md bg-muted overflow-hidden flex-shrink-0">
        {song.image ? (
          <img 
            src={song.image} 
            alt={song.title} 
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = generateFallbackImage(song.title);
              e.currentTarget.onerror = null;
            }}
          />
        ) : (
          <img 
            src={generateFallbackImage(song.title)}
            alt={song.title}
            className="w-full h-full object-cover"
          />
        )}
      </div>
      
      <div className="min-w-0 flex flex-col justify-center">
        <h3 className="text-[13px] font-medium leading-snug line-clamp-2 text-foreground">
          {song.title}
        </h3>
        <p className="text-[11px] text-muted-foreground truncate">
          {song.artist || 'Unknown Artist'}
        </p>
      </div>
      
      <div className="flex items-center gap-1">
        {currentSong && currentSong._id === song.id && isPlaying && (
          <div className="flex h-8 items-center gap-0.5 mr-3">
            {animationBars.map((height, idx) => (
              <span 
                key={idx} 
                className="w-0.5 bg-green-500 rounded-sm"
                style={{ 
                  height: '12px',
                  transform: `scaleY(${height / 100})`, 
                  transition: 'transform 0.2s ease',
                  animationDelay: `${idx * 0.2}s`
                }}
              ></span>
            ))}
          </div>
        )}
        
        <Button
          variant="ghost"
          size="icon"
                          className={`size-8 text-muted-foreground opacity-0 group-hover:opacity-100 ${likedSongIds.has(song.id) ? '!opacity-100 text-green-500' : ''}`}
          onClick={(e) => toggleLikeSong(song, e)}
          title={likedSongIds.has(song.id) ? 'Remove from liked songs' : 'Add to liked songs'}
        >
          <Heart className={likedSongIds.has(song.id) ? 'fill-current' : ''} size={18} />
        </Button>
        
                        <div className="w-16 text-right text-xs text-muted-foreground">
          {song.duration ? formatTime(parseInt(song.duration)) : ''}
        </div>
      </div>
    </div>
  );

  const SongDetailView = () => {
    if (!selectedSong) return null;
    
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full"
            onClick={() => setSelectedSong(null)}
          >
            <ArrowLeft />
          </Button>
          <h2 className="text-xl font-bold">Song Details</h2>
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full"
            onClick={() => setSelectedSong(null)}
          >
            <X />
          </Button>
        </div>
        
        <div className="flex flex-col items-center justify-center mb-6">
                      <div className="w-56 h-56 rounded-lg overflow-hidden bg-muted mb-4 shadow-xl">
            {selectedSong.image ? (
              <img 
                src={selectedSong.image} 
                alt={selectedSong.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = generateFallbackImage(selectedSong.title);
                  e.currentTarget.onerror = null;
                }}
              />
            ) : (
              <img 
                src={generateFallbackImage(selectedSong.title)}
                alt={selectedSong.title}
                className="w-full h-full object-cover"
              />
            )}
          </div>
          <h3 className="text-xl font-bold text-center">{selectedSong.title}</h3>
          <p className="text-muted-foreground text-center">{selectedSong.artist || 'Unknown Artist'}</p>
          {selectedSong.album && (
            <p className="text-muted-foreground/70 text-sm text-center">{selectedSong.album}</p>
          )}
          {selectedSong.year && (
            <p className="text-muted-foreground/50 text-xs text-center">{selectedSong.year}</p>
          )}
        </div>
        
        <div className="flex justify-center gap-4 mb-8">
          <Button 
            className="rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg"
            onClick={() => playSong(selectedSong)}
          >
            {isSongPlaying(selectedSong) ? (
              <>
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4 ml-0.5" />
                Play
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            className="rounded-full"
            onClick={(e) => toggleLikeSong(selectedSong, e as any)}
          >
            <Heart className={`mr-2 h-4 w-4 ${likedSongIds.has(selectedSong.id) ? 'fill-current text-red-500' : ''}`} />
            {likedSongIds.has(selectedSong.id) ? 'Remove' : 'Like'}
          </Button>
          
          <Button
            variant="outline"
            className="rounded-full"
            onClick={handleShare}
          >
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
        </div>
        
                    <div className="bg-muted/50 rounded-xl p-4 mb-4">
          <h4 className="text-sm font-medium mb-2 flex items-center">
            <Music className="h-4 w-4 mr-2" />
            Audio Information
          </h4>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <div className="text-muted-foreground">Duration</div>
            <div>{selectedSong.duration ? formatTime(parseInt(selectedSong.duration)) : 'Unknown'}</div>
            {selectedSong.url && (
              <>
                <div className="text-muted-foreground">Format</div>
                <div>MP4 Audio</div>
                <div className="text-muted-foreground">Quality</div>
                <div>High (320kbps)</div>
              </>
            )}
          </div>
        </div>
        
        {selectedSong.url && (
          <Button
            variant="outline"
            className="mt-auto rounded-full flex items-center justify-center"
            onClick={() => {
              if (selectedSong.url) {
                const a = document.createElement('a');
                a.href = selectedSong.url;
                a.download = `${selectedSong.title}.mp4`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Download Audio
          </Button>
        )}
      </div>
    );
  };

  // Login dialog
  const LoginDialog = () => (
    <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
      <DialogContent className="max-w-md">
        <div className="flex flex-col items-center py-6">
          <div className="size-16 bg-primary rounded-full flex items-center justify-center mb-4">
            <Music className="size-8 text-primary-foreground" />
          </div>
          
          <h2 className="text-xl font-bold mb-2">Sign in to continue</h2>
          <p className="text-muted-foreground text-center mb-6">
            Sign in to like songs, create playlists, and access all features.
          </p>
          
          <Button
            className="w-full mb-4 bg-primary text-primary-foreground hover:bg-primary/90 font-medium flex items-center justify-center gap-2"
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
    <div className="space-y-5">
      {/* Login Dialog */}
      <LoginDialog />
      
      {/* Song Detail View */}
      <SongDetailView />
      
      {/* Refresh Button */}
      <div className="flex justify-end px-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={refreshSongs}
                disabled={isRefreshing}
                className="rounded-full h-7 w-7"
              >
                <RefreshCcw className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Get latest trending songs</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {/* Search Results */}
      {location.pathname.includes('/search') && indianSearchResults.length > 0 && (
        <div className="mb-6">
          <SectionHeader title="Search Results" />
          <div className="space-y-0.5">
            {indianSearchResults.map(song => renderSongRow(song))}
          </div>
        </div>
      )}
      
      {/* Loading State */}
      {isIndianMusicLoading && (
        <div className="py-6 flex justify-center">
          <Loader className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}
      
      {/* Trending Songs Section */}
      {indianTrendingSongs.length > 0 && (
        <div className="mb-6 px-1">
          <SectionHeader title="Most Popular Songs" />
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-3">
            {indianTrendingSongs.slice(0, visibleCounts.trending).map(song => renderSongCard(song))}
          </div>
          {indianTrendingSongs.length > visibleCounts.trending && (
            <div className="mt-3 flex justify-center">
              <Button variant="ghost" className="text-xs h-8" onClick={() => loadMore('trending')}>
                Load More
              </Button>
            </div>
          )}
        </div>
      )}
      
      {/* Bollywood Songs */}
      {bollywoodSongs.length > 0 && (
        <div className="mb-6 px-1">
          <SectionHeader title="Bollywood Hits" />
          <div className="space-y-0.5 rounded-lg overflow-hidden bg-muted/30">
            {bollywoodSongs.slice(0, visibleCounts.bollywood).map(song => renderSongRow(song))}
          </div>
          {bollywoodSongs.length > visibleCounts.bollywood && (
            <div className="mt-3 flex justify-center">
              <Button variant="ghost" className="text-xs h-8" onClick={() => loadMore('bollywood')}>
                Load More
              </Button>
            </div>
          )}
        </div>
      )}
      
      {/* Hollywood Songs */}
      {hollywoodSongs.length > 0 && (
        <div className="mb-6 px-1">
          <SectionHeader title="International Hits" />
          <div className="space-y-0.5 rounded-lg overflow-hidden bg-muted/30">
            {hollywoodSongs.slice(0, visibleCounts.hollywood).map(song => renderSongRow(song))}
          </div>
          {hollywoodSongs.length > visibleCounts.hollywood && (
            <div className="mt-3 flex justify-center">
              <Button variant="ghost" className="text-xs h-8" onClick={() => loadMore('hollywood')}>
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