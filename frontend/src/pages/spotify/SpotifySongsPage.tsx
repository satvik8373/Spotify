import React, { useEffect, useState } from 'react';
import { useSpotify } from '../../contexts/SpotifyContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import SpotifyLogin from '../../components/SpotifyLogin';
import { Play, PauseIcon, Search, Loader2 } from 'lucide-react';
import { ContentLoading, ButtonLoading } from '../../components/ui/loading';

interface Track {
  id: string;
  name: string;
  uri: string;
  album: {
    name: string;
    images: { url: string }[];
  };
  artists: { name: string }[];
  duration_ms: number;
}

const SpotifySongsPage: React.FC = () => {
  const spotify = useSpotify();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);

  useEffect(() => {
    // Load initial data on component mount
    if (spotify.isAuthenticated) {
      loadRecentTracks();
    }
  }, [spotify.isAuthenticated]);

  const loadRecentTracks = async () => {
    // If authenticated, load the user's saved tracks as initial content
    if (spotify.isAuthenticated) {
      const savedTracks = await spotify.fetchSavedTracks(20);
      if (savedTracks.length > 0) {
        const tracks = savedTracks.map(item => item.track);
        setSearchResults(tracks);
      }
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await spotify.searchTracks(searchQuery);
      setSearchResults(results);
    } catch (error) {
      // Error searching tracks
    } finally {
      setIsSearching(false);
    }
  };

  const handlePlayPause = async (track: Track) => {
    if (!spotify.isAuthenticated) return;

    if (currentTrackId === track.id && isPlaying) {
      // Stop playing
      setIsPlaying(false);
      setCurrentTrackId(null);
    } else {
      // Start playing new track
      setIsPlaying(true);
      setCurrentTrackId(track.id);
      await spotify.playTrack(track.uri);
    }
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${Number(seconds) < 10 ? '0' : ''}${seconds}`;
  };

  if (spotify.loading) {
    return (
      <ContentLoading text="Loading Spotify..." />
    );
  }

  if (!spotify.isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Connect to Spotify</h1>
        <p className="mb-8 text-gray-400">
          Connect your Spotify account to browse and play your music.
        </p>
        <SpotifyLogin className="w-full max-w-sm" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Spotify Songs</h1>
        {spotify.user && (
          <div className="flex items-center space-x-2">
            <img 
              src={spotify.user.images?.[0]?.url || 'https://via.placeholder.com/40'} 
              alt={spotify.user.display_name} 
              className="w-8 h-8 rounded-full"
            />
            <span className="text-sm">{spotify.user.display_name}</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSearch} className="flex space-x-2">
        <div className="relative flex-grow">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search songs..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={isSearching}>
          {isSearching ? <ButtonLoading /> : 'Search'}
        </Button>
      </form>

      <div className="space-y-2">
        {searchResults.length > 0 ? (
          <div className="rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-black bg-opacity-20 text-left">
                <tr>
                  <th className="p-4">#</th>
                  <th className="p-4">Title</th>
                  <th className="p-4 hidden md:table-cell">Album</th>
                  <th className="p-4 text-right">Duration</th>
                </tr>
              </thead>
              <tbody>
                {searchResults.map((track, index) => (
                  <tr 
                    key={track.id}
                    className="border-b border-gray-800 hover:bg-gray-900 transition-colors"
                  >
                    <td className="p-4 w-12">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handlePlayPause(track)}
                      >
                        {isPlaying && currentTrackId === track.id ? (
                          <PauseIcon className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <img
                          src={track.album.images[0]?.url || 'https://via.placeholder.com/40'}
                          alt={track.album.name}
                          className="w-10 h-10 object-cover rounded"
                        />
                        <div>
                          <p className="font-medium">{track.name}</p>
                          <p className="text-gray-400 text-xs">
                            {track.artists.map(artist => artist.name).join(', ')}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 hidden md:table-cell text-gray-400">
                      {track.album.name}
                    </td>
                    <td className="p-4 text-right text-gray-400">
                      {formatDuration(track.duration_ms)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center p-8 text-gray-500">
            {searchQuery ? 'No results found' : 'Search for songs or connect to Spotify'}
          </div>
        )}
      </div>
    </div>
  );
};

export default SpotifySongsPage; 