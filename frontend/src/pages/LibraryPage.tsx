import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Loader, 
  Library, 
  PlusCircle, 
  Search, 
  Clock, 
  Heart, 
  Music, 
  ListMusic,
  Grid3X3,
  List,
  Pin,
  PinOff,
  User,
  ArrowUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlaylistStore } from '../stores/usePlaylistStore';
import { CreatePlaylistDialog } from '../components/playlist/CreatePlaylistDialog';
import { PlaylistCard } from '../components/playlist/PlaylistCard';
import { useAuthStore } from '../stores/useAuthStore';
import { cn } from '@/lib/utils';

const LibraryPage = () => {
  const { isAuthenticated, loading, user } = useAuth();
  const { userId } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLibraryLoading, setIsLibraryLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { userPlaylists, fetchUserPlaylists } = usePlaylistStore();
  
  // Scroll management
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  // Filter and view options
  const [activeFilter, setActiveFilter] = useState<'all' | 'playlists' | 'liked'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [pinnedPlaylists, setPinnedPlaylists] = useState<string[]>([]);

  // Remember previously viewed playlists and scroll position
  useEffect(() => {
    // Load saved pinned playlists from localStorage
    try {
      const savedPinned = localStorage.getItem('mavrix-pinned-playlists');
      if (savedPinned) {
        setPinnedPlaylists(JSON.parse(savedPinned));
      }
      
      // Load saved view mode
      const savedViewMode = localStorage.getItem('mavrix-library-view-mode');
      if (savedViewMode && (savedViewMode === 'grid' || savedViewMode === 'list')) {
        setViewMode(savedViewMode as 'grid' | 'list');
      }
      
      // Load saved scroll position
      const savedScrollPosition = sessionStorage.getItem('mavrix-library-scroll');
      if (savedScrollPosition) {
        const position = parseInt(savedScrollPosition, 10);
        // Defer scroll restoration until after render
        setTimeout(() => {
          if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTop = position;
            setScrollPosition(position);
          }
        }, 100);
      }
    } catch (error) {
      console.error('Error loading saved library preferences', error);
    }
  }, []);
  
  // Save pinned playlists when they change
  useEffect(() => {
    if (pinnedPlaylists.length > 0) {
      localStorage.setItem('mavrix-pinned-playlists', JSON.stringify(pinnedPlaylists));
    }
  }, [pinnedPlaylists]);
  
  // Save view mode when it changes
  useEffect(() => {
    localStorage.setItem('mavrix-library-view-mode', viewMode);
  }, [viewMode]);

  // Handle scroll events
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentPos = e.currentTarget.scrollTop;
    setScrollPosition(currentPos);
    setShowScrollTop(currentPos > 300);
    
    // Save scroll position to session storage
    sessionStorage.setItem('mavrix-library-scroll', currentPos.toString());
  };
  
  // Scroll to top function
  const scrollToTop = () => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  // Filtered playlists
  const filteredPlaylists = userPlaylists.filter(playlist => {
    // Apply search filter
    if (searchQuery) {
      return playlist.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    
    // Apply type filter
    if (activeFilter === 'all') return true;
    if (activeFilter === 'playlists') return true;
    
    return true;
  });
  
  // Toggle pin status for a playlist
  const togglePinned = (playlistId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setPinnedPlaylists(prev => {
      if (prev.includes(playlistId)) {
        return prev.filter(id => id !== playlistId);
      } else {
        return [...prev, playlistId];
      }
    });
  };

  // Navigate to playlist with scroll position preservation
  const navigateToPlaylist = (playlistId: string) => {
    // Save current scroll position before navigation
    sessionStorage.setItem('mavrix-library-scroll', scrollPosition.toString());
    navigate(`/playlist/${playlistId}`);
  };

  // Separate playlists into pinned and unpinned
  const pinnedItems = filteredPlaylists.filter(playlist => pinnedPlaylists.includes(playlist._id));
  const unpinnedItems = filteredPlaylists.filter(playlist => !pinnedPlaylists.includes(playlist._id));

  // Load library data
  useEffect(() => {
    const loadData = async () => {
      if (isAuthenticated) {
        try {
          await fetchUserPlaylists();
        } catch (error) {
          console.error('Error loading playlists', error);
        }
      }
      setIsLibraryLoading(false);
    };

    loadData();
  }, [isAuthenticated, fetchUserPlaylists]);

  return (
    <main className="h-full bg-black overflow-hidden">
      <div className="h-full flex flex-col">
        {/* Library header with filters */}
        <div className="px-4 sm:px-6 py-4 flex flex-col space-y-4 bg-zinc-900 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-zinc-200 font-medium">
              <Library className="h-5 w-5" />
              <h1 className="text-xl">Your Library</h1>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full h-8 w-8"
                title={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
              >
                {viewMode === 'grid' ? (
                  <List className="h-4 w-4" />
                ) : (
                  <Grid3X3 className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowCreateDialog(true)}
                className="text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full h-8 w-8"
                title="Create playlist"
              >
                <PlusCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Filter chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              className={cn(
                "px-3 py-1.5 text-sm rounded-full whitespace-nowrap",
                activeFilter === 'all' 
                  ? "bg-white text-black font-medium"
                  : "bg-zinc-800 text-white hover:bg-zinc-700"
              )}
              onClick={() => setActiveFilter('all')}
            >
              All
            </button>
            <button
              className={cn(
                "px-3 py-1.5 text-sm rounded-full whitespace-nowrap flex items-center gap-1.5",
                activeFilter === 'playlists' 
                  ? "bg-white text-black font-medium"
                  : "bg-zinc-800 text-white hover:bg-zinc-700"
              )}
              onClick={() => setActiveFilter('playlists')}
            >
              <ListMusic className="h-3.5 w-3.5" />
              Playlists
            </button>
            <button
              className={cn(
                "px-3 py-1.5 text-sm rounded-full whitespace-nowrap flex items-center gap-1.5",
                activeFilter === 'liked'
                  ? "bg-white text-black font-medium"
                  : "bg-zinc-800 text-white hover:bg-zinc-700"
              )}
              onClick={() => navigate('/liked-songs')}
            >
              <Heart className="h-3.5 w-3.5" />
              Liked Songs
            </button>
          </div>
          
          {/* Search input - only show when we have playlists */}
          {userPlaylists.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search in Your Library"
                className="w-full bg-zinc-800/90 text-white rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-600"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}
        </div>
        
        {/* Library content */}
        <div 
          ref={scrollAreaRef}
          className="flex-1 bg-gradient-to-b from-zinc-900 to-black pb-24 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent"
          onScroll={handleScroll}
        >
          <div className="p-2 sm:p-4">
            {isLibraryLoading || loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader className="h-8 w-8 animate-spin text-green-500" />
              </div>
            ) : !isAuthenticated ? (
              <div className="bg-zinc-800/50 rounded-lg p-8 text-center">
                <Library className="h-12 w-12 mx-auto mb-4 text-zinc-500" />
                <h2 className="text-xl font-semibold mb-2">Sign in to view your library</h2>
                <p className="text-zinc-400 mb-6">
                  Create an account or sign in to save and access your favorite music
                </p>
                <Button
                  onClick={() => navigate('/')}
                  className="bg-white text-black hover:bg-zinc-200"
                >
                  Sign In
                </Button>
              </div>
            ) : userPlaylists.length === 0 ? (
              <div className="bg-zinc-800/40 rounded-xl p-8 text-center">
                <div className="w-16 h-16 bg-zinc-700 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Music className="h-8 w-8 text-zinc-400" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Create your first playlist</h2>
                <p className="text-zinc-400 mb-6 max-w-md mx-auto">
                  It's easy, we'll help you. Start building your collection of music you love.
                </p>
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  className="bg-white text-black hover:bg-zinc-200"
                >
                  Create Playlist
                </Button>
              </div>
            ) : (
              <div>
                {/* Liked Songs Card - Always at top */}
                <div className="mb-4">
                  <div 
                    className="flex items-center gap-3 p-3 hover:bg-zinc-800/60 rounded-md cursor-pointer transition-colors"
                    onClick={() => navigate('/liked-songs')}
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-blue-400 rounded-md flex items-center justify-center">
                      <Heart className="h-6 w-6 text-white" fill="white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white truncate">Liked Songs</h3>
                      <p className="text-sm text-zinc-400 flex items-center gap-1">
                        <Pin className="h-3 w-3" /> Playlist
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Pinned Playlists Section - Only show if there are pinned items */}
                {pinnedItems.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs font-medium uppercase text-zinc-400 mb-2 px-2">
                      Pinned
                    </div>
                    
                    {viewMode === 'list' ? (
                      <div className="space-y-1">
                        {pinnedItems.map(playlist => (
                          <div 
                            key={playlist._id}
                            className="flex items-center gap-3 p-3 hover:bg-zinc-800/60 rounded-md cursor-pointer group transition-colors"
                            onClick={() => navigateToPlaylist(playlist._id)}
                          >
                            <img 
                              src={playlist.imageUrl || '/default-playlist.jpg'} 
                              alt={playlist.name}
                              className="w-12 h-12 object-cover rounded-md"
                              loading="lazy"
                            />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-white truncate">{playlist.name}</h3>
                              <p className="text-sm text-zinc-400 flex items-center gap-1">
                                <ListMusic className="h-3 w-3" /> 
                                Playlist • <span className="flex items-center gap-1"><User className="h-3 w-3" /> {playlist.createdBy.fullName}</span>
                              </p>
                            </div>
                            <button 
                              className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-white p-1.5 rounded-full hover:bg-zinc-700/50 transition-all"
                              onClick={(e) => togglePinned(playlist._id, e)}
                              title="Unpin"
                            >
                              <PinOff className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                        {pinnedItems.map(playlist => (
                          <div 
                            key={playlist._id}
                            className="bg-zinc-800/40 rounded-lg p-4 hover:bg-zinc-700/40 transition-colors cursor-pointer group relative"
                            onClick={() => navigateToPlaylist(playlist._id)}
                          >
                            <div className="aspect-square mb-4 rounded-md overflow-hidden shadow-md relative group-hover:shadow-lg transition-all">
                              <img 
                                src={playlist.imageUrl || '/default-playlist.jpg'} 
                                alt={playlist.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                              <button 
                                className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 bg-zinc-900/80 text-white p-1.5 rounded-full hover:bg-black hover:scale-105 transition-all"
                                onClick={(e) => togglePinned(playlist._id, e)}
                                title="Unpin"
                              >
                                <PinOff className="h-4 w-4" />
                              </button>
                            </div>
                            <h3 className="font-medium text-white truncate">{playlist.name}</h3>
                            <p className="text-sm text-zinc-400 truncate mt-1">
                              Playlist • {playlist.createdBy.fullName}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Main Playlist List */}
                {unpinnedItems.length > 0 && (
                  <div>
                    {pinnedItems.length > 0 && (
                      <div className="text-xs font-medium uppercase text-zinc-400 mb-2 px-2">
                        Your Playlists
                      </div>
                    )}
                    
                    {viewMode === 'list' ? (
                      <div className="space-y-1">
                        {unpinnedItems.map(playlist => (
                          <div 
                            key={playlist._id}
                            className="flex items-center gap-3 p-3 hover:bg-zinc-800/60 rounded-md cursor-pointer group transition-colors"
                            onClick={() => navigateToPlaylist(playlist._id)}
                          >
                            <img 
                              src={playlist.imageUrl || '/default-playlist.jpg'} 
                              alt={playlist.name}
                              className="w-12 h-12 object-cover rounded-md"
                              loading="lazy"
                            />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-white truncate">{playlist.name}</h3>
                              <p className="text-sm text-zinc-400 flex items-center gap-1">
                                <ListMusic className="h-3 w-3" /> 
                                Playlist • <span className="flex items-center gap-1"><User className="h-3 w-3" /> {playlist.createdBy.fullName}</span>
                              </p>
                            </div>
                            <button 
                              className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-white p-1.5 rounded-full hover:bg-zinc-700/50 transition-all"
                              onClick={(e) => togglePinned(playlist._id, e)}
                              title="Pin"
                            >
                              <Pin className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                        {unpinnedItems.map(playlist => (
                          <div 
                            key={playlist._id}
                            className="bg-zinc-800/40 rounded-lg p-4 hover:bg-zinc-700/40 transition-colors cursor-pointer group relative"
                            onClick={() => navigateToPlaylist(playlist._id)}
                          >
                            <div className="aspect-square mb-4 rounded-md overflow-hidden shadow-md relative group-hover:shadow-lg transition-all">
                              <img 
                                src={playlist.imageUrl || '/default-playlist.jpg'} 
                                alt={playlist.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                              <button 
                                className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 bg-zinc-900/80 text-white p-1.5 rounded-full hover:bg-black hover:scale-105 transition-all"
                                onClick={(e) => togglePinned(playlist._id, e)}
                                title="Pin"
                              >
                                <Pin className="h-4 w-4" />
                              </button>
                            </div>
                            <h3 className="font-medium text-white truncate">{playlist.name}</h3>
                            <p className="text-sm text-zinc-400 truncate mt-1">
                              Playlist • {playlist.createdBy.fullName}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scroll to top button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-24 right-6 bg-zinc-800/80 hover:bg-zinc-700 text-white p-3 rounded-full shadow-lg transition-all z-50 backdrop-blur-sm"
          aria-label="Scroll to top"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}

      <CreatePlaylistDialog isOpen={showCreateDialog} onClose={() => setShowCreateDialog(false)} />
    </main>
  );
};

export default LibraryPage;
