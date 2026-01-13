import React, { useState, useEffect } from 'react';
import { RefreshCw, ChevronRight } from 'lucide-react';
import { JioSaavnPlaylistCard } from './JioSaavnPlaylistCard';
import { JioSaavnPlaylist, jioSaavnService, PlaylistCategory } from '@/services/jioSaavnService';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { HorizontalScroll, ScrollItem } from '@/components/ui/horizontal-scroll';
import { SectionWrapper } from '@/components/ui/section-wrapper';

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
    fetchPlaylists();
  }, [categoryId, limit]);

  const fetchPlaylists = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await jioSaavnService.getPlaylistsByCategory(categoryId, limit);
      setPlaylists(data);
    } catch (err) {
      console.error('Error fetching JioSaavn playlists:', err);
      setError('Failed to load playlists');
      toast.error('Failed to load JioSaavn playlists');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlaylistClick = (playlist: JioSaavnPlaylist) => {
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