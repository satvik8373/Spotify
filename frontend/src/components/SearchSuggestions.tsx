import React from 'react';
import { useMusicStore } from '@/stores/useMusicStore';

interface SearchSuggestionsProps {
  isVisible: boolean;
  query: string;
  onSelectSong: (songName: string) => void;
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
}) => {
  const { indianSearchResults } = useMusicStore();

  // Mock recent searches - in a real app this would come from localStorage or state
  const recentSearches: string[] = React.useMemo(
    () => ['Latest hits', 'Top songs', 'Popular tracks'],
    []
  );

  if (!isVisible) return null;

  // If query is empty, show recent searches
  if (!query.trim()) {
    if (recentSearches.length === 0) return null;

    return (
      <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 rounded-md shadow-lg overflow-hidden z-20">
        <div className="p-2">
          <h3 className="text-xs font-semibold text-zinc-400 mb-2">Recent Searches</h3>
          <div className="space-y-1">
            {recentSearches.slice(0, 5).map((search: string, index: number) => (
              <div
                key={`${search}-${index}`}
                className="flex items-center p-2 hover:bg-zinc-700 rounded cursor-pointer"
                onClick={() => onSelectSong(search)}
              >
                <span className="text-sm truncate">{search}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // If query exists but no specific results to show yet
  if (query.length < 3 || !indianSearchResults || indianSearchResults.length === 0) {
    return (
      <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 rounded-md shadow-lg p-2 z-20">
        <p className="text-zinc-400 text-xs p-2">
          {query.length < 3 ? 'Type at least 3 characters to search' : 'No results found'}
        </p>
      </div>
    );
  }

  // Show search results
  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 rounded-md shadow-lg overflow-hidden z-20">
      <div className="p-2">
        <h3 className="text-xs font-semibold text-zinc-400 mb-2">Suggestions</h3>
        <div className="space-y-1">
          {indianSearchResults.slice(0, 5).map((song: SearchItem, index: number) => (
            <div
              key={`${song.id || index}`}
              className="flex items-center gap-2 p-2 hover:bg-zinc-700 rounded cursor-pointer"
              onClick={() => onSelectSong(song.title)}
            >
              <div className="h-8 w-8 rounded overflow-hidden flex-shrink-0">
                <img
                  src={song.image || '/images/default-album.png'}
                  alt={song.title}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium truncate">{song.title}</p>
                <p className="text-xs text-zinc-400 truncate">{song.artist || 'Unknown Artist'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SearchSuggestions;
