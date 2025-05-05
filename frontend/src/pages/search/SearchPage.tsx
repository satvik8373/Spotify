import { useEffect, useState } from 'react';
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { useMusicStore } from '@/stores/useMusicStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { usePlaylistStore } from '@/stores/usePlaylistStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Play, 
  Loader, 
  Heart, 
  Search, 
  XCircle, 
  ListMusic, 
  Clock, 
  Trash2, 
  ChevronRight,
  Music,
  ExternalLink,
  Instagram
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '../../contexts/AuthContext';
import { loadLikedSongs, saveLikedSongs } from '@/services/likedSongsService';
import IndianMusicPlayer from '@/components/IndianMusicPlayer';
import { PlaylistCard } from '@/components/playlist/PlaylistCard';
import { Playlist } from '@/types';
import { debounce } from 'lodash';
import { cn } from '@/lib/utils';

// Maximum number of recent searches to store
const MAX_RECENT_SEARCHES = 8;

// Instagram handle
const INSTAGRAM_HANDLE = "@mavrix_official";
const INSTAGRAM_URL = "https://www.instagram.com/mavrix_official?igsh=MTZyYnVxMmdiYzBmeQ%3D%3D&utm_source=qr";
const INSTAGRAM_HANDLE_TRADING = "@mavrix.trading";
const INSTAGRAM_URL_TRADING = "https://www.instagram.com/mavrix.trading?igsh=bDIzdGJjazgyYzE3";

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
  
  // Recent searches state
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  // Load recent searches from localStorage on component mount
  useEffect(() => {
    const savedSearches = localStorage.getItem('recentSearches');
    if (savedSearches) {
      try {
        setRecentSearches(JSON.parse(savedSearches));
      } catch (error) {
        console.error('Failed to parse recent searches:', error);
        setRecentSearches([]);
      }
    }
  }, []);
  
  // Save recent search when performing a search
  const saveRecentSearch = (query: string) => {
    if (!query.trim()) return;
    
    // Create new array with current query at the beginning, removing duplicates
    const updatedSearches = [
      query,
      ...recentSearches.filter(item => item.toLowerCase() !== query.toLowerCase())
    ].slice(0, MAX_RECENT_SEARCHES);
    
    setRecentSearches(updatedSearches);
    localStorage.setItem('recentSearches', JSON.stringify(updatedSearches));
  };
  
  // Remove a specific recent search
  const removeRecentSearch = (searchToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the parent click event
    
    const updatedSearches = recentSearches.filter(
      search => search !== searchToRemove
    );
    
    setRecentSearches(updatedSearches);
    localStorage.setItem('recentSearches', JSON.stringify(updatedSearches));
  };
  
  // Clear all recent searches
  const clearAllRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  // Update the search when the URL changes
  useEffect(() => {
    if (query) {
      setSearchQuery(query);
      saveRecentSearch(query);
      
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
  
  const clickRecentSearch = (searchTerm: string) => {
    navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
  };
  
  const openInstagram = (url: string) => {
    window.open(url, '_blank');
  };

  const renderEmptyState = () => (
    <div className="space-y-8">
      {/* Recent Searches Section */}
      {recentSearches.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Recent searches</h2>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={clearAllRecentSearches}
              className="text-sm text-white/70 hover:text-white hover:bg-white/10"
            >
              Clear all
            </Button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {recentSearches.map((search, index) => (
              <div 
                key={index}
                onClick={() => clickRecentSearch(search)}
                className="bg-[#181818] hover:bg-[#282828] rounded-md p-4 cursor-pointer transition-colors group relative"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-md bg-neutral-800 flex items-center justify-center flex-shrink-0">
                    <Search className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-white truncate">{search}</h3>
                    <p className="text-xs text-white/60">Recent search</p>
                  </div>
                </div>
                
                {/* Delete button that appears on hover */}
                <button
                  onClick={(e) => removeRecentSearch(search, e)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-full bg-black/40 text-white/80 hover:text-white hover:bg-black/60 transition-opacity"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Follow on Instagram Section */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Follow Us</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* First Instagram Account */}
          <div 
            onClick={(e: React.MouseEvent) => openInstagram(INSTAGRAM_URL)}
            className="bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 rounded-lg overflow-hidden p-6 relative cursor-pointer transition-transform hover:scale-[1.02] flex items-center"
          >
            <div className="flex-1">
              <div className="flex items-center mb-3">
                <Instagram className="h-6 w-6 text-white mr-2" />
                <h3 className="text-xl font-bold text-white">{INSTAGRAM_HANDLE}</h3>
              </div>
              <p className="text-white/80 mb-4 text-sm">Music updates and news</p>
              <Button 
                className="bg-white hover:bg-white/90 text-black font-medium rounded-full px-6 flex items-center" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  openInstagram(INSTAGRAM_URL);
                }}
              >
                Follow
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <div className="hidden md:block">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <Instagram className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>

          {/* Second Instagram Account */}
          <div 
            onClick={(e: React.MouseEvent) => openInstagram(INSTAGRAM_URL_TRADING)}
            className="bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-400 rounded-lg overflow-hidden p-6 relative cursor-pointer transition-transform hover:scale-[1.02] flex items-center"
          >
            <div className="flex-1">
              <div className="flex items-center mb-3">
                <Instagram className="h-6 w-6 text-white mr-2" />
                <h3 className="text-xl font-bold text-white">{INSTAGRAM_HANDLE_TRADING}</h3>
              </div>
              <p className="text-white/80 mb-4 text-sm">Trading insights and analytics</p>
              <Button 
                className="bg-white hover:bg-white/90 text-black font-medium rounded-full px-6 flex items-center" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  openInstagram(INSTAGRAM_URL_TRADING);
                }}
              >
                Follow
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <div className="hidden md:block">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <Instagram className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>
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
        <div className="p-4 sm:p-6 max-w-7xl mx-auto">
          <div className="mb-6 flex flex-col lg:flex-row lg:items-center gap-4">
            <h1 className="text-3xl font-bold">Search</h1>
            
            {/* Search Box - Spotify-style white design */}
            <form onSubmit={handleSearch} className="flex-1 max-w-xl flex items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-700" />
                <Input
                  type="search"
                  placeholder="What do you want to listen to?"
                  value={searchQuery}
                  onChange={handleQueryChange}
                  className="w-full rounded-l-full bg-white text-zinc-800 pl-10 pr-10 h-12 focus:outline-none focus:ring-1 focus:ring-[#1ed760] border-none font-medium"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-700"
                  >
                    <XCircle size={18} />
                  </button>
                )}
              </div>
              <Button 
                type="submit"
                className="h-12 rounded-r-full rounded-l-none bg-white hover:bg-white/90 text-zinc-800 font-medium px-5 border-none"
              >
                Search
              </Button>
            </form>
          </div>

          {isInitialLoad ? (
            <div className="flex justify-center py-12">
              <Loader className="w-8 h-8 animate-spin text-zinc-500" />
            </div>
          ) : query ? (
            <div className="space-y-6">
              {/* Top Results - Featured Section */}
              {(indianSearchResults.length > 0 || playlistResults.length > 0) && (
                <div className="mb-8">
                  <h2 className="text-xl font-bold mb-4">Top Result</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Top Result Card */}
                    {indianSearchResults.length > 0 && (
                      <div className="bg-[#181818] hover:bg-[#282828] p-5 rounded-lg transition-colors shadow-lg">
                        <div className="flex flex-col h-full">
                          <div className="mb-4">
                            <img 
                              src={indianSearchResults[0].image} 
                              alt={indianSearchResults[0].title}
                              className="w-24 h-24 shadow-md rounded-md"
                            />
                          </div>
                          <h3 className="text-xl font-bold text-white truncate">{indianSearchResults[0].title}</h3>
                          <p className="text-sm text-white/60 mb-4">
                            {indianSearchResults[0].artist || "Unknown Artist"}
                          </p>
                          <div className="mt-auto">
                            <Button 
                              className="rounded-full h-12 w-12 bg-[#1db954] hover:bg-[#1ed760] text-black shadow-lg shadow-black/50"
                              size="icon"
                              onClick={() => usePlayerStore.getState().setCurrentSong(indianSearchResults[0] as any)}
                            >
                              <Play className="h-6 w-6 ml-0.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Alternative Top Result - Playlist */}
                    {indianSearchResults.length === 0 && playlistResults.length > 0 && (
                      <div className="bg-[#181818] hover:bg-[#282828] p-5 rounded-lg transition-colors shadow-lg">
                        <PlaylistCard 
                          playlist={playlistResults[0]}
                          size="large"
                          showDescription={true}
                          className="bg-transparent hover:bg-transparent"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Playlist Results */}
              {renderPlaylistResults()}
              
              {/* Song Results */}
              {indianSearchResults.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold mb-4">Songs</h2>
                  <IndianMusicPlayer />
                </div>
              )}
              
              {/* Show message if no results */}
              {indianSearchResults.length === 0 && playlistResults.length === 0 && (
                <div className="py-16 text-center bg-[#181818] rounded-lg">
                  <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="h-8 w-8 text-zinc-400" />
                  </div>
                  <p className="text-zinc-200 font-semibold text-lg">No results found for "{query}"</p>
                  <p className="text-zinc-400 text-sm mt-2">Try different keywords or check the spelling</p>
                </div>
              )}
            </div>
          ) : (
            // Empty state with recent searches and Instagram follow
            renderEmptyState()
          )}
        </div>
      </ScrollArea>
    </main>
  );
};

export default SearchPage;
