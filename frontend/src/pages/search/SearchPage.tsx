import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useMusicStore } from '@/stores/useMusicStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { Play, Search, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { resolveArtist } from '@/lib/resolveArtist';
import { useDebounce } from '@/hooks/useDebounce';
import { SearchSkeleton } from '@/components/SearchSkeleton';
import { SearchSuggestions, saveRecentSearch } from '@/components/SearchSuggestions';

const SearchPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const query = searchParams.get('q') || '';
  const debouncedQuery = useDebounce(searchQuery, 400); // Debounce input
  const searchAbortController = useRef<AbortController | null>(null);

  const { searchIndianSongs, indianSearchResults, isIndianMusicLoading } = useMusicStore();
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const hasSearched = useRef(false);

  // Perform search when query changes (from URL)
  useEffect(() => {
    if (query && query.trim()) {
      // Cancel previous search
      if (searchAbortController.current) {
        searchAbortController.current.abort();
      }
      searchAbortController.current = new AbortController();

      setIsSearching(true);
      hasSearched.current = true;
      setShowSuggestions(false);
      
      searchIndianSongs(query.trim())
        .then(() => {
          // Save to recent searches on successful search
          saveRecentSearch(query.trim());
        })
        .finally(() => {
          setIsSearching(false);
        });
    } else {
      hasSearched.current = false;
    }

    return () => {
      if (searchAbortController.current) {
        searchAbortController.current.abort();
      }
    };
  }, [query, searchIndianSongs]);

  // Handle search form submission
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowSuggestions(false);
    }
  }, [searchQuery, navigate]);

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback((suggestion: string) => {
    setSearchQuery(suggestion);
    navigate(`/search?q=${encodeURIComponent(suggestion)}`);
    setShowSuggestions(false);
  }, [navigate]);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    navigate('/search');
    setShowSuggestions(false);
  }, [navigate]);

  // Show suggestions when input is focused and not searching
  const handleInputFocus = useCallback(() => {
    if (!query) {
      setShowSuggestions(true);
    }
  }, [query]);

  const handleInputBlur = useCallback(() => {
    // Delay to allow click on suggestions
    setTimeout(() => setShowSuggestions(false), 200);
  }, []);

  // Play a single song - with URL fetching if needed (optimized)
  const playSong = useCallback(async (song: any, index: number) => {
    // If song doesn't have URL, fetch it from the API
    if (!song.url) {
      const toastId = toast.loading('Loading song...');
      
      try {
        // Fetch song details from backend with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(`/api/jiosaavn/songs/${song.id}`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        const data = await response.json();
        
        if (data.success && data.data && data.data.downloadUrl) {
          const downloadUrl = data.data.downloadUrl.find((d: any) => d.quality === '320kbps') ||
            data.data.downloadUrl.find((d: any) => d.quality === '160kbps') ||
            data.data.downloadUrl.find((d: any) => d.quality === '96kbps') ||
            data.data.downloadUrl[data.data.downloadUrl.length - 1];
          
          song.url = downloadUrl?.url || downloadUrl?.link || '';
          
          if (!song.url) {
            toast.dismiss(toastId);
            toast.error('Failed to get song URL');
            return;
          }
          
          // Update image if available
          if (data.data.image && Array.isArray(data.data.image)) {
            const image = data.data.image.find((i: any) => i.quality === '500x500') ||
              data.data.image.find((i: any) => i.quality === '150x150') ||
              data.data.image[data.data.image.length - 1];
            song.image = image?.url || image?.link || song.image;
          }
          
          // Update the song in the results array
          const { indianSearchResults: currentResults } = useMusicStore.getState();
          currentResults[index] = { ...song };
          
          toast.dismiss(toastId);
        } else {
          toast.dismiss(toastId);
          toast.error('This song is not available for playback');
          return;
        }
      } catch (error: any) {
        toast.error(error.name === 'AbortError' ? 'Request timeout' : 'Failed to load song');
        return;
      }
    }

    if (!song.url) {
      toast.error('This song is not available for playback');
      return;
    }

    const playerStore = usePlayerStore.getState();
    playerStore.setUserInteracted();
    
    const convertedSong = useMusicStore.getState().convertIndianSongToAppSong(song);
    
    if (!convertedSong.audioUrl) {
      toast.error('This song is not available for playback');
      return;
    }
    
    // Convert all songs to app format (only songs with URLs)
    const allSongs = indianSearchResults
      .filter((s: any) => s.url)
      .map((s: any) => useMusicStore.getState().convertIndianSongToAppSong(s))
      .filter((s: any) => s.audioUrl);
    
    const currentIndex = allSongs.findIndex((s: any) => s._id === convertedSong._id);
    
    if (currentIndex === -1) {
      playerStore.playAlbum([convertedSong], 0);
    } else {
      playerStore.playAlbum(allSongs, currentIndex);
    }
    
    playerStore.setIsPlaying(true);
    toast.success(`Now playing: ${song.title}`);
  }, [indianSearchResults]);

  // Play all songs (optimized)
  const playAll = useCallback(() => {
    if (indianSearchResults.length === 0) {
      toast.error('No songs to play');
      return;
    }

    const playerStore = usePlayerStore.getState();
    playerStore.setUserInteracted();
    
    const allSongs = indianSearchResults
      .filter((s: any) => s.url)
      .map((s: any) => useMusicStore.getState().convertIndianSongToAppSong(s));
    
    if (allSongs.length === 0) {
      toast.error('No playable songs found');
      return;
    }
    
    playerStore.playAlbum(allSongs, 0);
    playerStore.setIsPlaying(true);
    
    toast.success(`Playing ${allSongs.length} songs`);
  }, [indianSearchResults]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#121212] to-black text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-2">Search</h1>
          <p className="text-gray-400">Find your favorite songs, artists, and albums</p>
        </div>

        {/* Search Box */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none z-10" />
            <Input
              type="search"
              placeholder="What do you want to listen to?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              className="w-full h-14 pl-12 pr-12 bg-[#242424] border-0 text-white placeholder:text-gray-400 text-base rounded-full focus:ring-2 focus:ring-[#1db954] transition-all"
              autoComplete="off"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors z-10"
                aria-label="Clear search"
              >
                <XCircle size={20} />
              </button>
            )}
          </div>
        </form>

        {/* Search Suggestions */}
        {showSuggestions && (
          <SearchSuggestions
            onSelect={handleSuggestionSelect}
            currentQuery={searchQuery}
          />
        )}

        {/* Loading State with Skeleton */}
        {(isSearching || isIndianMusicLoading) && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="h-8 w-32 bg-gray-600 rounded animate-pulse"></div>
              <div className="h-10 w-32 bg-gray-600 rounded-full animate-pulse"></div>
            </div>
            <SearchSkeleton />
          </div>
        )}

        {/* Results */}
        {!isSearching && !isIndianMusicLoading && query && (
          <>
            {indianSearchResults.length > 0 ? (
              <div>
                {/* Results Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">
                    Songs ({indianSearchResults.length})
                  </h2>
                  <Button
                    onClick={playAll}
                    className="bg-[#1db954] hover:bg-[#1ed760] text-black font-semibold rounded-full px-6"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Play all
                  </Button>
                </div>

                {/* Song List - Optimized rendering */}
                <div className="space-y-2">
                  {indianSearchResults.map((song: any, index: number) => (
                    <div
                      key={song.id || index}
                      onClick={() => playSong(song, index)}
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-[#282828] transition-all duration-200 cursor-pointer group"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          playSong(song, index);
                        }
                      }}
                    >
                      {/* Index/Play Button */}
                      <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                        <span className="text-gray-400 group-hover:hidden transition-opacity">
                          {index + 1}
                        </span>
                        <div className="hidden group-hover:flex w-10 h-10 bg-[#1db954] rounded-full items-center justify-center shadow-lg transform group-hover:scale-105 transition-transform">
                          <Play className="h-5 w-5 text-black ml-0.5" fill="currentColor" />
                        </div>
                      </div>

                      {/* Song Image */}
                      <div className="w-14 h-14 rounded-md overflow-hidden bg-[#282828] flex-shrink-0 shadow-md">
                        <img
                          src={song.image || '/images/default-album.png'}
                          alt={song.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/default-album.png';
                          }}
                        />
                      </div>

                      {/* Song Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate group-hover:text-[#1db954] transition-colors">
                          {song.title}
                        </h3>
                        <p className="text-sm text-gray-400 truncate">
                          {resolveArtist(song)}
                        </p>
                      </div>

                      {/* Duration */}
                      {song.duration && (
                        <div className="text-sm text-gray-400 flex-shrink-0 tabular-nums">
                          {song.duration}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold mb-2">No results found</h3>
                <p className="text-gray-400">
                  Try searching with different keywords
                </p>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!query && !isSearching && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎵</div>
            <h3 className="text-xl font-semibold mb-2">Search for music</h3>
            <p className="text-gray-400">
              Find your favorite songs, artists, and albums
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
