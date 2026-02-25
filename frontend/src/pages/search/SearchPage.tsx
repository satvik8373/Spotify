import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useMusicStore } from '@/stores/useMusicStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { Play, Search, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { resolveArtist } from '@/lib/resolveArtist';

const SearchPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const query = searchParams.get('q') || '';

  const { searchIndianSongs, indianSearchResults, isIndianMusicLoading } = useMusicStore();
  const [isSearching, setIsSearching] = useState(false);

  // Perform search when query changes
  useEffect(() => {
    if (query && query.trim()) {
      setIsSearching(true);
      searchIndianSongs(query.trim())
        .finally(() => setIsSearching(false));
    }
  }, [query, searchIndianSongs]);

  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    navigate('/search');
  };

  // Play a single song - with URL fetching if needed
  const playSong = async (song: any, index: number) => {
    console.log('🎵 PLAY SONG CALLED', { song, index });
    
    // If song doesn't have URL, fetch it from the API
    if (!song.url) {
      console.log('⚠️ Song has no URL, fetching from API...');
      toast.loading('Loading song...', { id: 'loading-song' });
      
      try {
        // Fetch song details from backend
        const response = await fetch(`/api/jiosaavn/songs/${song.id}`);
        const data = await response.json();
        
        console.log('📥 API Response:', data);
        
        if (data.success && data.data && data.data.downloadUrl) {
          // Update the song with the download URL
          const downloadUrl = data.data.downloadUrl.find((d: any) => d.quality === '320kbps') ||
            data.data.downloadUrl.find((d: any) => d.quality === '160kbps') ||
            data.data.downloadUrl.find((d: any) => d.quality === '96kbps') ||
            data.data.downloadUrl[data.data.downloadUrl.length - 1];
          
          song.url = downloadUrl?.url || downloadUrl?.link || '';
          console.log('✅ Got URL:', song.url);
          
          // Also update the image if available
          if (data.data.image && Array.isArray(data.data.image)) {
            const image = data.data.image.find((i: any) => i.quality === '500x500') ||
              data.data.image.find((i: any) => i.quality === '150x150') ||
              data.data.image[data.data.image.length - 1];
            song.image = image?.url || image?.link || song.image;
            console.log('✅ Got Image:', song.image);
          }
          
          // Also update the song in the results array
          indianSearchResults[index] = { ...song };
          
          toast.dismiss('loading-song');
        } else {
          console.error('❌ No download URL in response');
          toast.dismiss('loading-song');
          toast.error('This song is not available for playback');
          return;
        }
      } catch (error) {
        console.error('❌ Error fetching song details:', error);
        toast.dismiss('loading-song');
        toast.error('Failed to load song');
        return;
      }
    }

    if (!song.url) {
      console.error('❌ Song still has no URL after fetch');
      toast.error('This song is not available for playback');
      return;
    }

    console.log('✅ Song has URL:', song.url);

    const playerStore = usePlayerStore.getState();
    
    // Mark user interaction FIRST
    playerStore.setUserInteracted();
    console.log('✅ User interaction set');
    
    // Convert all songs to app format (only songs with URLs)
    const allSongs = indianSearchResults
      .filter((s: any) => s.url)
      .map((s: any) => useMusicStore.getState().convertIndianSongToAppSong(s));
    
    console.log('✅ Converted songs:', allSongs.length);
    
    // If no songs have URLs yet, just play this one
    if (allSongs.length === 0) {
      const convertedSong = useMusicStore.getState().convertIndianSongToAppSong(song);
      playerStore.playAlbum([convertedSong], 0);
    } else {
      // Find the index of the current song in the filtered array
      const filteredIndex = indianSearchResults
        .filter((s: any) => s.url)
        .findIndex((s: any) => s.id === song.id);
      
      playerStore.playAlbum(allSongs, filteredIndex >= 0 ? filteredIndex : 0);
    }
    
    console.log('✅ playAlbum called');
    
    // Start playback immediately
    playerStore.setIsPlaying(true);
    console.log('✅ setIsPlaying(true) called');
    
    toast.success(`Now playing: ${song.title}`);
  };

  // Play all songs
  const playAll = () => {
    if (indianSearchResults.length === 0) {
      toast.error('No songs to play');
      return;
    }

    const playerStore = usePlayerStore.getState();
    playerStore.setUserInteracted();
    
    const allSongs = indianSearchResults
      .filter((s: any) => s.url)
      .map((s: any) => useMusicStore.getState().convertIndianSongToAppSong(s));
    
    playerStore.playAlbum(allSongs, 0);
    playerStore.setIsPlaying(true);
    
    toast.success(`Playing ${allSongs.length} songs`);
  };

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
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="search"
              placeholder="What do you want to listen to?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-14 pl-12 pr-12 bg-[#242424] border-0 text-white placeholder:text-gray-400 text-base rounded-full focus:ring-2 focus:ring-[#1db954]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <XCircle size={20} />
              </button>
            )}
          </div>
        </form>

        {/* Loading State */}
        {(isSearching || isIndianMusicLoading) && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-600 border-t-[#1db954]"></div>
            <p className="mt-4 text-gray-400">Searching...</p>
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

                {/* Song List */}
                <div className="space-y-2">
                  {indianSearchResults.map((song: any, index: number) => (
                    <div
                      key={song.id || index}
                      onClick={() => playSong(song, index)}
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-[#282828] transition-colors cursor-pointer group"
                    >
                      {/* Index/Play Button */}
                      <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                        <span className="text-gray-400 group-hover:hidden">
                          {index + 1}
                        </span>
                        <div className="hidden group-hover:flex w-10 h-10 bg-[#1db954] rounded-full items-center justify-center">
                          <Play className="h-5 w-5 text-black ml-0.5" />
                        </div>
                      </div>

                      {/* Song Image */}
                      <div className="w-14 h-14 rounded-md overflow-hidden bg-[#282828] flex-shrink-0">
                        <img
                          src={song.image || '/images/default-album.png'}
                          alt={song.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/default-album.png';
                          }}
                        />
                      </div>

                      {/* Song Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate">
                          {song.title}
                        </h3>
                        <p className="text-sm text-gray-400 truncate">
                          {resolveArtist(song)}
                        </p>
                      </div>

                      {/* Duration */}
                      {song.duration && (
                        <div className="text-sm text-gray-400 flex-shrink-0">
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
