import { useEffect, useState, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import IndianMusicPlayer from '@/components/IndianMusicPlayer';
import { usePlaylistStore } from '../../stores/usePlaylistStore';
import { PlaylistCard } from '../../components/playlist/PlaylistCard';
import { useAuthStore } from '../../stores/useAuthStore';
import { useAuth } from '@/contexts/AuthContext';
import { WifiOff, Play } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useMusicStore } from '@/stores/useMusicStore';
import { toast } from 'react-hot-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useLikedSongsStore } from '@/stores/useLikedSongsStore';
import { cn } from '@/lib/utils';
import { RecentlyPlayedCard } from '@/components/RecentlyPlayedCard';
//

// Suggested genres

// Fixed top picks categories

// Interface for recent playlist
interface RecentPlaylist {
  _id: string;
  name: string;
  imageUrl?: string;
  lastPlayed: number;
}




const HomePage = () => {
  const {
    publicPlaylists,
    fetchPublicPlaylists,
    createPlaylist,
  } = usePlaylistStore();
  const { isAuthenticated, userId } = useAuthStore();
  const navigate = useNavigate();
  const { isOnline } = useAuth();
  const [showCreatePlaylistDialog, setShowCreatePlaylistDialog] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [recentPlaylists, setRecentPlaylists] = useState<RecentPlaylist[]>([]);


  const { indianTrendingSongs, fetchIndianTrendingSongs } =
    useMusicStore();

  const { setCurrentSong } = usePlayerStore();
  const { loadLikedSongs } = useLikedSongsStore();
  const hasTrending = indianTrendingSongs && indianTrendingSongs.length > 0;

  // Load liked songs count
  useEffect(() => {
    loadLikedSongs();
  }, [loadLikedSongs]);


  useEffect(() => {
    const initializeHomePage = async () => {
      try {
        // Load all data in parallel for faster loading
        await Promise.all([
          fetchPublicPlaylists(),
        ]);
        
        // Ensure Indian songs are available (will use mock data first then try network)
        if (!indianTrendingSongs || indianTrendingSongs.length === 0) {
          fetchIndianTrendingSongs().catch(() => { });
        }
        
        // Small delay to ensure smooth transition from splash screen
        setTimeout(() => {
          setIsInitialLoading(false);
        }, 100);
      } catch (error) {
        console.error('Error initializing homepage:', error);
        // Still show content even if some requests fail
        setTimeout(() => {
          setIsInitialLoading(false);
        }, 200);
      }
    };

    initializeHomePage();
  }, [fetchPublicPlaylists, isAuthenticated, fetchIndianTrendingSongs, indianTrendingSongs?.length]);

  // Load recent playlists from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('recent_playlists');
      if (saved) {
        const items = JSON.parse(saved);
        setRecentPlaylists(items);
      }
    } catch (error) {
      console.error('Error loading recent playlists:', error);
    }
  }, []);



  // Function to add a playlist to recent
  const addToRecentPlaylists = (playlist: any) => {
    try {
      const newRecent = {
        _id: playlist._id,
        name: playlist.name,
        imageUrl: playlist.imageUrl,
        lastPlayed: Date.now(),
      };

      setRecentPlaylists(current => {
        // Remove if already exists
        const filtered = current.filter(p => p._id !== playlist._id);
        // Add to beginning
        const updated = [newRecent, ...filtered].slice(0, 5);
        // Save to localStorage
        localStorage.setItem('recent_playlists', JSON.stringify(updated));
        return updated;
      });
    } catch (error) {
      console.error('Error updating recent playlists:', error);
    }
  };

  // Function to get displayed items (prefer recent; fallback to public playlists)
  const getDisplayedItems = () => {
    const items = [];

    // Add recent playlists only if they exist
    if (recentPlaylists.length > 0) {
      items.push(
        ...recentPlaylists.map(playlist => ({
          _id: playlist._id,
          name: playlist.name,
          imageUrl: playlist.imageUrl,
          path: `/playlist/${playlist._id}`,
        }))
      );
    }

    // If we don't have enough recent playlists, add public playlists
    // Limit to 7 items (7 + 1 Liked Songs = 8 total cards)
    if (items.length < 7 && publicPlaylists.length > 0) {
      const remainingSlots = 7 - items.length;
      const additional = publicPlaylists
        .filter(p => !recentPlaylists.some(rp => rp._id === p._id))
        .slice(0, remainingSlots)
        .map(p => ({ _id: p._id, name: p.name, imageUrl: p.imageUrl, path: `/playlist/${p._id}` }));
      items.push(...additional);
    }

    return items.slice(0, 7); // 7 items + 1 Liked Songs = 8 total cards
  };

  // Handle playlist click (only for real playlists, no demo data)
  const handlePlaylistClick = (playlist: any) => {
    // Only handle real playlists with valid IDs
    if (playlist._id) {
      // Add to recent playlists
      addToRecentPlaylists(playlist);

      // Navigate to playlist
      navigate(`/playlist/${playlist._id}`);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to create a playlist');
      return;
    }

    if (!newPlaylistName.trim()) {
      toast.error('Please enter a playlist name');
      return;
    }

    setIsCreating(true);

    try {
      await createPlaylist(
        newPlaylistName,
        newPlaylistDesc || `A playlist created by ${userId}`,
        true
      );

      toast.success('Playlist created successfully!');
      setShowCreatePlaylistDialog(false);
      setNewPlaylistName('');
      setNewPlaylistDesc('');

      // Refresh user playlists
      fetchPublicPlaylists();

      // Navigate to library after creation
      navigate('/library');
    } catch (error) {
      console.error('Error creating playlist:', error);
      toast.error('Failed to create playlist. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };






  const [activeTab, setActiveTab] = useState<'all' | 'music' | 'podcasts'>('all');
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);
  const [likedSongsColor, setLikedSongsColor] = useState<string | null>(null);

  // Handle color changes - set Liked Songs color as default
  const handleColorChange = (color: string | null, isLikedSongs: boolean = false) => {
    setHoveredColor(color);
    // If this is the Liked Songs card, save its color as default
    if (isLikedSongs && color) {
      setLikedSongsColor(color);
    }
  };

  const activeColor = hoveredColor || likedSongsColor || '#121212';

  // Show loading state with proper layout structure
  if (isInitialLoading) {
    return (
      <main className="flex flex-col h-full overflow-hidden bg-[#121212]">
        <ScrollArea className="flex-1 h-full smooth-scroll">
          <div className="pt-4 pb-24 w-full max-w-[1950px] mx-auto px-3 md:px-8 box-border relative min-h-screen">
            {/* Navigation Tabs Skeleton */}
            <div className="mb-4 hidden md:flex gap-2">
              <div className="px-3 py-1 rounded-full w-12 h-8 skeleton-pulse"></div>
              <div className="px-3 py-1 rounded-full w-16 h-8 skeleton-pulse"></div>
              <div className="px-3 py-1 rounded-full w-20 h-8 skeleton-pulse"></div>
            </div>

            {/* Recently played skeleton */}
            <div className="mt-2 mb-8">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div 
                    key={i} 
                    className="h-[48px] md:h-[64px] w-full rounded-[4px] skeleton-pulse" 
                    style={{animationDelay: `${i * 0.1}s`}}
                  ></div>
                ))}
              </div>
            </div>

            {/* Section skeletons */}
            {Array.from({ length: 2 }).map((_, sectionIndex) => (
              <section key={sectionIndex} className="mb-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-8 rounded w-48 skeleton-pulse"></div>
                  <div className="h-6 rounded w-20 skeleton-pulse"></div>
                </div>
                <div className="relative -mx-3 md:-mx-8">
                  <div className="overflow-x-auto overflow-y-visible hidden-scroll px-3 md:px-8 py-2">
                    <div className="flex gap-0">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex-none w-[calc(100%/2.2)] sm:w-[calc(100%/3.3)] md:w-[calc(100%/4.3)] lg:w-[calc(100%/5.5)] xl:w-[calc(100%/5.5)]">
                          <div className="p-3">
                            <div 
                              className="w-full aspect-square rounded skeleton-pulse mb-2" 
                              style={{animationDelay: `${i * 0.1}s`}}
                            ></div>
                            <div 
                              className="h-4 rounded skeleton-pulse" 
                              style={{animationDelay: `${i * 0.1 + 0.1}s`}}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            ))}
          </div>
        </ScrollArea>
      </main>
    );
  }

  return (
    <main
      className="flex flex-col h-full overflow-hidden bg-[#121212] opacity-0 animate-[fadeIn_0.3s_ease-out_forwards]"
    >
      <ScrollArea className="flex-1 h-full smooth-scroll" ref={scrollRef}>
        <div className="pt-4 pb-24 w-full max-w-[1950px] mx-auto px-3 md:px-8 box-border relative min-h-screen">
          {/* Gradient background container - Spotify-style dynamic background */}


          {/* Dynamic Background Setup */}
          {isOnline && getDisplayedItems().length > 0 && (
            <>
              {/* 1. Underlying Animated Color Layer */}
              <div
                className="absolute top-0 left-0 right-0 h-[280px] pointer-events-none hidden md:block"
                style={{
                  backgroundColor: activeColor,
                  opacity: 0.4,
                  transition: 'background-color 2500ms ease-in-out'
                }}
              />

              {/* 2. Gradient Overlay to fade into the dark background */}
              <div
                className="absolute top-0 left-0 right-0 h-[280px] pointer-events-none hidden md:block"
                style={{
                  background: 'linear-gradient(to bottom, rgba(18,18,18,0) 0%, #121212 100%)'
                }}
              />
            </>
          )}

          <div className="relative z-10">
            {/* Navigation Tabs - All, Music, Podcasts */}
            <div className="mb-4 hidden md:flex gap-2">
              <button
                onClick={() => setActiveTab('all')}
                className={cn(
                  'px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 min-w-[40px]',
                  activeTab === 'all'
                    ? 'bg-white text-black'
                    : 'bg-white/10 text-white hover:bg-white/15'
                )}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab('music')}
                className={cn(
                  'px-3 py-1 rounded-full text-sm font-medium transition-all duration-200',
                  activeTab === 'music'
                    ? 'bg-white text-black'
                    : 'bg-white/10 text-white hover:bg-white/15'
                )}
              >
                Music
              </button>
              <button
                onClick={() => setActiveTab('podcasts')}
                className={cn(
                  'px-3 py-1 rounded-full text-sm font-medium transition-all duration-200',
                  activeTab === 'podcasts'
                    ? 'bg-white text-black'
                    : 'bg-white/10 text-white hover:bg-white/15'
                )}
              >
                Podcasts
              </button>
            </div>

            {/* Offline banner */}
            {!isOnline && (
              <div className="mb-3">
                <div className="bg-yellow-500/10 border border-yellow-600 text-yellow-200 text-xs sm:text-sm rounded-md px-3 py-2">
                  You are offline. Some features may be unavailable.
                </div>
              </div>
            )}

            {/* Offline placeholder */}
            {!isOnline && (
              <div className="mb-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <WifiOff className="h-4 w-4 text-yellow-400" />
                  <span className="text-xs sm:text-sm">No internet connection</span>
                </div>
              </div>
            )}

            {/* Recently played - Grid of 8 items */}
            {isOnline && getDisplayedItems().length > 0 && (
              <div className="mt-2 mb-8">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  {/* Liked Songs Card - Pinned First */}
                  <RecentlyPlayedCard
                    id="liked-songs"
                    title="Liked Songs"
                    imageUrl="https://res.cloudinary.com/djqq8kba8/image/upload/v1765037854/spotify_clone/playlists/IMG_5130_enrlhm.jpg"
                    subtitle="Playlist"
                    type="playlist"
                    onClick={() => navigate('/liked-songs')}
                    onPlay={() => navigate('/liked-songs')}
                    onHoverChange={(color) => handleColorChange(color, true)}
                  />

                  {/* Other recently played items */}
                  {getDisplayedItems().map((item: any) => {
                    const itemId = item._id || item.id;
                    return (
                      <RecentlyPlayedCard
                        key={itemId}
                        id={itemId}
                        title={item.title || item.name}
                        imageUrl={item.image || item.imageUrl}
                        subtitle={item.description || 'Playlist'}
                        type="playlist"
                        onClick={() => handlePlaylistClick(item)}
                        onPlay={() => handlePlaylistClick(item)}
                        onHoverChange={handleColorChange}
                      />
                    );
                  })}
                </div>
              </div>
            )}



            {/* All Public Playlists */}
            {isOnline && publicPlaylists.length > 0 && (
              <section className="mb-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-white text-2xl md:text-[30px] font-bold tracking-tight leading-none">
                    Popular Playlists
                  </h2>
                  <button
                    onClick={() => navigate('/library')}
                    className="text-[#adadad] text-sm md:text-base font-bold tracking-wider uppercase hover:underline transition-all"
                  >
                    SHOW ALL
                  </button>
                </div>

                <div className="relative -mx-3 md:-mx-8">
                  <div className="overflow-x-auto overflow-y-visible hidden-scroll px-3 md:px-8 py-2">
                    <div className="flex gap-0">
                      {publicPlaylists.map((playlist) => (
                        <div key={playlist._id} className="flex-none w-[calc(100%/2.2)] sm:w-[calc(100%/3.3)] md:w-[calc(100%/4.3)] lg:w-[calc(100%/5.5)] xl:w-[calc(100%/5.5)]">
                          <PlaylistCard
                            playlist={playlist}
                            showDescription={true}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Trending Songs Section - Horizontal Slider */}
            {isOnline && hasTrending && (
              <section className="mb-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-white text-2xl md:text-[30px] font-bold tracking-tight leading-none">
                    Trending Songs
                  </h2>
                </div>

                <div className="relative -mx-3 md:-mx-8">
                  <div className="overflow-x-auto overflow-y-visible hidden-scroll px-3 md:px-8 py-2">
                    <div className="flex gap-0">
                      {indianTrendingSongs.map((song, index) => (
                        <div key={song.id || index} className="flex-none w-[calc(100%/2.2)] sm:w-[calc(100%/3.3)] md:w-[calc(100%/4.3)] lg:w-[calc(100%/5.5)] xl:w-[calc(100%/5.5)]">
                          <div
                            className="group relative w-full rounded-md transition-colors duration-200 cursor-pointer p-3"
                            onClick={() => {
                              const songToPlay = useMusicStore.getState().convertIndianSongToAppSong(song);
                              setCurrentSong(songToPlay);

                              // Add to recently played
                              try {
                                const recentItem = {
                                  id: song.id,
                                  title: song.title,
                                  imageUrl: song.image,
                                  type: 'song',
                                  date: Date.now(),
                                  data: songToPlay,
                                };

                                const savedItems = localStorage.getItem('recently_played');
                                let items = savedItems ? JSON.parse(savedItems) : [];
                                items = items.filter((i: any) => i.id !== song.id);
                                items.unshift(recentItem);
                                if (items.length > 20) items = items.slice(0, 20);
                                localStorage.setItem('recently_played', JSON.stringify(items));
                                document.dispatchEvent(new Event('recentlyPlayedUpdated'));
                              } catch (error) {
                                console.error('Error updating recently played:', error);
                              }
                            }}
                          >
                            {/* Hover background */}
                            <div className="absolute inset-0 bg-[#1a1a1a] rounded-md transition-opacity duration-200 pointer-events-none opacity-0 group-hover:opacity-100" />
                            
                            <div className="relative">
                              {/* Song Image */}
                              <div className="relative w-full aspect-square mb-1">
                                <div className="w-full h-full rounded overflow-hidden shadow-lg">
                                  <img
                                    src={song.image || '/placeholder-song.png'}
                                    alt={song.title}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                    onError={e =>
                                      ((e.target as HTMLImageElement).src =
                                        'https://placehold.co/400x400/1f1f1f/959595?text=No+Image')
                                    }
                                  />
                                </div>

                                {/* Play Button */}
                                <div className="absolute bottom-2 right-2 transition-all duration-300 ease-in-out opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const songToPlay = useMusicStore.getState().convertIndianSongToAppSong(song);
                                      setCurrentSong(songToPlay);
                                    }}
                                    className="w-12 h-12 rounded-full bg-[#1ed760] hover:bg-[#1fdf64] hover:scale-105 flex items-center justify-center shadow-2xl transition-all duration-200"
                                    aria-label="Play song"
                                  >
                                    <Play className="w-5 h-5 ml-0.5" fill="black" stroke="none" />
                                  </button>
                                </div>
                              </div>

                              {/* Song Info - Fixed height */}
                              <div className="px-0 mt-2 w-full overflow-hidden h-[40px] flex items-start">
                                <p className="text-[#b3b3b3] text-xs font-normal line-clamp-2 leading-snug break-words">
                                  {song.title}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Indian Music Player Component */}
            <IndianMusicPlayer />

            {/* Bottom padding for mobile player */}
            <div className="h-2"></div>
          </div>
        </div>
      </ScrollArea>

      {/* Create Playlist Dialog */}
      <Dialog open={showCreatePlaylistDialog} onOpenChange={setShowCreatePlaylistDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl">Create a new playlist</DialogTitle>
            <DialogDescription>
              Give your playlist a name and description. You can add songs later.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="playlist-name">
                Name
              </Label>
              <Input
                id="playlist-name"
                value={newPlaylistName}
                onChange={e => setNewPlaylistName(e.target.value)}
                placeholder="My Awesome Playlist"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="playlist-description">
                Description (optional)
              </Label>
              <Textarea
                id="playlist-description"
                value={newPlaylistDesc}
                onChange={e => setNewPlaylistDesc(e.target.value)}
                placeholder="A collection of my favorite songs"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreatePlaylistDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreatePlaylist}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              disabled={isCreating || !newPlaylistName.trim()}
            >
              {isCreating ? 'Creating...' : 'Create Playlist'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default HomePage;