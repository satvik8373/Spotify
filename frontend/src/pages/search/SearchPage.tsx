import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useMusicStore } from '@/stores/useMusicStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { usePlaylistStore } from '@/stores/usePlaylistStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Play,
  Search,
  XCircle,
  Instagram,
  Mic,
  ExternalLink,
  Music
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '../../contexts/AuthContext';
import { PlaylistCard } from '@/components/playlist/PlaylistCard';
import type { Playlist } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useMemo } from 'react';
import { resolveArtist } from '@/lib/resolveArtist';


// Maximum number of recent searches to store
const MAX_RECENT_SEARCHES = 8;

// Instagram handle
const INSTAGRAM_HANDLE = "@mavrix_official";
const INSTAGRAM_URL = "https://www.instagram.com/mavrix_official?igsh=MTZyYnVxMmdiYzBmeQ%3D%3D&utm_source=qr";
const INSTAGRAM_HANDLE_TRADING = "@mavrix.trading";
const INSTAGRAM_URL_TRADING = "https://www.instagram.com/mavrix.trading?igsh=bDIzdGJjazgyYzE3";

// Speech Recognition setup
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionEvent extends Event {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
        confidence: number;
      };
    };
  };
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((event: Event) => void) | null;
}

interface Window {
  SpeechRecognition?: new () => SpeechRecognition;
  webkitSpeechRecognition?: new () => SpeechRecognition;
}

const SearchPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const query = searchParams.get('q') || '';
  const songId = searchParams.get('songId') || '';

  const { searchIndianSongs, indianSearchResults } = useMusicStore();
  const { searchPlaylists, searchResults: playlistResults } = usePlaylistStore();
  const { isAuthenticated, user } = useAuth();
  const [isInitialLoad, setIsInitialLoad] = useState(false);

  // Enhanced search states
  const [isSearching, setIsSearching] = useState(false);
  const [hasRealTimeResults, setHasRealTimeResults] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Recent searches state
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Speech recognition states
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);

  // Check if speech recognition is supported
  useEffect(() => {
    const SpeechRecognition = (window as unknown as Window).SpeechRecognition ||
      (window as unknown as Window).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';

      setRecognition(recognitionInstance);
      setSpeechSupported(true);
    } else {
      setSpeechSupported(false);
    }

    return () => {
      if (recognition) {
        recognition.onresult = null;
        recognition.onend = null;
        recognition.onerror = null;
        if (isListening) {
          try {
            recognition.stop();
          } catch (e) {
            console.error('Error stopping speech recognition:', e);
          }
        }
      }
    };
  }, []);

  // Toggle speech recognition
  const toggleListening = useCallback(() => {
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
      return;
    }

    // Set up recognition event handlers
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
        setSearchQuery(transcript);
        setTimeout(() => {
          navigate(`/search?q=${encodeURIComponent(transcript.trim())}`);
        }, 500);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
      toast.error('Speech recognition error', { description: event.error });
    };

    // Start listening
    try {
      recognition.start();
      setIsListening(true);
      toast.info('Listening... Speak now');
    } catch (error) {
      console.error('Speech recognition error', error);
      toast.error('Could not start speech recognition');
      setIsListening(false);
    }
  }, [recognition, isListening, navigate]);

  // Listen for voice-search toggle from MobileNav header
  useEffect(() => {
    const handler = () => toggleListening();
    document.addEventListener('toggleVoiceSearch', handler);
    return () => document.removeEventListener('toggleVoiceSearch', handler);
  }, [toggleListening]);

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
  const handleRemoveRecentSearch = (searchToRemove: string, e: React.MouseEvent) => {
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

  // Enhanced search with better performance and more aggressive matching
  useEffect(() => {
    if (query) {
      setSearchQuery(query);
      saveRecentSearch(query);
      setIsSearching(true);

      // Create an array of promises for all search operations
      const searchPromises = [
        searchIndianSongs(query),
        searchPlaylists(query)
      ];

      // Enhanced query variations for better results
      const queryVariations = [
        query,
        // Basic spelling variations
        query.replace(/aa/g, 'a'), // saiyaara -> saiyara
        query.replace(/a/g, 'aa'),  // saiyara -> saiyaara
        query.replace(/y/g, 'i'),   // saiyara -> saiara
        query.replace(/i/g, 'y'),   // saiara -> saiyara
        // Common Hindi/Urdu variations
        query.replace(/hoto/g, 'hi ho'), // tum hoto -> tum hi ho
        query.replace(/ho to/g, 'hi ho'), // tum ho to -> tum hi ho
        query.replace(/ho toh/g, 'hi ho'), // tum ho toh -> tum hi ho
        query.replace(/tum hoto/g, 'tum hi ho'), // direct replacement
        query.replace(/tum ho to/g, 'tum hi ho'), // direct replacement
        query.replace(/tum ho toh/g, 'tum hi ho'), // direct replacement
        // Remove extra spaces and normalize
        query.replace(/\s+/g, ' ').trim(),
        // Try without common words
        query.replace(/\b(hai|he|hain|ka|ki|ke|ko|se|mein|main)\b/g, '').replace(/\s+/g, ' ').trim(),
        // Try individual words if multi-word query
        ...(query.includes(' ') ? query.split(' ').filter(word => word.length > 2) : [])
      ].filter((v, i, arr) => arr.indexOf(v) === i && v.length > 0); // Remove duplicates and empty strings

      // Search with variations if original query doesn't yield good results
      const searchWithVariations = async () => {
        try {
          await Promise.all(searchPromises);
          
          // If we have very few results, try variations
          const currentResults = useMusicStore.getState().indianSearchResults;
          if (currentResults.length < 5 && queryVariations.length > 1) {
            for (const variation of queryVariations.slice(1)) {
              if (variation !== query && variation.length > 1) {
                await searchIndianSongs(variation);
                const newResults = useMusicStore.getState().indianSearchResults;
                if (newResults.length > currentResults.length) {
                  console.log(`Found better results with variation: "${variation}"`);
                  break; // Found better results with variation
                }
              }
            }
          }
        } catch (error) {
          console.error('Search failed:', error);
        } finally {
          setIsInitialLoad(false);
          setIsSearching(false);
        }
      };

      searchWithVariations();
    } else {
      // Clear search results if no query
      useMusicStore.setState({ indianSearchResults: [] });
      usePlaylistStore.setState({ searchResults: [] });
      setIsInitialLoad(false);
      setIsSearching(false);
    }
  }, [query, searchIndianSongs, searchPlaylists]);

  // Handle auto-playing specific song when songId is provided
  useEffect(() => {
    if (songId && indianSearchResults.length > 0) {
      const targetSong = indianSearchResults.find((s: any) =>
        s._id === songId || (s as any).id === songId
      );

      if (targetSong) {
        // Batch state updates to reduce re-renders
        usePlayerStore.setState({
          currentSong: targetSong as any,
          hasUserInteracted: true,
          isPlaying: true
        });

        // Show success message with slight delay to avoid blocking UI
        setTimeout(() => {
          toast.success(`Now playing: ${targetSong.title}`);
        }, 100);
      }
    }
  }, [songId, indianSearchResults]);

  // Compute sorted results with improved fuzzy matching and spelling suggestions
  const sortedIndianResults = useMemo(() => {
    if (!indianSearchResults || indianSearchResults.length === 0) return [] as any[];
    
    // Use either URL query or current search input
    const currentQuery = query || searchQuery;
    const qRaw = currentQuery.trim();
    const q = qRaw.toLowerCase();
    const qTokens = q.split(/\s+/).filter(Boolean);

    const penaltyWords = ['unknown', 'various', 'tribute', 'cover', 'karaoke', 'hits', 'best of', 'playlist', 'compilation'];
    const remixWords = ['remix', 'sped up', 'slowed', 'reverb', 'mashup'];

    // Enhanced spelling variations and phonetic matches
    const spellingSuggestions: { [key: string]: string[] } = {
      'saiyaara': ['saiyara', 'saiyaara', 'saiyara', 'sayara', 'sayaara', 'saiara', 'saiyara'],
      'saiyara': ['saiyaara', 'saiyara', 'sayara', 'sayaara'],
      'tum': ['tum', 'toom', 'toom', 'tum hi ho', 'tum hoto', 'tum ho to'],
      'hoto': ['ho to', 'hoto', 'ho toh', 'hi ho'],
      'ho': ['ho', 'hoo', 'hu'],
      'to': ['to', 'toh', 'too'],
      'toh': ['toh', 'to', 'too'],
      'mere': ['mere', 'meri', 'mera'],
      'dil': ['dil', 'dill', 'dill'],
      'hai': ['hai', 'he', 'hain'],
      'he': ['hai', 'he', 'hain'],
      'hain': ['hai', 'he', 'hain'],
      'ishq': ['ishq', 'ishque', 'ishk'],
      'pyaar': ['pyaar', 'pyar', 'piyar', 'piyaar'],
      'mohabbat': ['mohabbat', 'muhabbat', 'mohabat', 'muhabat'],
      'judaai': ['judaai', 'judai', 'juda', 'judaayi'],
      'judai': ['judaai', 'judai', 'juda', 'judaayi'],
      'bewafa': ['bewafa', 'bewafaa', 'bewfaa', 'bewfa'],
      'intezaar': ['intezaar', 'intezar', 'intizar', 'intizaar'],
      'intezar': ['intezaar', 'intezar', 'intizar', 'intizaar'],
      'khushi': ['khushi', 'khusi', 'kushi', 'kushy'],
      'gham': ['gham', 'gam', 'ghum', 'gum'],
      'gam': ['gham', 'gam', 'ghum', 'gum'],
      'zindagi': ['zindagi', 'jindagi', 'zindgi', 'jindgi'],
      'jindagi': ['zindagi', 'jindagi', 'zindgi', 'jindgi'],
      'duniya': ['duniya', 'dunya', 'dunia', 'duniyaa'],
      'dunya': ['duniya', 'dunya', 'dunia', 'duniyaa']
    };

    // Function to get all possible spellings for a word
    const getAllSpellings = (word: string): string[] => {
      const wordLower = word.toLowerCase();
      const variations = spellingSuggestions[wordLower] || [];
      return [word, ...variations];
    };

    // Enhanced fuzzy match function
    const fuzzyMatch = (str1: string, str2: string): number => {
      const s1 = str1.toLowerCase();
      const s2 = str2.toLowerCase();
      
      // Exact match
      if (s1 === s2) return 100;
      
      // Contains match
      if (s1.includes(s2) || s2.includes(s1)) return 80;
      
      // Word boundary matches (important for multi-word queries)
      const s1Words = s1.split(/\s+/);
      const s2Words = s2.split(/\s+/);
      
      let wordMatches = 0;
      for (const word1 of s1Words) {
        for (const word2 of s2Words) {
          if (word1 === word2) wordMatches += 20;
          else if (word1.includes(word2) || word2.includes(word1)) wordMatches += 15;
        }
      }
      
      if (wordMatches > 0) return Math.min(wordMatches, 75);
      
      // Levenshtein distance based scoring
      const maxLen = Math.max(s1.length, s2.length);
      const distance = levenshteinDistance(s1, s2);
      const similarity = ((maxLen - distance) / maxLen) * 100;
      
      return similarity > 50 ? similarity : 0;
    };

    // Simple Levenshtein distance implementation
    const levenshteinDistance = (str1: string, str2: string): number => {
      const matrix = [];
      for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
      }
      for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
      }
      for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
          if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            );
          }
        }
      }
      return matrix[str2.length][str1.length];
    };

    const score = (song: any): number => {
      const title = (song?.title || song?.name || '').toLowerCase();
      const artist = resolveArtist(song).toLowerCase();
      let s = 0;

      if (!q) return s;

      // Get all possible spellings for query tokens
      const expandedTokens = qTokens.flatMap(token => getAllSpellings(token));

      // Exact matches get highest priority
      if (title === q) s += 200;
      if (artist === q) s += 190;

      // Multi-word query handling
      if (qTokens.length > 1) {
        const titleWords = title.split(/\s+/);
        const artistWords = artist.split(/\s+/);
        
        // Check if all query words appear in title or artist
        const titleWordMatches = qTokens.filter((token: string) => 
          titleWords.some((word: string) => word.includes(token) || token.includes(word))
        ).length;
        
        const artistWordMatches = qTokens.filter((token: string) => 
          artistWords.some((word: string) => word.includes(token) || token.includes(word))
        ).length;
        
        // Boost songs where multiple query words match
        s += (titleWordMatches / qTokens.length) * 100;
        s += (artistWordMatches / qTokens.length) * 80;
      }

      // Check for spelling variations with enhanced scoring
      for (const token of expandedTokens) {
        const tokenLower = token.toLowerCase();
        
        // Title fuzzy matching
        const titleFuzzy = fuzzyMatch(title, tokenLower);
        if (titleFuzzy > 0) s += titleFuzzy * 0.9;
        
        // Artist fuzzy matching
        const artistFuzzy = fuzzyMatch(artist, tokenLower);
        if (artistFuzzy > 0) s += artistFuzzy * 0.8;
        
        // Word boundary matches (more precise)
        const titleRegex = new RegExp(`\\b${tokenLower}\\b`, 'i');
        const artistRegex = new RegExp(`\\b${tokenLower}\\b`, 'i');
        
        if (titleRegex.test(title)) s += 60;
        if (artistRegex.test(artist)) s += 55;
        
        // Partial word matches
        if (title.includes(tokenLower)) s += 40;
        if (artist.includes(tokenLower)) s += 35;
        if (title.startsWith(tokenLower)) s += 25;
        if (artist.startsWith(tokenLower)) s += 20;
      }

      // Original token matching (for exact spellings)
      for (const token of qTokens) {
        if (title.includes(token)) s += 45;
        if (artist.includes(token)) s += 40;
        if (title.startsWith(token)) s += 25;
        if (artist.startsWith(token)) s += 20;
      }

      // Penalize low-quality results
      if (penaltyWords.some(w => artist.includes(w))) s -= 60;
      if (penaltyWords.some(w => title.includes(w))) s -= 30;
      if (remixWords.some(w => title.includes(w))) s -= 15;

      // Boost for popular songs
      if (song.playCount && song.playCount > 1000000) s += 15;
      if (song.playCount && song.playCount > 10000000) s += 25;
      if (song.year && parseInt(song.year) >= new Date().getFullYear() - 2) s += 10;

      return Math.max(0, s);
    };

    return [...indianSearchResults]
      .map(song => ({ ...song, relevanceScore: score(song) }))
      .filter(song => song.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }, [indianSearchResults, query, searchQuery]);

  // Update auth store with current user info
  useEffect(() => {
    useAuthStore
      .getState()
      .setAuthStatus(isAuthenticated, isAuthenticated ? user?.id || null : null);
  }, [isAuthenticated, user]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Real-time search as user types (for mobile and desktop)
    if (value.trim().length >= 2) {
      setIsSearching(true);
      
      // Debounce the search to avoid too many API calls
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          await searchIndianSongs(value.trim());
          await searchPlaylists(value.trim());
          setHasRealTimeResults(true);
        } catch (error) {
          console.error('Real-time search failed:', error);
        } finally {
          setIsSearching(false);
        }
      }, 300); // 300ms debounce
    } else if (value.trim().length === 0) {
      // Clear results when search is empty
      useMusicStore.setState({ indianSearchResults: [] });
      usePlaylistStore.setState({ searchResults: [] });
      setHasRealTimeResults(false);
      setIsSearching(false);
    }
  };

  // Mobile-specific state - removed since we're not using popup
  // const [isTouchingSuggestions, setIsTouchingSuggestions] = useState(false);

  const handleInputFocus = () => {
    // No longer needed for popup, but keep for potential future use
  };

  const handleInputBlur = () => {
    // No longer needed for popup, but keep for potential future use
  };

  const handleSuggestionSelect = (songOrQuery: any) => {
    // If it's a song object with the necessary properties, play it directly
    if (songOrQuery && typeof songOrQuery === 'object' && (songOrQuery.title || songOrQuery.name)) {
      // Check if the song has a valid audio URL
      if (!songOrQuery.url) {
        toast.error('This song is not available for playback');
        return;
      }
      
      // Convert IndianSong to App Song format
      const convertedSong = useMusicStore.getState().convertIndianSongToAppSong(songOrQuery);
      
      // Play the song directly
      const playerStore = usePlayerStore.getState();
      playerStore.setCurrentSong(convertedSong);
      
      // Ensure the player is ready to play
      if (!playerStore.hasUserInteracted) {
        playerStore.setUserInteracted();
      }
      
      toast.success(`Now playing: ${songOrQuery.title || songOrQuery.name}`);
    } else {
      // If it's a string, treat it as a search query
      const query = typeof songOrQuery === 'string' ? songOrQuery : songOrQuery.toString();
      setSearchQuery(query);
      navigate(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  const handlePlaylistSelect = (playlistId: string) => {
    navigate(`/playlist/${playlistId}`);
  };

  const clearSearch = () => {
    setSearchQuery('');
    navigate('/search');
    searchInputRef.current?.focus();
  };

  const clickRecentSearch = (searchTerm: string) => {
    navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
  };

  const openInstagram = (url: string) => {
    window.open(url, '_blank');
  };

  const renderEmptyState = () => (
    <div className="space-y-6 w-full overflow-x-hidden">
      {/* Recent Searches Section */}
      {recentSearches.length > 0 && (
        <div className="bg-[#181818] rounded-lg p-4 md:p-6 border border-[#282828] w-full overflow-hidden">
          <div className="flex justify-between items-center mb-4 gap-2">
            <h2 className="text-xl font-bold text-white flex-shrink-0">Recent searches</h2>
            <Button
              onClick={clearAllRecentSearches}
              className="bg-transparent hover:bg-[#242424] text-[#b3b3b3] hover:text-white border-0 rounded-full px-2 md:px-3 py-1 text-xs md:text-sm font-medium transition-colors flex-shrink-0"
            >
              Clear all
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-3 w-full">
            {recentSearches.map((search, index) => (
              <div
                key={index}
                onClick={() => clickRecentSearch(search)}
                className="bg-[#242424] hover:bg-[#2a2a2a] rounded-lg p-2 md:p-3 cursor-pointer transition-colors group relative border border-[#282828] min-w-0"
              >
                <div className="flex items-center gap-2 md:gap-3 min-w-0">
                  <div className="w-8 md:w-10 h-8 md:h-10 rounded-lg bg-[#535353] flex items-center justify-center flex-shrink-0">
                    <Search className="h-4 md:h-5 w-4 md:w-5 text-[#b3b3b3]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs md:text-sm font-medium text-white truncate">{search}</h3>
                    <p className="text-xs text-[#b3b3b3]">Recent search</p>
                  </div>
                </div>

                {/* Delete button */}
                <button
                  onClick={(e) => handleRemoveRecentSearch(search, e)}
                  className="absolute top-1 md:top-2 right-1 md:right-2 opacity-0 group-hover:opacity-100 p-1 rounded-full bg-[#535353] text-[#b3b3b3] hover:text-white hover:bg-[#727272] transition-all duration-200"
                >
                  <XCircle className="h-2 md:h-3 w-2 md:w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Browse Categories */}
      <div className="bg-[#181818] rounded-lg p-4 md:p-6 border border-[#282828] w-full overflow-hidden">
        <h2 className="text-xl font-bold text-white mb-4">Browse all</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4 w-full">
          {[
            { name: 'Made For You', color: 'from-blue-800 to-blue-600' },
            { name: 'Recently Played', color: 'from-green-800 to-green-600' },
            { name: 'Liked Songs', color: 'from-purple-800 to-purple-600' },
            { name: 'Albums', color: 'from-orange-800 to-orange-600' },
            { name: 'Artists', color: 'from-red-800 to-red-600' },
            { name: 'Podcasts', color: 'from-indigo-800 to-indigo-600' }
          ].map((category, index) => (
            <div
              key={index}
              className={`bg-gradient-to-br ${category.color} rounded-lg p-3 md:p-4 cursor-pointer transition-transform hover:scale-105 relative overflow-hidden h-20 md:h-24 min-w-0`}
              onClick={() => handleSuggestionSelect(category.name)}
            >
              <h3 className="text-white font-bold text-xs md:text-sm truncate">{category.name}</h3>
              <div className="absolute -bottom-2 -right-2 w-12 md:w-16 h-12 md:h-16 bg-black/20 rounded-lg transform rotate-12"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Follow on Instagram Section */}
      <div className="bg-[#181818] rounded-lg p-4 md:p-6 border border-[#282828] w-full overflow-hidden">
        <h2 className="text-xl font-bold text-white mb-4">Follow Us</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 w-full">
          {/* First Instagram Account */}
          <div
            onClick={() => openInstagram(INSTAGRAM_URL)}
            className="bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 rounded-lg overflow-hidden p-3 md:p-4 relative cursor-pointer transition-transform hover:scale-[1.02] flex items-center min-w-0"
          >
            <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-center mb-2">
                <Instagram className="h-4 md:h-5 w-4 md:w-5 text-white mr-2 flex-shrink-0" />
                <h3 className="text-sm md:text-lg font-bold text-white truncate">{INSTAGRAM_HANDLE}</h3>
              </div>
              <p className="text-white/80 mb-2 md:mb-3 text-xs md:text-sm">Music updates and news</p>
              <Button
                className="bg-white hover:bg-white/90 text-black font-medium rounded-full px-3 md:px-4 py-1 text-xs md:text-sm flex items-center"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  openInstagram(INSTAGRAM_URL);
                }}
              >
                Follow
                <ExternalLink className="ml-1 h-2 md:h-3 w-2 md:w-3" />
              </Button>
            </div>
            <div className="hidden md:block flex-shrink-0">
              <div className="w-10 md:w-12 h-10 md:h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Instagram className="h-5 md:h-6 w-5 md:w-6 text-white" />
              </div>
            </div>
          </div>

          {/* Second Instagram Account */}
          <div
            onClick={() => openInstagram(INSTAGRAM_URL_TRADING)}
            className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-500 rounded-lg overflow-hidden p-3 md:p-4 relative cursor-pointer transition-transform hover:scale-[1.02] flex items-center min-w-0"
          >
            <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-center mb-2">
                <Instagram className="h-4 md:h-5 w-4 md:w-5 text-white mr-2 flex-shrink-0" />
                <h3 className="text-sm md:text-lg font-bold text-white truncate">{INSTAGRAM_HANDLE_TRADING}</h3>
              </div>
              <p className="text-white/80 mb-2 md:mb-3 text-xs md:text-sm">Trading insights and analytics</p>
              <Button
                className="bg-white hover:bg-white/90 text-black font-medium rounded-full px-3 md:px-4 py-1 text-xs md:text-sm flex items-center"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  openInstagram(INSTAGRAM_URL_TRADING);
                }}
              >
                Follow
                <ExternalLink className="ml-1 h-2 md:h-3 w-2 md:w-3" />
              </Button>
            </div>
            <div className="hidden md:block flex-shrink-0">
              <div className="w-10 md:w-12 h-10 md:h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Instagram className="h-5 md:h-6 w-5 md:w-6 text-white" />
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
      <div className="bg-[#181818] rounded-lg p-4 md:p-6 border border-[#282828] mb-6 w-full overflow-hidden">
        <h2 className="text-xl font-bold text-white mb-4">
          Playlists
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 w-full">
          {playlistResults.map((playlist: Playlist) => (
            <div key={playlist._id} className="bg-[#242424] hover:bg-[#2a2a2a] rounded-lg p-2 md:p-3 transition-colors min-w-0">
              <PlaylistCard
                playlist={playlist}
                showDescription={false}
                className="bg-transparent hover:bg-transparent border-0 text-white"
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#121212] overflow-x-hidden w-full">
      <ScrollArea className="h-screen w-full">
        <div className="pt-6 pb-32 md:pb-24 w-full px-3 md:px-4 box-border">
          {/* Search Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              Search
            </h1>
            <p className="text-[#b3b3b3] text-base">
              Find your favorite songs, artists, and playlists
            </p>
          </div>

          {/* Search Box */}
          <div className="mb-8 relative w-full max-w-2xl">
            <form onSubmit={handleSearch} className="flex items-center gap-2 w-full">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#b3b3b3] z-10" />
                <Input
                  ref={searchInputRef}
                  type="search"
                  placeholder="What do you want to listen to?"
                  value={searchQuery}
                  onChange={handleQueryChange}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  className="w-full h-12 pl-12 pr-4 bg-[#242424] border-0 text-white placeholder:text-[#b3b3b3] text-sm font-medium focus:outline-none focus:ring-0 focus:bg-[#2a2a2a] rounded-full transition-colors [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
                  autoComplete="off"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#b3b3b3] hover:text-white transition-colors z-10"
                  >
                    <XCircle size={18} />
                  </button>
                )}

                {/* Enhanced Search Suggestions - Disabled popup */}
                {/* <EnhancedSearchSuggestions
                  isVisible={showSuggestions}
                  query={searchQuery}
                  onSelectSong={handleSuggestionSelect}
                  onSelectPlaylist={handlePlaylistSelect}
                  onClose={() => setShowSuggestions(false)}
                  onTouchStart={() => setIsTouchingSuggestions(true)}
                  onTouchEnd={() => setIsTouchingSuggestions(false)}
                /> */}
              </div>

              {/* Voice Search Button */}
              {speechSupported && (
                <Button
                  type="button"
                  onClick={toggleListening}
                  className={cn(
                    "h-12 w-12 rounded-full border-0 transition-all duration-200",
                    isListening 
                      ? "bg-[#1db954] hover:bg-[#1ed760] text-black" 
                      : "bg-[#242424] hover:bg-[#2a2a2a] text-[#b3b3b3] hover:text-white"
                  )}
                  title={isListening ? "Stop listening" : "Search with voice"}
                >
                  {isListening ? (
                    <Mic className="h-5 w-5 animate-pulse" />
                  ) : (
                    <Mic className="h-5 w-5" />
                  )}
                </Button>
              )}
            </form>
          </div>

          {/* Inline Search Suggestions - Show when typing */}
          {searchQuery.length > 0 && !query && (
            <div className="mb-6">
              <div className="bg-[#181818] rounded-lg p-4 border border-[#282828] w-full">
                <h3 className="text-lg font-bold text-white mb-3">Search suggestions</h3>
                
                {/* Recent searches */}
                {recentSearches.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-[#b3b3b3] mb-2">Recent searches</h4>
                    <div className="flex flex-wrap gap-2">
                      {recentSearches.slice(0, 6).map((search, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestionSelect(search)}
                          className="bg-[#242424] hover:bg-[#2a2a2a] text-white px-3 py-2 rounded-full text-sm transition-colors"
                        >
                          {search}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trending searches */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-[#b3b3b3] mb-2">Trending searches</h4>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'saiyaara', 'tum hi ho', 'kesariya', 'raataan lambiyan', 
                      'mann meri jaan', 'apna bana le', 'perfect', 'shape of you'
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => handleSuggestionSelect(suggestion)}
                        className="bg-[#242424] hover:bg-[#2a2a2a] text-white px-3 py-2 rounded-full text-sm transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live search results preview */}
                {indianSearchResults.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-[#b3b3b3] mb-2">Quick results</h4>
                    <div className="space-y-2">
                      {indianSearchResults.slice(0, 3).map((song: any, index: number) => (
                        <div
                          key={song.id || song._id || index}
                          onClick={() => handleSuggestionSelect(song)}
                          className="flex items-center gap-3 p-2 rounded-md hover:bg-[#242424] transition-colors cursor-pointer"
                        >
                          <img
                            src={song.image || '/images/default-album.png'}
                            alt={song.title}
                            className="w-10 h-10 rounded-md object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/images/default-album.png';
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate text-sm">{song.title}</p>
                            <p className="text-[#b3b3b3] truncate text-xs">{resolveArtist(song)}</p>
                          </div>
                          <div className="w-8 h-8 bg-[#1db954] hover:bg-[#1ed760] rounded-full flex items-center justify-center">
                            <Play className="h-4 w-4 text-black ml-0.5" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Show "Press Enter to search for more" */}
                <div className="mt-4 pt-3 border-t border-[#282828]">
                  <button
                    onClick={() => handleSearch({ preventDefault: () => {} } as React.FormEvent)}
                    className="text-[#1db954] hover:text-[#1ed760] text-sm font-medium transition-colors"
                  >
                    Press Enter or click here to see all results for "{searchQuery}"
                  </button>
                </div>
              </div>
            </div>
          )}
          {isInitialLoad || isSearching ? (
            <div className="py-16 flex flex-col items-center justify-center">
              <div className="bg-[#181818] rounded-lg p-8 border border-[#282828]">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="w-8 h-8 border-2 border-[#535353] rounded-full animate-spin"></div>
                    <div className="absolute inset-0 w-8 h-8 border-2 border-transparent border-t-[#1db954] rounded-full animate-spin"></div>
                  </div>
                  <span className="text-white font-medium">Searching...</span>
                </div>
              </div>
            </div>
          ) : (query || hasRealTimeResults) ? (
            <div className="space-y-6 w-full overflow-x-hidden">
              {/* Top Results Section */}
              {(sortedIndianResults.length > 0 || playlistResults.length > 0) && (
                <div className="bg-[#181818] rounded-lg p-4 md:p-6 border border-[#282828] w-full">
                  <h2 className="text-xl font-bold text-white mb-4">Top result</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
                    {/* Top Song Result */}
                    {sortedIndianResults.length > 0 && (
                      <div className="bg-[#242424] hover:bg-[#2a2a2a] p-4 rounded-lg transition-colors group cursor-pointer">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <img
                              src={sortedIndianResults[0].image}
                              alt={sortedIndianResults[0].title}
                              className="w-16 h-16 rounded-lg object-cover"
                            />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                              <Button
                                size="icon"
                                className="w-10 h-10 bg-[#1db954] hover:bg-[#1ed760] text-black rounded-full border-0"
                                onClick={() => {
                                  const song = sortedIndianResults[0];
                                  if (!song.url) {
                                    toast.error('This song is not available for playback');
                                    return;
                                  }
                                  
                                  const convertedSong = useMusicStore.getState().convertIndianSongToAppSong(song);
                                  const playerStore = usePlayerStore.getState();
                                  playerStore.setCurrentSong(convertedSong);
                                  if (!playerStore.hasUserInteracted) {
                                    playerStore.setUserInteracted();
                                  }
                                  toast.success(`Now playing: ${song.title}`);
                                }}
                              >
                                <Play className="h-5 w-5 ml-0.5" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-white truncate mb-1">
                              {sortedIndianResults[0].title}
                            </h3>
                            <p className="text-[#b3b3b3] truncate text-sm">
                              {resolveArtist(sortedIndianResults[0])}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <div className="w-4 h-4 bg-[#1db954] rounded-sm flex items-center justify-center">
                                <Music className="h-2.5 w-2.5 text-black" />
                              </div>
                              <span className="text-xs text-[#b3b3b3] uppercase font-medium">Song</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Top Playlist Result */}
                    {playlistResults.length > 0 && (
                      <div className="bg-[#242424] hover:bg-[#2a2a2a] p-4 rounded-lg transition-colors">
                        <PlaylistCard
                          playlist={playlistResults[0]}
                          showDescription={true}
                          className="bg-transparent hover:bg-transparent border-0 text-white"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Playlist Results Section */}
              {renderPlaylistResults()}

              {/* All Songs Section - Mobile Optimized */}
              {sortedIndianResults.length > 0 && (
                <div className="bg-[#181818] rounded-lg p-3 md:p-6 border border-[#282828] w-full overflow-hidden">
                  <div className="flex items-center justify-between mb-3 md:mb-4 gap-2">
                    <h2 className="text-lg md:text-xl font-bold text-white flex-shrink-0">
                      Songs {searchQuery && !query && <span className="text-sm font-normal text-[#b3b3b3]">(as you type)</span>}
                    </h2>
                    {sortedIndianResults.length > 1 && (
                      <Button
                        onClick={() => {
                          const convertedSongs = sortedIndianResults
                            .filter((song: any) => song.url)
                            .map((song: any) => useMusicStore.getState().convertIndianSongToAppSong(song));
                          
                          if (convertedSongs.length > 0) {
                            const playerStore = usePlayerStore.getState();
                            playerStore.playAlbum(convertedSongs, 0);
                            if (!playerStore.hasUserInteracted) {
                              playerStore.setUserInteracted();
                            }
                            toast.success(`Playing ${convertedSongs.length} songs`);
                          } else {
                            toast.error('No playable songs found');
                          }
                        }}
                        className="bg-[#1db954] hover:bg-[#1ed760] text-black border-0 rounded-full px-2 md:px-4 py-1.5 md:py-2 font-semibold text-xs md:text-sm transition-colors flex-shrink-0"
                      >
                        <Play className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                        Play all
                      </Button>
                    )}
                  </div>
                  
                  <div className="space-y-1 max-h-[400px] md:max-h-[500px] overflow-y-auto w-full">
                    {sortedIndianResults.slice(0, 50).map((song: any, index: number) => (
                      <div
                        key={song.id || song._id || index}
                        className="flex items-center gap-2 md:gap-4 p-2 md:p-2 rounded-md hover:bg-[#242424] transition-colors group cursor-pointer w-full min-w-0"
                        onClick={() => {
                          if (!song.url) {
                            toast.error('This song is not available for playback');
                            return;
                          }
                          
                          const convertedSong = useMusicStore.getState().convertIndianSongToAppSong(song);
                          const playerStore = usePlayerStore.getState();
                          playerStore.setCurrentSong(convertedSong);
                          if (!playerStore.hasUserInteracted) {
                            playerStore.setUserInteracted();
                          }
                          toast.success(`Now playing: ${song.title}`);
                        }}
                      >
                        {/* Song Number/Play Button - More visible on mobile */}
                        <div className="w-8 md:w-8 h-8 md:h-8 flex items-center justify-center flex-shrink-0">
                          <span className="text-[#b3b3b3] group-hover:hidden font-medium text-sm md:text-sm">
                            {index + 1}
                          </span>
                          <div className="hidden group-hover:flex w-6 md:w-6 h-6 md:h-6 bg-[#1db954] hover:bg-[#1ed760] rounded-full items-center justify-center transition-all">
                            <Play className="h-3 md:h-3 w-3 md:w-3 text-black ml-0.5" />
                          </div>
                        </div>

                        {/* Song Image - Larger on mobile for better visibility */}
                        <div className="w-10 md:w-10 h-10 md:h-10 rounded-md overflow-hidden bg-[#282828] flex-shrink-0">
                          <img
                            src={song.image || '/images/default-album.png'}
                            alt={song.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/images/default-album.png';
                            }}
                          />
                        </div>

                        {/* Song Info - Better mobile layout */}
                        <div className="flex-1 min-w-0 pr-2">
                          <h4 className="font-medium text-white truncate text-sm md:text-sm">
                            {song.title}
                          </h4>
                          <p className="text-[#b3b3b3] truncate text-xs md:text-xs">
                            {resolveArtist(song)}
                          </p>
                        </div>

                        {/* Album Info - Hidden on mobile for space */}
                        {song.album && (
                          <div className="hidden lg:block text-xs md:text-sm text-[#b3b3b3] truncate max-w-24 xl:max-w-32 flex-shrink-0">
                            {song.album}
                          </div>
                        )}

                        {/* Song Duration */}
                        {song.duration && (
                          <div className="text-xs md:text-sm text-[#b3b3b3] w-10 md:w-12 text-right font-medium flex-shrink-0">
                            {song.duration}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Results State */}
              {!isSearching && sortedIndianResults.length === 0 && playlistResults.length === 0 && (
                <div className="py-16 text-center">
                  <div className="bg-[#181818] rounded-lg p-12 border border-[#282828] max-w-2xl mx-auto">
                    <div className="w-16 h-16 bg-[#282828] rounded-full flex items-center justify-center mx-auto mb-6">
                      <Search className="h-8 w-8 text-[#b3b3b3]" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No results found</h3>
                    <p className="text-[#b3b3b3] mb-6">
                      We couldn't find anything for "<span className="text-white font-medium">{query || searchQuery}</span>"
                    </p>
                    
                    {/* Spelling Suggestions */}
                    {(() => {
                      const spellingSuggestions: { [key: string]: string[] } = {
                        // Saiyaara variations
                        'saiyaara': ['saiyara', 'sayara', 'saiara', 'saiyaara'],
                        'saiyara': ['saiyaara', 'sayara', 'sayaara'],
                        'sayara': ['saiyaara', 'saiyara', 'sayaara'],
                        
                        // Tum variations
                        'tum': ['tum hi ho', 'tum se hi', 'tum jo aaye', 'tum mile'],
                        'tum hoto': ['tum hi ho', 'tum ho to', 'tum ho toh'],
                        'tum ho to': ['tum hi ho', 'tum hoto', 'tum ho toh'],
                        'tum ho toh': ['tum hi ho', 'tum hoto', 'tum ho to'],
                        'tum hi ho': ['tum hoto', 'tum ho to', 'tum ho toh'],
                        
                        // Mere variations
                        'mere': ['mere rashke qamar', 'mere dil mein', 'mere sapno ki rani'],
                        'meri': ['meri zindagi', 'meri jaan', 'meri duniya'],
                        'mera': ['mera dil', 'mera ishq', 'mera pyaar'],
                        
                        // Dil variations
                        'dil': ['dil diyan gallan', 'dil se', 'dil mein ho tum'],
                        'dill': ['dil diyan gallan', 'dil se', 'dil mein ho tum'],
                        
                        // Common Hindi words
                        'hai': ['hai', 'he', 'hain'],
                        'he': ['hai', 'he', 'hain'],
                        'hain': ['hai', 'he', 'hain'],
                        
                        // Love/Romance related
                        'ishq': ['ishq wala love', 'ishq sufiyana', 'ishq mubarak'],
                        'pyaar': ['pyaar kiya to darna kya', 'pyaar deewana hota hai', 'pyaar tune kya kiya'],
                        'mohabbat': ['mohabbatein', 'mohabbat barsa dena', 'mohabbat hai'],
                        'love': ['love aaj kal', 'love story', 'ishq wala love'],
                        
                        // Sad/Separation songs
                        'judaai': ['judaai judaai', 'juda hoke bhi', 'judai'],
                        'judai': ['judaai judaai', 'juda hoke bhi', 'judaai'],
                        'bewafa': ['bewafa sanam', 'bewafa tera masoom chehra', 'bewafai'],
                        'gham': ['gham ke sahare', 'gam', 'gham-e-ishq'],
                        'gam': ['gham ke sahare', 'gham', 'gam-e-ishq'],
                        
                        // Waiting/Longing
                        'intezaar': ['intezaar karna pada', 'intezar', 'intizar'],
                        'intezar': ['intezaar karna pada', 'intezaar', 'intizar'],
                        'intizar': ['intezaar karna pada', 'intezar', 'intezaar'],
                        
                        // Happiness
                        'khushi': ['khushi ke pal', 'khushi jahan', 'khushi ki baat'],
                        'khusi': ['khushi ke pal', 'khushi jahan', 'khushi ki baat'],
                        'kushi': ['khushi ke pal', 'khushi jahan', 'khushi ki baat'],
                        
                        // Life/World
                        'zindagi': ['zindagi na milegi dobara', 'zindagi do pal ki', 'zindagi ek safar'],
                        'jindagi': ['zindagi na milegi dobara', 'zindagi do pal ki', 'zindagi ek safar'],
                        'duniya': ['duniya mein logon ko', 'dunya', 'duniya kya kehti hai'],
                        'dunya': ['duniya mein logon ko', 'duniya', 'dunya kya kehti hai'],
                        
                        // Popular song titles
                        'kesariya': ['kesariya tera ishq hai piya', 'kesariya'],
                        'raataan': ['raataan lambiyan', 'ratan lambiyan'],
                        'ratan': ['raataan lambiyan', 'raatan lambiyan'],
                        'lambiyan': ['raataan lambiyan', 'lambiyan'],
                        'lambiyaan': ['raataan lambiyan', 'lambiyan'],
                        
                        // Arijit Singh popular songs
                        'tera': ['tera ban jaunga', 'tera fitoor', 'tera yaar hoon main'],
                        'ban': ['tera ban jaunga', 'apna bana le'],
                        'jaunga': ['tera ban jaunga', 'main jaunga'],
                        'apna': ['apna bana le', 'apna time aayega'],
                        'bana': ['apna bana le', 'bana de'],
                        
                        // Atif Aslam songs
                        've': ['ve maahi', 've kamleya'],
                        'maahi': ['ve maahi', 'maahi ve'],
                        'kamleya': ['ve kamleya', 'kamleya'],
                        
                        // Common misspellings
                        'bekhayali': ['bekhayali mein bhi tera', 'bekhayali'],
                        'bekhayal': ['bekhayali mein bhi tera', 'bekhayali'],
                        'hawayein': ['hawayein', 'hawaaein'],
                        'hawaaein': ['hawayein', 'hawaaein'],
                        'gerua': ['gerua', 'gerua sun raha hai'],
                        'perfect': ['perfect ed sheeran', 'perfect'],
                        'shape': ['shape of you', 'shape'],
                        'blinding': ['blinding lights', 'blinding'],
                        'stay': ['stay justin bieber', 'stay'],
                        'heat': ['heat waves', 'heat'],
                        'waves': ['heat waves', 'waves']
                      };
                      
                      const queryLower = (query || searchQuery).toLowerCase().trim();
                      const queryWords = queryLower.split(/\s+/).filter(Boolean);
                      
                      // Direct match suggestions
                      const directSuggestions = spellingSuggestions[queryLower] || [];
                      
                      // Word-based suggestions
                      const wordSuggestions = queryWords.flatMap((word: string) => 
                        spellingSuggestions[word] || []
                      );
                      
                      // Partial match suggestions (for multi-word queries)
                      const partialSuggestions = Object.keys(spellingSuggestions)
                        .filter(key => {
                          // Check if any word in the query matches any word in the key
                          const keyWords = key.split(/\s+/);
                          return queryWords.some(qWord => 
                            keyWords.some(kWord => 
                              kWord.includes(qWord) || qWord.includes(kWord)
                            )
                          );
                        })
                        .flatMap(key => spellingSuggestions[key])
                        .slice(0, 4);
                      
                      // Fuzzy matching for common misspellings
                      const fuzzyMatches = Object.keys(spellingSuggestions)
                        .filter(key => {
                          // Simple fuzzy matching - check if 70% of characters match
                          const similarity = calculateSimilarity(queryLower, key);
                          return similarity > 0.6;
                        })
                        .flatMap(key => spellingSuggestions[key])
                        .slice(0, 3);
                      
                      // Combine all suggestions and remove duplicates
                      const allSuggestions = [...new Set([
                        ...directSuggestions,
                        ...wordSuggestions,
                        ...partialSuggestions,
                        ...fuzzyMatches
                      ])].slice(0, 6);
                      
                      // Simple similarity calculation
                      function calculateSimilarity(str1: string, str2: string): number {
                        const longer = str1.length > str2.length ? str1 : str2;
                        const shorter = str1.length > str2.length ? str2 : str1;
                        const editDistance = getEditDistance(longer, shorter);
                        return (longer.length - editDistance) / longer.length;
                      }
                      
                      function getEditDistance(str1: string, str2: string): number {
                        const matrix = [];
                        for (let i = 0; i <= str2.length; i++) {
                          matrix[i] = [i];
                        }
                        for (let j = 0; j <= str1.length; j++) {
                          matrix[0][j] = j;
                        }
                        for (let i = 1; i <= str2.length; i++) {
                          for (let j = 1; j <= str1.length; j++) {
                            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                              matrix[i][j] = matrix[i - 1][j - 1];
                            } else {
                              matrix[i][j] = Math.min(
                                matrix[i - 1][j - 1] + 1,
                                matrix[i][j - 1] + 1,
                                matrix[i - 1][j] + 1
                              );
                            }
                          }
                        }
                        return matrix[str2.length][str1.length];
                      }
                      
                      return allSuggestions.length > 0 ? (
                        <div className="mb-6">
                          <p className="text-[#b3b3b3] text-sm mb-3">Did you mean:</p>
                          <div className="flex flex-wrap justify-center gap-2">
                            {allSuggestions.map((suggestion) => (
                              <Button
                                key={suggestion}
                                onClick={() => handleSuggestionSelect(suggestion)}
                                className="bg-[#242424] hover:bg-[#2a2a2a] text-[#b3b3b3] hover:text-white border border-[#535353] rounded-full px-3 py-1 text-xs font-medium transition-colors"
                              >
                                {suggestion}
                              </Button>
                            ))}
                          </div>
                        </div>
                      ) : null;
                    })()}
                    
                    <p className="text-[#b3b3b3] text-sm mb-6">Try different keywords or check the spelling</p>
                    
                    {/* Popular Search Suggestions */}
                    <div className="flex flex-wrap justify-center gap-2">
                      {['Latest hits', 'Bollywood songs', 'English pop', 'Romantic songs'].map((suggestion) => (
                        <Button
                          key={suggestion}
                          onClick={() => handleSuggestionSelect(suggestion)}
                          className="bg-[#242424] hover:bg-[#2a2a2a] text-[#b3b3b3] hover:text-white border border-[#535353] rounded-full px-3 py-1 text-xs font-medium transition-colors"
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Enhanced Empty State
            renderEmptyState()
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default SearchPage;


