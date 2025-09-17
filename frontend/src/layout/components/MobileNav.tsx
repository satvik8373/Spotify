import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, Library, Heart, LogIn, User, LogOut, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useAuth } from '@/contexts/AuthContext';
import { useLikedSongsStore } from '@/stores/useLikedSongsStore';
import SongDetailsView from '@/components/SongDetailsView';
import { signOut } from '@/services/hybridAuthService';
import { useAlbumColors } from '@/hooks/useAlbumColors';
import { MobileThemeToggle } from '@/components/MobileThemeToggle';

/**
 * Mobile Navigation with Profile Menu and Lockscreen Controls
 * 
 * Features:
 * - Profile dropdown with logout functionality
 * - Integration with Media Session API in AudioPlayer.tsx for lockscreen controls
 * - Background audio playback support (iOS/Android)
 * 
 * Note: For full lockscreen controls to work properly on mobile devices:
 * - iOS: Activate video to fullscreen mode, then swipe up to home screen
 * - Android: Enable background play in browser settings (Menu > Settings > Media > Background play)
 */



const MobileNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentSong, isPlaying, currentTime, duration } = usePlayerStore();
  const { isAuthenticated, user } = useAuth();
  const { likedSongIds, toggleLikeSong } = useLikedSongsStore();
  const [showSongDetails, setShowSongDetails] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [progress, setProgress] = useState(0);
  const albumColors = useAlbumColors(currentSong?.imageUrl);


  // Check if we have an active song to add padding to the bottom nav
  const hasActiveSong = !!currentSong;

  // Check if current song is liked
  const isLiked = currentSong ? likedSongIds?.has((currentSong as any).id || currentSong._id) : false;

  // State to track liked status independently
  const [songLiked, setSongLiked] = useState(isLiked);

  // Update songLiked whenever isLiked changes
  useEffect(() => {
    setSongLiked(isLiked);
  }, [isLiked]);

  // Listen for like updates from other components
  useEffect(() => {
    const handleLikeUpdate = (e: Event) => {
      if (!currentSong) return;

      const songId = (currentSong as any).id || currentSong._id;

      // Check if this event includes details about which song was updated
      if (e instanceof CustomEvent && e.detail) {
        // If we have details and it's not for our current song, ignore
        if (e.detail.songId && e.detail.songId !== songId) {
          return;
        }

        // If we have explicit like state in the event, use it
        if (typeof e.detail.isLiked === 'boolean') {
          setSongLiked(e.detail.isLiked);
          return;
        }
      }

      // Otherwise do a fresh check from the store
      const freshCheck = songId ? likedSongIds?.has(songId) : false;
      setSongLiked(freshCheck);
    };

    document.addEventListener('likedSongsUpdated', handleLikeUpdate);
    document.addEventListener('songLikeStateChanged', handleLikeUpdate);

    return () => {
      document.removeEventListener('likedSongsUpdated', handleLikeUpdate);
      document.removeEventListener('songLikeStateChanged', handleLikeUpdate);
    };
  }, [currentSong, likedSongIds]);

  // Stable gradient background with isolation and theme-aware fallbacks
  const gradientStyle = React.useMemo(() => ({
    background: 'linear-gradient(0deg, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.9) 10%, rgba(0, 0, 0, 0.8) 25%, rgba(0, 0, 0, 0.6) 40%, rgba(0, 0, 0, 0.4) 60%, rgba(0, 0, 0, 0.2) 75%, rgba(0, 0, 0, 0.1) 85%, transparent 95%, transparent 100%)',
    backgroundColor: 'transparent',
    border: 'none',
    boxShadow: 'none',
    isolation: 'isolate',
    zIndex: 30,
  }), []);

  // Force gradient override on theme changes and re-renders
  useEffect(() => {
    const styleId = 'mobile-nav-gradient-override';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;

    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    // Ultra-specific CSS to prevent any overrides
    styleElement.textContent = `
      .mobile-nav-gradient-container {
        background: linear-gradient(0deg, 
          rgba(0, 0, 0, 0.95) 0%, 
          rgba(0, 0, 0, 0.9) 10%, 
          rgba(0, 0, 0, 0.8) 25%, 
          rgba(0, 0, 0, 0.6) 40%, 
          rgba(0, 0, 0, 0.4) 60%, 
          rgba(0, 0, 0, 0.2) 75%, 
          rgba(0, 0, 0, 0.1) 85%, 
          transparent 95%, 
          transparent 100%) !important;
        background-color: transparent !important;
        border: none !important;
        box-shadow: none !important;
        isolation: isolate !important;
      }
      
      /* Prevent theme variables from affecting the nav */
      .mobile-nav-gradient-container,
      .mobile-nav-gradient-container * {
        --tw-bg-opacity: 0 !important;
      }
      
      /* Override any Tailwind background utilities */
      .mobile-nav-gradient-container .bg-background,
      .mobile-nav-gradient-container .bg-black,
      .mobile-nav-gradient-container .dark\\:bg-\\[\\#191414\\] {
        background-color: transparent !important;
        background: transparent !important;
      }
      
      /* Ensure child elements don't inherit problematic backgrounds */
      .mobile-nav-gradient-container > *:not(.mobile-player-container) {
        background-color: transparent !important;
      }
      
      /* Hover states remain functional */
      .mobile-nav-gradient-container .hover\\:bg-white\\/5:hover {
        background-color: rgba(255, 255, 255, 0.05) !important;
      }
    `;

    return () => {
      const element = document.getElementById(styleId);
      if (element) {
        element.remove();
      }
    };
  }, [location.pathname]); // Re-run on route changes

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (showProfileMenu) {
        setShowProfileMenu(false);
      }
    };

    // Add event listener only when profile menu is open
    if (showProfileMenu) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showProfileMenu]);

  // Update progress for the progress bar
  useEffect(() => {
    if (currentTime && duration) {
      setProgress((currentTime / duration) * 100);
    } else {
      setProgress(0);
    }
  }, [currentTime, duration]);



  const navItems = [
    {
      label: 'Home',
      icon: Home,
      path: '/home',
    },
    {
      label: 'Search',
      icon: Search,
      path: '/search',
    },
    {
      label: 'Your Library',
      icon: Library,
      path: '/library',
    },
    {
      label: 'Liked Songs',
      icon: Heart,
      path: '/liked-songs',
    },
  ];

  const isActive = (path: string) => {
    if (path === '/home' && location.pathname === '/home') return true;
    if (path !== '/home' && location.pathname.startsWith(path)) return true;
    return false;
  };

  // Show compact top header on specific routes
  const isLibraryRoute = location.pathname.startsWith('/library');
  const isSearchRoute = location.pathname.startsWith('/search');
  const isLikedRoute = location.pathname.startsWith('/liked-songs');
  const showMobileTopHeader = (
    location.pathname === '/home' ||
    location.pathname === '/' ||
    isLibraryRoute ||
    isSearchRoute
  );



  // Handle user login
  const handleLogin = () => {
    navigate('/login');
  };

  // Handle logout
  const handleLogout = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Navigate to welcome page first for faster perceived performance
      setShowProfileMenu(false);
      navigate('/', { replace: true });

      // Then perform the actual logout
      const result = await signOut();
      if (!result.success) {
        console.error('Error during logout:', result.error);
      }
    } catch (error) {
      console.error('Error signing out:', error);
      // Still close the menu and reset auth store
      setShowProfileMenu(false);
    }
  };

  // (removed unused search click handler)

  // Handle like toggle
  const handleLikeToggle = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening song details
    if (currentSong) {
      // Get the song ID consistently
      const songId = (currentSong as any).id || currentSong._id;

      // Optimistically update UI
      setSongLiked(!songLiked);

      // Perform the actual toggle with the correct song format
      toggleLikeSong({
        _id: songId,
        title: currentSong.title,
        artist: currentSong.artist,
        albumId: currentSong.albumId || null,
        imageUrl: currentSong.imageUrl || '',
        audioUrl: currentSong.audioUrl,
        duration: currentSong.duration || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Also dispatch a direct event for immediate notification
      document.dispatchEvent(new CustomEvent('songLikeStateChanged', {
        detail: {
          songId,
          song: currentSong,
          isLiked: !songLiked,
          timestamp: Date.now(),
          source: 'MobileNav'
        }
      }));
    }
  };

  // Handle song tap to open song details view
  const handleSongTap = () => {
    if (currentSong) {
      setShowSongDetails(true);
    }
  };



  // Handle profile click
  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowProfileMenu(prev => !prev);
  };

  // Calculate dropdown position to stay within viewport
  const getDropdownPosition = () => {
    if (typeof window === 'undefined') return 'right-0';

    // Check if we're near the right edge of the screen
    const viewportWidth = window.innerWidth;

    // If we're within 160px of the right edge, position dropdown to the left
    if (viewportWidth < 400) {
      return 'left-0';
    }

    return 'right-0';
  };

  // Get dropdown container styles
  const getDropdownStyles = () => {
    const position = getDropdownPosition();
    return {
      className: `absolute top-full mt-1 w-36 bg-popover/95 backdrop-blur-sm rounded-md shadow-xl overflow-hidden z-50 border border-border ${position}`,
      style: {
        minWidth: '144px',
        maxWidth: '200px',
      }
    };
  };



  return (
    <>
      {/* Song Details View */}
      <SongDetailsView
        isOpen={showSongDetails}
        onClose={() => setShowSongDetails(false)}
      />

      {/* Mobile Header - Spotify style (only on home) */}
      {showMobileTopHeader && !isLikedRoute && (
        <div className="fixed top-0 left-0 right-0 z-30 bg-background dark:bg-[#191414] md:hidden">
          {isLibraryRoute ? (
            <div className="flex items-center justify-between px-3 py-1">
              <div className="flex items-center gap-2">
                {isAuthenticated ? (
                  <div className="relative">
                    <button
                      onClick={handleProfileClick}
                      aria-label="Profile"
                      className="p-1"
                    >
                      {user?.picture ? (
                        <img
                          src={(user.picture || '').replace(/^http:\/\//, 'https://')}
                          alt={user.name || 'User'}
                          loading="lazy"
                          decoding="async"
                          width="24"
                          height="24"
                          className="rounded-full object-cover h-6 w-6"
                        />
                      ) : (
                        <User className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>
                    {showProfileMenu && (
                      <div
                        className={getDropdownStyles().className}
                        style={getDropdownStyles().style}
                      >
                        <div className="py-1">
                          <Link
                            to="/profile"
                            className="block px-4 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors"
                            onClick={() => setShowProfileMenu(false)}
                          >
                            Profile
                          </Link>
                          <button
                            onClick={handleLogout}
                            className="w-full text-left px-4 py-2 text-sm text-popover-foreground hover:bg-accent flex items-center transition-colors"
                          >
                            <LogOut className="h-3.5 w-3.5 mr-2" />
                            Sign out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={handleLogin}
                    aria-label="Sign in"
                    className="p-1"
                  >
                    <LogIn className="h-4 w-4 text-foreground" />
                  </button>
                )}
                <h2 className="text-sm font-semibold text-foreground">Your Library</h2>
              </div>
              <div className="flex items-center gap-2">
              </div>
            </div>
          ) : isSearchRoute ? (
            <div className="flex items-center justify-between px-3 py-1">
              <div className="flex items-center gap-2">
                {isAuthenticated ? (
                  <div className="relative">
                    <button
                      onClick={handleProfileClick}
                      aria-label="Profile"
                      className="p-1"
                    >
                      {user?.picture ? (
                        <img
                          src={(user.picture || '').replace(/^http:\/\//, 'https://')}
                          alt={user.name || 'User'}
                          loading="lazy"
                          decoding="async"
                          width="24"
                          height="24"
                          className="rounded-full object-cover h-6 w-6"
                        />
                      ) : (
                        <User className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>
                    {showProfileMenu && (
                      <div
                        className={getDropdownStyles().className}
                        style={getDropdownStyles().style}
                      >
                        <div className="py-1">
                          <Link
                            to="/profile"
                            className="block px-4 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors"
                            onClick={() => setShowProfileMenu(false)}
                          >
                            Profile
                          </Link>
                          <button
                            onClick={handleLogout}
                            className="w-full text-left px-4 py-2 text-sm text-popover-foreground hover:bg-accent flex items-center transition-colors"
                          >
                            <LogOut className="h-3.5 w-3.5 mr-2" />
                            Sign out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={handleLogin}
                    aria-label="Sign in"
                    className="p-1"
                  >
                    <LogIn className="h-4 w-4 text-foreground" />
                  </button>
                )}
                <h2 className="text-sm font-semibold text-foreground">Search</h2>
              </div>
              <div className="flex items-center gap-2" />
            </div>
          ) : (
            <div className="flex items-center justify-between px-3 py-1">
              <div className="flex items-center gap-2">
                {isAuthenticated ? (
                  <div className="relative">
                    <button
                      onClick={handleProfileClick}
                      aria-label="Profile"
                      className="p-1"
                    >
                      {user?.picture ? (
                        <img
                          src={(user.picture || '').replace(/^http:\/\//, 'https://')}
                          alt={user.name || 'User'}
                          loading="lazy"
                          decoding="async"
                          width="24"
                          height="24"
                          className="rounded-full object-cover h-6 w-6"
                        />
                      ) : (
                        <User className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>
                    {showProfileMenu && (
                      <div
                        className={getDropdownStyles().className}
                        style={getDropdownStyles().style}
                      >
                        <div className="py-1">
                          <Link
                            to="/profile"
                            className="block px-4 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors"
                            onClick={() => setShowProfileMenu(false)}
                          >
                            Profile
                          </Link>
                          <button
                            onClick={handleLogout}
                            className="w-full text-left px-4 py-2 text-sm text-popover-foreground hover:bg-accent flex items-center transition-colors"
                          >
                            <LogOut className="h-3.5 w-3.5 mr-2" />
                            Sign out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={handleLogin}
                    aria-label="Sign in"
                    className="p-1"
                  >
                    <LogIn className="h-4 w-4 text-foreground" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <MobileThemeToggle />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom Navigation - Spotify Style with Gradient Background */}
      <div
        className="mobile-nav-gradient-container fixed bottom-0 left-0 right-0 md:hidden"
        style={{
          ...gradientStyle,
          paddingBottom: `env(safe-area-inset-bottom, 0px)`,
          paddingTop: hasActiveSong ? '60px' : '40px',
          '--album-primary': albumColors.primary || '#1db954',
          '--album-secondary': albumColors.secondary || '#191414',
        } as React.CSSProperties}
      >
        {/* Spotify Mobile Player - Floating Design */}
        {hasActiveSong && (
          <div className="px-2 pb-1">
            <div className="mobile-player-container relative rounded-xl overflow-hidden shadow-2xl mx-1">
              {/* Main Player Container - Compact */}
              <div
                className="relative px-3 py-2"
                style={{
                  background: `linear-gradient(90deg, ${albumColors.primary || '#1a1a1a'} 0%, ${albumColors.secondary || '#121212'} 100%)`,
                }}
              >
                {/* Player Content - Compact Layout */}
                <div className="flex items-center justify-between">
                  {/* Left: Album Art + Song Info */}
                  <div
                    className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                    onClick={handleSongTap}
                  >
                    {/* Album Artwork - Smaller */}
                    <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-md shadow-md">
                      <img
                        src={(currentSong.imageUrl || '').replace(/^http:\/\//, 'https://')}
                        alt={currentSong.title}
                        className="w-full h-full object-cover"
                        loading="eager"
                        decoding="async"
                        width="40"
                        height="40"
                      />
                    </div>

                    {/* Song Info - Compact */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate leading-tight">
                        {currentSong.title}
                      </p>
                      <p className="text-white/70 text-xs truncate leading-tight">
                        {currentSong.artist}
                      </p>
                    </div>
                  </div>

                  {/* Right: Controls - Spotify Authentic */}
                  <div className="flex items-center gap-2">
                    {/* Like Button - Smaller */}
                    <button
                      onClick={handleLikeToggle}
                      className="p-1 transition-transform duration-200 active:scale-90"
                    >
                      <Heart
                        className={cn("h-4 w-4", songLiked ? "text-green-400" : "text-white/75")}
                        fill={songLiked ? 'currentColor' : 'none'}
                      />
                    </button>

                    {/* Play/Pause Button - White Filled Icons */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        usePlayerStore.getState().togglePlay();
                      }}
                      className="p-2 transition-transform duration-200 active:scale-90"
                    >
                      {isPlaying ? (
                        <Pause
                          className="h-5 w-5 text-white"
                          fill="white"
                        />
                      ) : (
                        <Play
                          className="h-5 w-5 text-white ml-px"
                          fill="white"
                        />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Ultra-thin Progress Bar - Floating Width */}
              <div className="absolute bottom-0 left-0 right-0">
                <div className="h-0.5 bg-white/20 relative">
                  <div
                    className="h-full bg-white absolute top-0 left-0 transition-all duration-100 ease-linear"
                    style={{ width: `${progress || 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Items - Positioned at bottom with proper contrast */}
        <div
          className="relative grid grid-cols-4 h-20 px-2 pt-2"
          style={{
            backgroundColor: 'transparent',
            background: 'transparent',
            zIndex: 10
          }}
        >
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-300 bg-transparent',
                isActive(item.path)
                  ? 'text-white scale-105'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              )}
            >
              <div className={cn(
                'flex items-center justify-center h-7 w-7 mb-1 transition-all duration-300',
                isActive(item.path) && 'scale-110'
              )}>
                <item.icon
                  className={cn(
                    'h-5 w-5 transition-all duration-300',
                    isActive(item.path) ? 'text-white' : 'text-current'
                  )}
                  fill={isActive(item.path) ? 'white' : 'none'}
                />
              </div>
              <span className={cn(
                "text-[10px] font-medium tracking-tight transition-all duration-300",
                isActive(item.path) ? "text-white" : "text-white/70"
              )}>
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
};

export default MobileNav;
