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
  Loader2,
  ExternalLink,
  RefreshCw,
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
import { getUserPlaylists, isAuthenticated as isSpotifyAuthenticated, getAuthorizationUrl, formatSpotifyPlaylist } from '@/services/spotifyService';

// Suggested genres
const suggestedGenres = [
  {
    id: 1,
    name: 'Rock',
    color: 'from-zinc-800 to-zinc-900 hover:from-purple-900/30 hover:to-zinc-900',
  },
  {
    id: 2,
    name: 'Hip Hop',
    color: 'from-zinc-800 to-zinc-900 hover:from-orange-900/30 hover:to-zinc-900',
  },
  {
    id: 3,
    name: 'Electronic',
    color: 'from-zinc-800 to-zinc-900 hover:from-blue-900/30 hover:to-zinc-900',
  },
  {
    id: 4,
    name: 'Classical',
    color: 'from-zinc-800 to-zinc-900 hover:from-amber-900/30 hover:to-zinc-900',
  },
  {
    id: 5,
    name: 'Pop',
    color: 'from-zinc-800 to-zinc-900 hover:from-pink-900/30 hover:to-zinc-900',
  },
  {
    id: 6,
    name: 'R&B',
    color: 'from-zinc-800 to-zinc-900 hover:from-indigo-900/30 hover:to-zinc-900',
  },
  {
    id: 7,
    name: 'Jazz',
    color: 'from-zinc-800 to-zinc-900 hover:from-green-900/30 hover:to-zinc-900',
  },
  {
    id: 8,
    name: 'Bollywood',
    color: 'from-zinc-800 to-zinc-900 hover:from-red-900/30 hover:to-zinc-900',
  },
];

// Fixed top picks categories
const topPicks = [
  {
    id: 1,
    title: 'Liked Songs',
    subtitle: 'All your liked songs',
    icon: <Heart className="h-6 w-6" />,
    image: 'https://misc.scdn.co/liked-songs/liked-songs-640.png',
    path: '/liked-songs',
    gradient: 'from-indigo-500 to-indigo-900',
    fixed: true,
  },
];

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

