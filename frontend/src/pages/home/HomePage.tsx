import { useEffect, useState, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import IndianMusicPlayer from '@/components/IndianMusicPlayer';
import { usePlaylistStore } from '../../stores/usePlaylistStore';
import { PlaylistCard } from '../../components/playlist/PlaylistCard';
import { useAuthStore } from '../../stores/useAuthStore';
import { useAuth } from '@/contexts/AuthContext';
import { WifiOff, PlayCircle } from 'lucide-react';
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
    featuredPlaylists,
    publicPlaylists,
    fetchFeaturedPlaylists,
    fetchUserPlaylists,
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
    fetchFeaturedPlaylists();
    fetchPublicPlaylists();
    if (isAuthenticated) {
      fetchUserPlaylists();
    }
    // Ensure Indian songs are available (will use mock data first then try network)
    if (!indianTrendingSongs || indianTrendingSongs.length === 0) {
      fetchIndianTrendingSongs().catch(() => { });
    }
  }, [fetchFeaturedPlaylists, fetchUserPlaylists, fetchPublicPlaylists, isAuthenticated, fetchIndianTrendingSongs, indianTrendingSongs?.length]);

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
      fetchUserPlaylists();

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

  return (
    <main
      className="flex flex-col h-full overflow-hidden bg-[#121212]"
    >
      <ScrollArea className="flex-1 h-full" ref={scrollRef}>
        <div className="pt-4 pb-24 w-full max-w-[1950px] mx-auto px-3 md:px-8 box-border relative">
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

            {/* Public Playlists Section */}
            {isOnline && publicPlaylists.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold tracking-tight">Public Playlists</h2>
                  <Button
                    variant="ghost"
                    className="text-sm text-muted-foreground hover:text-foreground font-bold h-auto px-0 hover:underline"
                    onClick={() => navigate('/library')}
                  >
                    Show all
                  </Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-6">
                  {publicPlaylists
                    .filter(playlist => playlist.isPublic !== false)
                    .map(playlist => (
                      <PlaylistCard
                        key={playlist._id}
                        playlist={playlist}
                      />
                    ))}
                </div>
              </div>
            )}


            {/* Featured Playlists Section */}
            {featuredPlaylists.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold tracking-tight">Featured Playlists</h2>
                  <Button
                    variant="ghost"
                    className="text-sm text-muted-foreground hover:text-foreground font-bold h-auto px-0 hover:underline"
                    onClick={() => navigate('/library')}
                  >
                    Show all
                  </Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-6">
                  {featuredPlaylists.map(playlist => (
                    <PlaylistCard
                      key={playlist._id}
                      playlist={playlist}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Today's Hits Section - only when trending available */}
            {hasTrending && (
              <div className="mb-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1">
                  {indianTrendingSongs.slice(0, 6).map((song, index) => (
                    <div
                      key={song.id || index}
                      className="group flex items-center gap-2 p-1.5 rounded hover:bg-muted/70 dark:hover:bg-muted/50 cursor-pointer transition-colors"
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
                      <div className="relative w-9 h-9 rounded overflow-hidden flex-shrink-0">
                        <img
                          src={song.image}
                          alt={song.title}
                          className="object-cover w-full h-full"
                          loading="lazy"
                          onError={e =>
                          ((e.target as HTMLImageElement).src =
                            'https://placehold.co/400x400/1f1f1f/959595?text=No+Image')
                          }
                        />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <PlayCircle className="h-4 w-4 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium leading-tight truncate">{song.title}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {song.artist || 'Unknown Artist'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isOnline && hasTrending && (
              <div className="mb-5">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
                  {indianTrendingSongs.slice(0, 6).map(song => (
                    <div
                      key={song.id}
                      className="flex flex-col rounded-md overflow-hidden cursor-pointer group transition-all duration-300 bg-muted/50 dark:bg-muted/30 hover:bg-muted/80 dark:hover:bg-muted/50 border border-border/60"
                      onClick={() => {
                        // Convert IndianSong to Song format (only if valid data exists)
                        if (!song.id || !song.title) return;

                        const convertedSong = {
                          _id: song.id,
                          title: song.title,
                          artist: song.artist || '',
                          albumId: null,
                          imageUrl: song.image || '',
                          audioUrl: song.url || '',
                          duration: song.duration || '',
                          createdAt: new Date().toISOString(),
                          updatedAt: new Date().toISOString(),
                        };
                        setCurrentSong(convertedSong as any);
                      }}
                    >
                      <div className="aspect-square relative overflow-hidden">
                        <img
                          src={song.image || '/placeholder-song.png'}
                          alt={song.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute bottom-1 right-1 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="bg-green-500 rounded-full p-1 text-black shadow-md">
                            <PlayCircle size={16} />
                          </button>
                        </div>
                      </div>
                      <div className="p-1.5">
                        <h3 className="text-[11px] font-medium leading-snug line-clamp-2">{song.title}</h3>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {song.artist || 'Unknown Artist'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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