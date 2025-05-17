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
  ChevronRight,
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
  isPublic?: boolean;
}

// Add this CSS to handle the horizontal scroll and Netflix-like effects
const netflixRowStyles = `
	.netflix-row {
		position: relative;
		padding: 12px 0;
		scroll-behavior: smooth;
		width: 100%;
		overflow-x: hidden;
	}
	
	.netflix-row:hover .handle {
		opacity: 1;
	}
	
	.netflix-slider {
		display: flex;
		overflow-x: scroll;
		overflow-y: hidden;
		scroll-snap-type: x mandatory;
		gap: 16px;
		-ms-overflow-style: none;
		scrollbar-width: none;
		padding: 10px 0;
		padding-left: 16px;
		padding-right: 20px;
		margin-right: 4px;
		width: calc(100% - 4px);
		max-width: 100vw;
	}
	
	.netflix-slider::-webkit-scrollbar {
		display: none;
	}
	
	.netflix-card {
		flex: 0 0 calc(80% - 16px); /* Show larger cards on mobile */
		scroll-snap-align: start;
		position: relative;
		transition: all 0.3s ease;
		transform-origin: center left;
		z-index: 1;
		max-width: 260px; /* Even bigger max-width on mobile */
	}
	
	@media (min-width: 640px) {
		.netflix-card {
			flex: 0 0 calc(33.333% - 16px); /* Show 3 cards on tablet */
			max-width: 220px;
		}
	}
	
	@media (min-width: 1024px) {
		.netflix-card {
			flex: 0 0 220px; /* Fixed width on desktop */
			max-width: 220px;
		}
		
		.netflix-card:hover {
			transform: scale(1.07);
			z-index: 10;
		}
		
		.netflix-card:hover ~ .netflix-card {
			transform: translateX(20px);
		}
	}
	
	/* Updated card styles to match the example image */
	.card-wrapper {
		display: flex;
		flex-direction: column;
		width: 100%;
	}
	
	.card-image {
		width: 100%;
		aspect-ratio: 1/1;
		border-radius: 8px;
		overflow: hidden;
		margin-bottom: 8px;
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
	}
	
	.card-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	
	.card-content {
		padding: 0 2px;
	}
	
	.card-title {
		font-size: 0.9rem;
		font-weight: 600;
		color: white;
		margin-bottom: 2px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		letter-spacing: -0.2px;
	}
	
	.card-artist {
		font-size: 0.75rem;
		color: rgba(255,255,255,0.7);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		letter-spacing: -0.1px;
	}
	
	.play-button-overlay {
		position: absolute;
		bottom: 50px;
		right: 8px;
		opacity: 0;
		transition: opacity 0.2s ease;
		z-index: 5;
	}
	
	.netflix-card:hover .play-button-overlay {
		opacity: 1;
	}
	
	.netflix-rank {
		position: absolute;
		left: -16px;
		top: 50%;
		transform: translateY(-50%);
		font-size: 100px;
		font-weight: 800;
		opacity: 0.9;
		text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.8);
		-webkit-text-stroke: 2px #fff;
		color: transparent;
		z-index: 2;
		line-height: 1;
	}
	
	@media (min-width: 640px) {
		.netflix-rank {
			left: -20px;
			font-size: 120px;
		}
	}
	
	@media (min-width: 1024px) {
		.netflix-rank {
			left: -25px;
			font-size: 140px;
		}
	}
`;

