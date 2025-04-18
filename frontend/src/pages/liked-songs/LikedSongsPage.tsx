import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMusicStore } from "@/stores/useMusicStore";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { Button } from "@/components/ui/button";
import { 
  Play, 
  Heart, 
  Trash2, 
  Loader, 
  Clock, 
  Music,
  LogIn
} from "lucide-react";
import Topbar from "@/components/Topbar";
import toast from "react-hot-toast";
import { SignInButton, useAuth } from "@clerk/clerk-react";
import { loadLikedSongs, removeLikedSong } from "@/services/likedSongsService";

const LikedSongsPage = () => {
  const [likedSongs, setLikedSongs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const navigate = useNavigate();
  const { setCurrentSong, playAlbum } = usePlayerStore();
  const { isSignedIn } = useAuth();

  // Load liked songs on mount
  useEffect(() => {
    const loadSongs = () => {
      try {
        setIsLoading(true);
        // Get liked songs using our service
        const songs = loadLikedSongs();
        setLikedSongs(songs);
      } catch (error) {
        console.error("Error loading liked songs:", error);
        toast.error("Failed to load liked songs");
        setLikedSongs([]);
      } finally {
        setIsLoading(false);
      }
    };

    // Update auth store based on Clerk auth state
    useAuthStore.getState().setAuthStatus(!!isSignedIn, isSignedIn ? ((window as any).Clerk?.user?.id || null) : null);
    
    // Only load songs if authenticated
    if (isSignedIn) {
      loadSongs();
    } else {
      setIsLoading(false);
    }

    // Listen for liked songs updates from other components
    const handleLikedSongsUpdated = () => {
      if (isSignedIn) {
        loadSongs();
      }
    };

    document.addEventListener('likedSongsUpdated', handleLikedSongsUpdated);
    
    return () => {
      document.removeEventListener('likedSongsUpdated', handleLikedSongsUpdated);
    };
  }, [isSignedIn]);

  const playSong = (song: any) => {
    // Create a proper song object for the player with consistent property naming
    const appSong = {
      _id: song.id,
      title: song.title,
      artist: song.artist || "Unknown Artist",
      albumId: null,
      // Fix the image property to use imageUrl as expected by the player
      imageUrl: song.imageUrl || song.image,
      // Fix the audio property to use audioUrl as expected by the player
      audioUrl: song.audioUrl || song.url || "",
      duration: parseInt(song.duration?.toString() || "0"),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setCurrentSong(appSong);
  };

  const removeSong = (songId: string) => {
    // Use our service to remove the song
    removeLikedSong(songId);
    // Load the updated songs after removal
    const updatedSongs = loadLikedSongs();
    setLikedSongs(updatedSongs);
    toast.success("Song removed from liked songs");
  };

  // Convert all liked songs to app format
  const convertToAppSongs = (songs: any[]) => {
    return songs.map(song => ({
      _id: song.id,
      title: song.title,
      artist: song.artist || "Unknown Artist",
      albumId: null,
      // Fix the image property to use imageUrl as expected by the player
      imageUrl: song.imageUrl || song.image,
      // Fix the audio property to use audioUrl as expected by the player
      audioUrl: song.audioUrl || song.url || "",
      duration: parseInt(song.duration?.toString() || "0"),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
  };

  // Play all songs in order
  const playAllSongs = () => {
    if (likedSongs.length === 0) return;
    const appSongs = convertToAppSongs(likedSongs);
    playAlbum(appSongs, 0);
    toast.success("Playing all liked songs");
  };

  // Format duration from seconds to MM:SS
  const formatDuration = (seconds: string | number) => {
    const sec = Number(seconds);
    if (isNaN(sec)) return "0:00";
    
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins}:${secs < 10 ? '0' + secs : secs}`;
  };

  // If user is not signed in, show login prompt
  if (!isSignedIn) {
    return (
      <main className="rounded-md overflow-hidden h-full bg-gradient-to-b from-indigo-900 to-zinc-900">
        <Topbar />
        <div className="flex items-center justify-center h-[calc(100vh-180px)]">
          <div className="text-center p-8 bg-zinc-900/40 rounded-xl border border-zinc-800/50 max-w-md">
            <div className="flex justify-center mb-6">
              <Heart className="size-20 text-indigo-500" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Sign in to view your Liked Songs</h2>
            <p className="text-zinc-400 mb-8">
              Create an account or sign in to keep track of all your favorite songs in one place.
            </p>
            <SignInButton mode="modal">
              <Button className="bg-white text-black hover:bg-white/90 px-8 py-6 text-lg">
                <LogIn className="mr-2 h-5 w-5" />
                Sign In
              </Button>
            </SignInButton>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="rounded-md overflow-hidden h-full bg-gradient-to-b from-indigo-900 to-zinc-900">
      <Topbar />
      <ScrollArea className="h-[calc(100vh-180px)]">
        <div className="p-4 sm:p-6">
          {/* Header section with improved styling */}
          <div 
            className="relative flex flex-col md:flex-row items-end md:items-center gap-6 mb-8 p-8 rounded-xl bg-gradient-to-r from-indigo-800 to-blue-600"
          >
            <div className="flex-shrink-0 w-40 h-40 md:w-48 md:h-48 flex items-center justify-center bg-gradient-to-br from-indigo-600 to-blue-400 rounded-md shadow-lg">
              <Heart className="size-20 text-white" />
            </div>
            <div className="z-10">
              <p className="uppercase text-xs text-zinc-300 font-medium mb-2">Playlist</p>
              <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white drop-shadow-sm">Liked Songs</h1>
              <p className="text-zinc-300">{likedSongs.length} songs</p>
              
              {/* Play controls */}
              {likedSongs.length > 0 && (
                <div className="flex items-center gap-3 mt-6">
                  <Button 
                    onClick={playAllSongs}
                    size="lg" 
                    className="bg-green-500 hover:bg-green-600 text-black font-medium rounded-full px-8 shadow-lg"
                  >
                    <Play className="size-5 mr-2" />
                    Play
                  </Button>
                </div>
              )}
            </div>
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent rounded-xl" />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader className="w-8 h-8 animate-spin text-zinc-500" />
            </div>
          ) : (
            <>
              {likedSongs.length > 0 ? (
                <div>
                  {/* Table header */}
                  <div className="grid grid-cols-12 px-4 py-2 border-b border-zinc-800 text-zinc-400 text-sm font-medium">
                    <div className="col-span-1 text-center">#</div>
                    <div className="col-span-6">TITLE</div>
                    <div className="col-span-4 hidden md:block">ARTIST</div>
                    <div className="col-span-1 flex justify-end">
                      <Clock className="size-4" />
                    </div>
                  </div>
                  
                  {/* Song rows */}
                  {likedSongs.map((song, index) => (
                    <div
                      key={song.id}
                      className="grid grid-cols-12 px-4 py-3 hover:bg-white/5 rounded-md transition-colors group items-center"
                    >
                      <div className="col-span-1 text-center flex items-center justify-center">
                        <span className="text-zinc-400 group-hover:hidden">{index + 1}</span>
                        <Button 
                          onClick={() => playSong(song)}
                          variant="ghost" 
                          size="icon" 
                          className="hidden group-hover:flex h-8 w-8 text-white"
                        >
                          <Play className="h-4 w-4 ml-0.5" />
                        </Button>
                      </div>
                      
                      <div className="col-span-6 flex items-center gap-3">
                        <div className="w-10 h-10 flex-shrink-0 rounded overflow-hidden bg-zinc-800">
                          {(song.imageUrl || song.image) ? (
                            <img
                              src={song.imageUrl || song.image}
                              alt={song.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                // Add a fallback if image fails to load
                                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40?text=Music';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-zinc-700">
                              <Music className="h-5 w-5 text-zinc-400" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{song.title}</p>
                        </div>
                      </div>
                      
                      <div className="col-span-4 hidden md:block text-zinc-400 truncate">
                        {song.artist || "Unknown Artist"}
                      </div>
                      
                      <div className="col-span-1 flex items-center justify-end gap-2">
                        <Button 
                          onClick={() => removeSong(song.id)}
                          variant="ghost" 
                          size="icon" 
                          className="opacity-0 group-hover:opacity-100 h-8 w-8 text-zinc-400 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <span className="text-zinc-500 text-sm">
                          {formatDuration(song.duration || 0)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-zinc-900/40 backdrop-blur-sm rounded-xl border border-zinc-800/50 shadow-lg transition-all hover:border-indigo-800/40 hover:bg-zinc-900/50">
                  <div className="flex justify-center mb-6">
                    <div className="p-6 rounded-full bg-zinc-800/50 border border-zinc-700/30 shadow-inner">
                      <Heart className="size-20 text-indigo-400 animate-pulse" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-semibold mb-3 text-white">Your Liked Songs playlist is empty</h3>
                  <p className="text-zinc-400 mb-8 max-w-md mx-auto px-4">
                    Songs you like will appear here. Find some music you love by browsing and tap the heart icon to add it to your liked songs.
                  </p>
                  <Button 
                    onClick={() => navigate('/search')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-6 rounded-full shadow-lg hover:shadow-indigo-800/20 hover:scale-105 transition-all duration-300"
                  >
                    <Music className="mr-2 h-5 w-5" />
                    Browse music
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </main>
  );
};

export default LikedSongsPage; 