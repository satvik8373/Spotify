import React, { useEffect, useState, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import IndianMusicPlayer from '@/components/IndianMusicPlayer';
import { usePlaylistStore } from '../../stores/usePlaylistStore';
import { PlaylistCard } from '../../components/playlist/PlaylistCard';
import { useAuthStore } from '../../stores/useAuthStore';
import {
  PlusCircle,
  Disc,
  Heart,
  Clock,
  Library,
  Music2,
  PlayCircle,
  Share2,
  ThumbsUp,
  Hash,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useNavigate, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
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
import { RecentlyPlayed } from '@/components/RecentlyPlayed';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';

// Suggested genres

// Fixed top picks categories

// Interface for recent playlist
interface RecentPlaylist {
  _id: string;
  name: string;
  imageUrl?: string;
  lastPlayed: number;
}

// Interface for playlist metrics
interface PlaylistMetrics {
  clicks: number;
  likes: number;
  shares: number;
}

interface TopPlaylist extends RecentPlaylist {
  metrics: PlaylistMetrics;
  rank: number;
  isLiked: boolean;
}

// Add this CSS to handle the horizontal scroll and Netflix-like effects
const netflixRowStyles = `
	.netflix-row {
		position: relative;
		padding: 12px 0;
		scroll-behavior: smooth;
	}
	
	.netflix-row:hover .handle {
		opacity: 1;
	}
	
	.netflix-slider {
		display: flex;
		overflow-x: scroll;
		overflow-y: hidden;
		scroll-snap-type: x mandatory;
		gap: 6px;
		-ms-overflow-style: none;
		scrollbar-width: none;
		padding: 10px 0;
		padding-left: 8px;
	}
	
	.netflix-slider::-webkit-scrollbar {
		display: none;
	}
	
	.netflix-card {
		flex: 0 0 calc(50% - 8px); /* Show 2 cards on mobile */
		scroll-snap-align: start;
		position: relative;
		transition: all 0.3s ease;
		transform-origin: center left;
	}
	
	@media (min-width: 640px) {
		.netflix-card {
			flex: 0 0 calc(33.333% - 8px); /* Show 3 cards on tablet */
		}
	}
	
	@media (min-width: 1024px) {
		.netflix-card {
			flex: 0 0 290px; /* Fixed width on desktop */
		}
		
		.netflix-card:hover {
			transform: scale(1.1);
			z-index: 2;
		}
		
		.netflix-card:hover ~ .netflix-card {
			transform: translateX(20px);
		}
	}
	
	.netflix-rank {
		position: absolute;
		left: -8px;
		top: 50%;
		transform: translateY(-50%);
		font-size: 85px;
		font-weight: 800;
		opacity: 0.8;
		text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
		-webkit-text-stroke: 2px #fff;
		color: transparent;
		z-index: 1;
	}
	
	@media (min-width: 640px) {
		.netflix-rank {
			left: -12px;
			font-size: 110px;
		}
	}
	
	@media (min-width: 1024px) {
		.netflix-rank {
			left: -15px;
			font-size: 130px;
		}
	}
`;

const HomePage = () => {
  const {
    featuredPlaylists,
    userPlaylists,
    fetchFeaturedPlaylists,
    fetchUserPlaylists,
    createPlaylist,
    publicPlaylists,
    fetchPublicPlaylists,
  } = usePlaylistStore();
  const { isAuthenticated, userId } = useAuthStore();
  const navigate = useNavigate();
  const [showCreatePlaylistDialog, setShowCreatePlaylistDialog] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showAllPlaylists, setShowAllPlaylists] = useState(false);
  const [recentPlaylists, setRecentPlaylists] = useState<RecentPlaylist[]>([]);
  const [topPlaylists, setTopPlaylists] = useState<TopPlaylist[]>([]);
  const [sortBy, setSortBy] = useState<'clicks' | 'likes' | 'shares'>('clicks');

  const { indianTrendingSongs } =
    useMusicStore();

  const { setCurrentSong } = usePlayerStore();

  useEffect(() => {
    fetchFeaturedPlaylists();
    fetchPublicPlaylists();
    if (isAuthenticated) {
      fetchUserPlaylists();
    }
  }, [fetchFeaturedPlaylists, fetchUserPlaylists, fetchPublicPlaylists, isAuthenticated]);

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

  // Load top playlists
  useEffect(() => {
    // For authenticated users, use their playlists
    if (isAuthenticated && userPlaylists.length > 0) {
      try {
        const saved = localStorage.getItem('playlist_metrics') || '{}';
        const metrics = JSON.parse(saved);

        const top = userPlaylists
          .map((playlist, index) => ({
            _id: playlist._id,
            name: playlist.name,
            imageUrl: playlist.imageUrl,
            lastPlayed: Date.now(),
            metrics: metrics[playlist._id] || { clicks: 0, likes: 0, shares: 0 },
            rank: index + 1,
            isLiked: false,
          }))
          .sort((a, b) => b.metrics[sortBy] - a.metrics[sortBy])
          .slice(0, 10)
          .map((playlist, index) => ({ ...playlist, rank: index + 1 }));

        setTopPlaylists(top);
      } catch (error) {
        console.error('Error loading top playlists:', error);
      }
    }
    // For non-authenticated users, use featured playlists or create dummy ones
    else {
      // If we have featured playlists, use those
      if (featuredPlaylists.length > 0) {
        const top = featuredPlaylists
          .map((playlist, index) => ({
            _id: playlist._id,
            name: playlist.name,
            imageUrl: playlist.imageUrl,
            lastPlayed: Date.now(),
            metrics: {
              clicks: Math.floor(Math.random() * 1000) + 100,
              likes: Math.floor(Math.random() * 500) + 50,
              shares: Math.floor(Math.random() * 200) + 10,
            },
            rank: index + 1,
            isLiked: false,
          }))
          .slice(0, 10)
          .map((playlist, index) => ({ ...playlist, rank: index + 1 }));

        setTopPlaylists(top);
      }
      // If no featured playlists, create dummy playlists
      else {
        const dummyPlaylists = [
          {
            _id: 'top1',
            name: "Today's Top Hits",
            imageUrl: 'https://i.scdn.co/image/ab67706f000000020377b345bbe437803ac0bc0b',
          },
          {
            _id: 'top2',
            name: 'RapCaviar',
            imageUrl: 'https://i.scdn.co/image/ab67706f00000002ffa215be1a4c64e3cbf59d1e',
          },
          {
            _id: 'top3',
            name: 'All Out 2010s',
            imageUrl: 'https://i.scdn.co/image/ab67706f0000000278b4745cb9ce8ffe32d763bc',
          },
          {
            _id: 'top4',
            name: 'Rock Classics',
            imageUrl: 'https://i.scdn.co/image/ab67706f0000000278b4745cb9ce8ffe32d763bc',
          },
          {
            _id: 'top5',
            name: 'Chill Hits',
            imageUrl: 'https://i.scdn.co/image/ab67706f00000002b60db5d0557bcd3ad97a44a7',
          },
          {
            _id: 'top6',
            name: 'Viva Latino',
            imageUrl: 'https://i.scdn.co/image/ab67706f00000002b70e0223f544b1faa2e95ed0',
          },
          {
            _id: 'top7',
            name: 'Mood Booster',
            imageUrl: 'https://i.scdn.co/image/ab67706f00000002bd0e19e810bb4b55ab164a95',
          },
          {
            _id: 'top8',
            name: 'Peaceful Piano',
            imageUrl: 'https://i.scdn.co/image/ab67706f00000002ca5a7517156021292e5663a4',
          },
          {
            _id: 'top9',
            name: 'Indie Rock',
            imageUrl: 'https://i.scdn.co/image/ab67706f000000025f7327d3fdc71af27917adba',
          },
          {
            _id: 'top10',
            name: 'Sleep',
            imageUrl: 'https://i.scdn.co/image/ab67706f00000002b70e0223f544b1faa2e95ed0',
          },
        ].map((playlist, index) => ({
          ...playlist,
          lastPlayed: Date.now(),
          metrics: {
            clicks: Math.floor(Math.random() * 1000) + 100,
            likes: Math.floor(Math.random() * 500) + 50,
            shares: Math.floor(Math.random() * 200) + 10,
          },
          rank: index + 1,
          isLiked: false,
        }));

        setTopPlaylists(dummyPlaylists);
      }
    }
  }, [userPlaylists, sortBy, isAuthenticated, featuredPlaylists]);

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

  // Function to get displayed items (6 total)
  const getDisplayedItems = () => {
    const items = [];

    // Always add Liked Songs first
    items.push({
      id: 'liked-songs',
      title: 'Liked Songs',
      image: 'https://misc.scdn.co/liked-songs/liked-songs-640.png',
      path: '/liked-songs',
      gradient: 'from-indigo-500 to-indigo-900',
      fixed: true,
    });

    // Add recent playlists
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

    // If we don't have enough recent playlists, add some user playlists
    if (items.length < 6 && isAuthenticated && userPlaylists.length > 0) {
      const remainingSlots = 6 - items.length;
      const additionalPlaylists = userPlaylists
        .filter(p => !recentPlaylists.some(rp => rp._id === p._id))
        .slice(0, remainingSlots);
      items.push(...additionalPlaylists);
    }

    return items.slice(0, 6);
  };

  // Handle playlist click
  const handlePlaylistClick = (playlist: any) => {
    // For regular playlists with an id that's not a dummy "top" id
    if (playlist._id && !playlist._id.startsWith('top')) {
      // Update metrics
      updateMetrics(playlist._id, 'clicks');

      // Add to recent playlists
      addToRecentPlaylists(playlist);

      // Navigate to playlist
      navigate(`/playlist/${playlist._id}`);
    }
    // For dummy top playlists (non-authenticated users)
    else if (playlist._id && playlist._id.startsWith('top')) {
      // Show a toast that encourages sign-up
      toast(
        <div>
          <p className="font-medium">{playlist.name}</p>
          <p className="text-xs mt-1">Sign up to create and save playlists</p>
        </div>
      );

      // Still record metrics for the interaction
      if (playlist._id) {
        updateMetrics(playlist._id, 'clicks');
      }
    }
    // For items like "Liked Songs"
    else if (playlist.path) {
      navigate(playlist.path);
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

  // Update playlist metrics
  const updateMetrics = (playlistId: string, metric: keyof PlaylistMetrics) => {
    try {
      const saved = localStorage.getItem('playlist_metrics') || '{}';
      const metrics = JSON.parse(saved);

      metrics[playlistId] = metrics[playlistId] || { clicks: 0, likes: 0, shares: 0 };
      metrics[playlistId][metric]++;

      localStorage.setItem('playlist_metrics', JSON.stringify(metrics));

      // Update state
      setTopPlaylists(current =>
        current.map(playlist =>
          playlist._id === playlistId
            ? {
                ...playlist,
                metrics: {
                  ...playlist.metrics,
                  [metric]: playlist.metrics[metric] + 1,
                },
              }
            : playlist
        )
      );
    } catch (error) {
      console.error('Error updating metrics:', error);
    }
  };

  // Handle like

  // Handle share

  // Add style tag for Netflix-like effects
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = netflixRowStyles;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <main className="flex flex-col h-full overflow-hidden bg-gradient-to-b from-zinc-900 to-black">
      <ScrollArea className="flex-1 h-full" ref={scrollRef}>
        <div className="pt-1 pb-6">
          {/* Recently played section */}
          <div className="px-2 sm:px-4">
            {/* Top Picks Section - Enhanced Design */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold tracking-tight">Recently played</h2>
                {isAuthenticated && userPlaylists.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-white/10 rounded-full"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-56 bg-zinc-800 border-zinc-700 text-white"
                    >
                      {userPlaylists.map(playlist => (
                        <DropdownMenuItem
                          key={playlist._id}
                          className="hover:bg-white/10 cursor-pointer py-2"
                          onClick={() => handlePlaylistClick(playlist)}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded overflow-hidden">
                              {playlist.imageUrl ? (
                                <img
                                  src={playlist.imageUrl}
                                  alt={playlist.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-purple-500 to-purple-900 flex items-center justify-center">
                                  <Music2 className="h-4 w-4 text-white" />
                                </div>
                              )}
                            </div>
                            <span className="text-sm truncate">{playlist.name}</span>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {getDisplayedItems().map((item: any) => (
                  <div
                    key={item._id || item.id}
                    onClick={() => handlePlaylistClick(item)}
                    className="group relative h-[56px] rounded-md overflow-hidden transition-all duration-300 hover:bg-zinc-800/80 cursor-pointer"
                  >
                    <div className="absolute inset-0 bg-zinc-800/60" />
                    <div className="relative flex items-center h-full">
                      <div className="w-[56px] h-full flex-shrink-0">
                        {item.image || item.imageUrl ? (
                          <img
                            src={item.image || item.imageUrl}
                            alt={item.title || item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-500 to-purple-900 flex items-center justify-center">
                            <Music2 className="h-5 w-5 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 px-3">
                        <h3 className="font-bold text-sm leading-tight truncate">
                          {item.title || item.name}
                        </h3>
                      </div>
                      <div className="absolute right-2 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-1 group-hover:translate-y-0">
                        <Button
                          size="icon"
                          className="rounded-full bg-green-500 hover:bg-green-400 hover:scale-105 text-black h-8 w-8 shadow-lg"
                        >
                          <PlayCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recently Played Section */}
            <RecentlyPlayed />

            {/* Public Playlists Section - Moved position */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-bold tracking-tight">Public Playlists</h2>
                <Button
                  variant="ghost"
                  className="text-zinc-400 hover:text-white text-xs sm:text-sm h-8"
                  onClick={() => navigate('/playlists')}
                >
                  See all
                </Button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-3">
                {publicPlaylists.map(playlist => (
                  <div
                    key={playlist._id}
                    className="group relative transform transition-all duration-300 hover:scale-[1.02]"
                    onClick={() => handlePlaylistClick(playlist)}
                  >
                    <PlaylistCard
                      playlist={playlist}
                      isOwner={isAuthenticated && userId === playlist.createdBy.clerkId}
                    />
                  </div>
                ))}
                {publicPlaylists.length === 0 && (
                  <div className="col-span-full py-8 text-center text-muted-foreground">
                    No public playlists available
                  </div>
                )}
              </div>
            </div>

            {/* Featured Playlists Section */}
            {featuredPlaylists.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold tracking-tight">Featured Playlists</h2>
                  <Button
                    variant="ghost"
                    className="text-zinc-400 hover:text-white text-xs sm:text-sm h-8"
                    onClick={() => navigate('/library')}
                  >
                    See all
                  </Button>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-3">
                  {featuredPlaylists.map(playlist => (
                    <div
                      key={playlist._id}
                      className="group relative transform transition-all duration-300 hover:scale-[1.02]"
                    >
                      <PlaylistCard
                        playlist={playlist}
                        isOwner={isAuthenticated && userId === playlist.createdBy.clerkId}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Today's Hits Section */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold tracking-tight">Today's Hits</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                {indianTrendingSongs.slice(0, 6).map((song, index) => (
                  <div
                    key={song.id || index}
                    className="group flex items-center gap-3 p-2 rounded hover:bg-zinc-800/50 cursor-pointer transition-colors"
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
                    <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0">
                      <img
                        src={song.image}
                        alt={song.title}
                        className="object-cover w-full h-full"
                        onError={e =>
                          ((e.target as HTMLImageElement).src =
                            'https://placehold.co/400x400/1f1f1f/959595?text=No+Image')
                        }
                      />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <PlayCircle className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight truncate">{song.title}</p>
                      <p className="text-xs text-zinc-400 truncate mt-0.5">
                        {song.artist || 'Unknown Artist'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 px-2 sm:px-4 gap-2">
              <h2 className="text-lg font-bold tracking-tight">Indian Music</h2>
            </div>
            <div className="gap-2 px-2 sm:px-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {indianTrendingSongs.slice(0, 6).map(song => (
                <div
                  key={song.id}
                  className="flex flex-col rounded-md overflow-hidden cursor-pointer group transition-all duration-300 bg-zinc-800/30 hover:bg-zinc-800/70"
                  onClick={() => {
                    // Convert IndianSong to Song format
                    const convertedSong = {
                      _id: song.id,
                      title: song.title,
                      artist: song.artist || 'Unknown Artist',
                      albumId: null,
                      imageUrl: song.image,
                      audioUrl: song.url || '',
                      duration: song.duration || '0:00',
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
                    />
                    <div className="absolute bottom-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="bg-green-500 rounded-full p-1.5 text-black">
                        <PlayCircle size={20} />
                      </button>
                    </div>
                  </div>
                  <div className="p-2">
                    <h3 className="text-sm font-medium truncate">{song.title}</h3>
                    <p className="text-xs text-zinc-400 truncate mt-0.5">
                      {song.artist || 'Unknown Artist'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Indian Music Player Component */}
          <IndianMusicPlayer />

          {/* Bottom padding for mobile player */}
          <div className="h-2"></div>
        </div>

        {/* Top Charts Section */}
        <div className="container px-2 md:px-4 lg:px-6 py-4">
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-2xl font-bold">Top Charts</h2>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs hover:bg-black/10">
                  Sort by: {sortBy === 'clicks' ? 'Plays' : sortBy === 'likes' ? 'Likes' : 'Shares'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSortBy('clicks')}>Plays</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('likes')}>Likes</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('shares')}>Shares</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="netflix-row">
            <div className="netflix-slider">
              {topPlaylists.map((playlist) => (
                <div
                  key={playlist._id}
                  className="netflix-card relative"
                  onClick={() => handlePlaylistClick(playlist)}
                >
                  <div className="netflix-rank">{playlist.rank}</div>
                  <PlaylistCard
                    playlist={{
                      _id: playlist._id,
                      name: playlist.name,
                      imageUrl: playlist.imageUrl || '',
                      isPublic: true,
                      songs: [],
                      featured: false,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                      createdBy: { _id: '', clerkId: '', fullName: '', imageUrl: '' },
                      description: ''
                    }}
                    isOwner={false}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Create Playlist Dialog */}
      <Dialog open={showCreatePlaylistDialog} onOpenChange={setShowCreatePlaylistDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl">Create a new playlist</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Give your playlist a name and description. You can add songs later.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="playlist-name" className="text-white">
                Name
              </Label>
              <Input
                id="playlist-name"
                value={newPlaylistName}
                onChange={e => setNewPlaylistName(e.target.value)}
                className="bg-zinc-800 border-zinc-700 focus-visible:ring-green-500"
                placeholder="My Awesome Playlist"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="playlist-description" className="text-white">
                Description (optional)
              </Label>
              <Textarea
                id="playlist-description"
                value={newPlaylistDesc}
                onChange={e => setNewPlaylistDesc(e.target.value)}
                className="bg-zinc-800 border-zinc-700 focus-visible:ring-green-500 resize-none"
                placeholder="A collection of my favorite songs"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreatePlaylistDialog(false)}
              className="border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreatePlaylist}
              className="bg-green-500 hover:bg-green-600 text-black font-medium"
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
