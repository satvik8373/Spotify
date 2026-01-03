import React, { useEffect, useState } from 'react';
import { useSpotify } from '../../contexts/SpotifyContext';
import { Button } from '../../components/ui/button';
import { Loader2 } from 'lucide-react';
import SpotifyLogin from '../../components/SpotifyLogin';
import { Link } from 'react-router-dom';

interface Playlist {
  id: string;
  name: string;
  description: string;
  images: { url: string }[];
  owner: { display_name: string };
  tracks: { total: number };
}

const SpotifyPlaylistsPage: React.FC = () => {
  const spotify = useSpotify();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  useEffect(() => {
    if (spotify.isAuthenticated) {
      loadPlaylists();
    }
  }, [spotify.isAuthenticated]);

  const loadPlaylists = async () => {
    setIsLoading(true);
    try {
      const userPlaylists = await spotify.fetchUserPlaylists(50);
      setPlaylists(userPlaylists);
    } catch (error) {
      console.error('Error loading playlists:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (spotify.loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    );
  }

  if (!spotify.isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Connect to Spotify</h1>
        <p className="mb-8 text-gray-400">
          Connect your Spotify account to view your playlists.
        </p>
        <SpotifyLogin className="w-full max-w-sm" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Your Playlists</h1>
        <Button
          onClick={loadPlaylists}
          disabled={isLoading}
          variant="outline"
          size="sm"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Refresh
        </Button>
      </div>

      {isLoading && playlists.length === 0 ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-green-500" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {playlists.length > 0 ? (
            playlists.map((playlist) => (
              <Link
                key={playlist.id}
                to={`/spotify/playlist/${playlist.id}`}
                className="group bg-zinc-900 rounded-md overflow-hidden hover:bg-zinc-800 transition-colors"
              >
                <div className="aspect-square overflow-hidden relative">
                  <img
                    src={playlist.images[0]?.url || 'https://via.placeholder.com/300?text=No+Cover'}
                    alt={playlist.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                    <Button className="bg-green-500 hover:bg-green-600 text-white">
                      View Playlist
                    </Button>
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="font-semibold truncate">{playlist.name}</h3>
                  <p className="text-sm text-gray-400 truncate">
                    By {playlist.owner.display_name} • {playlist.tracks.total} tracks
                  </p>
                </div>
              </Link>
            ))
          ) : (
            <div className="col-span-full text-center p-12 text-gray-500">
              No playlists found. Create playlists in Spotify to see them here.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SpotifyPlaylistsPage; 