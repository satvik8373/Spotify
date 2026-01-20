import { useState, useEffect, useCallback, useMemo } from 'react';
import { enhancedSearchService, SearchResult, SearchFilters, SearchOptions } from '@/services/enhancedSearchService';
import { useMusicStore } from '@/stores/useMusicStore';
import { usePlaylistStore } from '@/stores/usePlaylistStore';

interface UseEnhancedSearchOptions {
  debounceMs?: number;
  minQueryLength?: number;
  maxResults?: number;
  enableCache?: boolean;
}

interface UseEnhancedSearchReturn {
  // Search state
  isSearching: boolean;
  searchResults: SearchResult[];
  hasResults: boolean;
  error: string | null;
  
  // Search functions
  search: (query: string, options?: SearchOptions) => Promise<void>;
  clearSearch: () => void;
  clearCache: () => void;
  
  // Suggestions
  suggestions: SearchResult[];
  getSuggestions: (query: string) => Promise<SearchResult[]>;
  
  // Recent searches
  recentSearches: string[];
  addRecentSearch: (query: string) => void;
  removeRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  
  // Analytics
  searchAnalytics: {
    totalSearches: number;
    cacheHitRate: number;
    averageResponseTime: number;
  };
}

const MAX_RECENT_SEARCHES = 10;
const DEFAULT_DEBOUNCE_MS = 300;
const DEFAULT_MIN_QUERY_LENGTH = 2;
const DEFAULT_MAX_RESULTS = 20;

export const useEnhancedSearch = (options: UseEnhancedSearchOptions = {}): UseEnhancedSearchReturn => {
  const {
    debounceMs = DEFAULT_DEBOUNCE_MS,
    minQueryLength = DEFAULT_MIN_QUERY_LENGTH,
    maxResults = DEFAULT_MAX_RESULTS,
    enableCache = true
  } = options;

  // State
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchAnalytics, setSearchAnalytics] = useState({
    totalSearches: 0,
    cacheHitRate: 0,
    averageResponseTime: 0
  });

  // Debounce timer
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('enhancedRecentSearches');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed.slice(0, MAX_RECENT_SEARCHES));
        }
      }
    } catch (error) {
      console.error('Error loading recent searches:', error);
      setRecentSearches([]);
    }
  }, []);

  // Save recent searches to localStorage
  const saveRecentSearches = useCallback((searches: string[]) => {
    try {
      localStorage.setItem('enhancedRecentSearches', JSON.stringify(searches));
    } catch (error) {
      console.error('Error saving recent searches:', error);
    }
  }, []);

  // Add recent search
  const addRecentSearch = useCallback((query: string) => {
    if (!query.trim()) return;

    const normalizedQuery = query.trim();
    setRecentSearches(prev => {
      const filtered = prev.filter(search => 
        search.toLowerCase() !== normalizedQuery.toLowerCase()
      );
      const updated = [normalizedQuery, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      saveRecentSearches(updated);
      return updated;
    });
  }, [saveRecentSearches]);

  // Remove recent search
  const removeRecentSearch = useCallback((query: string) => {
    setRecentSearches(prev => {
      const updated = prev.filter(search => search !== query);
      saveRecentSearches(updated);
      return updated;
    });
  }, [saveRecentSearches]);

  // Clear recent searches
  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    localStorage.removeItem('enhancedRecentSearches');
  }, []);

  // Main search function
  const search = useCallback(async (query: string, searchOptions: SearchOptions = {}) => {
    if (!query.trim() || query.length < minQueryLength) {
      setSearchResults([]);
      setError(null);
      return;
    }

    // Clear previous debounce timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Set up new debounce timer
    const timer = setTimeout(async () => {
      setIsSearching(true);
      setError(null);
      
      const startTime = Date.now();

      try {
        // Perform enhanced search
        const results = await enhancedSearchService.search(query, {
          limit: maxResults,
          ...searchOptions
        });

        setSearchResults(results);
        addRecentSearch(query);

        // Update analytics
        const responseTime = Date.now() - startTime;
        setSearchAnalytics(prev => ({
          totalSearches: prev.totalSearches + 1,
          cacheHitRate: enhancedSearchService.getSearchAnalytics().cacheHitRate,
          averageResponseTime: (prev.averageResponseTime + responseTime) / 2
        }));

      } catch (err) {
        console.error('Search failed:', err);
        setError(err instanceof Error ? err.message : 'Search failed');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, debounceMs);

    setDebounceTimer(timer);
  }, [debounceTimer, debounceMs, minQueryLength, maxResults, addRecentSearch]);

  // Get search suggestions
  const getSuggestions = useCallback(async (query: string): Promise<SearchResult[]> => {
    if (!query.trim() || query.length < minQueryLength) {
      setSuggestions([]);
      return [];
    }

    try {
      const results = await enhancedSearchService.getSearchSuggestions(query, 8);
      setSuggestions(results);
      return results;
    } catch (error) {
      console.error('Failed to get suggestions:', error);
      setSuggestions([]);
      return [];
    }
  }, [minQueryLength]);

  // Clear search results
  const clearSearch = useCallback(() => {
    setSearchResults([]);
    setSuggestions([]);
    setError(null);
    setIsSearching(false);
    
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      setDebounceTimer(null);
    }
  }, [debounceTimer]);

  // Clear search cache
  const clearCache = useCallback(() => {
    enhancedSearchService.clearCache();
  }, []);

  // Computed values
  const hasResults = useMemo(() => searchResults.length > 0, [searchResults]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  return {
    // Search state
    isSearching,
    searchResults,
    hasResults,
    error,
    
    // Search functions
    search,
    clearSearch,
    clearCache,
    
    // Suggestions
    suggestions,
    getSuggestions,
    
    // Recent searches
    recentSearches,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
    
    // Analytics
    searchAnalytics
  };
};

export default useEnhancedSearch;