// Interface for Spotify playlist
interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  owner: string;
  tracksCount: number;
  source: string;
  externalUrl: string;
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
  const [spotifyPlaylists, setSpotifyPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [loadingSpotify, setLoadingSpotify] = useState(false);
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);

  const { indianTrendingSongs, indianNewReleases, bollywoodSongs, hollywoodSongs } =
    useMusicStore();

  const { setCurrentSong, playPlaylist } = usePlayerStore();

  useEffect(() => {
    fetchFeaturedPlaylists();
    if (isAuthenticated) {
      fetchUserPlaylists();
    }
  }, [fetchFeaturedPlaylists, fetchUserPlaylists, isAuthenticated]);

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

  // Check if Spotify is connected and fetch playlists
  useEffect(() => {
    const checkSpotifyConnection = async () => {
      const connected = isSpotifyAuthenticated();
      setIsSpotifyConnected(connected);
      
      if (connected) {
        setLoadingSpotify(true);
        try {
          const data = await getUserPlaylists(6, 0);
          if (data && data.items && Array.isArray(data.items)) {
            // Safely map playlists and filter out any nulls or undefined values
            const formattedPlaylists = data.items
              .map((item: any) => {
                try {
                  return formatSpotifyPlaylist(item);
                } catch (err) {
                  console.error('Error formatting playlist:', err);
                  return null;
                }
              })
              .filter(Boolean); // Remove any null/undefined entries
              
            setSpotifyPlaylists(formattedPlaylists);
            
            // Store in localStorage as a cache
            try {
              localStorage.setItem('spotify_playlists_cache', JSON.stringify({
                timestamp: Date.now(),
                playlists: formattedPlaylists
              }));
            } catch (cacheErr) {
              console.error('Error caching playlists:', cacheErr);
            }
          } else {
            console.warn('No playlists found in response or invalid format', data);
            // Try to use cached data if available
            tryLoadCachedPlaylists();
          }
        } catch (error) {
          console.error('Error fetching Spotify playlists:', error);
          // Try to use cached data if available
          tryLoadCachedPlaylists();
        } finally {
          setLoadingSpotify(false);
        }
      } else {
        // Clear spotify playlists if not connected
        setSpotifyPlaylists([]);
      }
    };
    
    const tryLoadCachedPlaylists = () => {
      try {
        const cachedData = localStorage.getItem('spotify_playlists_cache');
        if (cachedData) {
          const { timestamp, playlists } = JSON.parse(cachedData);
          // Only use cache if it's less than 1 hour old
          if (Date.now() - timestamp < 3600000 && Array.isArray(playlists)) {
            setSpotifyPlaylists(playlists);
            return true;
          }
        }
      } catch (error) {
        console.error('Error loading cached playlists:', error);
      }
      return false;
    };
    
    checkSpotifyConnection();
  }, []);
  
  // Function to retry loading Spotify playlists
  const handleRetrySpotify = () => {
    const retry = async () => {
      if (!isSpotifyAuthenticated()) {
        handleConnectSpotify();
        return;
      }
      
      setLoadingSpotify(true);
      try {
        const data = await getUserPlaylists(6, 0);
        if (data && data.items && Array.isArray(data.items)) {
          const formattedPlaylists = data.items
            .map((item: any) => {
              try {
                return formatSpotifyPlaylist(item);
              } catch (err) {
                return null;
              }
            })
            .filter(Boolean);
            
          setSpotifyPlaylists(formattedPlaylists);
        }
      } catch (error) {
        console.error('Error retrying Spotify playlists:', error);
        toast.error('Could not load Spotify playlists');
      } finally {
        setLoadingSpotify(false);
      }
    };
    
    retry();
  };
  
  // Connect to Spotify
  const handleConnectSpotify = () => {
    window.location.href = getAuthorizationUrl();
  };

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
  const handleLike = (playlist: TopPlaylist) => {
    if (!isAuthenticated) {
      toast.error('Please sign in to like playlists');
      return;
    }
    updateMetrics(playlist._id, 'likes');
    setTopPlaylists(current =>
      current.map(p => (p._id === playlist._id ? { ...p, isLiked: !p.isLiked } : p))
    );
  };

  // Handle share
  const handleShare = async (playlist: TopPlaylist) => {
    try {
      await navigator.share({
        title: playlist.name,
        text: `Check out this playlist: ${playlist.name}`,
        url: `${window.location.origin}/playlist/${playlist._id}`,
      });
      updateMetrics(playlist._id, 'shares');
    } catch (error) {
      console.error('Error sharing:', error);
      // Fallback to copying link
      navigator.clipboard.writeText(`${window.location.origin}/playlist/${playlist._id}`);
      toast.success('Link copied to clipboard!');
      updateMetrics(playlist._id, 'shares');
    }
  };

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

            {/* Spotify Playlists Section - MOVED UP FOR BETTER VISIBILITY */}
            <div className="mb-8 px-2 sm:px-0">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold tracking-tight flex items-center">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-green-500 mr-2">
                    <path fill="currentColor" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                  </svg>
                  Spotify Playlists
                </h2>
                <Link 
                  to="/spotify-playlists" 
                  className="text-sm font-medium text-zinc-400 hover:text-white"
                >
                  View All
                </Link>
              </div>

              {!isSpotifyConnected ? (
                <div className="bg-zinc-800/60 rounded-md p-4 flex flex-col sm:flex-row items-center justify-between">
                  <div className="flex items-center mb-3 sm:mb-0">
                    <svg viewBox="0 0 24 24" className="h-8 w-8 text-green-500 mr-3 flex-shrink-0">
                      <path fill="currentColor" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                    <div>
                      <h3 className="font-bold text-white">Connect with Spotify</h3>
                      <p className="text-zinc-400 text-sm">Access your Spotify playlists and discover new music</p>
                    </div>
                  </div>
                  <Button 
                    onClick={handleConnectSpotify}
                    className="bg-green-500 hover:bg-green-600 text-white rounded-full px-4 py-2 h-auto"
                  >
                    Connect with Spotify
                  </Button>
                </div>
              ) : loadingSpotify ? (
                <div className="flex justify-center items-center py-6 bg-zinc-800/60 rounded-md">
                  <Loader2 className="h-8 w-8 animate-spin text-green-500" />
                </div>
              ) : spotifyPlaylists && spotifyPlaylists.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {spotifyPlaylists.map((playlist) => (
                    <Link 
                      key={playlist.id}
                      to={`/spotify-playlist/${playlist.id}`}
                      className="bg-zinc-800/60 rounded-md overflow-hidden hover:bg-zinc-800 transition-colors group"
                    >
                      <div className="aspect-square relative">
                        {playlist.imageUrl ? (
                          <img 
                            src={playlist.imageUrl} 
                            alt={playlist.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/1f1f1f/959595?text=No+Image';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-zinc-700 flex items-center justify-center">
                            <Music2 className="h-12 w-12 text-zinc-500" />
                          </div>
                        )}
                        <div className="absolute bottom-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" className="h-8 w-8 rounded-full bg-green-500 hover:bg-green-400 text-white shadow-md">
                            <PlayCircle className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a 
                            href={playlist.externalUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>
                      <div className="p-2">
                        <h3 className="font-bold text-sm truncate">{playlist.name}</h3>
                        <p className="text-zinc-400 text-xs truncate">By {playlist.owner}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="bg-zinc-800/60 rounded-md p-4 text-center">
                  <p className="text-zinc-400 mb-3">No Spotify playlists found. Try connecting again or check your Spotify account.</p>
                  <Button 
                    onClick={handleRetrySpotify} 
                    variant="outline" 
                    size="sm"
                    className="border-zinc-700 hover:bg-zinc-700"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-2" />
                    Retry
                  </Button>
                </div>
              )}
            </div>

            {/* Recently Played Section */}
            <RecentlyPlayed />

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
