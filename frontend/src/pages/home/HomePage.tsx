import { useEffect, useState } from 'react';
import { usePlaylistStore } from '../../stores/usePlaylistStore';
import { PlaylistCard } from '../../components/playlist/PlaylistCard';
import { JioSaavnPlaylistsSection } from '@/components/jiosaavn/JioSaavnPlaylistsSection';
import { RecentlyPlayedCard } from '@/components/RecentlyPlayedCard';
import { useNavigate } from 'react-router-dom';
import { useLikedSongsStore } from '@/stores/useLikedSongsStore';
import { HorizontalScroll, ScrollItem } from '@/components/ui/horizontal-scroll';
import { SectionWrapper } from '@/components/ui/section-wrapper';
import { recentlyPlayedService } from '@/services/recentlyPlayedService';
import { networkOptimizer } from '@/utils/networkOptimizer';
import SlowConnectionSkeleton from '@/components/skeletons/SlowConnectionSkeleton';

const HomePage = () => {
  const publicPlaylists = usePlaylistStore(state => state.publicPlaylists);
  const fetchPublicPlaylists = usePlaylistStore(state => state.fetchPublicPlaylists);
  const isLoading = usePlaylistStore(state => state.isLoading);

  const [isInitialLoading, setIsInitialLoading] = useState(true); // Start with true
  const [displayItems, setDisplayItems] = useState<any[]>([]);
  const [networkOptimized, setNetworkOptimized] = useState(false);
  const [skipHeavyElements, setSkipHeavyElements] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false); // Track if we've loaded data before
  const navigate = useNavigate();
  const { loadLikedSongs } = useLikedSongsStore();
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);
  const [likedSongsColor, setLikedSongsColor] = useState<string | null>(null);

  // Network optimization setup
  useEffect(() => {
    const handleNetworkChange = () => {
      const config = networkOptimizer.getConfig();
      setNetworkOptimized(config.enableDataSaver);
      setSkipHeavyElements(config.skipHeavyElements);
    };

    networkOptimizer.onConfigChange(handleNetworkChange);
    handleNetworkChange(); // Initial check
  }, []);

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
        // For cellular/slow connections, load minimal data only
        if (skipHeavyElements) {
          // Load only essential data - liked songs and 3 playlists max
          if (publicPlaylists.length === 0) {
            // Load minimal playlists only
            await fetchPublicPlaylists().catch(() => {}); // Wait for essential data
          }
          setHasLoadedOnce(true);
          setIsInitialLoading(false);
          return; // Skip heavy data loading
        }

        // For moderate optimization, reduce data
        if (networkOptimized) {
          if (publicPlaylists.length === 0) {
            await fetchPublicPlaylists().catch(() => {}); // Wait for data
          }
          setHasLoadedOnce(true);
          setIsInitialLoading(false);
        } else {
          // Full data loading for good connections
          if (usePlaylistStore.getState().shouldRefresh()) {
            await usePlaylistStore.getState().refreshAllData().catch(() => {});
          } else if (publicPlaylists.length === 0) {
            await fetchPublicPlaylists().catch(() => {});
          }
          setHasLoadedOnce(true);
          setIsInitialLoading(false);
        }
      } catch (error) {
        // Error initializing homepage - show content anyway
        setHasLoadedOnce(true);
        setIsInitialLoading(false);
      }
    };

    // Only initialize if we haven't loaded once
    if (!hasLoadedOnce) {
      initializeHomePage();
    } else {
      // If we've loaded before, show content immediately
      setIsInitialLoading(false);
    }
  }, [fetchPublicPlaylists, networkOptimized, skipHeavyElements, hasLoadedOnce]); // Removed publicPlaylists.length to prevent infinite loops

  useEffect(() => {
    // Calculate recent items inside the effect to avoid dependency issues
    const currentRecentItems = recentlyPlayedService.getDisplayItems(publicPlaylists);
    setDisplayItems(currentRecentItems);

    // Listen for updates to recently played
    const handleRecentlyPlayedUpdated = () => {
      const newItems = recentlyPlayedService.getDisplayItems(publicPlaylists);
      setDisplayItems(newItems);
    };

    // Add event listener
    window.addEventListener('recentlyPlayedUpdated', handleRecentlyPlayedUpdated);

    return () => {
      window.removeEventListener('recentlyPlayedUpdated', handleRecentlyPlayedUpdated);
    };
  }, [publicPlaylists]); // Only depend on publicPlaylists, not recentItems

  // Function to get displayed items - no memoization
  const getDisplayedItems = () => {
    return displayItems;
  };

  // Handle color changes - simplified
  const handleColorChange = (color: string | null, isLikedSongs: boolean = false) => {
    setHoveredColor(color);
    // If this is the Liked Songs card, save its color as default
    if (isLikedSongs && color) {
      setLikedSongsColor(color);
    }
  };

  // Function to convert any color format to rgba with opacity - simplified
  const colorToRgba = (color: string, opacity: number) => {
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
  };

  const activeColor = hoveredColor || likedSongsColor || 'rgb(60, 40, 120)';

  // Handle playlist click - simplified
  const handlePlaylistClick = (item: any) => {
    if (item._id) {
      if (item.type === 'jiosaavn-playlist') {
        recentlyPlayedService.addJioSaavnPlaylist(item.data || {
          id: item._id,
          name: item.name,
          image: item.imageUrl
        });
        navigate(`/jiosaavn/playlist/${item._id}`, {
          state: { playlist: item.data }
        });
      } else if (item.type === 'album') {
        recentlyPlayedService.addAlbum({
          _id: item._id,
          name: item.name,
          imageUrl: item.imageUrl
        });
        navigate(`/albums/${item._id}`);
      } else {
        recentlyPlayedService.addPlaylist({
          _id: item._id,
          name: item.name,
          imageUrl: item.imageUrl,
          isPublic: true
        });
        navigate(`/playlist/${item._id}`);
      }
    }
  };

  if (isInitialLoading && !hasLoadedOnce) {
    return (
      <div className="min-h-screen bg-[#121212] py-4 space-y-6 relative w-full z-10 pb-32 md:pb-8 animate-[fadeIn_0.3s_ease-out]">
        {/* Recently played skeleton */}
        <div className="px-4 md:px-6 mb-6 w-full">
          <SlowConnectionSkeleton count={4} type="recently-played" className="" />
        </div>
        
        {/* Made for you section skeleton */}
        <div className="px-4 md:px-6">
          <div className="mb-4 space-y-2">
            <div className="h-6 bg-white/10 rounded-full w-32 animate-pulse" />
            <div className="h-4 bg-white/8 rounded-full w-48 animate-pulse" />
          </div>
          <SlowConnectionSkeleton count={6} type="card" className="" />
        </div>
        
        {/* Additional sections skeleton */}
        <div className="px-4 md:px-6">
          <div className="mb-4 space-y-2">
            <div className="h-6 bg-white/10 rounded-full w-28 animate-pulse" />
            <div className="h-4 bg-white/8 rounded-full w-40 animate-pulse" />
          </div>
          <SlowConnectionSkeleton count={5} type="card" className="" />
        </div>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-[#121212] overflow-x-hidden relative animate-[fadeIn_0.4s_ease-out]">
      {/* Skip dynamic background for cellular connections */}
      {!skipHeavyElements && (
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
      )}

      <div className="py-4 space-y-4 relative w-full z-10 pb-32 md:pb-8">
        {/* Skip filter pills for cellular */}
        {!skipHeavyElements && (
          <div className="px-4 md:px-6 hidden md:flex items-center gap-2 mb-1.5 sticky top-0 z-20 pt-2">
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
        )}

        <div className="w-full overflow-x-hidden">
          {/* Recently Played Section - Always show, even if empty */}
          <section className="px-4 md:px-6 mb-6 w-full animate-[scaleIn_0.4s_ease-out]">
            <div className={`grid ${skipHeavyElements ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-4'} gap-[6px] w-full max-w-full`}>
              {/* Liked Songs Card - Always show */}
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

              {/* Other recently played items - limited for cellular */}
              {!skipHeavyElements && getDisplayedItems().slice(0, 7).map((item: any) => {
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

          {/* Public Playlists Section - Minimal for cellular */}
          <SectionWrapper
            title="Made for you"
            subtitle={skipHeavyElements ? "Essential playlists" : "Your personal mix of music"}
            showViewAll={!skipHeavyElements}
            onViewAll={() => navigate('/library')}
          >
            <HorizontalScroll
              itemWidth={120}
              gap={10}
              showArrows={!skipHeavyElements}
              snapToItems={false}
            >
              {publicPlaylists.length > 0 ? (
                publicPlaylists.slice(0, skipHeavyElements ? 3 : networkOptimized ? 8 : 20).map((playlist, index) => (
                  <ScrollItem key={playlist._id} width={120}>
                    <div 
                      className="animate-[scaleIn_0.3s_ease-out]"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <PlaylistCard
                        playlist={playlist}
                        showDescription={!skipHeavyElements}
                        className="hover:bg-card/50 transition-all duration-200 hover:scale-105"
                      />
                    </div>
                  </ScrollItem>
                ))
              ) : (isInitialLoading || isLoading) ? (
                <SlowConnectionSkeleton count={skipHeavyElements ? 3 : 6} type="card" className="" />
              ) : hasLoadedOnce ? (
                <div className="text-zinc-500 text-sm p-4 w-full text-center animate-[fadeIn_0.3s_ease-out]">
                  {skipHeavyElements ? "No essential content available" : "No playlists found"}
                </div>
              ) : (
                <SlowConnectionSkeleton count={skipHeavyElements ? 3 : 6} type="card" className="" />
              )}
            </HorizontalScroll>
          </SectionWrapper>

          {/* JioSaavn Sections - Skip entirely for cellular, minimal for slow connections */}
          {!skipHeavyElements && !networkOptimized && (
            <>
              <section>
                <JioSaavnPlaylistsSection
                  title="Trending Now"
                  categoryId="trending"
                  limit={14}
                  showViewAll={true}
                />
              </section>

              <section>
                <JioSaavnPlaylistsSection
                  title="Bollywood Hits"
                  categoryId="bollywood"
                  limit={14}
                  showViewAll={true}
                />
              </section>

              <section>
                <JioSaavnPlaylistsSection
                  title="Romantic Songs"
                  categoryId="romantic"
                  limit={14}
                  showViewAll={true}
                />
              </section>

              <section>
                <JioSaavnPlaylistsSection
                  title="Punjabi Music"
                  categoryId="punjabi"
                  limit={14}
                  showViewAll={true}
                />
              </section>
            </>
          )}

          {/* Single essential section for moderate optimization */}
          {!skipHeavyElements && networkOptimized && (
            <section>
              <JioSaavnPlaylistsSection
                title="Trending Now"
                categoryId="trending"
                limit={6}
                showViewAll={true}
              />
            </section>
          )}

          {/* Cellular mode message */}
          {skipHeavyElements && (
            <div className="px-4 md:px-6 py-8 text-center">
              <div className="bg-gray-800/30 rounded-lg p-4">
                <h3 className="text-white font-medium mb-2">Cellular Mode Active</h3>
                <p className="text-gray-400 text-sm">
                  Heavy elements disabled to save data. Switch to WiFi for full experience.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;