import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader, Play, Pause, Heart, RefreshCcw, ChevronDown, Clock, Music, X, Share2, Download, MoreHorizontal, ArrowLeft, Volume2 } from "lucide-react";
import toast from "react-hot-toast";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { useMusicStore } from "@/stores/useMusicStore";
import { useAuth, useSignIn } from "@clerk/clerk-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { loadLikedSongs, addLikedSong, removeLikedSong, isSongLiked } from "@/services/likedSongsService";
import { useLocation } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface Song {
  id: string;
  title: string;
  artist?: string;
  album?: string;
  year?: string;
  duration?: string;
  image: string;
  url?: string;
  lyrics?: string;
}

const IndianMusicPlayer = () => {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [likedSongIds, setLikedSongIds] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [visibleTrendingSongs, setVisibleTrendingSongs] = useState(10);
  const [visibleNewReleases, setVisibleNewReleases] = useState(10);
  const [visibleBollywoodSongs, setVisibleBollywoodSongs] = useState(10);
  const [visibleHollywoodSongs, setVisibleHollywoodSongs] = useState(10);
  const [visibleOfficialSongs, setVisibleOfficialSongs] = useState(10);
  const [visibleHindiSongs, setVisibleHindiSongs] = useState(10);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [showSongDetails, setShowSongDetails] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  
  // Get player store methods
  const { setCurrentSong: setAppCurrentSong, isPlaying, togglePlay, currentSong } = usePlayerStore();
  
  // Get music store methods
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

  const { isSignedIn } = useAuth();
  const location = useLocation();

  // Add state for animation of playing song
  const [animationBars, setAnimationBars] = useState<number[]>([]);

  const { signIn, isLoaded: isClerkLoaded } = useSignIn();

  // Generate random animation values on component mount and when play state changes
  useEffect(() => {
    if (isPlaying) {
      // Create an array of random values for animation bars
      const bars = Array.from({ length: 5 }, () => Math.random() * 100);
      setAnimationBars(bars);
      
      // Update animation values every 700ms for effect
      const interval = setInterval(() => {
        setAnimationBars(Array.from({ length: 5 }, () => Math.random() * 100));
      }, 700);
      
      return () => clearInterval(interval);
    }
  }, [isPlaying, currentSong]);

  // Load all music categories on component mount
  useEffect(() => {
    fetchIndianTrendingSongs();
    fetchIndianNewReleases();
    fetchBollywoodSongs();
    fetchHollywoodSongs();
    fetchOfficialTrendingSongs();
    fetchHindiSongs();
    
    // Check for search query in URL
    const queryParams = new URLSearchParams(location.search);
    const q = queryParams.get('q');
    
    // If on home page, clear search results
    if (location.pathname === '/') {
      // Reset the search results in the store if on homepage
      if (indianSearchResults.length > 0) {
        // Clear the search results by setting to empty array
        useMusicStore.setState({ indianSearchResults: [] });
      }
    } else if (q) {
      // Only search if we have a query and are not on the home page
      searchIndianSongs(q);
    }
  }, [
    fetchIndianTrendingSongs, 
    fetchIndianNewReleases, 
    fetchBollywoodSongs,
    fetchHollywoodSongs,
    fetchOfficialTrendingSongs,
    fetchHindiSongs,
    location.pathname, 
    location.search, 
    searchIndianSongs,
    indianSearchResults.length
  ]);

  // Update auth store with current user info
  useEffect(() => {
    useAuthStore.getState().setAuthStatus(
      !!isSignedIn, 
      isSignedIn ? ((window as any).Clerk?.user?.id || null) : null
    );
  }, [isSignedIn]);

  // Load liked songs on mount and when auth changes
  useEffect(() => {
    try {
      const likedSongs = loadLikedSongs();
      setLikedSongIds(new Set(likedSongs.map((song) => song.id)));
    } catch (error) {
      console.error("Error loading liked songs:", error);
    }
  }, [isSignedIn]);

  const refreshSongs = async () => {
    setIsRefreshing(true);
    try {
      // Fetch new songs from different APIs
      await Promise.all([
        fetchIndianTrendingSongs(),
        fetchIndianNewReleases(),
        fetchBollywoodSongs(),
        fetchHollywoodSongs(),
        fetchOfficialTrendingSongs(),
        fetchHindiSongs()
      ]);
      
      // Reset visible counts
      setVisibleTrendingSongs(10);
      setVisibleNewReleases(10);
      setVisibleBollywoodSongs(10);
      setVisibleHollywoodSongs(10);
      setVisibleOfficialSongs(10);
      setVisibleHindiSongs(10);
    } catch (error) {
      console.error("Error refreshing songs:", error);
    }
    setIsRefreshing(false);
  };

  const loadMoreTrending = () => {
    setVisibleTrendingSongs(prev => Math.min(prev + 10, indianTrendingSongs.length));
  };

  const loadMoreNewReleases = () => {
    setVisibleNewReleases(prev => Math.min(prev + 10, indianNewReleases.length));
  };
  
  const loadMoreBollywood = () => {
    setVisibleBollywoodSongs(prev => Math.min(prev + 10, bollywoodSongs.length));
  };
  
  const loadMoreHollywood = () => {
    setVisibleHollywoodSongs(prev => Math.min(prev + 10, hollywoodSongs.length));
  };
  
  const loadMoreOfficial = () => {
    setVisibleOfficialSongs(prev => Math.min(prev + 10, officialTrendingSongs.length));
  };
  
  const loadMoreHindi = () => {
    setVisibleHindiSongs(prev => Math.min(prev + 10, hindiSongs.length));
  };

  const playSong = (song: any) => {
    if (!song) {
      return;
    }
    
    // If song doesn't have URL, fetch details
    if (!song.url) {
      fetchSongDetails(song.id);
      return;
    }
    
    try {
      // Convert to app song format
      const appSong = convertIndianSongToAppSong(song);
      
      // Set the current song in the player store
      setAppCurrentSong(appSong);
    } catch (error) {
      console.error("Error playing song:", error);
    }
  };
  
  const fetchSongDetails = async (songId: string) => {
    if (!songId) {
      return;
    }
    
    try {
      // First try using our backend proxy
      let response;
      let data;
      
      try {
        response = await fetch(`/api/music/songs/${songId}`);
        
        if (!response.ok) {
          throw new Error('Backend proxy failed');
        }
        
        data = await response.json();
      } catch (backendError) {
        console.error('Backend proxy error:', backendError);
        
        // Fallback to direct JioSaavn API if backend fails
        console.log('Trying direct JioSaavn API...');
        response = await fetch(`https://saavn.dev/api/songs?id=${songId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch song details');
        }
        
        data = await response.json();
      }
      
      if (data.data && data.data[0]) {
        const songDetails = data.data[0];
        
        // Ensure downloadUrl exists
        if (!songDetails.downloadUrl || songDetails.downloadUrl.length === 0) {
          throw new Error('Song has no playable audio URL');
        }
        
        const song = {
          id: songDetails.id,
          title: songDetails.name,
          artist: songDetails.primaryArtists,
          album: songDetails.album.name,
          year: songDetails.year,
          duration: songDetails.duration,
          image: songDetails.image[2].url,
          url: songDetails.downloadUrl[4].url 
        };
        
        playSong(song);
      } else {
        throw new Error('Song details not found');
      }
    } catch (error: any) {
      console.error('Error fetching song details:', error);
    }
  };

  // Format time in MM:SS format
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Handle Google sign-in
  const handleGoogleSignIn = async () => {
    if (!isClerkLoaded) {
      toast.error("Authentication system is loading. Please try again.");
      return;
    }
    
    try {
      console.log("Starting Google sign-in flow from IndianMusicPlayer");
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/auth-callback",
        redirectUrlComplete: "/",
      });
    } catch (error) {
      console.error("Google sign-in error:", error);
      toast.error("Failed to sign in with Google. Please try again.");
    }
  };

  // Handle liking a song
  const toggleLikeSong = (song: any, event: React.MouseEvent<HTMLButtonElement>) => {
    // Stop click from bubbling to parent (which would play the song)
    event.stopPropagation();
    
    // If user is not signed in and tries to like a song
    if (!isSignedIn) {
      // Show login dialog
      setShowLoginDialog(true);
      return;
    }
    
    // Check if song is already liked
    const isLiked = likedSongIds.has(song.id);
    
    if (isLiked) {
      // Remove from liked songs
      removeLikedSong(song.id);
      
      // Update state
      const newLikedIds = new Set(likedSongIds);
      newLikedIds.delete(song.id);
      setLikedSongIds(newLikedIds);
    } else {
      // Ensure the song object has all required properties for the likedSongsService
      const songToSave = {
        id: song.id,
        title: song.title,
        artist: song.artist || "Unknown Artist",
        album: song.album || "Unknown Album",
        imageUrl: song.image,
        audioUrl: song.url || "",
        duration: parseInt(song.duration || "0"),
        year: song.year || ""
      };
      
      // Add to liked songs
      addLikedSong(songToSave);
      
      // Update state
      const newLikedIds = new Set(likedSongIds);
      newLikedIds.add(song.id);
      setLikedSongIds(newLikedIds);
    }

    // Refresh the liked songs list in case it's displayed elsewhere
    document.dispatchEvent(new CustomEvent('likedSongsUpdated'));
  };

  // Show song details
  const viewSongDetails = (song: Song, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    setSelectedSong(song);
    setShowSongDetails(true);
    
    // If the song details don't include lyrics, try to fetch them
    if (!song.lyrics && song.id) {
      fetchSongLyrics(song.id);
    }
  };
  
  // Close song details
  const closeSongDetails = () => {
    setShowSongDetails(false);
    setSelectedSong(null);
  };
  
  // Fetch song lyrics
  const fetchSongLyrics = async (songId: string) => {
    try {
      const response = await fetch(`/api/music/lyrics?id=${songId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch lyrics');
      }
      
      const data = await response.json();
      if (data.data && data.data.lyrics) {
        // Update the selected song with lyrics
        setSelectedSong(prev => {
          if (!prev) return null;
          return {
            ...prev,
            lyrics: data.data.lyrics
          };
        });
      }
    } catch (error) {
      console.error('Error fetching lyrics:', error);
    }
  };

  // Function to check if a song is currently playing
  const isSongPlaying = (song: any) => {
    if (!currentSong || !isPlaying) return false;
    return (currentSong as any).id === song.id || (currentSong as any)._id === song.id;
  };

  // Render a song card for all song lists (trending, new releases, search results)
  const renderSongCard = (song: any) => {
    const isCurrentlyPlaying = isSongPlaying(song);
    
    return (
      <div
        key={song.id}
        className={`group relative rounded-xl overflow-hidden ${isCurrentlyPlaying ? 'bg-gradient-to-br from-green-900/40 to-zinc-800/90' : 'bg-gradient-to-br from-zinc-900/70 to-zinc-800/70 hover:from-zinc-800/90 hover:to-zinc-700/90'} transition-all p-4 backdrop-blur-lg shadow-xl border ${isCurrentlyPlaying ? 'border-green-500/50 shadow-green-500/20' : 'border-zinc-700/30 hover:border-green-500/30 hover:shadow-green-500/5'}`}
      >
        <div 
          className="aspect-square rounded-lg overflow-hidden mb-4 relative group cursor-pointer"
          onClick={() => viewSongDetails(song)}
        >
          <img
            src={song.image}
            alt={song.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          
          {/* Playing state overlay */}
          {isCurrentlyPlaying && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm">
              <div className="flex items-end h-10 gap-1 px-2 py-1 bg-black/60 rounded-full">
                {animationBars.map((height, index) => (
                  <div 
                    key={index}
                    className="w-1 bg-green-500 rounded-full animate-pulse"
                    style={{ 
                      height: `${Math.max(15, height/2)}px`,
                      animationDelay: `${index * 0.1}s`,
                      animationDuration: `${0.6 + Math.random() * 0.4}s`
                    }}
                  ></div>
                ))}
              </div>
            </div>
          )}
          
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
            <Button 
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation();
                playSong(song);
              }}
              className="bg-green-500/90 hover:bg-green-600/90 hover:scale-110 h-14 w-14 rounded-full shadow-xl shadow-green-500/20 backdrop-blur-sm border border-green-400/20 transform transition-all duration-300"
            >
              {isCurrentlyPlaying ? (
                <Pause className="h-7 w-7 text-white" />
              ) : (
                <Play className="h-7 w-7 ml-0.5 text-white" />
              )}
            </Button>
          </div>
          
          {song.duration && (
            <div className="absolute bottom-2 left-2 text-xs bg-black/60 text-white px-2 py-1 rounded-full backdrop-blur-sm flex items-center opacity-0 group-hover:opacity-100 transition-all duration-300">
              <Clock className="h-3 w-3 mr-1" />
              {formatTime(parseInt(song.duration))}
            </div>
          )}
        </div>
        
        <div className="flex flex-col justify-between min-h-[60px]">
          <div className="flex mb-1">
            <Button
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => toggleLikeSong(song, e)}
              className="h-9 w-9 text-zinc-400 hover:text-white transition-all hover:scale-110 hover:bg-zinc-800/80 rounded-full flex-shrink-0 -ml-2 mr-1"
            >
              <Heart className={`h-5 w-5 transition-all duration-300 ${likedSongIds.has(song.id) ? 'fill-green-500 text-green-500 animate-pulse' : ''}`} />
            </Button>
            <div className="flex-1 min-w-0">
              <p 
                className={`font-medium truncate ${isCurrentlyPlaying ? 'text-green-400' : 'text-white group-hover:text-green-400'} transition-colors duration-300 cursor-pointer`}
                title={song.title}
                onClick={() => viewSongDetails(song)}
              >
                {song.title}
              </p>
              <p className="text-sm text-zinc-400 truncate group-hover:text-zinc-300 transition-colors duration-300" title={song.artist}>
                {song.artist}
              </p>
            </div>
          </div>
        </div>
        
        {/* Playing indicator border animation */}
        {isCurrentlyPlaying ? (
          <div className="absolute inset-0 border-2 border-green-500/30 rounded-xl pointer-events-none animate-pulse"></div>
        ) : (
          <div className="absolute inset-0 border border-green-500/0 rounded-xl group-hover:border-green-500/20 pointer-events-none transition-all duration-500"></div>
        )}
      </div>
    );
  };

  // Render a song row for search results
  const renderSongRow = (song: any) => {
    const isCurrentlyPlaying = isSongPlaying(song);
    
    return (
      <div
        key={song.id}
        className={`flex items-center gap-4 p-4 ${isCurrentlyPlaying ? 'bg-gradient-to-r from-green-900/40 to-zinc-800/90' : 'bg-gradient-to-r from-zinc-900/80 to-zinc-800/80 hover:from-zinc-800/90 hover:to-zinc-700/90'} rounded-xl transition-all group backdrop-blur-lg shadow-lg border ${isCurrentlyPlaying ? 'border-green-500/40' : 'border-zinc-700/30 hover:border-green-500/30'} mb-3 cursor-pointer`}
        onClick={() => viewSongDetails(song)}
      >
        <div className="relative overflow-hidden rounded-lg w-16 h-16 flex-shrink-0">
          <img
            src={song.image}
            alt={song.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          
          {/* Sound wave animation for currently playing song */}
          {isCurrentlyPlaying && (
            <div className="absolute inset-0 flex items-end justify-center bg-black/40 p-1">
              <div className="flex items-end gap-0.5 h-6">
                {animationBars.map((height, index) => (
                  <div 
                    key={index}
                    className="w-0.5 bg-green-500 rounded-sm animate-pulse"
                    style={{ 
                      height: `${Math.max(20, height)}%`,
                      animationDelay: `${index * 0.1}s`,
                      animationDuration: `${0.6 + Math.random() * 0.4}s`
                    }}
                  ></div>
                ))}
              </div>
            </div>
          )}
          
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
            <Music className="h-5 w-5 text-green-400" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0 pr-3">
          <div className="flex items-center mb-0.5">
            <Button
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => toggleLikeSong(song, e)}
              className="h-7 w-7 text-zinc-400 hover:text-white opacity-70 group-hover:opacity-100 hover:scale-110 transition-all hover:bg-zinc-800/80 rounded-full flex-shrink-0 -ml-2 mr-1 p-0"
            >
              <Heart className={`h-4 w-4 transition-all duration-300 ${likedSongIds.has(song.id) ? 'fill-green-500 text-green-500' : ''}`} />
            </Button>
            <p className={`font-medium truncate ${isCurrentlyPlaying ? 'text-green-400' : 'text-white group-hover:text-green-400'} transition-colors duration-300 flex-1`} title={song.title}>
              {song.title}
            </p>
            
            {/* Small playing indicator */}
            {isCurrentlyPlaying && (
              <Volume2 className="h-4 w-4 text-green-400 mr-1 animate-pulse" />
            )}
          </div>
          <p className="text-sm text-zinc-400 truncate group-hover:text-zinc-300 transition-colors duration-300 ml-7" title={song.artist}>
            {song.artist}
          </p>
          {song.duration && (
            <div className="flex items-center text-xs text-zinc-500 mt-1 ml-7 group-hover:text-zinc-400 transition-colors duration-300">
              <Clock className="h-3 w-3 mr-1" />
              {formatTime(parseInt(song.duration))}
            </div>
          )}
        </div>
        
        <div className="flex-shrink-0">
          <Button 
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              playSong(song);
            }}
            className="opacity-80 group-hover:opacity-100 h-11 w-11 text-white bg-zinc-800/80 hover:bg-green-600/90 rounded-full transition-all shadow-lg hover:shadow-green-500/20 backdrop-blur-sm border border-zinc-700/50 hover:border-green-500/30"
          >
            {isCurrentlyPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </Button>
        </div>
      </div>
    );
  };

  const isHomePage = location.pathname === '/';
  const hasSearchQuery = location.search.includes('q=');

  const SectionHeader = ({ title, onRefresh }: { title: string; onRefresh?: () => void }) => (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl font-bold bg-gradient-to-r from-white via-green-300 to-zinc-400 bg-clip-text text-transparent relative inline-block">
        {title}
        <span className="absolute -bottom-1 left-0 right-0 h-px bg-gradient-to-r from-green-500/50 via-green-300/20 to-transparent"></span>
      </h2>
      {onRefresh && (
        <Button
          onClick={onRefresh}
          className="text-zinc-400 hover:text-white flex items-center gap-1 hover:bg-zinc-800/60 rounded-full px-4 transition-all hover:shadow-md border border-zinc-800/60 hover:border-green-500/30"
          disabled={isRefreshing}
        >
          <RefreshCcw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''} mr-1`} />
          <span>Refresh</span>
        </Button>
      )}
    </div>
  );

  // Song details component
  const SongDetailView = () => {
    if (!selectedSong) return null;

    // Using a type-safe approach to handle the different Song interfaces
    const isCurrentlyPlaying = isPlaying && 
      (currentSong ? 
        (currentSong as any).id === selectedSong.id || 
        (currentSong as any)._id === selectedSong.id 
      : false);
    
    // Handle sharing song
    const handleShare = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      
      // Create share data with the song information
      const shareData = {
        title: selectedSong.title,
        text: `Check out "${selectedSong.title}" by ${selectedSong.artist}`,
        url: window.location.href
      };
      
      // Check if Web Share API is available
      if (navigator.share && typeof navigator.share === 'function') {
        navigator.share(shareData)
          .then(() => {
            // Shared successfully
          })
          .catch((error) => {
            console.error("Error sharing:", error);
          });
      } else {
        // Fallback: copy link to clipboard
        const songUrl = window.location.href;
        navigator.clipboard.writeText(songUrl)
          .then(() => {
            // Link copied successfully
          })
          .catch(() => {
            console.error("Error copying link to clipboard");
          });
      }
    };
    
    return (
      <div className="relative">
        {/* Background gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/60 to-black z-10"></div>
        
        {/* Blurred background image */}
        <div className="absolute inset-0 overflow-hidden">
          <img 
            src={selectedSong.image} 
            alt="" 
            className="w-full h-full object-cover blur-2xl opacity-30 scale-110"
          />
        </div>
        
        <div className="relative z-20 p-6 md:p-8">
          {/* Header with back button */}
          <div className="flex justify-between items-center mb-8">
            <Button
              onClick={closeSongDetails}
              className="h-9 w-9 rounded-full bg-black/40 backdrop-blur-sm text-white/80 hover:text-white hover:bg-black/60"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            <Button
              className="h-9 w-9 rounded-full bg-black/40 backdrop-blur-sm text-white/80 hover:text-white hover:bg-black/60"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Song info section */}
          <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
            {/* Album cover */}
            <div className="flex-shrink-0 relative group">
              <img 
                src={selectedSong.image} 
                alt={selectedSong.title} 
                className="w-48 h-48 md:w-64 md:h-64 rounded-lg shadow-2xl object-cover"
              />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg flex items-center justify-center">
                <Button
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => playSong(selectedSong)}
                  variant="default"
                  size="icon"
                  className="h-16 w-16 rounded-full bg-green-500/90 hover:bg-green-600 shadow-lg"
                >
                  {isCurrentlyPlaying ? (
                    <Pause className="h-8 w-8" />
                  ) : (
                    <Play className="h-8 w-8 ml-1" />
                  )}
                </Button>
              </div>
            </div>
            
            {/* Song details */}
            <div className="text-center md:text-left">
              <div className="bg-white/5 px-3 py-1 rounded-full inline-block mb-3 backdrop-blur-sm">
                <span className="text-xs text-white/80">SONG</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">{selectedSong.title}</h1>
              <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 text-white/70 mb-6">
                <p className="text-lg font-medium">{selectedSong.artist}</p>
                {selectedSong.album && (
                  <>
                    <span className="hidden md:inline">•</span>
                    <p>{selectedSong.album}</p>
                  </>
                )}
                {selectedSong.year && (
                  <>
                    <span className="hidden md:inline">•</span>
                    <p>{selectedSong.year}</p>
                  </>
                )}
                {selectedSong.duration && (
                  <>
                    <span className="hidden md:inline">•</span>
                    <p className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatTime(parseInt(selectedSong.duration))}
                    </p>
                  </>
                )}
              </div>
              
              {/* Action buttons */}
              <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                <Button
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => playSong(selectedSong)}
                  className="bg-green-500 hover:bg-green-600 text-white rounded-full px-6 transition-all duration-300 hover:shadow-md hover:shadow-green-500/20"
                >
                  {isCurrentlyPlaying ? (
                    <>
                      <Pause className="h-4 w-4 mr-2" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2 ml-0.5" />
                      Play
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => toggleLikeSong(selectedSong, e)}
                  variant="outline"
                  className="rounded-full border-zinc-700 hover:border-white bg-transparent text-white transition-all duration-300 hover:shadow-md"
                >
                  <Heart className={`h-4 w-4 mr-2 ${likedSongIds.has(selectedSong.id) ? 'fill-green-500 text-green-500' : ''}`} />
                  {likedSongIds.has(selectedSong.id) ? 'Saved' : 'Save'}
                </Button>
                
                <Button
                  variant="ghost"
                  className="rounded-full text-white/70 hover:text-white hover:bg-white/10 p-2.5 transition-all duration-300"
                  onClick={handleShare}
                >
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
          
          {/* Lyrics section */}
          {selectedSong.lyrics ? (
            <div className="mt-10 bg-zinc-900/40 backdrop-blur-sm rounded-lg p-6 max-w-3xl mx-auto">
              <h2 className="text-2xl font-bold mb-4 text-white">Lyrics</h2>
              <div className="text-white/80 whitespace-pre-wrap leading-relaxed">
                {selectedSong.lyrics}
              </div>
            </div>
          ) : (
            <div className="mt-10 bg-zinc-900/40 backdrop-blur-sm rounded-lg p-6 text-center max-w-xl mx-auto">
              <Music className="h-10 w-10 mx-auto mb-3 text-white/30" />
              <h2 className="text-xl font-semibold text-white/80 mb-2">Lyrics unavailable</h2>
              <p className="text-white/50">We couldn't find lyrics for this song.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Login Dialog */}
      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 p-6 max-w-md">
          <div className="flex flex-col items-center">
            <Heart className="h-16 w-16 text-white mb-4" />
            <h2 className="text-xl font-bold mb-2">Sign in to like songs</h2>
            <p className="text-center text-zinc-400 mb-6">
              Sign in to save your liked songs to your library and access them from any device.
            </p>
            <button
              onClick={handleGoogleSignIn}
              className="w-full px-4 py-3 rounded-full font-medium bg-white text-black hover:bg-white/90 flex items-center justify-center gap-2 mb-4"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5">
                <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" 
                fill="#4285F4" />
              </svg>
              Continue with Google
            </button>
            <button
              onClick={() => setShowLoginDialog(false)}
              className="text-zinc-400 hover:text-white"
            >
              Not now
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main content */}
      <div className="pb-24">
        <div className="space-y-10">
          {/* Song details view */}
          <SongDetailView />
          
          {/* Search results */}
          {indianSearchResults.length > 0 && !isHomePage && (
            <div className="mb-8">
              <SectionHeader title={`Search Results (${indianSearchResults.length})`} />
              <div className="space-y-2">
                {indianSearchResults.map(renderSongRow)}
              </div>
            </div>
          )}

          {/* No results message */}
          {indianSearchResults.length === 0 && hasSearchQuery && !isIndianMusicLoading && !isHomePage && (
            <div className="text-center py-12 text-zinc-500 bg-zinc-900/60 rounded-xl backdrop-blur-lg shadow-lg border border-zinc-800/40">
              <Music className="h-12 w-12 mx-auto mb-4 text-zinc-600" />
              <p className="text-lg">No results found for "{new URLSearchParams(location.search).get('q')}"</p>
              <p className="text-sm mt-2 text-zinc-600">Try a different search term or check spelling</p>
            </div>
          )}

          {/* Loading state for search */}
          {isIndianMusicLoading && !isHomePage && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader className="h-8 w-8 animate-spin text-zinc-400 mb-4" />
              <p className="text-zinc-500">Searching for songs...</p>
            </div>
          )}

          {/* Main content for homepage */}
          {(!indianSearchResults.length || location.pathname === '/') && (
            <>
              {/* Top Action Bar */}
              <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold">Music Player</h1>
                <Button 
                  variant="outline" 
                  onClick={refreshSongs}
                  disabled={isRefreshing}
                  className="flex items-center gap-2 border-zinc-700 hover:border-white text-zinc-400 hover:text-white"
                >
                  {isRefreshing ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCcw className="h-4 w-4" />
                  )}
                  Refresh
                </Button>
              </div>
              
              {/* Hindi Section - NOW FIRST */}
              <section className="mb-12">
                <SectionHeader title="Hindi Top Songs" />
                
                {isIndianMusicLoading && !hindiSongs.length ? (
                  <div className="flex items-center justify-center h-40">
                    <Loader className="h-8 w-8 animate-spin text-zinc-500" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mb-6">
                      {hindiSongs.slice(0, visibleHindiSongs).map(song => renderSongCard(song))}
                    </div>
                    
                    {hindiSongs.length > visibleHindiSongs && (
                      <div className="mt-4 flex justify-center">
                        <Button
                          variant="outline"
                          onClick={loadMoreHindi}
                          className="text-zinc-400 hover:text-white border-zinc-700 hover:border-white w-40"
                        >
                          Load More
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </section>
              
              {/* Bollywood Section - NOW SECOND */}
              <section className="mb-12">
                <SectionHeader title="Bollywood Hits" />
                
                {isIndianMusicLoading && !bollywoodSongs.length ? (
                  <div className="flex items-center justify-center h-40">
                    <Loader className="h-8 w-8 animate-spin text-zinc-500" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mb-6">
                      {bollywoodSongs.slice(0, visibleBollywoodSongs).map(song => renderSongCard(song))}
                    </div>
                    
                    {bollywoodSongs.length > visibleBollywoodSongs && (
                      <div className="mt-4 flex justify-center">
                        <Button
                          variant="outline"
                          onClick={loadMoreBollywood}
                          className="text-zinc-400 hover:text-white border-zinc-700 hover:border-white w-40"
                        >
                          Load More
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </section>
              
              {/* Official Trending Section - NOW THIRD */}
              <section className="mb-12">
                <SectionHeader title="Official Trending Hits" />
                
                {isIndianMusicLoading && !officialTrendingSongs.length ? (
                  <div className="flex items-center justify-center h-40">
                    <Loader className="h-8 w-8 animate-spin text-zinc-500" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mb-6">
                      {officialTrendingSongs.slice(0, visibleOfficialSongs).map(song => renderSongCard(song))}
                    </div>
                    
                    {officialTrendingSongs.length > visibleOfficialSongs && (
                      <div className="mt-4 flex justify-center">
                        <Button
                          variant="outline"
                          onClick={loadMoreOfficial}
                          className="text-zinc-400 hover:text-white border-zinc-700 hover:border-white w-40"
                        >
                          Load More
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </section>
              
              {/* Hollywood Section - NOW FOURTH */}
              <section className="mb-12">
                <SectionHeader title="Hollywood & International Music" />
                
                {isIndianMusicLoading && !hollywoodSongs.length ? (
                  <div className="flex items-center justify-center h-40">
                    <Loader className="h-8 w-8 animate-spin text-zinc-500" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mb-6">
                      {hollywoodSongs.slice(0, visibleHollywoodSongs).map(song => renderSongCard(song))}
                    </div>
                    
                    {hollywoodSongs.length > visibleHollywoodSongs && (
                      <div className="mt-4 flex justify-center">
                        <Button
                          variant="outline"
                          onClick={loadMoreHollywood}
                          className="text-zinc-400 hover:text-white border-zinc-700 hover:border-white w-40"
                        >
                          Load More
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </section>
              
              {/* Trending Songs Section */}
              <section className="mb-12">
                <SectionHeader title="Trending Songs" />
                
                {isIndianMusicLoading && !indianTrendingSongs.length ? (
                  <div className="flex items-center justify-center h-40">
                    <Loader className="h-8 w-8 animate-spin text-zinc-500" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mb-6">
                      {indianTrendingSongs.slice(0, visibleTrendingSongs).map(song => renderSongCard(song))}
                    </div>
                    
                    {indianTrendingSongs.length > visibleTrendingSongs && (
                      <div className="mt-4 flex justify-center">
                        <Button
                          variant="outline"
                          onClick={loadMoreTrending}
                          className="text-zinc-400 hover:text-white border-zinc-700 hover:border-white w-40"
                        >
                          Load More
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </section>
              
              {/* Latest Releases Section */}
              <section className="mb-12">
                <SectionHeader title="Latest Releases" />
                
                {isIndianMusicLoading && !indianNewReleases.length ? (
                  <div className="flex items-center justify-center h-40">
                    <Loader className="h-8 w-8 animate-spin text-zinc-500" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mb-6">
                      {indianNewReleases.slice(0, visibleNewReleases).map(song => renderSongCard(song))}
                    </div>
                    
                    {indianNewReleases.length > visibleNewReleases && (
                      <div className="mt-4 flex justify-center">
                        <Button
                          variant="outline"
                          onClick={loadMoreNewReleases}
                          className="text-zinc-400 hover:text-white border-zinc-700 hover:border-white w-40"
                        >
                          Load More
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </>
  );
};

// Add animation keyframes to the global styles (you might need to add this to your global CSS file)
// If you have a global.css file, add this:
// @keyframes progress {
//   0% { width: 0%; }
//   100% { width: 100%; }
// }
// .animate-progress {
//   animation: progress 30s linear infinite;
// }

export default IndianMusicPlayer;