import { useEffect, useState } from 'react';
import { usePlaylistStore } from '../../stores/usePlaylistStore';
import { PlaylistCard } from '../../components/playlist/PlaylistCard';
import { useAuth } from '@/contexts/AuthContext';
import { WifiOff } from 'lucide-react';
import { JioSaavnPlaylistsSection } from '@/components/jiosaavn/JioSaavnPlaylistsSection';
import { RecentlyPlayedCard } from '@/components/RecentlyPlayedCard';
import { useNavigate } from 'react-router-dom';
import { useLikedSongsStore } from '@/stores/useLikedSongsStore';
import { HorizontalScroll, ScrollItem } from '@/components/ui/horizontal-scroll';
import { SectionWrapper } from '@/components/ui/section-wrapper';

// Interface for recent playlist
interface RecentPlaylist {
  _id: string;
  name: string;
  imageUrl?: string;
  lastPlayed: number;
}

const HomePage = () => {
  const { publicPlaylists, fetchPublicPlaylists } = usePlaylistStore();
  const { isOnline } = useAuth();
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [recentPlaylists, setRecentPlaylists] = useState<RecentPlaylist[]>([]);
  const navigate = useNavigate();
  const { loadLikedSongs } = useLikedSongsStore();
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);
  const [likedSongsColor, setLikedSongsColor] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Load liked songs count
  useEffect(() => {
    loadLikedSongs();
  }, [loadLikedSongs]);

  useEffect(() => {
    const initializeHomePage = async () => {
      try {
        await fetchPublicPlaylists();
        setTimeout(() => {
          setIsInitialLoading(false);
        }, 100);
      } catch (error) {
        console.error('Error initializing homepage:', error);
        setTimeout(() => {
          setIsInitialLoading(false);
        }, 200);
      }
    };

    initializeHomePage();
  }, [fetchPublicPlaylists]);

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

  // Handle color changes with ultra-smooth transitions
  const handleColorChange = (color: string | null, isLikedSongs: boolean = false) => {
    // Set transitioning state for smoother visual feedback
    setIsTransitioning(true);
    
    // Add a longer delay for more elegant, slower transitions
    setTimeout(() => {
      setHoveredColor(color);
      // If this is the Liked Songs card, save its color as default
      if (isLikedSongs && color) {
        setLikedSongsColor(color);
      }
      
      // Clear transitioning state after a delay
      setTimeout(() => {
        setIsTransitioning(false);
      }, 500);
    }, 150); // Longer delay for more elegant feel
  };

  // Function to convert any color format to rgba with opacity
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

  const activeColor = hoveredColor || likedSongsColor || 'rgb(60, 40, 120)'; // More subtle default purple

  // Debug logging
  useEffect(() => {
    console.log('Active color:', activeColor);
    console.log('Hovered color:', hoveredColor);
    console.log('Liked songs color:', likedSongsColor);
  }, [activeColor, hoveredColor, likedSongsColor]);

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

  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <WifiOff className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Internet Connection</h2>
        <p className="text-muted-foreground">
          Please check your connection and try again.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden relative">
      {/* Dynamic Background Setup - Spotify-style gradient flow */}
      {isOnline && (
        <>
          {/* Main gradient background that flows from top and ends naturally */}
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
              transition: 'background 3500ms cubic-bezier(0.25, 0.1, 0.25, 1)',
              willChange: 'background'
            }}
          />
        </>
      )}

      <div className="py-6 space-y-8 relative w-full z-10">
        <div className="w-full overflow-x-hidden">
          {/* Recently Played Section */}
          {isOnline && getDisplayedItems().length > 0 && (
            <section className="px-4 md:px-6 mb-8 w-full">
              <div className="mb-6">
                <h2 className="text-xl md:text-2xl font-bold text-foreground mb-4 gradient-text-shadow">
                  Good afternoon
                </h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 w-full max-w-full">
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
              ) : (
                Array.from({ length: 8 }).map((_, i) => (
                  <ScrollItem key={i} width={120}>
                    <div className="space-y-3 p-1">
                      <div className="w-full aspect-square rounded-md bg-muted animate-pulse" />
                      <div className="h-3 rounded bg-muted animate-pulse" />
                      <div className="h-2 rounded bg-muted animate-pulse w-3/4" />
                    </div>
                  </ScrollItem>
                ))
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