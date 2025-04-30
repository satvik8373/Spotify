import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  getPlaylist, 
  getPlaylistTracks, 
  formatSpotifyTrack,
  isAuthenticated,
  getAuthorizationUrl
} from '@/services/spotifyService';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ArrowLeft, Clock, Play, ExternalLink } from 'lucide-react';

interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  imageUrl: string;
  audioUrl: string;
  year: string;
  source: string;
}

interface PlaylistDetails {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  owner: string;
  tracksCount: number;
  externalUrl: string;
  followers?: number;
}

const SpotifyPlaylistDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [playlist, setPlaylist] = useState<PlaylistDetails | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [tracksLoading, setTracksLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [authenticated, setAuthenticated] = useState(isAuthenticated());
  const limit = 50;
  
  const navigate = useNavigate();

  // Format duration
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };
  
  // Fetch playlist details
  const fetchPlaylistDetails = useCallback(async () => {
    if (!id || !authenticated) return;
    
    try {
      setLoading(true);
      const data = await getPlaylist(id);
      
      setPlaylist({
        id: data.id,
        name: data.name,
        description: data.description || '',
        imageUrl: data.images && data.images[0] ? data.images[0].url : '',
        owner: data.owner?.display_name || 'Spotify User',
        tracksCount: data.tracks?.total || 0,
        externalUrl: data.external_urls?.spotify || '',
        followers: data.followers?.total
      });
      
      setError(null);
    } catch (error) {
      console.error('Error fetching playlist details:', error);
      setError('Failed to load playlist details. Please try again later.');
      
      // Check if error is due to auth issues
      if (error instanceof Error && error.message.includes('No valid token')) {
        setAuthenticated(false);
      }
    } finally {
      setLoading(false);
    }
  }, [id, authenticated]);
  
  // Fetch playlist tracks
  const fetchPlaylistTracks = useCallback(async (offsetVal = 0, append = false) => {
    if (!id || !authenticated) return;
    
    try {
      setIsLoadingMore(true);
      const data = await getPlaylistTracks(id, limit, offsetVal);
      
      // Filter out null tracks and format
      const formattedTracks = data.items
        .map(formatSpotifyTrack)
        .filter(Boolean);
      
      // Update state
      setTracks(prev => append ? [...prev, ...formattedTracks] : formattedTracks);
      setOffset(offsetVal + limit);
      setHasMore(data.next !== null);
      setError(null);
    } catch (error) {
      console.error('Error fetching playlist tracks:', error);
      setError('Failed to load tracks. Please try again later.');
      
      // Check if error is due to auth issues
      if (error instanceof Error && error.message.includes('No valid token')) {
        setAuthenticated(false);
      }
    } finally {
      setTracksLoading(false);
      setIsLoadingMore(false);
    }
  }, [id, authenticated]);
  
  // Initial load
  useEffect(() => {
    if (authenticated) {
      fetchPlaylistDetails();
      fetchPlaylistTracks(0, false);
    } else {
      setLoading(false);
      setTracksLoading(false);
    }
  }, [authenticated, fetchPlaylistDetails, fetchPlaylistTracks]);
  
  // Handle load more
  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      fetchPlaylistTracks(offset, true);
    }
  };
  
  // Handle login with Spotify
  const handleLogin = () => {
    window.location.href = getAuthorizationUrl();
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
  
  // Play song if available
  const playSong = (track: Track) => {
    if (!track.audioUrl) {
      alert('Preview not available for this track');
      return;
    }
    
    // You can implement your audio player here
    // For now, we'll use a simple approach
    const audio = new Audio(track.audioUrl);
    audio.play();
  };
  
  return (
    <div className="min-h-screen bg-zinc-900 text-white pb-16">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-900/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link to="/spotify-playlists" className="inline-flex items-center text-zinc-400 hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Playlists
          </Link>
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
              onClick={() => navigate('/spotify-playlists')}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded"
            >
              Back to Playlists
            </button>
          </div>
        ) : playlist ? (
          <>
            {/* Playlist header */}
            <div className="flex flex-col md:flex-row md:items-end gap-6 mb-8">
              <div className="w-48 h-48 flex-shrink-0 bg-zinc-800 rounded-md overflow-hidden shadow-xl">
                {playlist.imageUrl ? (
                  <img 
                    src={playlist.imageUrl} 
                    alt={playlist.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-700 flex items-center justify-center">
                    <svg className="h-24 w-24 text-zinc-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 19V5l12-2v13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M9 19a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" stroke="currentColor" strokeWidth="2"/>
                      <path d="M21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="text-xs uppercase font-bold mb-1">Playlist</div>
                <h1 className="text-4xl md:text-5xl font-bold mb-2">{playlist.name}</h1>
                {playlist.description && (
                  <p className="text-zinc-400 text-sm mb-2" 
                    dangerouslySetInnerHTML={{ __html: playlist.description }}
                  ></p>
                )}
                <div className="flex items-center text-sm text-zinc-400">
                  <span className="font-bold text-white">{playlist.owner}</span>
                  <span className="mx-1">•</span>
                  <span>{playlist.tracksCount} tracks</span>
                  {playlist.followers !== undefined && (
                    <>
                      <span className="mx-1">•</span>
                      <span>{playlist.followers.toLocaleString()} followers</span>
                    </>
                  )}
                  <a 
                    href={playlist.externalUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ml-2 inline-flex items-center text-zinc-400 hover:text-white"
                  >
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </div>
              </div>
            </div>
            
            {/* Tracks list */}
            {tracksLoading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-green-500" />
              </div>
            ) : tracks.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-zinc-400">This playlist has no tracks.</p>
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-300px)]">
                <table className="w-full">
                  <thead className="border-b border-zinc-800 sticky top-0 bg-zinc-900">
                    <tr>
                      <th className="text-left py-2 pl-2 pr-4 w-10">#</th>
                      <th className="text-left py-2 px-4">Title</th>
                      <th className="text-left py-2 px-4 hidden md:table-cell">Album</th>
                      <th className="text-right py-2 pl-4 pr-2">
                        <Clock className="h-4 w-4 inline" />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tracks.map((track, index) => (
                      <tr 
                        key={track.id}
                        className="hover:bg-zinc-800 group"
                      >
                        <td className="text-left p-2 text-zinc-400">
                          <span className="group-hover:hidden">{index + 1}</span>
                          <button 
                            className="hidden group-hover:block text-white"
                            onClick={() => playSong(track)}
                            disabled={!track.audioUrl}
                          >
                            <Play className="h-4 w-4" />
                          </button>
                        </td>
                        <td className="text-left py-2 px-4">
                          <div className="flex items-center">
                            <div className="w-10 h-10 mr-3 bg-zinc-800 flex-shrink-0">
                              {track.imageUrl && (
                                <img 
                                  src={track.imageUrl} 
                                  alt={track.title}
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            <div>
                              <div className="font-medium">{track.title}</div>
                              <div className="text-sm text-zinc-400">{track.artist}</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-left py-2 px-4 text-zinc-400 hidden md:table-cell">
                          {track.album}
                        </td>
                        <td className="text-right py-2 pl-4 pr-2 text-zinc-400">
                          {formatDuration(track.duration)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
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
                        'Load More Tracks'
                      )}
                    </button>
                  </div>
                )}
              </ScrollArea>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
};

export default SpotifyPlaylistDetail; 