const HomePage = () => {
  const {
    featuredPlaylists,
    userPlaylists,
    publicPlaylists,
    fetchFeaturedPlaylists,
    fetchUserPlaylists,
    fetchPublicPlaylists,
    createPlaylist,
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
        <div className="pt-1 pb-6 max-w-full overflow-x-hidden">
          {/* Recently played section */}
          <div className="px-2 sm:px-4">
            {/* Top Picks Section - Enhanced Design */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2.5">
                <h2 className="text-base font-bold tracking-tight">Recently played</h2>
                {isAuthenticated && userPlaylists.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:bg-white/10 rounded-full"
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
                          className="hover:bg-white/10 cursor-pointer py-1.5"
                          onClick={() => handlePlaylistClick(playlist)}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded overflow-hidden">
                              {playlist.imageUrl ? (
                                <img
                                  src={playlist.imageUrl}
                                  alt={playlist.name}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-purple-500 to-purple-900 flex items-center justify-center">
                                  <Music2 className="h-3.5 w-3.5 text-white" />
                                </div>
                              )}
                            </div>
                            <span className="text-xs truncate">{playlist.name}</span>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5">
                {getDisplayedItems().map((item: any) => (
                  <div
                    key={item._id || item.id}
                    onClick={() => handlePlaylistClick(item)}
                    className="group relative h-[50px] rounded-md overflow-hidden transition-all duration-300 hover:bg-zinc-800/80 cursor-pointer"
                  >
                    <div className="absolute inset-0 bg-zinc-800/60" />
                    <div className="relative flex items-center h-full">
                      <div className="w-[50px] h-full flex-shrink-0">
                        {item.image || item.imageUrl ? (
                          <img
                            src={item.image || item.imageUrl}
                            alt={item.title || item.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-500 to-purple-900 flex items-center justify-center">
                            <Music2 className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 px-2.5">
                        <h3 className="font-medium text-xs leading-tight truncate">
                          {item.title || item.name}
                        </h3>
                      </div>
                      <div className="absolute right-2 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-1 group-hover:translate-y-0">
                        <Button
                          size="icon"
                          className="rounded-full bg-green-500 hover:bg-green-400 hover:scale-105 text-black h-7 w-7 shadow-md"
                        >
                          <PlayCircle className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recently Played Section */}
            <RecentlyPlayed />

            {/* Public Playlists Section */}
            {publicPlaylists.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2.5">
                  <h2 className="text-base font-bold tracking-tight">Public Playlists</h2>
                  <Button
                    variant="ghost"
                    className="text-zinc-400 hover:text-white text-[10px] sm:text-xs h-7"
                    onClick={() => navigate('/library')}
                  >
                    See all
                  </Button>
                </div>
                <div className="netflix-row relative" id="public-playlists-row">
                  <button 
                    className="handle handle-left absolute left-0 top-1/2 -translate-y-1/2 z-10 h-full px-1 opacity-0 hover:opacity-100 transition-opacity hidden sm:flex"
                    onClick={() => {
                      const slider = document.querySelector('#public-playlists-row .netflix-slider');
                      if (slider) {
                        slider.scrollBy({ left: -180, behavior: 'smooth' });
                      }
                    }}
                  >
                    <div className="flex items-center justify-center h-10 w-10 bg-black/50 backdrop-blur-sm rounded-full">
                      <ChevronRight className="h-5 w-5 rotate-180" />
                    </div>
                  </button>
                  
                  <div className="netflix-slider">
                    {publicPlaylists
                      .filter(playlist => playlist.isPublic !== false)
                      .map((playlist) => (
                        <div
                          key={playlist._id}
                          className="netflix-card group relative cursor-pointer"
                          onClick={() => handlePlaylistClick(playlist)}
                        >
                          <div className="card-wrapper">
                            <div className="card-image">
                              {playlist.imageUrl ? (
                                <img
                                  src={playlist.imageUrl}
                                  alt={playlist.name}
                                  loading="lazy"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/1f1f1f/959595?text=No+Image';
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center">
                                  <Music2 className="h-8 w-8 text-zinc-500" />
                                </div>
                              )}
                              <div className="play-button-overlay">
                                <Button
                                  size="icon"
                                  className="h-10 w-10 rounded-full bg-green-500 hover:bg-green-600 text-black shadow-xl"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePlaylistClick(playlist);
                                  }}
                                >
                                  <PlayCircle className="h-5 w-5" />
                                </Button>
                              </div>
                            </div>
                            <div className="card-content">
                              <h3 className="card-title">{playlist.name}</h3>
                              <p className="card-artist">{playlist.createdBy?.fullName || 'Unknown'}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                  
                  <button 
                    className="handle handle-right absolute right-0 top-1/2 -translate-y-1/2 z-10 h-full px-1 opacity-0 hover:opacity-100 transition-opacity hidden sm:flex"
                    onClick={() => {
                      const slider = document.querySelector('#public-playlists-row .netflix-slider');
                      if (slider) {
                        slider.scrollBy({ left: 180, behavior: 'smooth' });
                      }
                    }}
                  >
                    <div className="flex items-center justify-center h-10 w-10 bg-black/50 backdrop-blur-sm rounded-full">
                      <ChevronRight className="h-5 w-5" />
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Top 10 Playlists Section - Netflix Style */}
            {topPlaylists.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2.5">
                  <h2 className="text-base font-bold tracking-tight">Top 10 Playlists</h2>
                </div>
                <div className="netflix-row relative" id="top10-row">
                  <button 
                    className="handle handle-left absolute left-0 top-1/2 -translate-y-1/2 z-10 h-full px-1 opacity-0 hover:opacity-100 transition-opacity hidden sm:flex"
                    onClick={() => {
                      const slider = document.querySelector('#top10-row .netflix-slider');
                      if (slider) {
                        slider.scrollBy({ left: -180, behavior: 'smooth' });
                      }
                    }}
                  >
                    <div className="flex items-center justify-center h-10 w-10 bg-black/50 backdrop-blur-sm rounded-full">
                      <ChevronRight className="h-5 w-5 rotate-180" />
                    </div>
                  </button>
                  
                  <div className="netflix-slider" id="netflix-slider">
                    {topPlaylists
                      .filter(playlist => playlist.isPublic !== false)
                      .slice(0, 10)
                      .map((playlist, index) => (
                        <div
                          key={playlist._id}
                          className="netflix-card group relative cursor-pointer"
                          onClick={() => handlePlaylistClick(playlist)}
                        >
                          <div className="netflix-rank">{index + 1}</div>
                          <div className="card-wrapper">
                            <div className="card-image">
                              {playlist.imageUrl ? (
                                <img
                                  src={playlist.imageUrl}
                                  alt={playlist.name}
                                  loading="lazy"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/1f1f1f/959595?text=No+Image';
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center">
                                  <Music2 className="h-8 w-8 text-zinc-500" />
                                </div>
                              )}
                              <div className="play-button-overlay">
                                <Button
                                  size="icon"
                                  className="h-10 w-10 rounded-full bg-green-500 hover:bg-green-600 text-black shadow-xl"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePlaylistClick(playlist);
                                  }}
                                >
                                  <PlayCircle className="h-5 w-5" />
                                </Button>
                              </div>
                            </div>
                            <div className="card-content">
                              <h3 className="card-title">{playlist.name}</h3>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="card-artist">{playlist.metrics.likes} likes</span>
                              </div>
                            </div>
                          </div>
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-7 w-7 rounded-full bg-black/40 hover:bg-black/60"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Handle like
                                updateMetrics(playlist._id, 'likes');
                                setTopPlaylists(current =>
                                  current.map(p => 
                                    p._id === playlist._id
                                      ? { ...p, isLiked: !p.isLiked }
                                      : p
                                  )
                                );
                                toast.success(`${playlist.isLiked ? 'Removed from' : 'Added to'} your Liked Playlists`);
                              }}
                            >
                              <Heart className={`h-3.5 w-3.5 ${playlist.isLiked ? 'fill-white text-white' : ''}`} />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                  
                  <button 
                    className="handle handle-right absolute right-0 top-1/2 -translate-y-1/2 z-10 h-full px-1 opacity-0 hover:opacity-100 transition-opacity hidden sm:flex"
                    onClick={() => {
                      const slider = document.querySelector('#top10-row .netflix-slider');
                      if (slider) {
                        slider.scrollBy({ left: 180, behavior: 'smooth' });
                      }
                    }}
                  >
                    <div className="flex items-center justify-center h-10 w-10 bg-black/50 backdrop-blur-sm rounded-full">
                      <ChevronRight className="h-5 w-5" />
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Featured Playlists Section */}
            {/* Featured Playlists Section - REMOVED */}

            {/* Today's Hits Section */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2.5">
                <h2 className="text-base font-bold tracking-tight">Today's Hits</h2>
              </div>
              <div className="netflix-row relative" id="todays-hits-row">
                <button 
                  className="handle handle-left absolute left-0 top-1/2 -translate-y-1/2 z-10 h-full px-1 opacity-0 hover:opacity-100 transition-opacity hidden sm:flex"
                  onClick={() => {
                    const slider = document.querySelector('#todays-hits-row .netflix-slider');
                    if (slider) {
                      slider.scrollBy({ left: -180, behavior: 'smooth' });
                    }
                  }}
                >
                  <div className="flex items-center justify-center h-10 w-10 bg-black/50 backdrop-blur-sm rounded-full">
                    <ChevronRight className="h-5 w-5 rotate-180" />
                  </div>
                </button>
                
                <div className="netflix-slider">
                  {indianTrendingSongs.slice(0, 12).map((song, index) => (
                    <div
                      key={song.id || index}
                      className="netflix-card group relative cursor-pointer"
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
                      <div className="card-wrapper">
                        <div className="card-image">
                          <img
                            src={song.image || '/placeholder-song.png'}
                            alt={song.title}
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/1f1f1f/959595?text=No+Image';
                            }}
                          />
                          <div className="play-button-overlay">
                            <Button
                              size="icon"
                              className="h-10 w-10 rounded-full bg-green-500 hover:bg-green-600 text-black shadow-xl"
                              onClick={(e) => {
                                e.stopPropagation();
                                const songToPlay = useMusicStore.getState().convertIndianSongToAppSong(song);
                                setCurrentSong(songToPlay);
                              }}
                            >
                              <PlayCircle className="h-5 w-5" />
                            </Button>
                          </div>
                        </div>
                        <div className="card-content">
                          <h3 className="card-title">{song.title}</h3>
                          <p className="card-artist">{song.artist || 'Unknown Artist'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <button 
                  className="handle handle-right absolute right-0 top-1/2 -translate-y-1/2 z-10 h-full px-1 opacity-0 hover:opacity-100 transition-opacity hidden sm:flex"
                  onClick={() => {
                    const slider = document.querySelector('#todays-hits-row .netflix-slider');
                    if (slider) {
                      slider.scrollBy({ left: 180, behavior: 'smooth' });
                    }
                  }}
                >
                  <div className="flex items-center justify-center h-10 w-10 bg-black/50 backdrop-blur-sm rounded-full">
                    <ChevronRight className="h-5 w-5" />
                  </div>
                </button>
              </div>
            </div>
          </div>

          <div className="mb-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2.5 px-2 sm:px-4 gap-1">
              <h2 className="text-base font-bold tracking-tight">Indian Music</h2>
            </div>
            <div className="netflix-row relative" id="indian-music-row">
              <button 
                className="handle handle-left absolute left-0 top-1/2 -translate-y-1/2 z-10 h-full px-1 opacity-0 hover:opacity-100 transition-opacity hidden sm:flex"
                onClick={() => {
                  const slider = document.querySelector('#indian-music-row .netflix-slider');
                  if (slider) {
                    slider.scrollBy({ left: -180, behavior: 'smooth' });
                  }
                }}
              >
                <div className="flex items-center justify-center h-10 w-10 bg-black/50 backdrop-blur-sm rounded-full">
                  <ChevronRight className="h-5 w-5 rotate-180" />
                </div>
              </button>
              
              <div className="netflix-slider">
                {indianTrendingSongs.slice(6, 18).map((song, index) => (
                  <div
                    key={song.id || `indian-${index}`}
                    className="netflix-card group relative cursor-pointer"
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
                    <div className="card-wrapper">
                      <div className="card-image">
                        <img
                          src={song.image || '/placeholder-song.png'}
                          alt={song.title}
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/1f1f1f/959595?text=No+Image';
                          }}
                        />
                        <div className="play-button-overlay">
                          <Button
                            size="icon"
                            className="h-10 w-10 rounded-full bg-green-500 hover:bg-green-600 text-black shadow-xl"
                            onClick={(e) => {
                              e.stopPropagation();
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
                            <PlayCircle className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                      <div className="card-content">
                        <h3 className="card-title">{song.title}</h3>
                        <p className="card-artist">{song.artist || 'Unknown Artist'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <button 
                className="handle handle-right absolute right-0 top-1/2 -translate-y-1/2 z-10 h-full px-1 opacity-0 hover:opacity-100 transition-opacity hidden sm:flex"
                onClick={() => {
                  const slider = document.querySelector('#indian-music-row .netflix-slider');
                  if (slider) {
                    slider.scrollBy({ left: 180, behavior: 'smooth' });
                  }
                }}
              >
                <div className="flex items-center justify-center h-10 w-10 bg-black/50 backdrop-blur-sm rounded-full">
                  <ChevronRight className="h-5 w-5" />
                </div>
              </button>
            </div>
          </div>

          {/* Indian Music Player Component */}
          <IndianMusicPlayer />

          {/* Bottom padding for mobile player */}
          <div className="h-2"></div>
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
