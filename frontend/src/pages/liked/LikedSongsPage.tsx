import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuthStore } from "@/stores/useAuthStore";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { Heart, Play, Pause, Clock, Music, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLikedSongsStore } from "@/stores/useLikedSongsStore";
import { Song } from "@/types";

// Interface for liked songs which might have different ID fields compared to regular songs
interface LikedSong extends Omit<Song, '_id'> {
  id?: string;
  _id?: string;
  album?: string;
}

const LikedSongsPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated } = useAuthStore();
  const { setCurrentSong, currentSong, isPlaying, togglePlay, playPlaylist } = usePlayerStore();
  const { likedSongs, likedSongIds, loadLikedSongs } = useLikedSongsStore();

  useEffect(() => {
    // Load liked songs when component mounts
    loadLikedSongsData();

    // Listen for updates to liked songs
    const handleLikedSongsUpdated = () => loadLikedSongsData();
    document.addEventListener('likedSongsUpdated', handleLikedSongsUpdated);

    return () => {
      document.removeEventListener('likedSongsUpdated', handleLikedSongsUpdated);
    };
  }, [isAuthenticated]);

  const loadLikedSongsData = () => {
    setIsLoading(true);
    try {
      loadLikedSongs();
    } catch (error) {
      console.error("Error loading liked songs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handlePlayAll = () => {
    if (likedSongs.length === 0) return;
    
    // Convert liked songs to the format expected by the player
    const formattedSongs = likedSongs.map(song => {
      const songId = (song as LikedSong).id || song._id;
      return {
        _id: songId as string,
        title: song.title,
        artist: song.artist,
        imageUrl: song.imageUrl,
        audioUrl: song.audioUrl,
        duration: song.duration,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        albumId: null
      };
    });
    
    playPlaylist(formattedSongs);
  };

  const isSongPlaying = (song: LikedSong) => {
    if (!currentSong || !isPlaying) return false;
    const currentId = (currentSong as any).id || currentSong._id;
    const songId = song.id || song._id;
    return currentId === songId;
  };

  const handlePlaySong = (song: LikedSong) => {
    const songId = song.id || song._id;
    const formattedSong: Song = {
      _id: songId as string,
      title: song.title,
      artist: song.artist,
      imageUrl: song.imageUrl,
      audioUrl: song.audioUrl,
      duration: song.duration,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      albumId: null
    };
    
    if (isSongPlaying(song)) {
      togglePlay();
    } else {
      setCurrentSong(formattedSong);
    }
  };

  return (
    <main className="rounded-md overflow-hidden h-full bg-gradient-to-b from-zinc-800 to-zinc-900">
      <ScrollArea className="h-[calc(100vh-180px)]">
        <div className="p-4 sm:p-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
            <div className="flex-shrink-0 bg-gradient-to-br from-purple-700 to-purple-900 w-52 h-52 shadow-2xl flex items-center justify-center rounded-md">
              <Heart className="text-white w-24 h-24 drop-shadow-lg" />
            </div>
            
            <div className="flex flex-col items-center md:items-start">
              <span className="uppercase text-sm font-bold text-white/70">Playlist</span>
              <h1 className="text-4xl md:text-6xl font-extrabold mb-3 mt-2">Liked Songs</h1>
              <div className="text-white/70 flex items-center gap-1">
                <span className="font-medium">{likedSongs.length} songs</span>
              </div>
            </div>
          </div>
          
          {/* Play button and action bar */}
          <div className="flex items-center gap-6 mb-6">
            <Button
              onClick={handlePlayAll}
              disabled={likedSongs.length === 0}
              className="bg-green-500 hover:bg-green-400 text-black rounded-full w-14 h-14 flex items-center justify-center shadow-xl transition-transform duration-200 hover:scale-105"
            >
              <Play className="h-7 w-7 ml-1" />
            </Button>
          </div>
          
          {/* Table headers */}
          <div className="grid grid-cols-[16px_1fr_1fr_auto] gap-4 px-4 py-2 text-white/60 text-sm border-b border-white/10 mb-2">
            <div>#</div>
            <div>TITLE</div>
            <div>ALBUM</div>
            <div className="flex justify-end">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          
          {/* Songs list */}
          {isLoading ? (
            <div className="flex items-center justify-center h-60">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : likedSongs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-60">
              <Heart className="h-16 w-16 text-white/20 mb-4" />
              <p className="text-white/60 text-lg mb-2">Songs you like will appear here</p>
              <p className="text-white/40 text-sm">Save songs by tapping the heart icon</p>
            </div>
          ) : (
            <div className="space-y-1">
              {likedSongs.map((song, index) => {
                // Type cast to our LikedSong interface to handle both id formats
                const likedSong = song as LikedSong;
                const uniqueKey = likedSong.id || likedSong._id;
                
                return (
                  <div 
                    key={uniqueKey} 
                    className="grid grid-cols-[16px_1fr_1fr_auto] gap-4 px-4 py-2 text-white hover:bg-white/10 rounded-md group cursor-pointer"
                    onClick={() => handlePlaySong(likedSong)}
                  >
                    <div className="flex items-center">
                      {isSongPlaying(likedSong) ? (
                        <div className="w-4 h-4 text-green-500 animate-pulse">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C22 4.92893 22 7.28595 22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12Z"></path></svg>
                        </div>
                      ) : (
                        <span className="text-white/60 group-hover:hidden">{index + 1}</span>
                      )}
                      <Play className="h-4 w-4 hidden group-hover:block text-white" />
                    </div>
                    
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 rounded overflow-hidden bg-zinc-800 flex-shrink-0">
                        {likedSong.imageUrl ? (
                          <img 
                            src={likedSong.imageUrl} 
                            alt={likedSong.title} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                            <Music className="h-5 w-5 text-zinc-400" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className={`font-medium truncate ${isSongPlaying(likedSong) ? 'text-green-500' : 'text-white'}`}>
                          {likedSong.title}
                        </p>
                        <p className="text-sm text-white/60 truncate">{likedSong.artist}</p>
                      </div>
                    </div>
                    
                    <div className="self-center text-white/60 text-sm truncate">
                      {likedSong.album || '—'}
                    </div>
                    
                    <div className="flex items-center justify-end gap-4">
                      <Heart className="h-4 w-4 fill-green-500 text-green-500" />
                      <span className="text-white/60 text-sm">{formatTime(likedSong.duration)}</span>
                      <MoreHorizontal className="h-4 w-4 text-white/0 group-hover:text-white/60" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </main>
  );
};

export default LikedSongsPage; 