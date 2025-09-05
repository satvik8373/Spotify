import { useEffect, useState, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import IndianMusicPlayer from '@/components/IndianMusicPlayer';
import { usePlaylistStore } from '../../stores/usePlaylistStore';
import { PlaylistCard } from '../../components/playlist/PlaylistCard';
import { useAuthStore } from '../../stores/useAuthStore';
import { useAuth } from '@/contexts/AuthContext';
import { Music2, PlayCircle, ThumbsUp, ChevronRight, WifiOff, Share2, Heart } from 'lucide-react';
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
import { RecentlyPlayed } from '@/components/RecentlyPlayed';
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
		gap: 12px;
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
		flex: 0 0 calc(45% - 16px); /* Show 2 cards on mobile */
		scroll-snap-align: start;
		position: relative;
		transition: all 0.3s ease;
		transform-origin: center left;
		z-index: 1;
		max-width: 180px;
	}
	
	@media (min-width: 640px) {
		.netflix-card {
			flex: 0 0 calc(33.333% - 16px); /* Show 3 cards on tablet */
			max-width: 200px;
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
	
	.netflix-rank {
		position: absolute;
		left: -16px;
		top: 50%;
		transform: translateY(-50%);
		font-size: 100px;
		font-weight: 800;
		opacity: 0.9;
		text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.8);
		-webkit-text-stroke: 2px hsl(var(--foreground));
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
  const [topPlaylists, setTopPlaylists] = useState<TopPlaylist[]>([]);
  

  const { indianTrendingSongs, fetchIndianTrendingSongs } =
    useMusicStore();

  const { setCurrentSong } = usePlayerStore();
  const hasTrending = indianTrendingSongs && indianTrendingSongs.length > 0;
  const adContainerRef = useRef<HTMLDivElement>(null);
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState(false);
  const [showAd, setShowAd] = useState(true);

  useEffect(() => {
    fetchFeaturedPlaylists();
    fetchPublicPlaylists();
    if (isAuthenticated) {
      fetchUserPlaylists();
    }
    // Ensure Indian songs are available (will use mock data first then try network)
    if (!indianTrendingSongs || indianTrendingSongs.length === 0) {
      fetchIndianTrendingSongs().catch(() => {});
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

  // Load top playlists (always use public playlists for all users)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('playlist_metrics') || '{}';
      const metrics = JSON.parse(saved);

      const source = publicPlaylists.filter(p => p.isPublic !== false);
      const top = source
        .map((playlist, index) => ({
          _id: playlist._id,
          name: playlist.name,
          imageUrl: playlist.imageUrl,
          lastPlayed: Date.now(),
          metrics: metrics[playlist._id] || { clicks: 0, likes: 0, shares: 0 },
          rank: index + 1,
          isLiked: false,
        }))
        .sort((a, b) => b.metrics.clicks - a.metrics.clicks)
        .slice(0, 10)
        .map((playlist, index) => ({ ...playlist, rank: index + 1 }));

      setTopPlaylists(top);
    } catch (error) {
      console.error('Error loading top playlists:', error);
    }
  }, [publicPlaylists]);

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
    if (items.length < 8 && publicPlaylists.length > 0) {
      const remainingSlots = 8 - items.length;
      const additional = publicPlaylists
        .filter(p => !recentPlaylists.some(rp => rp._id === p._id))
        .slice(0, remainingSlots)
        .map(p => ({ _id: p._id, name: p.name, imageUrl: p.imageUrl, path: `/playlist/${p._id}` }));
      items.push(...additional);
    }

    return items.slice(0, 8);
  };

  // Handle playlist click (only for real playlists, no demo data)
  const handlePlaylistClick = (playlist: any) => {
    // Only handle real playlists with valid IDs
    if (playlist._id) {
      // Update metrics
      updateMetrics(playlist._id, 'clicks');

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

  // Inject external ad script into container
  useEffect(() => {
    const loadAdScript = async () => {
      if (!isOnline || !showAd) return;
      
      try {
        setAdError(false);
        
        // Set up ad options with compact dimensions
        (window as any).atOptions = {
          key: '0a3dc65c1dc3cb69102dcd1b8531e50a',
          format: 'iframe',
          height: 150,
          width: 300,
          params: {
            'margin': '0',
            'padding': '0',
            'border': 'none',
            'overflow': 'hidden'
          },
        };

        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = '//www.highperformanceformat.com/0a3dc65c1dc3cb69102dcd1b8531e50a/invoke.js';
        script.async = true;

        // Add error handling for script loading
        script.onerror = () => {
          console.warn('Ad script failed to load');
          setAdError(true);
          setAdLoaded(false);
        };

        script.onload = () => {
          console.log('Ad script loaded successfully');
          // Reduced delay for faster loading
          setTimeout(() => {
            setAdLoaded(true);
          }, 500);
        };

        if (adContainerRef.current) {
          adContainerRef.current.innerHTML = '';
          adContainerRef.current.appendChild(script);
          
          // Add CSS to ensure iframe fits perfectly and smooth skeleton animations
          const style = document.createElement('style');
          style.textContent = `
            #ad-container iframe {
              width: 300px !important;
              height: 150px !important;
              border: none !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: hidden !important;
              display: block !important;
            }
            
            /* Normal speed skeleton animations */
            .skeleton-pulse {
              animation: skeleton-pulse 1.5s ease-in-out infinite;
            }
            
            .skeleton-shimmer {
              animation: skeleton-shimmer 2s ease-in-out infinite;
            }
            
            @keyframes skeleton-pulse {
              0%, 100% {
                opacity: 1;
              }
              50% {
                opacity: 0.6;
              }
            }
            
            @keyframes skeleton-shimmer {
              0% {
                transform: translateX(-100%) skewX(-12deg);
              }
              100% {
                transform: translateX(200%) skewX(-12deg);
              }
            }
          `;
          document.head.appendChild(style);
          
          // Set container ID for CSS targeting
          adContainerRef.current.id = 'ad-container';
        }
      } catch (error) {
        console.error('Failed to load ad script', error);
        setAdError(true);
        setAdLoaded(false);
      }
    };

    // Only load ads if online and ad should be shown
    if (isOnline && showAd) {
      loadAdScript();
    }
  }, [isOnline, showAd]);

  // Handle ad close
  const handleCloseAd = () => {
    setShowAd(false);
    if (adContainerRef.current) {
      adContainerRef.current.innerHTML = '';
    }
  };

  return (
    <main className="flex flex-col h-full overflow-hidden bg-gradient-to-b from-background to-background/95 dark:from-[#191414] dark:to-[#191414] ">
      <ScrollArea className="flex-1 h-full" ref={scrollRef}>
        <div className="pt-3 pb-6 max-w-full overflow-x-hidden px-[6px]">
          {/* Offline banner */}
          {!isOnline && (
            <div className="px-2 sm:px-4 mb-3">
              <div className="bg-yellow-500/10 border border-yellow-600 text-yellow-200 text-xs sm:text-sm rounded-md px-3 py-2">
                You are offline. Some features may be unavailable.
              </div>
            </div>
          )}

          {/* Offline placeholder */}
          {!isOnline && (
            <div className="px-2 sm:px-4 mb-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <WifiOff className="h-4 w-4 text-yellow-400" />
                <span className="text-xs sm:text-sm">No internet connection</span>
              </div>
            </div>
          )}

          {/* Recently played section - render only when data exists and online */}
          {isOnline && getDisplayedItems().length > 0 && (
          <div className="px-2 sm:px-4 mt-1">
            
            <div className="mb-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-4 gap-1.5">
                {getDisplayedItems().map((item: any) => (
                  <div
                    key={item._id || item.id}
                    onClick={() => handlePlaylistClick(item)}
                    className="group relative h-[55px] rounded overflow-hidden transition-all duration-300 cursor-pointer border border-border/60"
                  >
                    <div className="absolute inset-0 bg-muted/95 dark:bg-[#292929] scale-110" />
                    <div className="relative flex items-center h-full">
                      <div className="w-[55px] h-full flex-shrink-0 rounded overflow-hidden">
                        {item.image || item.imageUrl ? (
                          <img
                            src={item.image || item.imageUrl}
                            alt={item.title || item.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-500 to-purple-900 flex items-center justify-center rounded">
                            <Music2 className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 px-2.5">
                        <h3 className="font-medium text-[11px] leading-snug line-clamp-2">
                          {item.title || item.name}
                        </h3>
                      </div>
                      
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recently Played Section */}
            <RecentlyPlayed />
                
            {/* Ad slot - only show when online and ad should be shown */}
            {isOnline && showAd && (
              <div className="px-2 sm:px-4 mb-5 flex justify-center">
                <div className="relative group">
                  {/* Container with theme-matching background */}
                  <div className="relative bg-background/95 dark:bg-[#191414]/95 rounded-xl p-1 shadow-lg border border-border/50">
                    {/* Inner container */}
                    <div className="relative bg-background dark:bg-[#191414] rounded-lg p-2">
                      {/* Close button */}
                      <button
                        onClick={handleCloseAd}
                        className="absolute -top-1 -right-1 z-10 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-lg transition-all duration-200 hover:scale-110"
                        aria-label="Close advertisement"
                      >
                        ×
                      </button>
                      
                      {/* Loading state - Compact Skeleton */}
                      {!adLoaded && !adError && (
                        <div className="w-[300px] h-[150px] bg-muted/50 dark:bg-muted/30 rounded-lg overflow-hidden relative">
                          {/* Compact skeleton content structure */}
                          <div className="p-3 space-y-2">
                            {/* Header skeleton */}
                            <div className="h-3 bg-muted/70 dark:bg-muted/50 rounded w-2/3 skeleton-pulse"></div>
                            
                            {/* Content area skeleton */}
                            <div className="space-y-1">
                              <div className="h-2 bg-muted/60 dark:bg-muted/40 rounded w-full skeleton-pulse"></div>
                              <div className="h-2 bg-muted/60 dark:bg-muted/40 rounded w-4/5 skeleton-pulse"></div>
                            </div>
                            
                            {/* Image placeholder skeleton */}
                            <div className="mt-2 h-12 bg-muted/60 dark:bg-muted/40 rounded skeleton-pulse"></div>
                            
                            {/* Button skeleton */}
                            <div className="mt-2 flex justify-center">
                              <div className="h-6 w-16 bg-muted/70 dark:bg-muted/50 rounded skeleton-pulse"></div>
                            </div>
                          </div>
                          
                          {/* Shimmer overlay */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/8 to-transparent transform -skew-x-12 skeleton-shimmer"></div>
                        </div>
                      )}
                      
                      {/* Error state */}
                      {adError && (
                        <div className="w-[300px] h-[150px] flex items-center justify-center bg-destructive/10 dark:bg-destructive/20 rounded-lg border border-destructive/30">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-6 h-6 text-destructive">⚠️</div>
                            <p className="text-sm text-destructive">Ad failed to load</p>
                            <button
                              onClick={() => {
                                setAdError(false);
                                setShowAd(true);
                              }}
                              className="text-xs text-primary hover:text-primary/80 underline"
                            >
                              Retry
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {/* Ad container - exact dimensions */}
                      <div
                        ref={adContainerRef}
                        className={`rounded-lg overflow-hidden transition-all duration-500 ${
                          adLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                        }`}
                        style={{ 
                          width: '300px', 
                          height: '150px',
                          minHeight: '150px',
                          maxWidth: '300px',
                          maxHeight: '150px'
                        }}
                        aria-label="advertisement"
                      />
                    </div>
                  </div>
                  
                  {/* Ad label */}
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 bg-background/90 dark:bg-[#191414]/90 text-foreground text-xs px-2 py-1 rounded-full backdrop-blur-sm border border-border/50">
                    Advertisement
                  </div>
                </div>
              </div>
            )}

            {/* Public Playlists Section */}
            {publicPlaylists.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2.5">
                  <h2 className="text-base font-bold tracking-tight">Public Playlists</h2>
                  <Button
                    variant="ghost"
                    className="text-muted-foreground hover:text-foreground text-[10px] sm:text-xs h-7"
                    onClick={() => navigate('/library')}
                  >
                    See all
                  </Button>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-3">
                  {publicPlaylists
                    .filter(playlist => playlist.isPublic !== false)
                    .map(playlist => (
                      <div
                        key={playlist._id}
                        className="group relative transform transition-all duration-300 hover:scale-[1.02]"
                      >
                        <PlaylistCard
                          playlist={playlist}
                        />
                      </div>
                    ))}
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
                          <div className="relative rounded-md overflow-hidden aspect-square shadow-lg w-full h-auto">
                            {playlist.imageUrl ? (
                              <img
                                src={playlist.imageUrl}
                                alt={playlist.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/1f1f1f/959595?text=No+Image';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-muted to-muted/80 flex items-center justify-center">
                                <Music2 className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="absolute bottom-0 left-0 w-full p-2">
                              <h3 className="text-xs font-medium line-clamp-1">{playlist.name}</h3>
                              <div className="flex items-center gap-1 mt-0.5">
                                <div className="flex items-center gap-0.5 text-[8px] text-muted-foreground">
                                  <ThumbsUp className="h-2.5 w-2.5" />
                                  <span>{playlist.metrics.likes}</span>
                                </div>
                                <div className="flex items-center gap-0.5 text-[8px] text-muted-foreground ml-2">
                                  <Share2 className="h-2.5 w-2.5" />
                                  <span>{playlist.metrics.shares}</span>
                                </div>
                              </div>
                            </div>
                            <div className="absolute top-0 inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
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
            {featuredPlaylists.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2.5">
                  <h2 className="text-base font-bold tracking-tight">Featured Playlists</h2>
                  <Button
                    variant="ghost"
                    className="text-muted-foreground hover:text-foreground text-[10px] sm:text-xs h-7"
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
                      />
                    </div>
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
          </div>
          )}

          {isOnline && hasTrending && (
          <div className="mb-5">
                            <div className="px-2 sm:px-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
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
