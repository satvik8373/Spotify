import React, { useState, useEffect } from 'react';
import { RefreshCw, ChevronRight } from 'lucide-react';
import { JioSaavnPlaylistCard } from './JioSaavnPlaylistCard';
import { JioSaavnPlaylist, jioSaavnService, PlaylistCategory } from '@/services/jioSaavnService';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { HorizontalScroll, ScrollItem } from '@/components/ui/horizontal-scroll';
import { SectionWrapper } from '@/components/ui/section-wrapper';
import { recentlyPlayedService } from '@/services/recentlyPlayedService';

interface JioSaavnPlaylistsSectionProps {
  title?: string;
  categoryId?: string;
  limit?: number;
  showViewAll?: boolean;
}

export const JioSaavnPlaylistsSection: React.FC<JioSaavnPlaylistsSectionProps> = ({
  title,
  categoryId = 'trending',
  limit = 10,
  showViewAll = true,
}) => {
  const [playlists, setPlaylists] = useState<JioSaavnPlaylist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<PlaylistCategory | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Find the category
    const foundCategory = jioSaavnService.getCategoryById(categoryId);
    setCategory(foundCategory || null);
    
    // Try to load from cache first
    const cachedData = localStorage.getItem(`jiosaavn-${categoryId}`);
    const cachedTimeStr = localStorage.getItem(`jiosaavn-${categoryId}-time`);
    
    if (cachedData && cachedTimeStr) {
      try {
        const parsed = JSON.parse(cachedData);
        const cacheAge = Date.now() - parseInt(cachedTimeStr);
        
        // Use cache if it's less than 24 hours old (much longer cache)
        if (cacheAge < 24 * 60 * 60 * 1000 && parsed.length > 0) {
          setPlaylists(parsed);
          return; // Don't fetch if we have valid cache
        }
      } catch (error) {
        console.error('Error parsing cached data:', error);
      }
    }
    
    // Only fetch if no valid cache exists
    fetchPlaylists();
  }, [categoryId, limit]);

  const fetchPlaylists = async () => {
    try {
      setIsLoading(true);
      setError(null);

      let data: JioSaavnPlaylist[];
      
      // Use optimized methods with timeout for better performance
      const fetchPromise = categoryId === 'trending' 
        ? jioSaavnService.getJioSaavnTrendingPlaylists()
        : jioSaavnService.getFreshPlaylistsByCategory(categoryId, limit);

      // Add timeout to prevent slow loading
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );

      try {
        data = await Promise.race([fetchPromise, timeoutPromise]);
      } catch (timeoutError) {
        console.warn(`Timeout fetching ${categoryId} playlists, using fallback`);
        // Fast fallback
        if (categoryId === 'trending') {
          data = await jioSaavnService.searchPlaylists('trending now', limit);
        } else {
          data = await jioSaavnService.searchPlaylists(categoryId, limit);
        }
      }
      
      // Limit the results if needed
      if (data.length > limit) {
        data = data.slice(0, limit);
      }
      
      setPlaylists(data);
      
      // Cache the data for 24 hours
      const now = Date.now();
      localStorage.setItem(`jiosaavn-${categoryId}`, JSON.stringify(data));
      localStorage.setItem(`jiosaavn-${categoryId}-time`, now.toString());
    } catch (err) {
      console.error('Error fetching JioSaavn playlists:', err);
      setError('Failed to load playlists');
      toast.error('Failed to load JioSaavn playlists');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlaylistClick = (playlist: JioSaavnPlaylist) => {
    // Add to recently played
    recentlyPlayedService.addJioSaavnPlaylist(playlist);
    
    // Navigate to JioSaavn playlist page
    navigate(`/jiosaavn/playlist/${playlist.id}`, {
      state: { playlist }
    });
  };

  const handlePlayPlaylist = async (playlist: JioSaavnPlaylist) => {
    try {
      toast.loading('Loading playlist...', { id: 'jiosaavn-play' });

      // Fetch playlist details with songs
      const playlistDetails = await jioSaavnService.getPlaylistDetails(playlist.id);

      if (playlistDetails.songs && playlistDetails.songs.length > 0) {
        // Convert first song and play
        jioSaavnService.convertToAppSong(playlistDetails.songs[0]);

        // You can integrate with your player store here
        // For now, just show success
        toast.success(`Playing "${playlist.name}"`, { id: 'jiosaavn-play' });

        // Navigate to playlist page to show all songs
        navigate(`/jiosaavn/playlist/${playlist.id}`, {
          state: { playlist, autoPlay: true }
        });
      } else {
        toast.error('No songs found in playlist', { id: 'jiosaavn-play' });
      }
    } catch (error) {
      console.error('Error playing JioSaavn playlist:', error);
      toast.error('Failed to play playlist', { id: 'jiosaavn-play' });
    }
  };

  const handleViewAll = () => {
    navigate('/jiosaavn/playlists', {
      state: { category: categoryId, title: getSectionTitle() }
    });
  };

  const handleRefresh = () => {
    // Clear cache and fetch fresh data
    localStorage.removeItem(`jiosaavn-${categoryId}`);
    localStorage.removeItem(`jiosaavn-${categoryId}-time`);
    fetchPlaylists();
  };

  const getSectionTitle = () => {
    if (title) return title;
    if (category) return `${category.icon} ${category.name}`;
    return 'JioSaavn Playlists';
  };

  const getSectionDescription = () => {
    if (category) return category.description;
    return 'Discover curated playlists from JioSaavn';
  };

  if (error && playlists.length === 0) {
    return (
      <SectionWrapper
        title={getSectionTitle()}
        showViewAll={false}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <div className="bg-destructive/10 border border-destructive/20 text-destructive-foreground text-sm rounded-md px-4 py-3">
              {error}. Check your internet connection and try again.
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="text-muted-foreground hover:text-foreground ml-4"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </SectionWrapper>
    );
  }

  if (playlists.length === 0 && !isLoading) {
    return null;
  }

  return (
    <SectionWrapper
      title={getSectionTitle()}
      showViewAll={showViewAll}
      onViewAll={handleViewAll}
    >
      <HorizontalScroll
        itemWidth={120}
        gap={10}
        showArrows={true}
        snapToItems={false}
      >
        {isLoading ? (
          // Loading skeleton
          Array.from({ length: 8 }).map((_, i) => (
            <ScrollItem key={i} width={120}>
              <div className="space-y-2 p-1">
                <div 
                  className="w-full aspect-square rounded-md bg-muted animate-pulse" 
                  style={{animationDelay: `${i * 0.1}s`}}
                />
                <div 
                  className="h-3 rounded bg-muted animate-pulse" 
                  style={{animationDelay: `${i * 0.1 + 0.1}s`}}
                />
                <div 
                  className="h-2 rounded bg-muted animate-pulse w-3/4" 
                  style={{animationDelay: `${i * 0.1 + 0.2}s`}}
                />
              </div>
            </ScrollItem>
          ))
        ) : (
          // Actual playlist cards
          playlists.map((playlist) => (
            <ScrollItem key={playlist.id} width={120}>
              <JioSaavnPlaylistCard
                playlist={playlist}
                onClick={handlePlaylistClick}
                onPlay={handlePlayPlaylist}
                showDescription={true}
              />
            </ScrollItem>
          ))
        )}
      </HorizontalScroll>
    </SectionWrapper>
  );
};