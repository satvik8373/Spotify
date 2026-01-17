import React, { useEffect, useState } from 'react';
import { useMusicStore } from '@/stores/useMusicStore';
import { usePlaylistStore } from '@/stores/usePlaylistStore';
import { Playlist } from '@/types';
import { Music, ListMusic, Clock } from 'lucide-react';

interface SearchSuggestionsProps {
  isVisible: boolean;
  query: string;
  onSelectSong: (songName: string) => void;
  onSelectPlaylist?: (playlistId: string) => void;
}

// Define a simple type for search items
type SearchItem = {
  id?: string;
  title: string;
  artist?: string;
  image?: string;
};

const SearchSuggestions: React.FC<SearchSuggestionsProps> = ({
  isVisible,
  query,
  onSelectSong,
  onSelectPlaylist,
}) => {
  const { indianSearchResults } = useMusicStore();
  const { searchPlaylists, searchResults: playlistResults, isSearching } = usePlaylistStore();
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('recentSearches');
      if (saved) {
        setRecentSearches(JSON.parse(saved).slice(0, 5));
      }
    } catch (error) {
      console.error('Error loading recent searches:', error);
      setRecentSearches(['Latest hits', 'Top songs', 'Popular tracks']);
    }
  }, []);

  // Search for playlists when the query changes
  useEffect(() => {
    if (query.trim().length >= 2) {
      searchPlaylists(query);
    }
  }, [query, searchPlaylists]);

  // Save a search term to recent searches
  const saveSearchTerm = (term: string) => {
    try {
      const saved = localStorage.getItem('recentSearches');
      let searches = saved ? JSON.parse(saved) : [];
      
      // Remove if it already exists to avoid duplicates
      searches = searches.filter((s: string) => s !== term);
      
      // Add to beginning
      searches.unshift(term);
      
      // Limit to 5 recent searches
      searches = searches.slice(0, 5);
      
      localStorage.setItem('recentSearches', JSON.stringify(searches));
      setRecentSearches(searches);
    } catch (error) {
      console.error('Error saving search term:', error);
    }
  };

  if (!isVisible) return null;

  // If query is empty, show recent searches
  if (!query.trim()) {
    if (recentSearches.length === 0) return null;

    return (
      <div className="absolute top-full left-0 right-0 mt-2 bg-[#2a2a2a] rounded-lg shadow-2xl overflow-hidden z-[100] max-h-[400px] overflow-y-auto">
        <div className="p-3">
          <h3 className="text-sm font-semibold text-white mb-3 px-2">Recent searches</h3>
          <div className="space-y-0">
            {recentSearches.map((search: string, index: number) => (
              <div
                key={`${search}-${index}`}
                className="flex items-center px-3 py-2.5 hover:bg-[#3a3a3a] rounded-md cursor-pointer transition-colors"
                onClick={() => {
                  onSelectSong(search);
                  saveSearchTerm(search);
                }}
              >
                <Clock className="h-4 w-4 mr-3 text-[#b3b3b3] flex-shrink-0" />
                <span className="text-sm text-white truncate">{search}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // If query exists but no specific results to show yet
  if (query.length < 2) {
    return (
      <div className="absolute top-full left-0 right-0 mt-2 bg-[#2a2a2a] rounded-lg shadow-2xl p-4 z-[100]">
        <p className="text-[#b3b3b3] text-sm text-center">
          Type at least 2 characters to search
        </p>
      </div>
    );
  }

  // Loading state
  if (isSearching && playlistResults.length === 0 && indianSearchResults.length === 0) {
    return (
      <div className="absolute top-full left-0 right-0 mt-2 bg-[#2a2a2a] rounded-lg shadow-2xl p-4 z-[100]">
        <p className="text-[#b3b3b3] text-sm text-center">Searching...</p>
      </div>
    );
  }

  // No results state
  if (!isSearching && playlistResults.length === 0 && indianSearchResults.length === 0) {
    return (
      <div className="absolute top-full left-0 right-0 mt-2 bg-[#2a2a2a] rounded-lg shadow-2xl p-4 z-[100]">
        <p className="text-[#b3b3b3] text-sm text-center">No results found</p>
      </div>
    );
  }

  // Show search results with songs and playlists
  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-[#2a2a2a] rounded-lg shadow-2xl overflow-hidden z-[100] max-h-[400px] overflow-y-auto">
      {/* Songs section */}
      {indianSearchResults.length > 0 && (
        <div className="p-3">
          <h3 className="text-sm font-semibold text-white mb-3 px-2">Songs</h3>
          <div className="space-y-0">
            {indianSearchResults.slice(0, 3).map((song: SearchItem, index: number) => (
              <div
                key={`${song.id || index}`}
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-[#3a3a3a] rounded-md cursor-pointer transition-colors"
                onClick={() => {
                  onSelectSong(song.title);
                  saveSearchTerm(song.title);
                }}
              >
                <div className="h-10 w-10 rounded overflow-hidden flex-shrink-0">
                  <img
                    src={song.image || '/images/default-album.png'}
                    alt={song.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="overflow-hidden flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-white">{song.title}</p>
                  <p className="text-xs text-[#b3b3b3] truncate">{song.artist || 'Unknown Artist'}</p>
                </div>
                <Music className="h-4 w-4 text-[#b3b3b3] flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Playlists section */}
      {playlistResults.length > 0 && onSelectPlaylist && (
        <div className="p-3 border-t border-[#3a3a3a]">
          <h3 className="text-sm font-semibold text-white mb-3 px-2">Playlists</h3>
          <div className="space-y-0">
            {playlistResults.slice(0, 3).map((playlist: Playlist, index: number) => (
              <div
                key={`playlist-${playlist._id || index}`}
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-[#3a3a3a] rounded-md cursor-pointer transition-colors"
                onClick={() => {
                  onSelectPlaylist(playlist._id);
                  saveSearchTerm(playlist.name);
                }}
              >
                <div className="h-10 w-10 rounded overflow-hidden flex-shrink-0">
                  <img
                    src={playlist.imageUrl || '/images/default-playlist.jpg'}
                    alt={playlist.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="overflow-hidden flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-white">{playlist.name}</p>
                  <p className="text-xs text-[#b3b3b3] truncate">
                    {playlist.songs.length} songs • {playlist.createdBy?.fullName || 'Unknown User'}
                  </p>
                </div>
                <ListMusic className="h-4 w-4 text-[#b3b3b3] flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View all results link */}
      {(indianSearchResults.length > 3 || playlistResults.length > 3) && (
        <div className="p-3 border-t border-[#3a3a3a]">
          <div 
            className="px-3 py-2.5 hover:bg-[#3a3a3a] rounded-md cursor-pointer text-center text-sm text-[#b3b3b3] hover:text-white transition-colors"
            onClick={() => {
              onSelectSong(query);
              saveSearchTerm(query);
            }}
          >
            See all results for "{query}"
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchSuggestions;
