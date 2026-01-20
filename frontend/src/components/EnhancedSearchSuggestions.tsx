import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useMusicStore } from '@/stores/useMusicStore';
import { usePlaylistStore } from '@/stores/usePlaylistStore';
import { Playlist } from '@/types';
import { Music, ListMusic, Clock, TrendingUp, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolveArtist } from '@/lib/resolveArtist';

interface SearchSuggestionsProps {
  isVisible: boolean;
  query: string;
  onSelectSong: (song: any) => void; // Changed to accept song object instead of string
  onSelectPlaylist?: (playlistId: string) => void;
  onClose?: () => void;
  className?: string;
  onTouchStart?: () => void;
  onTouchEnd?: () => void;
}

// Enhanced search item types
type SearchSuggestion = {
  id: string;
  type: 'song' | 'playlist' | 'artist' | 'recent' | 'trending';
  title: string;
  subtitle?: string;
  image?: string;
  relevanceScore?: number;
  data?: any;
};

// Trending/Popular search terms with better Indian music suggestions
const TRENDING_SEARCHES = [
  'saiyaara',
  'tum hi ho',
  'kesariya',
  'raataan lambiyan',
  'mann meri jaan',
  'apna bana le',
  'kahani suno',
  'dil diyan gallan',
  'tera ban jaunga',
  'bekhayali',
  've maahi',
  'ishq wala love',
  'gerua',
  'hawayein',
  'perfect',
  'shape of you',
  'blinding lights',
  'stay',
  'as it was',
  'heat waves'
];

