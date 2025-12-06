import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Loader,
  Library,
  Heart,
  Music,
  ListMusic,
  Pin,
  PinOff,
  User,
  ArrowUp,
  LayoutGrid,
  Search,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlaylistStore } from '../stores/usePlaylistStore';
import { CreatePlaylistDialog } from '../components/playlist/CreatePlaylistDialog';
import { cn } from '@/lib/utils';

const LibraryPage = () => {
  const { isAuthenticated, loading, user } = useAuth();
  const navigate = useNavigate();
  const [isLibraryLoading, setIsLibraryLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { userPlaylists, fetchUserPlaylists } = usePlaylistStore();

  // Scroll management
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // View options
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
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
  const filteredPlaylists = userPlaylists;

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
      console.log('LibraryPage: loadData called, isAuthenticated:', isAuthenticated, 'user:', user?.id);
      if (isAuthenticated) {
        try {
          console.log('LibraryPage: Calling fetchUserPlaylists');
          await fetchUserPlaylists();
          console.log('LibraryPage: fetchUserPlaylists completed');
        } catch (error) {
          console.error('Error loading playlists', error);
        }
      } else {
        console.log('LibraryPage: User not authenticated, skipping playlist fetch');
      }
      setIsLibraryLoading(false);
    };

    loadData();
  }, [isAuthenticated, fetchUserPlaylists, user]);

  // Debug logging
  useEffect(() => {
    console.log('LibraryPage: Auth state changed:', { isAuthenticated, loading, user: user?.id });
  }, [isAuthenticated, loading, user]);

  // Debug playlist store state
  useEffect(() => {
    console.log('LibraryPage: Playlist store state changed:', {
      userPlaylistsCount: userPlaylists.length,
      userPlaylists: userPlaylists.map(p => ({ id: p._id, name: p.name }))
    });
  }, [userPlaylists]);

  // Debug logging
  useEffect(() => {
    console.log('LibraryPage: Auth state changed:', { isAuthenticated, loading, user: user?.id });
  }, [isAuthenticated, loading, user]);

  // Debug playlist store state
  useEffect(() => {
    console.log('LibraryPage: Playlist store state changed:', {
      userPlaylistsCount: userPlaylists.length,
      userPlaylists: userPlaylists.map(p => ({ id: p._id, name: p.name }))
    });
  }, [userPlaylists]);


  return (
    <main className="h-full overflow-hidden px-[6px] bg-gradient-to-b from-background to-background/95 dark:from-[#191414] dark:to-[#191414] text-foreground">
      <div className="h-full flex flex-col">
        {/* Library content */}
        <div
          ref={scrollAreaRef}
          className="flex-1 pb-24 overflow-y-auto"
          onScroll={handleScroll}
        >
          <div className="p-2 sm:p-4 pt-4">
            {isLibraryLoading || loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !isAuthenticated ? (
              <div className="bg-card border border-border rounded-lg p-8 text-center">
                <Library className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-xl font-semibold mb-2">Sign in to view your library</h2>
                <p className="text-muted-foreground mb-6">
                  Create an account or sign in to save and access your favorite music
                </p>
                <Button
                  onClick={() => navigate('/')}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Sign In
                </Button>
              </div>
            ) : userPlaylists.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-8 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                  <Music className="h-8 w-8 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Create your first playlist</h2>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  It's easy, we'll help you. Start building your collection of music you love.
                </p>
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Create Playlist
                </Button>
              </div>
            ) : (
              <div>
                {/* Tools - shown first, compact size */}
                <div className="mb-3 px-2 sm:px-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewMode(prev => (prev === 'grid' ? 'list' : 'grid'))}
                      className="h-7 w-7 rounded-full bg-muted flex items-center justify-center hover:bg-accent transition-colors"
                      aria-label="Toggle grid/list"
                    >
                      <LayoutGrid className="h-3.5 w-3.5 text-foreground" />
                    </button>
                    <button
                      onClick={() => navigate('/search')}
                      className="h-7 w-7 rounded-full bg-muted flex items-center justify-center hover:bg-accent transition-colors"
                      aria-label="Search"
                    >
                      <Search className="h-3.5 w-3.5 text-foreground" />
                    </button>
                    <button
                      onClick={() => setShowCreateDialog(true)}
                      className="bg-green-500 hover:bg-green-600 text-white px-2.5 py-1 rounded-full flex items-center gap-1.5 text-xs font-medium transition-colors"
                      aria-label="Create playlist"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Create</span>
                    </button>
                  </div>
                </div>

                {/* Liked Songs Card - Always at top */}
                <div className="mb-4">
                  <div
                    className="flex items-center gap-3 p-3 hover:bg-accent rounded-md cursor-pointer transition-colors"
                    onClick={() => navigate('/liked-songs')}
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-blue-400 rounded-md flex items-center justify-center">
                      <Heart className="h-6 w-6 text-white" fill="white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground truncate">Liked Songs</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Pin className="h-3 w-3" /> Playlist
                      </p>
                    </div>
                  </div>
                </div>

                {/* Favourite Playlists Section */}
                <LikedPlaylistsSection />

                {/* Pinned Playlists Section - Only show if there are pinned items */}
                {pinnedItems.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs font-medium uppercase text-muted-foreground mb-2 px-2">
                      Pinned
                    </div>

                    {viewMode === 'list' ? (
                      <div className="space-y-1">
                        {pinnedItems.map(playlist => (
                          <div
                            key={playlist._id}
                            className="flex items-center gap-3 p-3 hover:bg-accent rounded-md cursor-pointer group transition-colors"
                            onClick={() => navigateToPlaylist(playlist._id)}
                          >
                            <img
                              src={playlist.imageUrl || '/default-playlist.jpg'}
                              alt={playlist.name}
                              className="w-12 h-12 object-cover rounded-md"
                              loading="lazy"
                            />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-foreground truncate">{playlist.name}</h3>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <ListMusic className="h-3 w-3" />
                                Playlist • <span className="flex items-center gap-1"><User className="h-3 w-3" /> {playlist.createdBy.fullName}</span>
                              </p>
                            </div>
                            <button
                              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground p-1.5 rounded-full hover:bg-accent transition-all"
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
                            className="bg-card border border-border rounded-lg p-4 hover:bg-accent transition-colors cursor-pointer group relative"
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
                                className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 bg-background/80 text-foreground p-1.5 rounded-full hover:bg-background hover:scale-105 transition-all border border-border"
                                onClick={(e) => togglePinned(playlist._id, e)}
                                title="Unpin"
                              >
                                <PinOff className="h-4 w-4" />
                              </button>
                            </div>
                            <h3 className="font-medium text-foreground truncate">{playlist.name}</h3>
                            <p className="text-sm text-muted-foreground truncate mt-1">
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
                      <div className="text-xs font-medium uppercase text-muted-foreground mb-2 px-2">
                        Your Playlists
                      </div>
                    )}

                    {viewMode === 'list' ? (
                      <div className="space-y-1">
                        {unpinnedItems.map(playlist => (
                          <div
                            key={playlist._id}
                            className="flex items-center gap-3 p-3 hover:bg-accent rounded-md cursor-pointer group transition-colors"
                            onClick={() => navigateToPlaylist(playlist._id)}
                          >
                            <img
                              src={playlist.imageUrl || '/default-playlist.jpg'}
                              alt={playlist.name}
                              className="w-12 h-12 object-cover rounded-md"
                              loading="lazy"
                            />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-foreground truncate">{playlist.name}</h3>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <ListMusic className="h-3 w-3" />
                                Playlist • <span className="flex items-center gap-1"><User className="h-3 w-3" /> {playlist.createdBy.fullName}</span>
                              </p>
                            </div>
                            <button
                              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground p-1.5 rounded-full hover:bg-accent transition-all"
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
                            className="bg-card border border-border rounded-lg p-4 hover:bg-accent transition-colors cursor-pointer group relative"
                            onClick={() => navigateToPlaylist(playlist._id)}
                          >
                            <div className="aspect-square mb-4 rounded-md overflow-hidden shadow-md relative group-hover:shadow-lg transition-all">
                              <img
                                src={playlist.imageUrl || '/default-playlist.jpg'}
                                alt={playlist.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <h3 className="font-medium text-foreground truncate">{playlist.name}</h3>
                            <p className="text-sm text-muted-foreground truncate mt-1">
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
          className="fixed bottom-24 right-6 bg-card/80 hover:bg-accent text-foreground p-3 rounded-full shadow-lg transition-all z-50 backdrop-blur-sm border border-border"
          aria-label="Scroll to top"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}

      <CreatePlaylistDialog isOpen={showCreateDialog} onClose={() => setShowCreateDialog(false)} />
    </main>
  );
};

// Liked Playlists Section Component
function LikedPlaylistsSection() {
  let likedIds: string[] = [];
  try {
    likedIds = JSON.parse(localStorage.getItem('liked_playlists') || '[]');
  } catch { }

  const { playlists } = usePlaylistStore();
  const navigate = useNavigate();
  const favs = playlists.filter(p => likedIds.includes(p._id)).slice(0, 6);

  if (favs.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="text-xs font-medium uppercase text-muted-foreground mb-2 px-2">
        Favourite Playlists
      </div>
      <div className="space-y-1">
        {favs.map((playlist) => (
          <div
            key={`fav-${playlist._id}`}
            className="flex items-center gap-3 p-3 hover:bg-accent rounded-md cursor-pointer group transition-colors"
            onClick={() => navigate(`/playlist/${playlist._id}`)}
          >
            <img
              src={playlist.imageUrl || '/default-playlist.jpg'}
              alt={playlist.name}
              className="w-12 h-12 object-cover rounded-md"
              loading="lazy"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-foreground truncate">{playlist.name}</h3>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Heart className="h-3 w-3" />
                Favourite • {playlist.createdBy?.fullName || 'Unknown'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LibraryPage;
