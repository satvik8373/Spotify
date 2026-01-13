import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Music, Filter, TrendingUp, Sparkles } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { JioSaavnPlaylistCard } from '@/components/jiosaavn/JioSaavnPlaylistCard';
import { JioSaavnPlaylist, jioSaavnService, PLAYLIST_CATEGORIES, PlaylistCategory } from '@/services/jioSaavnService';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';

const JioSaavnPlaylistsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [playlists, setPlaylists] = useState<JioSaavnPlaylist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PlaylistCategory>(
    PLAYLIST_CATEGORIES.find(cat => cat.id === location.state?.category) || PLAYLIST_CATEGORIES[0]
  );
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [detectedCategory, setDetectedCategory] = useState<PlaylistCategory | null>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      fetchCategoryPlaylists();
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const debounceTimer = setTimeout(() => {
        performSmartSearch();
      }, 500);

      return () => clearTimeout(debounceTimer);
    } else {
      fetchCategoryPlaylists();
      setSearchSuggestions([]);
      setDetectedCategory(null);
    }
  }, [searchQuery]);

  const fetchCategoryPlaylists = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await jioSaavnService.getPlaylistsByCategory(selectedCategory.id, 50);
      setPlaylists(data);
    } catch (err) {
      console.error('Error fetching JioSaavn playlists:', err);
      setError('Failed to load playlists');
      toast.error('Failed to load playlists');
    } finally {
      setIsLoading(false);
    }
  };

  const performSmartSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const result = await jioSaavnService.smartSearch(searchQuery, 50);
      setPlaylists(result.playlists);
      setDetectedCategory(result.detectedCategory || null);
      setSearchSuggestions(result.suggestions);
      
      if (result.detectedCategory) {
        toast.success(`Found ${result.playlists.length} ${result.detectedCategory.name} playlists`);
      }
    } catch (err) {
      console.error('Error searching JioSaavn playlists:', err);
      setError('Failed to search playlists');
      toast.error('Failed to search playlists');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlaylistClick = (playlist: JioSaavnPlaylist) => {
    navigate(`/jiosaavn/playlist/${playlist.id}`, {
      state: { playlist }
    });
  };

  const handlePlayPlaylist = async (playlist: JioSaavnPlaylist) => {
    try {
      toast.loading('Loading playlist...', { id: 'jiosaavn-play' });
      
      const playlistDetails = await jioSaavnService.getPlaylistDetails(playlist.id);
      
      if (playlistDetails.songs && playlistDetails.songs.length > 0) {
        toast.success(`Playing "${playlist.name}"`, { id: 'jiosaavn-play' });
        
        navigate(`/jiosaavn/playlist/${playlist.id}`, {
          state: { playlist, autoPlay: true }
        });
      } else {
        toast.error('No songs found in playlist', { id: 'jiosaavn-play' });
      }
    } catch (error) {
      console.error('Error playing JioSaavn playlist:', error);
      toast.error('Failed to play playlist', { id: 'jiosaavn-play' });
    }
  };

  const handleCategoryChange = (category: PlaylistCategory) => {
    setSelectedCategory(category);
    setSearchQuery(''); // Clear search when changing category
    setDetectedCategory(null);
    setSearchSuggestions([]);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
  };

  const getPageTitle = () => {
    if (searchQuery) {
      if (detectedCategory) {
        return `${detectedCategory.name} Playlists`;
      }
      return `Search Results for "${searchQuery}"`;
    }
    return `${selectedCategory.name} Playlists`;
  };

  const getPageSubtitle = () => {
    if (searchQuery && detectedCategory) {
      return detectedCategory.description;
    }
    if (searchQuery) {
      return `${playlists.length} playlists found`;
    }
    return selectedCategory.description;
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white">
      <ScrollArea className="h-screen">
        <div className="pb-32 md:pb-24">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-[#121212]/95 backdrop-blur-sm border-b border-white/10">
            <div className="flex items-center gap-4 p-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="rounded-full hover:bg-white/10"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              
              <div className="flex-1">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Music className="w-6 h-6 text-orange-500" />
                  {getPageTitle()}
                </h1>
                <p className="text-sm text-white/60 mt-1">{getPageSubtitle()}</p>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="px-4 pb-4 space-y-3">
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/60" />
                  <Input
                    placeholder="Search JioSaavn playlists..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/15 focus:border-white/30"
                  />
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="bg-white/10 border-white/20 text-white hover:bg-white/15 flex items-center gap-2"
                      style={{ borderColor: selectedCategory.color + '40', color: selectedCategory.color }}
                    >
                      <span className="text-lg">{selectedCategory.icon}</span>
                      <Filter className="w-4 h-4" />
                      {selectedCategory.name}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Browse Categories
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    
                    {/* High Priority Categories */}
                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                      TRENDING
                    </DropdownMenuLabel>
                    {PLAYLIST_CATEGORIES.filter(cat => cat.priority >= 7).map((category) => (
                      <DropdownMenuItem
                        key={category.id}
                        onClick={() => handleCategoryChange(category)}
                        className={cn(
                          "flex items-center gap-3 cursor-pointer",
                          selectedCategory.id === category.id && "bg-orange-500/20 text-orange-400"
                        )}
                      >
                        <span className="text-lg">{category.icon}</span>
                        <div className="flex-1">
                          <div className="font-medium">{category.name}</div>
                          <div className="text-xs text-muted-foreground">{category.description}</div>
                        </div>
                      </DropdownMenuItem>
                    ))}
                    
                    <DropdownMenuSeparator />
                    
                    {/* Other Categories */}
                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                      MORE CATEGORIES
                    </DropdownMenuLabel>
                    {PLAYLIST_CATEGORIES.filter(cat => cat.priority < 7).map((category) => (
                      <DropdownMenuItem
                        key={category.id}
                        onClick={() => handleCategoryChange(category)}
                        className={cn(
                          "flex items-center gap-3 cursor-pointer",
                          selectedCategory.id === category.id && "bg-orange-500/20 text-orange-400"
                        )}
                      >
                        <span className="text-lg">{category.icon}</span>
                        <div className="flex-1">
                          <div className="font-medium">{category.name}</div>
                          <div className="text-xs text-muted-foreground">{category.description}</div>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Search Suggestions */}
              {searchSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs text-white/60">Suggestions:</span>
                  {searchSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="px-3 py-1 text-xs bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

              {/* Category Detection Banner */}
              {detectedCategory && (
                <div 
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
                  style={{ backgroundColor: detectedCategory.color + '20', borderColor: detectedCategory.color + '40' }}
                >
                  <TrendingUp className="w-4 h-4" style={{ color: detectedCategory.color }} />
                  <span>Smart search detected: <strong>{detectedCategory.name}</strong> category</span>
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <div 
                      className="w-full aspect-square rounded skeleton-pulse" 
                      style={{animationDelay: `${i * 0.1}s`}}
                    ></div>
                    <div 
                      className="h-4 rounded skeleton-pulse" 
                      style={{animationDelay: `${i * 0.1 + 0.1}s`}}
                    ></div>
                    <div 
                      className="h-3 rounded skeleton-pulse w-3/4" 
                      style={{animationDelay: `${i * 0.1 + 0.2}s`}}
                    ></div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="bg-red-500/10 border border-red-600 text-red-200 text-sm rounded-md px-4 py-3 mb-6">
                {error}
              </div>
            ) : playlists.length > 0 ? (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-white/60 text-sm">
                    {playlists.length} playlists found
                  </div>
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSearchQuery('')}
                      className="text-white/60 hover:text-white"
                    >
                      Clear search
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {playlists.map((playlist) => (
                    <JioSaavnPlaylistCard
                      key={playlist.id}
                      playlist={playlist}
                      onClick={handlePlaylistClick}
                      onPlay={handlePlayPlaylist}
                      showDescription={true}
                      className="p-3"
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="text-6xl mb-4">{selectedCategory.icon}</div>
                <h3 className="text-xl font-semibold mb-2">No playlists found</h3>
                <p className="text-white/60 mb-4">
                  {searchQuery 
                    ? `No results for "${searchQuery}"`
                    : `No ${selectedCategory.name.toLowerCase()} playlists available`
                  }
                </p>
                {searchQuery && (
                  <Button
                    variant="outline"
                    onClick={() => setSearchQuery('')}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/15"
                  >
                    Browse {selectedCategory.name} playlists
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default JioSaavnPlaylistsPage;