const EnhancedSearchSuggestions: React.FC<SearchSuggestionsProps> = ({
  isVisible,
  query,
  onSelectSong,
  onSelectPlaylist,
  onClose,
  className,
  onTouchStart,
  onTouchEnd
}) => {
  const { indianSearchResults, isIndianMusicLoading } = useMusicStore();
  const { searchPlaylists, searchResults: playlistResults, isSearching } = usePlaylistStore();
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('recentSearches');
      if (saved) {
        const parsed = JSON.parse(saved);
        setRecentSearches(Array.isArray(parsed) ? parsed.slice(0, 8) : []);
      }
    } catch (error) {
      console.error('Error loading recent searches:', error);
      setRecentSearches([]);
    }
  }, []);

  // Enhanced search with debouncing and better results
  useEffect(() => {
    if (query.trim().length >= 2) {
      const timeoutId = setTimeout(() => {
        searchPlaylists(query);
      }, 300); // Debounce search requests

      return () => clearTimeout(timeoutId);
    }
  }, [query, searchPlaylists]);

  // Save search term with better deduplication
  const saveSearchTerm = useCallback((term: string) => {
    if (!term.trim()) return;

    try {
      const normalizedTerm = term.trim().toLowerCase();
      const saved = localStorage.getItem('recentSearches');
      let searches = saved ? JSON.parse(saved) : [];
      
      // Remove existing entries (case-insensitive)
      searches = searches.filter((s: string) => s.toLowerCase() !== normalizedTerm);
      
      // Add to beginning with original case
      searches.unshift(term.trim());
      
      // Limit to 8 recent searches
      searches = searches.slice(0, 8);
      
      localStorage.setItem('recentSearches', JSON.stringify(searches));
      setRecentSearches(searches);
    } catch (error) {
      console.error('Error saving search term:', error);
    }
  }, []);

  // Enhanced search suggestions with better scoring
  const searchSuggestions = useMemo((): SearchSuggestion[] => {
    const suggestions: SearchSuggestion[] = [];
    const queryLower = query.toLowerCase().trim();
    const queryTokens = queryLower.split(/\s+/).filter(Boolean);

    // Helper function to calculate relevance score
    const calculateRelevance = (text: string, type: string): number => {
      const textLower = text.toLowerCase();
      let score = 0;

      // Exact match gets highest score
      if (textLower === queryLower) score += 100;
      
      // Starts with query gets high score
      if (textLower.startsWith(queryLower)) score += 80;
      
      // Contains all query tokens
      const containsAllTokens = queryTokens.every(token => textLower.includes(token));
      if (containsAllTokens) score += 60;
      
      // Contains some query tokens
      const matchingTokens = queryTokens.filter(token => textLower.includes(token)).length;
      score += (matchingTokens / queryTokens.length) * 40;
      
      // Type-based scoring
      if (type === 'song') score += 10;
      if (type === 'playlist') score += 5;
      
      return score;
    };

    // Add song suggestions with enhanced scoring
    if (indianSearchResults && indianSearchResults.length > 0) {
      indianSearchResults
        .slice(0, 6)
        .forEach((song: any, index) => {
          const title = song.title || song.name || '';
          const artist = resolveArtist(song);
          const relevanceScore = calculateRelevance(`${title} ${artist}`, 'song');
          
          suggestions.push({
            id: `song-${song.id || song._id || index}`,
            type: 'song',
            title,
            subtitle: artist,
            image: song.image,
            relevanceScore,
            data: song
          });
        });
    }

    // Add playlist suggestions
    if (playlistResults && playlistResults.length > 0) {
      playlistResults
        .slice(0, 4)
        .forEach((playlist: Playlist, index) => {
          const relevanceScore = calculateRelevance(playlist.name, 'playlist');
          
          suggestions.push({
            id: `playlist-${playlist._id || index}`,
            type: 'playlist',
            title: playlist.name,
            subtitle: `${playlist.songs.length} songs • ${playlist.createdBy?.fullName || 'Unknown'}`,
            image: playlist.imageUrl,
            relevanceScore,
            data: playlist
          });
        });
    }

    // Sort by relevance score
    return suggestions.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  }, [query, indianSearchResults, playlistResults]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible) return;

      const totalItems = query.trim() 
        ? searchSuggestions.length 
        : recentSearches.length + TRENDING_SEARCHES.length;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % totalItems);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev <= 0 ? totalItems - 1 : prev - 1);
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0) {
            if (query.trim()) {
              const suggestion = searchSuggestions[selectedIndex];
              if (suggestion) {
                if (suggestion.type === 'song') {
                  onSelectSong(suggestion.data); // Pass the actual song object
                } else if (suggestion.type === 'playlist' && onSelectPlaylist) {
                  onSelectPlaylist(suggestion.data._id);
                }
                saveSearchTerm(suggestion.title);
              }
            } else {
              const allItems = [...recentSearches, ...TRENDING_SEARCHES];
              const selectedItem = allItems[selectedIndex];
              if (selectedItem) {
                // For recent/trending searches, we need to search for the song
                // This will trigger a search instead of playing directly
                onSelectSong(selectedItem);
                saveSearchTerm(selectedItem);
              }
            }
          }
          break;
        case 'Escape':
          onClose?.();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, selectedIndex, searchSuggestions, recentSearches, query, onSelectSong, onSelectPlaylist, onClose, saveSearchTerm]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(-1);
  }, [query]);

  if (!isVisible) return null;

  // Empty state with recent searches and trending
  if (!query.trim()) {
    const hasRecentSearches = recentSearches.length > 0;
    const showTrending = TRENDING_SEARCHES.length > 0;

    if (!hasRecentSearches && !showTrending) return null;

    return (
      <div 
        className={cn(
          "absolute top-full left-0 right-0 mt-2 bg-[#282828] rounded-lg shadow-2xl overflow-hidden z-[100] max-h-[500px] overflow-y-auto border border-[#3e3e3e]",
          className
        )}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Recent searches */}
        {hasRecentSearches && (
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-[#b3b3b3]" />
              <h3 className="text-sm font-semibold text-white">Recent searches</h3>
            </div>
            <div className="space-y-1">
              {recentSearches.map((search: string, index: number) => (
                <div
                  key={`recent-${index}`}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-all duration-200",
                    selectedIndex === index 
                      ? "bg-[#1db954] text-black" 
                      : "hover:bg-[#3e3e3e] text-white"
                  )}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    onSelectSong(search);
                    saveSearchTerm(search);
                  }}
                  onClick={() => {
                    onSelectSong(search);
                    saveSearchTerm(search);
                  }}
                >
                  <Search className="h-4 w-4 flex-shrink-0 opacity-70" />
                  <span className="text-sm truncate">{search}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trending searches */}
        {showTrending && (
          <div className={cn("p-4", hasRecentSearches && "border-t border-[#3e3e3e]")}>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-[#b3b3b3]" />
              <h3 className="text-sm font-semibold text-white">Trending searches</h3>
            </div>
            <div className="space-y-1">
              {TRENDING_SEARCHES.slice(0, 6).map((search: string, index: number) => {
                const adjustedIndex = hasRecentSearches ? recentSearches.length + index : index;
                return (
                  <div
                    key={`trending-${index}`}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-all duration-200",
                      selectedIndex === adjustedIndex 
                        ? "bg-[#1db954] text-black" 
                        : "hover:bg-[#3e3e3e] text-white"
                    )}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      onSelectSong(search);
                      saveSearchTerm(search);
                    }}
                    onClick={() => {
                      onSelectSong(search);
                      saveSearchTerm(search);
                    }}
                  >
                    <TrendingUp className="h-4 w-4 flex-shrink-0 opacity-70" />
                    <span className="text-sm truncate">{search}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Loading state
  if ((isIndianMusicLoading || isSearching) && searchSuggestions.length === 0) {
    return (
      <div className={cn(
        "absolute top-full left-0 right-0 mt-2 bg-[#282828] rounded-lg shadow-2xl p-6 z-[100] border border-[#3e3e3e]",
        className
      )}>
        <div className="flex items-center justify-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#1db954] border-t-transparent"></div>
          <p className="text-[#b3b3b3] text-sm">Searching for "{query}"...</p>
        </div>
      </div>
    );
  }

  // No results state
  if (!isIndianMusicLoading && !isSearching && searchSuggestions.length === 0) {
    return (
      <div className={cn(
        "absolute top-full left-0 right-0 mt-2 bg-[#282828] rounded-lg shadow-2xl p-6 z-[100] border border-[#3e3e3e]",
        className
      )}>
        <div className="text-center">
          <Search className="h-8 w-8 text-[#b3b3b3] mx-auto mb-3 opacity-50" />
          <p className="text-white font-medium mb-1">No results found</p>
          <p className="text-[#b3b3b3] text-sm">Try different keywords or check your spelling</p>
        </div>
      </div>
    );
  }

  // Show enhanced search results
  return (
    <div 
      className={cn(
        "absolute top-full left-0 right-0 mt-2 bg-[#282828] rounded-lg shadow-2xl overflow-hidden z-[100] max-h-[500px] overflow-y-auto border border-[#3e3e3e]",
        className
      )}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Search results grouped by type */}
      <div className="p-4">
        {/* Top result */}
        {searchSuggestions.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#1db954]" />
              Top result
            </h3>
            <div
              className={cn(
                "flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-all duration-200 border border-transparent",
                selectedIndex === 0 
                  ? "bg-[#1db954] text-black border-[#1db954]" 
                  : "bg-[#1a1a1a] hover:bg-[#3e3e3e] text-white"
              )}
              onTouchStart={(e) => {
                e.preventDefault();
                const suggestion = searchSuggestions[0];
                if (suggestion.type === 'song') {
                  onSelectSong(suggestion.data);
                } else if (suggestion.type === 'playlist' && onSelectPlaylist) {
                  onSelectPlaylist(suggestion.data._id);
                }
                saveSearchTerm(suggestion.title);
              }}
              onClick={() => {
                const suggestion = searchSuggestions[0];
                if (suggestion.type === 'song') {
                  onSelectSong(suggestion.data); // Pass the actual song object
                } else if (suggestion.type === 'playlist' && onSelectPlaylist) {
                  onSelectPlaylist(suggestion.data._id);
                }
                saveSearchTerm(suggestion.title);
              }}
            >
              <div className="h-12 w-12 rounded-lg overflow-hidden flex-shrink-0 bg-[#3e3e3e]">
                <img
                  src={searchSuggestions[0].image || '/images/default-album.png'}
                  alt={searchSuggestions[0].title}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/default-album.png';
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate text-lg">{searchSuggestions[0].title}</p>
                <p className={cn(
                  "text-sm truncate",
                  selectedIndex === 0 ? "text-black/70" : "text-[#b3b3b3]"
                )}>
                  {searchSuggestions[0].subtitle}
                </p>
              </div>
              <div className={cn(
                "flex-shrink-0",
                selectedIndex === 0 ? "text-black" : "text-[#b3b3b3]"
              )}>
                {searchSuggestions[0].type === 'song' ? (
                  <Music className="h-5 w-5" />
                ) : (
                  <ListMusic className="h-5 w-5" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Other results */}
        {searchSuggestions.length > 1 && (
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">More results</h3>
            <div className="space-y-1">
              {searchSuggestions.slice(1, 8).map((suggestion, index) => {
                const adjustedIndex = index + 1;
                return (
                  <div
                    key={suggestion.id}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-all duration-200",
                      selectedIndex === adjustedIndex 
                        ? "bg-[#1db954] text-black" 
                        : "hover:bg-[#3e3e3e] text-white"
                    )}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      if (suggestion.type === 'song') {
                        onSelectSong(suggestion.data);
                      } else if (suggestion.type === 'playlist' && onSelectPlaylist) {
                        onSelectPlaylist(suggestion.data._id);
                      }
                      saveSearchTerm(suggestion.title);
                    }}
                    onClick={() => {
                      if (suggestion.type === 'song') {
                        onSelectSong(suggestion.data); // Pass the actual song object
                      } else if (suggestion.type === 'playlist' && onSelectPlaylist) {
                        onSelectPlaylist(suggestion.data._id);
                      }
                      saveSearchTerm(suggestion.title);
                    }}
                  >
                    <div className="h-10 w-10 rounded overflow-hidden flex-shrink-0 bg-[#3e3e3e]">
                      <img
                        src={suggestion.image || '/images/default-album.png'}
                        alt={suggestion.title}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/images/default-album.png';
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{suggestion.title}</p>
                      <p className={cn(
                        "text-xs truncate",
                        selectedIndex === adjustedIndex ? "text-black/70" : "text-[#b3b3b3]"
                      )}>
                        {suggestion.subtitle}
                      </p>
                    </div>
                    <div className={cn(
                      "flex-shrink-0",
                      selectedIndex === adjustedIndex ? "text-black" : "text-[#b3b3b3]"
                    )}>
                      {suggestion.type === 'song' ? (
                        <Music className="h-4 w-4" />
                      ) : (
                        <ListMusic className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* View all results */}
        {searchSuggestions.length > 8 && (
          <div className="mt-4 pt-3 border-t border-[#3e3e3e]">
            <div 
              className="px-3 py-2.5 hover:bg-[#3e3e3e] rounded-md cursor-pointer text-center text-sm text-[#b3b3b3] hover:text-white transition-colors"
              onTouchStart={(e) => {
                e.preventDefault();
                onSelectSong(query);
                saveSearchTerm(query);
              }}
              onClick={() => {
                onSelectSong(query); // This will trigger a search for all results
                saveSearchTerm(query);
              }}
            >
              See all results for "{query}"
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedSearchSuggestions;