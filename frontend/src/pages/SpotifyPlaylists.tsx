import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getUserPlaylists, 
  isAuthenticated, 
  getAuthorizationUrl,
  formatSpotifyPlaylist,
  logout
} from '@/services/spotifyService';
import { Loader2, RefreshCw, LogOut, ExternalLink } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Playlist {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  owner: string;
  tracksCount: number;
  source: string;
  externalUrl: string;
}

const SpotifyPlaylists: React.FC = () => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [authenticated, setAuthenticated] = useState(isAuthenticated());
  const [offset, setOffset] = useState(0);
  const limit = 20;
  
  const navigate = useNavigate();
  
  // Fetch playlists from Spotify
  const fetchPlaylists = useCallback(async (offsetVal = 0, append = false) => {
    if (!authenticated) return;
    
    try {
      setIsLoadingMore(true);
      const data = await getUserPlaylists(limit, offsetVal);
      
      // Format playlists
      const formattedPlaylists = data.items.map(formatSpotifyPlaylist);
      
      // Update state
      setPlaylists(prev => append ? [...prev, ...formattedPlaylists] : formattedPlaylists);
      setOffset(offsetVal + limit);
      setHasMore(data.next !== null);
      setError(null);
    } catch (error) {
      console.error('Error fetching playlists:', error);
      setError('Failed to load playlists. Please try again later.');
      
      // Check if error is due to auth issues
      if (error instanceof Error && error.message.includes('No valid token')) {
        setAuthenticated(false);
      }
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  }, [authenticated]);
  
  // Initial load
  useEffect(() => {
    if (authenticated) {
      fetchPlaylists(0, false);
    } else {
      setLoading(false);
    }
  }, [authenticated, fetchPlaylists]);
  
  // Handle login with Spotify
  const handleLogin = () => {
    window.location.href = getAuthorizationUrl();
  };
  
  // Handle load more
  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      fetchPlaylists(offset, true);
    }
  };
  
  // Handle logout
  const handleLogout = () => {
    logout();
    setAuthenticated(false);
    setPlaylists([]);
  };
  
  // Handle refresh
  const handleRefresh = () => {
    setLoading(true);
    fetchPlaylists(0, false);
  };
  
  // Handle view playlist tracks
  const handleViewPlaylist = (playlistId: string) => {
    navigate(`/spotify-playlist/${playlistId}`);
  };
  
  // Render login screen if not authenticated
  if (!authenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-900 text-white p-4">
        <div className="text-center max-w-md">
          <svg viewBox="0 0 24 24" className="h-16 w-16 text-green-500 mx-auto mb-6">
            <path fill="currentColor" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
          <h1 className="text-3xl font-bold mb-4">Connect with Spotify</h1>
          <p className="mb-8 text-zinc-400">
            Connect your Spotify account to access your playlists and discover new music.
          </p>
          <button 
            onClick={handleLogin}
            className="w-full px-6 py-3 bg-green-500 hover:bg-green-600 rounded-full font-bold transition-colors"
          >
            Connect with Spotify
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-zinc-900 text-white pb-16">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-900/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <svg viewBox="0 0 24 24" className="h-8 w-8 text-green-500 mr-3">
              <path fill="currentColor" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
            <h1 className="text-2xl font-bold">Your Spotify Playlists</h1>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleRefresh}
              className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700"
              title="Refresh playlists"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700"
              title="Disconnect from Spotify"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-green-500" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-zinc-400 mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded"
            >
              Try Again
            </button>
          </div>
        ) : playlists.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-zinc-400 mb-4">No playlists found in your Spotify account.</p>
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-130px)]">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {playlists.map((playlist) => (
                <div 
                  key={playlist.id}
                  className="bg-zinc-800 rounded-lg overflow-hidden hover:bg-zinc-700 transition-colors cursor-pointer group"
                  onClick={() => handleViewPlaylist(playlist.id)}
                >
                  <div className="relative pb-[100%]">
                    {playlist.imageUrl ? (
                      <img 
                        src={playlist.imageUrl} 
                        alt={playlist.name}
                        className="absolute top-0 left-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute top-0 left-0 w-full h-full bg-zinc-700 flex items-center justify-center">
                        <svg className="h-16 w-16 text-zinc-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M9 19V5l12-2v13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M9 19a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" stroke="currentColor" strokeWidth="2"/>
                          <path d="M21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a 
                        href={playlist.externalUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center text-xs text-white hover:underline"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" /> Open in Spotify
                      </a>
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="font-bold text-white truncate">{playlist.name}</h3>
                    <p className="text-zinc-400 text-sm truncate">By {playlist.owner}</p>
                    <p className="text-zinc-500 text-xs mt-1">{playlist.tracksCount} tracks</p>
                  </div>
                </div>
              ))}
            </div>
            
            {hasMore && (
              <div className="flex justify-center my-8">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-full flex items-center"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Loading more...
                    </>
                  ) : (
                    'Load More Playlists'
                  )}
                </button>
              </div>
            )}
          </ScrollArea>
        )}
      </div>
    </div>
  );
};

export default SpotifyPlaylists; 