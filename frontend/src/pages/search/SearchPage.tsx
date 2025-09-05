import { useEffect, useState, useCallback } from 'react';
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
  ExternalLink
} from 'lucide-react';
import { ListSkeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '../../contexts/AuthContext';
import IndianMusicPlayer from '@/components/IndianMusicPlayer';
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
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
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

  // Compute sorted results prioritizing official/real artist matches
  const sortedIndianResults = useMemo(() => {
    if (!indianSearchResults || indianSearchResults.length === 0) return [] as any[];
    const qRaw = (query || '').trim();
    const q = qRaw.toLowerCase();
    const qTokens = q.split(/\s+/).filter(Boolean);

    const penaltyWords = ['unknown', 'various', 'tribute', 'cover', 'karaoke', 'hits', 'best of', 'playlist', 'compilation'];
    const remixWords = ['remix', 'sped up', 'slowed', 'reverb', 'mashup'];

    const score = (song: any): number => {
      const title = (song?.title || song?.name || '').toLowerCase();
      const artist = resolveArtist(song).toLowerCase();
      let s = 0;

      if (!q) return s;

      // Strong artist matches first
      if (artist === q) s += 120;
      if (artist.includes(q)) s += 80;

      // Title matches
      if (title === q) s += 60;
      if (title.includes(q)) s += 30;

      // Token coverage: bonus for covering most tokens in title
      const covered = qTokens.filter(t => title.includes(t)).length;
      s += covered * 15;
      if (covered >= Math.max(1, Math.ceil(qTokens.length * 0.7))) s += 25;

      // Penalize generic or unofficial indicators
      if (penaltyWords.some(w => artist.includes(w))) s -= 60;
      if (penaltyWords.some(w => title.includes(w))) s -= 30;
      if (remixWords.some(w => title.includes(w))) s -= 25;

      // Slight boost if title starts with the query
      if (title.startsWith(q)) s += 10;

      // If neither title nor artist contains query tokens, penalize heavily
      const artistCovered = qTokens.filter(t => artist.includes(t)).length;
      if (covered === 0 && artistCovered === 0) s -= 100;

      return s;
    };

    return [...indianSearchResults]
      .sort((a, b) => score(b) - score(a));
  }, [indianSearchResults, query]);

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
            <h2 className="text-xl font-bold text-foreground">Recent searches</h2>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={clearAllRecentSearches}
              className="text-sm text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              Clear all
            </Button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {recentSearches.map((search, index) => (
              <div 
                key={index}
                onClick={() => clickRecentSearch(search)}
                className="bg-card hover:bg-accent rounded-md p-4 cursor-pointer transition-colors group relative border border-border"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                    <Search className="h-6 w-6 text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground truncate">{search}</h3>
                    <p className="text-xs text-muted-foreground">Recent search</p>
                  </div>
                </div>
                
                {/* Delete button that appears on hover */}
                <button
                  onClick={(e) => removeRecentSearch(search, e)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-full bg-muted text-muted-foreground hover:text-foreground hover:bg-accent transition-opacity"
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
        <h2 className="text-xl font-bold text-foreground mb-4">Follow Us</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* First Instagram Account */}
          <div 
            onClick={() => openInstagram(INSTAGRAM_URL)}
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
            onClick={() => openInstagram(INSTAGRAM_URL_TRADING)}
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
    <main className="rounded-md overflow-hidden h-full px-[6px] bg-gradient-to-b from-background to-background/95 dark:from-[#191414] dark:to-[#191414] text-foreground" >
      <ScrollArea className="h-[calc(100vh-180px)]">
        <div className="p-4 sm:p-6 max-w-7xl mx-auto">
          {/* Search Box - Spotify-style white design with speech recognition */}
          <form onSubmit={handleSearch} className="flex-1 max-w-xl flex items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="What do you want to listen to?"
                value={searchQuery}
                onChange={handleQueryChange}
                className="w-full rounded-l-full bg-card text-foreground pl-10 pr-10 h-12 border border-border focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <XCircle size={18} />
                </button>
              )}
            </div>
            <Button 
              type="submit"
              className="h-12 rounded-none bg-card hover:bg-accent text-foreground font-medium px-5 border border-border"
            >
              Search
            </Button>
            
            {/* Speech recognition button */}
            {speechSupported && (
              <Button
                type="button"
                onClick={toggleListening}
                className={cn(
                  "h-12 rounded-r-full bg-card hover:bg-accent text-foreground font-medium px-3 border border-border transition-all",
                  isListening && "text-primary"
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

        {isInitialLoad ? (
          <div className="py-12">
            <ListSkeleton count={8} isMobile={false} />
          </div>
        ) : query ? (
          <div className="space-y-6">
            {/* Top Results - Featured Section */}
            {(sortedIndianResults.length > 0 || playlistResults.length > 0) && (
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4">Top Result</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Top Result Card */}
                  {sortedIndianResults.length > 0 && (
                    <div className="bg-card hover:bg-accent p-5 rounded-lg transition-colors shadow-lg border border-border">
                      <div className="flex flex-col h-full">
                        <div className="mb-4">
                          <img 
                            src={sortedIndianResults[0].image} 
                            alt={sortedIndianResults[0].title}
                            className="w-24 h-24 shadow-md rounded-md"
                          />
                        </div>
                        <h3 className="text-xl font-bold text-foreground truncate">{sortedIndianResults[0].title}</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          {resolveArtist(sortedIndianResults[0])}
                        </p>
                        <div className="mt-auto">
                          <Button 
                            className="rounded-full h-12 w-12 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
                            size="icon"
                            onClick={() => usePlayerStore.getState().setCurrentSong(sortedIndianResults[0] as any)}
                          >
                            <Play className="h-6 w-6 ml-0.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Alternative Top Result - Playlist */}
                  {indianSearchResults.length === 0 && playlistResults.length > 0 && (
                    <div className="bg-card hover:bg-accent p-5 rounded-lg transition-colors shadow-lg border border-border">
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
            {sortedIndianResults.length > 0 && (
              <div>
                <h2 className="text-xl font-bold mb-4">Songs</h2>
                <IndianMusicPlayer />
              </div>
            )}
            
            {/* Show message if no results */}
            {sortedIndianResults.length === 0 && playlistResults.length === 0 && (
              <div className="py-16 text-center bg-card rounded-lg border border-border">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-foreground font-semibold text-lg">No results found for "{query}"</p>
                <p className="text-muted-foreground text-sm mt-2">Try different keywords or check the spelling</p>
                {/* Voice search button removed */}
              </div>
            )}
          </div>
        ) : (
          // Empty state with recent searches and Instagram follow
          renderEmptyState()
        )}
      </ScrollArea>
    </main>
  );
};

export default SearchPage;

