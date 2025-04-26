import { useEffect, useState } from 'react';
import { Heart, Music, Play, Pause } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { loadLikedSongs, removeLikedSong, syncWithServer } from '@/services/likedSongsService';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { Song } from '@/types';
import { useAuthStore } from '@/stores/useAuthStore';

// Convert liked song format to player song format
const adaptToPlayerSong = (likedSong: any): Song => {
  return {
    _id: likedSong.id || likedSong.songId,
    title: likedSong.title,
    artist: likedSong.artist,
    audioUrl: likedSong.audioUrl,
    imageUrl: likedSong.imageUrl,
    duration: likedSong.duration || 0,
    albumId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
};

const LikedSongsPage = () => {
  const [likedSongs, setLikedSongs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentSong, isPlaying, playAlbum, togglePlay } = usePlayerStore();
  const { isAuthenticated, userId } = useAuthStore();

  // Load liked songs on mount and when auth state changes
  useEffect(() => {
    // Clear cache expiry to force a fresh fetch when auth changes
    if (isAuthenticated) {
      localStorage.removeItem('spotify-clone-liked-songs-expiry');
    }
    
    loadAndSetLikedSongs();

    // Subscribe to liked songs updates
    const handleLikedSongsUpdated = () => {
      loadAndSetLikedSongs();
    };

    document.addEventListener('likedSongsUpdated', handleLikedSongsUpdated);
    
    return () => {
      document.removeEventListener('likedSongsUpdated', handleLikedSongsUpdated);
    };
  }, [isAuthenticated, userId]);
  
  // Load and set liked songs
  const loadAndSetLikedSongs = async () => {
    setIsLoading(true);
    try {
      // Force server fetch when logged in
      if (isAuthenticated) {
        // Clear cache expiry to force fresh fetch
        localStorage.removeItem('spotify-clone-liked-songs-expiry');
      }
      
      const songs = await loadLikedSongs();
      console.log('Loaded liked songs:', songs);
      setLikedSongs(songs);
    } catch (error) {
      console.error('Error loading liked songs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Play all liked songs
  const playAllSongs = () => {
    if (likedSongs.length > 0) {
      const playerSongs = likedSongs.map(adaptToPlayerSong);
      playAlbum(playerSongs, 0);
    }
  };

  // Handle playing a specific song
  const playSong = (song: any, index: number) => {
    const playerSongs = likedSongs.map(adaptToPlayerSong);
    
    if (currentSong && currentSong._id === song.id) {
      togglePlay();
    } else {
      playAlbum(playerSongs, index);
    }
  };

  // Check if a song is currently playing
  const isSongPlaying = (song: any) => {
    return isPlaying && currentSong && currentSong._id === song.id;
  };

  // Unlike a song
  const unlikeSong = async (id: string) => {
    await removeLikedSong(id);
    setLikedSongs(prev => prev.filter(song => song.id !== id));
  };

  return (
    <main className="rounded-md overflow-hidden h-full bg-gradient-to-b from-indigo-900 to-zinc-900">
      <div className="p-6 md:p-8">
        <div className="flex flex-col mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Liked Songs</h1>
          <p className="text-zinc-400 mb-4">
            {isLoading ? 'Loading your liked songs...' 
              : likedSongs.length > 0
                ? `${likedSongs.length} songs`
                : 'No liked songs yet'}
          </p>
          
          {/* Refresh button */}
          {isAuthenticated && (
            <Button
              onClick={loadAndSetLikedSongs}
              className="mb-4 bg-zinc-700 hover:bg-zinc-600 text-white self-start"
              disabled={isLoading}
            >
              Refresh Songs
            </Button>
          )}
          
          {/* Play button */}
          {likedSongs.length > 0 && (
            <Button
              onClick={playAllSongs}
              className="w-12 h-12 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center self-start"
            >
              <Play size={24} className="ml-1" />
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[calc(100vh-300px)]">
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : likedSongs.length > 0 ? (
            <div className="space-y-2">
              {likedSongs.map((song, index) => (
                <div 
                  key={song.id}
                  className="flex items-center p-2 rounded-md hover:bg-white/10 transition-colors group"
                >
                  <div className="relative flex-shrink-0 w-12 h-12 rounded overflow-hidden mr-3">
                    <img 
                      src={song.imageUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgZmlsbD0iIzU1NSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiNmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='} 
                      alt={song.title}
                      className="object-cover w-full h-full"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgZmlsbD0iIzU1NSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiNmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
                      }}
                    />
                    <button
                      onClick={() => playSong(song, index)}
                      className={`absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity ${isSongPlaying(song) ? 'opacity-100' : ''}`}
                    >
                      {isSongPlaying(song) ? <Pause size={24} className="text-white" /> : <Play size={24} className="text-white ml-1" />}
                    </button>
                  </div>
                  
                  <div className="flex-grow min-w-0">
                    <h3 className="text-white text-sm font-medium truncate">{song.title}</h3>
                    <p className="text-zinc-400 text-xs truncate">{song.artist}</p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <span className="text-zinc-400 text-xs hidden sm:block">
                      {formatTime(song.duration || 0)}
                    </span>
                    
                    <button
                      onClick={() => unlikeSong(song.id)}
                      className="text-rose-500 hover:text-rose-600 transition-colors"
                      aria-label="Unlike song"
                    >
                      <Heart size={18} fill="currentColor" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Music size={64} className="text-zinc-500 mb-4" />
              <h3 className="text-white text-xl font-medium mb-2">Songs you like will appear here</h3>
              <p className="text-zinc-400 max-w-md">
                Save songs by tapping the heart icon
              </p>
            </div>
          )}
        </ScrollArea>
      </div>
    </main>
  );
};

export default LikedSongsPage; 