import { useEffect, useState } from 'react';
import { Heart, Music, Play, Pause } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { loadLikedSongs, removeLikedSong } from '@/services/likedSongsService';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { Song } from '@/types';

// Convert liked song format to player song format
const adaptToPlayerSong = (likedSong: any): Song => {
  return {
    _id: likedSong.id,
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
  const { currentSong, isPlaying, playAlbum, togglePlay } = usePlayerStore();

  // Load liked songs on mount
  useEffect(() => {
    loadAndSetLikedSongs();

    // Subscribe to liked songs updates
    const handleLikedSongsUpdated = () => {
      loadAndSetLikedSongs();
    };

    document.addEventListener('likedSongsUpdated', handleLikedSongsUpdated);
    
    return () => {
      document.removeEventListener('likedSongsUpdated', handleLikedSongsUpdated);
    };
  }, []);
  
  // Load and set liked songs
  const loadAndSetLikedSongs = () => {
    const songs = loadLikedSongs();
    console.log('Loaded liked songs:', songs);
    setLikedSongs(songs);
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
  const unlikeSong = (id: string) => {
    removeLikedSong(id);
    setLikedSongs(prev => prev.filter(song => song.id !== id));
  };

  return (
    <main className="rounded-md overflow-hidden h-full bg-gradient-to-b from-indigo-900 to-zinc-900">
      <ScrollArea className="h-[calc(100vh-180px)]">
        <div className="p-4 sm:p-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row gap-6 items-center md:items-end mb-8">
            <div className="w-48 h-48 md:w-56 md:h-56 flex-shrink-0 bg-gradient-to-br from-indigo-600 to-blue-400 rounded-lg shadow-xl flex items-center justify-center">
              <Heart className="w-24 h-24 text-white" />
            </div>
            
            <div className="text-center md:text-left">
              <p className="text-sm uppercase font-medium mb-1">Playlist</p>
              <h1 className="text-4xl md:text-6xl font-bold mb-2">Liked Songs</h1>
              <p className="text-zinc-400 mb-4">{likedSongs.length} songs</p>
              
              {likedSongs.length > 0 && (
                <Button 
                  onClick={playAllSongs}
                  className="bg-green-500 hover:bg-green-600 rounded-full px-8"
                >
                  <Play className="h-5 w-5 mr-2" />
                  Play
                </Button>
              )}
            </div>
          </div>
          
          {/* Song list */}
          {likedSongs.length > 0 ? (
            <div className="space-y-2">
              {likedSongs.map((song, index) => (
                <div 
                  key={song.id}
                  className="flex items-center gap-4 p-2 hover:bg-white/5 rounded-md group relative"
                >
                  <div className="w-10 text-center text-zinc-400 group-hover:hidden">
                    {index + 1}
                  </div>
                  <div className="w-10 hidden group-hover:flex items-center justify-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-white"
                      onClick={() => playSong(song, index)}
                    >
                      {isSongPlaying(song) ? (
                        <Pause className="h-5 w-5" />
                      ) : (
                        <Play className="h-5 w-5 ml-0.5" />
                      )}
                    </Button>
                  </div>
                  
                  <div className="w-10 h-10 flex-shrink-0 bg-zinc-800 rounded overflow-hidden">
                    {song.imageUrl ? (
                      <img src={song.imageUrl} alt={song.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-zinc-700 flex items-center justify-center">
                        <Music className="h-5 w-5 text-zinc-400" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${isSongPlaying(song) ? 'text-green-500' : 'text-white'}`}>
                      {song.title}
                    </p>
                    <p className="text-sm text-zinc-400 truncate">
                      {song.artist}
                    </p>
                  </div>
                  
                  <div className="text-zinc-400 text-sm hidden md:block">
                    {song.album}
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-green-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => unlikeSong(song.id)}
                    >
                      <Heart className="h-5 w-5 fill-green-500" />
                    </Button>
                    
                    <span className="text-zinc-400 text-sm min-w-[40px] text-right">
                      {formatTime(song.duration || 0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-zinc-800/50 rounded-lg p-8 text-center">
              <Heart className="h-12 w-12 mx-auto mb-4 text-zinc-500" />
              <h2 className="text-xl font-semibold mb-2">Songs you like will appear here</h2>
              <p className="text-zinc-400 mb-6">
                Save songs by tapping the heart icon
              </p>
              <Button 
                onClick={() => window.location.href = '/'}
                className="bg-white text-black hover:bg-zinc-200"
              >
                Find Songs
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </main>
  );
};

export default LikedSongsPage; 