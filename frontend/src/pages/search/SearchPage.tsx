import { useEffect, useState } from 'react';
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { useMusicStore } from '@/stores/useMusicStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { usePlaylistStore } from '@/stores/usePlaylistStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, Loader, Heart, Search, XCircle, ListMusic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '../../contexts/AuthContext';
import { loadLikedSongs, saveLikedSongs } from '@/services/likedSongsService';
import IndianMusicPlayer from '@/components/IndianMusicPlayer';
import { PlaylistCard } from '@/components/playlist/PlaylistCard';
import { Playlist } from '@/types';
import { debounce } from 'lodash';

const SearchPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const query = searchParams.get('q') || '';

  const { isIndianMusicLoading, searchIndianSongs, indianSearchResults } = useMusicStore();
  const { searchPlaylists, searchResults: playlistResults, isSearching } = usePlaylistStore();
  const { isAuthenticated, user } = useAuth();
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Update the search when the URL changes
  useEffect(() => {
    if (query) {
      setSearchQuery(query);
      
      // Create an array of promises for all search operations
      const searchPromises = [
        searchIndianSongs(query),
        searchPlaylists(query)
      ];
      
      // Wait for all searches to complete
      Promise.all(searchPromises)
        .then(() => {
          setIsInitialLoad(false);
        })
        .catch(error => {
          console.error('Search failed:', error);
          setIsInitialLoad(false);
        });
    } else {
      // Clear search results if no query
      useMusicStore.setState({ indianSearchResults: [] });
      usePlaylistStore.setState({ searchResults: [] });
      setIsInitialLoad(false);
    }
  }, [query, searchIndianSongs, searchPlaylists]);

  // Update auth store with current user info
  useEffect(() => {
    useAuthStore
      .getState()
      .setAuthStatus(isAuthenticated, isAuthenticated ? user?.id || null : null);
  }, [isAuthenticated, user]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
  };

  const clearSearch = () => {
    setSearchQuery('');
    navigate('/search');
  };

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
        <Search className="h-8 w-8 text-zinc-400" />
      </div>
      <h2 className="text-xl font-semibold text-white mb-2">Search for music</h2>
      <p className="text-zinc-400 max-w-md">
        Search for songs, artists, or playlists to start listening
      </p>
    </div>
  );

  const renderPlaylistResults = () => {
    if (playlistResults.length === 0) return null;
    
    return (
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Playlists</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
          {playlistResults.map((playlist: Playlist) => (
            <PlaylistCard 
              key={playlist._id}
              playlist={playlist}
              size="small"
              showDescription={false}
              className="w-full max-w-full h-full"
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <main className="rounded-md overflow-hidden h-full bg-gradient-to-b from-zinc-800 to-zinc-900">
      <ScrollArea className="h-[calc(100vh-180px)]">
        <div className="p-4 sm:p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Search</h1>
            
            {/* Mobile Search Box - Only visible on smaller screens */}
            <form onSubmit={handleSearch} className="mb-6 md:hidden">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  type="search"
                  placeholder="What do you want to listen to?"
                  value={searchQuery}
                  onChange={handleQueryChange}
                  className="w-full rounded-full bg-zinc-800 pl-10 pr-10 h-10 focus:outline-none focus:ring-1 focus:ring-[#1ed760] border-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                  >
                    <XCircle size={16} />
                  </button>
                )}
              </div>
            </form>
            
            {query && <p className="text-zinc-400">Results for "{query}"</p>}
          </div>

          {isInitialLoad ? (
            <div className="flex justify-center py-12">
              <Loader className="w-8 h-8 animate-spin text-zinc-500" />
            </div>
          ) : query ? (
            <div className="space-y-6">
              {/* Playlist Results */}
              {renderPlaylistResults()}
              
              {/* Song Results */}
              <div>
                <h2 className="text-xl font-bold mb-4">Songs</h2>
                <IndianMusicPlayer />
              </div>
              
              {/* Show message if no results */}
              {indianSearchResults.length === 0 && playlistResults.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-zinc-400">No results found for "{query}"</p>
                  <p className="text-zinc-500 text-sm mt-2">Try different keywords or check the spelling</p>
                </div>
              )}
            </div>
          ) : (
            // Empty state when no search query
            renderEmptyState()
          )}
        </div>
      </ScrollArea>
    </main>
  );
};

export default SearchPage;
