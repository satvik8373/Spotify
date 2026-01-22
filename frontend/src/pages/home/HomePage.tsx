import { useEffect, useState, useMemo, useCallback } from 'react';
import { usePlaylistStore } from '../../stores/usePlaylistStore';
import { PlaylistCard } from '../../components/playlist/PlaylistCard';
import { JioSaavnPlaylistsSection } from '@/components/jiosaavn/JioSaavnPlaylistsSection';
import { RecentlyPlayedCard } from '@/components/RecentlyPlayedCard';
import { useNavigate } from 'react-router-dom';
import { useLikedSongsStore } from '@/stores/useLikedSongsStore';
import { HorizontalScroll, ScrollItem } from '@/components/ui/horizontal-scroll';
import { SectionWrapper } from '@/components/ui/section-wrapper';
import { recentlyPlayedService } from '@/services/recentlyPlayedService';

const HomePage = () => {
  const publicPlaylists = usePlaylistStore(state => state.publicPlaylists);
  const fetchPublicPlaylists = usePlaylistStore(state => state.fetchPublicPlaylists);
  const isLoading = usePlaylistStore(state => state.isLoading);

  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [displayItems, setDisplayItems] = useState<any[]>([]);
  const navigate = useNavigate();
  const { loadLikedSongs } = useLikedSongsStore();
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);
  const [likedSongsColor, setLikedSongsColor] = useState<string | null>(null);

  // Load liked songs count
  useEffect(() => {
    loadLikedSongs();
  }, [loadLikedSongs]);

  // Auto-refresh when app becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && usePlaylistStore.getState().shouldRefresh()) {
        usePlaylistStore.getState().refreshAllData();
      }
    };

    const handleFocus = () => {
      if (usePlaylistStore.getState().shouldRefresh()) {
        usePlaylistStore.getState().refreshAllData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  useEffect(() => {
    const initializeHomePage = async () => {
      try {
        // Show content immediately, load data in background
        setIsInitialLoading(false);

        // Check if we need to refresh data
        if (usePlaylistStore.getState().shouldRefresh()) {
          await usePlaylistStore.getState().refreshAllData();
        } else {
          await fetchPublicPlaylists();
        }
      } catch (error) {
        // Error initializing homepage
        // Still show content even if data loading fails
        setIsInitialLoading(false);
      }
    };

    initializeHomePage();
  }, [fetchPublicPlaylists]);

  // Load recent playlists from the new service - optimized with useMemo
  const memoizedDisplayItems = useMemo(() => {
    return recentlyPlayedService.getDisplayItems(publicPlaylists);
  }, [publicPlaylists]);

  useEffect(() => {
    let isMounted = true;

    const updateDisplayItems = () => {
      if (!isMounted) return;
      
      // Use shallow comparison instead of JSON.stringify for better performance
      setDisplayItems(prev => {
        const newItems = memoizedDisplayItems;
        if (prev.length === newItems.length && 
            prev.every((item, index) => item._id === newItems[index]?._id)) {
          return prev;
        }
        return newItems;
      });
    };

    // Initial load
    updateDisplayItems();

    // Listen for updates to recently played
    const handleRecentlyPlayedUpdated = () => {
      updateDisplayItems();
    };

    document.addEventListener('recentlyPlayedUpdated', handleRecentlyPlayedUpdated);
    return () => {
      isMounted = false;
      document.removeEventListener('recentlyPlayedUpdated', handleRecentlyPlayedUpdated);
    };
  }, [memoizedDisplayItems]);

  // Function to get displayed items (memoized)
  const getDisplayedItems = useCallback(() => {
    return displayItems;
  }, [displayItems]);

  // Handle color changes - optimized
  const handleColorChange = useCallback((color: string | null, isLikedSongs: boolean = false) => {
    setHoveredColor(color);
    // If this is the Liked Songs card, save its color as default
    if (isLikedSongs && color) {
      setLikedSongsColor(color);
    }
  }, []);

  // Function to convert any color format to rgba with opacity - memoized
  const colorToRgba = useCallback((color: string, opacity: number) => {
    if (!color || color === '#121212') return `rgba(18, 18, 18, ${opacity})`;

    // If it's already an rgb() format, extract the values
    if (color.startsWith('rgb(')) {
      const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (rgbMatch) {
        const [, r, g, b] = rgbMatch;
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
      }
    }

    // If it's a hex color, convert it
    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }

    // Fallback
    return `rgba(18, 18, 18, ${opacity})`;
  }, []);

  const activeColor = useMemo(() => 
    hoveredColor || likedSongsColor || 'rgb(60, 40, 120)', 
    [hoveredColor, likedSongsColor]
  );

  // Handle playlist click (works for both regular and JioSaavn playlists) - optimized
  const handlePlaylistClick = useCallback((item: any) => {
    // Only handle items with valid IDs
    if (item._id) {
      if (item.type === 'jiosaavn-playlist') {
        // Add JioSaavn playlist to recent
        recentlyPlayedService.addJioSaavnPlaylist(item.data || {
          id: item._id,
          name: item.name,
          image: item.imageUrl
        });
        // Navigate to JioSaavn playlist
        navigate(`/jiosaavn/playlist/${item._id}`, {
          state: { playlist: item.data }
        });
      } else if (item.type === 'album') {
        // Add album to recent
        recentlyPlayedService.addAlbum({
          _id: item._id,
          name: item.name,
          imageUrl: item.imageUrl
        });
        // Navigate to album
        navigate(`/albums/${item._id}`);
      } else {
        // Regular playlist
        recentlyPlayedService.addPlaylist({
          _id: item._id,
          name: item.name,
          imageUrl: item.imageUrl,
          isPublic: true
        });
        // Navigate to playlist
        navigate(`/playlist/${item._id}`);
      }
    }
  }, [navigate]);

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-[#121212]"></div>
    );
  }



  return (
    <div className="min-h-screen bg-[#121212] overflow-x-hidden relative">
      {/* Dynamic Background Setup - Spotify-style gradient flow */}
      {/* Dynamic Background Setup - Spotify-style gradient flow */}
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none hidden md:block"
        style={{
          height: '350px',
          background: `linear-gradient(180deg, 
            ${colorToRgba(activeColor, 0.4)} 0%, 
            ${colorToRgba(activeColor, 0.35)} 10%, 
            ${colorToRgba(activeColor, 0.28)} 20%, 
            ${colorToRgba(activeColor, 0.22)} 30%, 
            ${colorToRgba(activeColor, 0.17)} 40%, 
            ${colorToRgba(activeColor, 0.13)} 50%, 
            ${colorToRgba(activeColor, 0.09)} 60%, 
            ${colorToRgba(activeColor, 0.06)} 70%, 
            ${colorToRgba(activeColor, 0.04)} 80%, 
            ${colorToRgba(activeColor, 0.02)} 90%, 
            ${colorToRgba(activeColor, 0.01)} 95%, 
            transparent 100%)`,
          transition: 'background 1000ms ease',
          willChange: 'background'
        }}
      />

      <div className="py-4 space-y-4 relative w-full z-10 pb-32 md:pb-8">
        {/* Top Filter Pills */}
        <div className="px-4 md:px-6 hidden md:flex items-center gap-2 mb-1.5 sticky top-0 z-20 pt-2">
          {/* Profile Placeholder from image */}
          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mr-1 hidden md:block">
            <img
              src="https://res.cloudinary.com/djqq8kba8/image/upload/v1765037854/spotify_clone/playlists/IMG_5130_enrlhm.jpg"
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>
          <button className="px-3 py-1.5 rounded-full bg-[#1ed760] text-black text-[13px] font-bold transition-colors">
            All
          </button>
          <button className="px-3 py-1.5 rounded-full bg-white/10 text-white text-[13px] font-bold hover:bg-white/20 transition-colors">
            Music
          </button>
          <button className="px-3 py-1.5 rounded-full bg-white/10 text-white text-[13px] font-bold hover:bg-white/20 transition-colors">
            Podcasts
          </button>
        </div>

        <div className="w-full overflow-x-hidden">
          {/* Recently Played Section */}
          {getDisplayedItems().length > 0 && (
            <section className="px-4 md:px-6 mb-6 w-full">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-[6px] w-full max-w-full">
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

                {/* Other recently played items - up to 7 more for total of 8 */}
                {getDisplayedItems().slice(0, 7).map((item: any) => {
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
            </section>
          )}

          {/* Public Playlists Section */}
          <SectionWrapper
            title="Made for you"
            subtitle="Your personal mix of music"
            showViewAll={true}
            onViewAll={() => navigate('/library')}
          >
            <HorizontalScroll
              itemWidth={120}
              gap={10}
              showArrows={true}
              snapToItems={false}
            >
              {publicPlaylists.length > 0 ? (
                publicPlaylists.slice(0, 20).map((playlist) => (
                  <ScrollItem key={playlist._id} width={120}>
                    <PlaylistCard
                      playlist={playlist}
                      showDescription={true}
                      className="hover:bg-card/50 transition-colors"
                    />
                  </ScrollItem>
                ))
              ) : isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <ScrollItem key={i} width={120}>
                    <div className="space-y-3 p-1">
                      <div className="w-full aspect-square rounded-md bg-muted animate-pulse" />
                      <div className="h-3 rounded bg-muted animate-pulse" />
                      <div className="h-2 rounded bg-muted animate-pulse w-3/4" />
                    </div>
                  </ScrollItem>
                ))
              ) : (
                <div className="text-zinc-500 text-sm p-4 w-full text-center">No playlists found</div>
              )}
            </HorizontalScroll>
          </SectionWrapper>

          {/* JioSaavn Trending Section */}
          <section>
            <JioSaavnPlaylistsSection
              title="Trending Now"
              categoryId="trending"
              limit={14}
              showViewAll={true}
            />
          </section>

          {/* JioSaavn Bollywood Section */}
          <section>
            <JioSaavnPlaylistsSection
              title="Bollywood Hits"
              categoryId="bollywood"
              limit={14}
              showViewAll={true}
            />
          </section>

          {/* JioSaavn Romantic Section */}
          <section>
            <JioSaavnPlaylistsSection
              title="Romantic Songs"
              categoryId="romantic"
              limit={14}
              showViewAll={true}
            />
          </section>

          {/* JioSaavn Punjabi Section */}
          <section>
            <JioSaavnPlaylistsSection
              title="Punjabi Music"
              categoryId="punjabi"
              limit={14}
              showViewAll={true}
            />
          </section>
        </div>
      </div>
    </div>
  );
};

export default HomePage;