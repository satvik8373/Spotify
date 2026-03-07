import * as React from 'react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, Library, Heart, LogIn, User, Play, Pause, ListMusic, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayerSync } from '@/hooks/usePlayerSync';

import SongDetailsView from '@/components/SongDetailsView';
import QueueDrawer from '@/components/QueueDrawer';
import { signOut } from '@/services/hybridAuthService';
import { useAlbumColors } from '@/hooks/useAlbumColors';
import { WhatsNewDialog } from '@/components/WhatsNewDialog';
import ProfileDropdown from '@/components/ProfileDropdown';
import { PingPongScroll } from '@/components/PingPongScroll';


/**
 * Mobile Navigation with Profile Menu and Lockscreen Controls
 * 
 * Features:
 * - Profile dropdown with logout functionality
 * - Integration with Media Session API in AudioPlayer.tsx for lockscreen controls
 * 
 * Note: For full lockscreen controls to work properly on mobile devices:
 * - iOS: Activate video to fullscreen mode, then swipe up to home screen
 * - Android: Enable background play in browser settings (Menu > Settings > Media > Background play)
 */



const MobileNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentTime, duration } = usePlayerStore();
  const { isPlaying, currentSong } = usePlayerSync();
  const { isAuthenticated, user } = useAuth();
  const [showSongDetails, setShowSongDetails] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [progress, setProgress] = useState(0);
  const albumColors = useAlbumColors(currentSong?.imageUrl);

  // Check if we have an active song to add padding to the bottom nav
  const hasActiveSong = !!currentSong;

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
      position: 'left'
    },
    {
      label: 'Search',
      icon: Search,
      path: '/search',
      position: 'left'
    },
    {
      label: 'Library',
      icon: Library,
      path: '/library',
      position: 'right'
    },
    {
      label: 'Liked',
      icon: Heart,
      path: '/liked-songs',
      position: 'right'
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
        // Error during logout
      }
    } catch (error) {
      // Still close the menu and reset auth store
      setShowProfileMenu(false);
    }
  };

  // (removed unused search click handler)



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
        maxWidth: '320px',
      }
    };
  };



  return (
    <>
      <WhatsNewDialog open={showWhatsNew} onOpenChange={setShowWhatsNew} />

      {/* Song Details View */}
      <SongDetailsView
        isOpen={showSongDetails}
        onClose={() => setShowSongDetails(false)}
      />

      {/* Queue Drawer */}
      <QueueDrawer
        isOpen={showQueue}
        onClose={() => setShowQueue(false)}
      />

      <style>{`
        .mobile-nav-gradient-container {
          background: transparent !important;
          background-color: transparent !important;
        }

        /* Floating Nav Custom CSS from Stitch */
        .nav-container {
          position: relative;
          width: 92%;
          max-width: 400px;
          height: 54px;
          margin: 0 auto;
        }

        .nav-background {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(30, 30, 30, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 27px;
          /* CSS Mask for the circular notch - tighter fit for 44px button */
          mask: radial-gradient(circle 27px at 50% 0%, transparent 100%, black 100%);
          -webkit-mask: radial-gradient(circle 27px at 50% 0, transparent 28px, black 29px);
          z-index: 10;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .nav-content {
          position: relative;
          z-index: 20;
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: 100%;
          padding: 0 24px;
        }

        .ai-button-container {
          position: absolute;
          top: -22px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 30;
        }

        @keyframes aiGradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .ai-button {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          /* Vibrant AI Gradient */
          background: linear-gradient(135deg, #ff3366 0%, #8b5cf6 50%, #3b82f6 100%);
          background-size: 200% 200%;
          animation: aiGradient 3s ease infinite;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #232526;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
          position: relative;
          overflow: hidden;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        
        .ai-button:active {
          transform: translateX(-50%) scale(0.95);
        }

        .ai-logo {
          font-weight: 800;
          font-size: 1.1rem;
          color: white;
          text-shadow: 0 0 10px rgba(255,255,255,0.4);
          letter-spacing: -0.5px;
        }

        .ai-button::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.1);
          pointer-events: none;
        }
      `}</style>

      {/* Mobile Header - Spotify style (only on home) */}
      {showMobileTopHeader && !isLikedRoute && (
        <div className="fixed top-0 left-0 right-0 z-30 bg-[#121212] dark:bg-[#121212] md:hidden">
          {isLibraryRoute ? (
            <div className="flex items-center justify-between px-4 h-12">
              <div className="flex items-center gap-2.5">
                {isAuthenticated ? (
                  <div className="relative">
                    <button
                      onClick={handleProfileClick}
                      aria-label="Profile"
                      className="p-0.5"
                    >
                      {user?.picture ? (
                        <img
                          src={(user.picture || '').replace(/^http:\/\//, 'https://')}
                          alt={user.name || 'User'}
                          loading="lazy"
                          decoding="async"
                          width="28"
                          height="28"
                          className="rounded-full object-cover h-7 w-7"
                        />
                      ) : (
                        <User className="h-6 w-6 text-muted-foreground" />
                      )}
                    </button>
                    <ProfileDropdown
                      isOpen={showProfileMenu}
                      onClose={() => setShowProfileMenu(false)}
                      onLogout={handleLogout}
                      className={getDropdownStyles().className}
                      style={getDropdownStyles().style}
                    />
                  </div>
                ) : (
                  <button
                    onClick={handleLogin}
                    aria-label="Sign in"
                    className="p-1"
                  >
                    <LogIn className="h-5 w-5 text-foreground" />
                  </button>
                )}
                <h2 className="text-base font-bold text-foreground">Your Library</h2>
              </div>
              <div className="flex items-center gap-2">
              </div>
            </div>
          ) : isSearchRoute ? (
            <div className="flex items-center justify-between px-4 h-12">
              <div className="flex items-center gap-2.5">
                {isAuthenticated ? (
                  <div className="relative">
                    <button
                      onClick={handleProfileClick}
                      aria-label="Profile"
                      className="p-0.5"
                    >
                      {user?.picture ? (
                        <img
                          src={(user.picture || '').replace(/^http:\/\//, 'https://')}
                          alt={user.name || 'User'}
                          loading="lazy"
                          decoding="async"
                          width="28"
                          height="28"
                          className="rounded-full object-cover h-7 w-7"
                        />
                      ) : (
                        <User className="h-6 w-6 text-muted-foreground" />
                      )}
                    </button>
                    <ProfileDropdown
                      isOpen={showProfileMenu}
                      onClose={() => setShowProfileMenu(false)}
                      onLogout={handleLogout}
                      className={getDropdownStyles().className}
                      style={getDropdownStyles().style}
                    />
                  </div>
                ) : (
                  <button
                    onClick={handleLogin}
                    aria-label="Sign in"
                    className="p-1"
                  >
                    <LogIn className="h-5 w-5 text-foreground" />
                  </button>
                )}
                <h2 className="text-base font-bold text-foreground">Search</h2>
              </div>
              <div className="flex items-center gap-2" />
            </div>
          ) : (
            <div className="flex items-center justify-between px-4 h-12">
              <div className="flex items-center gap-2.5">
                {isAuthenticated ? (
                  <div className="relative">
                    <button
                      onClick={handleProfileClick}
                      aria-label="Profile"
                      className="p-0.5"
                    >
                      {user?.picture ? (
                        <img
                          src={(user.picture || '').replace(/^http:\/\//, 'https://')}
                          alt={user.name || 'User'}
                          loading="lazy"
                          decoding="async"
                          width="28"
                          height="28"
                          className="rounded-full object-cover h-7 w-7"
                        />
                      ) : (
                        <User className="h-6 w-6 text-muted-foreground" />
                      )}
                    </button>
                    <ProfileDropdown
                      isOpen={showProfileMenu}
                      onClose={() => setShowProfileMenu(false)}
                      onLogout={handleLogout}
                      className={getDropdownStyles().className}
                      style={getDropdownStyles().style}
                    />
                  </div>
                ) : (
                  <button
                    onClick={handleLogin}
                    aria-label="Sign in"
                    className="p-0.5"
                  >
                    <LogIn className="h-5 w-5 text-foreground" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowWhatsNew(true)}
                  className="w-8 h-8 rounded-full hover:bg-[#1f1f1f] flex items-center justify-center transition-colors"
                  aria-label="What's New"
                >
                  <Bell size={20} className="text-white transition-colors" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom Navigation Wrapper - Pointer Events None so clicks pass through empty space */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 bg-transparent flex flex-col justify-end pointer-events-none md:hidden"
        style={{
          paddingBottom: `env(safe-area-inset-bottom, 0px)`,
        } as React.CSSProperties}
      >
        {/* Mobile Player container - Spaced to avoid the AI button */}
        {hasActiveSong && location.pathname !== '/liked-songs/sync' && (
          <div className="px-2 mb-4 pointer-events-auto">
            <div className="relative rounded-lg overflow-hidden shadow-2xl mx-1 bg-[#1a1a1a]">
              {/* Main Player Container - Compact Height */}
              <div
                className="relative px-2 py-1 h-[42px] flex items-center"
                style={{
                  backgroundColor: albumColors.primary || '#1a1a1a',
                  transition: 'background-color 300ms ease, color 300ms ease',
                }}
              >
                {/* Player Content - Compact Layout */}
                <div className="flex items-center justify-between w-full h-full">
                  {/* Left: Album Art + Song Info */}
                  <div
                    className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                    onClick={handleSongTap}
                  >
                    {/* Album Artwork - Smaller */}
                    <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-md shadow-md">
                      <img
                        src={(currentSong.imageUrl || '').replace(/^http:\/\//, 'https://')}
                        alt={currentSong.title}
                        className="w-full h-full object-cover"
                        loading="eager"
                        decoding="async"
                        width="32"
                        height="32"
                      />
                    </div>

                    {/* Song Info - Smart Marquee */}
                    <div className="flex-1 min-w-0 overflow-hidden mr-2">
                      <div className="w-full overflow-hidden mb-0.5" style={{ color: albumColors.text || '#ffffff' }}>
                        <PingPongScroll
                          text={currentSong.title}
                          className="text-sm font-medium leading-tight py-0.5"
                          velocity={15}
                        />
                      </div>

                      {/* Artist - PingPong Scroll */}
                      <div className="mt-0.5" style={{ color: 'color-mix(in srgb, ' + (albumColors.text || '#ffffff') + ', transparent 30%)' }}>
                        <PingPongScroll
                          text={currentSong.artist}
                          className="text-xs leading-tight"
                          velocity={12}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right: Controls - Spotify Authentic */}
                  <div className="flex items-center gap-1" style={{ color: albumColors.text || '#ffffff', transition: 'color 300ms ease' }}>
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
                          className="h-5 w-5"
                          fill="currentColor"
                        />
                      ) : (
                        <Play
                          className="h-5 w-5 ml-px"
                          fill="currentColor"
                        />
                      )}
                    </button>

                    {/* Queue Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowQueue(true);
                      }}
                      className="p-1.5 transition-transform duration-200 active:scale-90"
                      aria-label="Open queue"
                    >
                      <ListMusic className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Ultra-thin Progress Bar - Floating Width */}
              <div className="absolute bottom-[1px] left-2 right-2">
                <div className="h-0.5 bg-white/20 relative rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white absolute top-0 left-0 transition-all duration-100 ease-linear rounded-full"
                    style={{ width: `${progress || 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Floating Navigation Pill */}
        <div className="pb-3 w-full flex justify-center mt-1 pointer-events-auto">
          <div className="nav-container">
            {/* Central AI Button */}
            <div className="ai-button-container">
              <Link to="/mood-playlist" className="ai-button block group">
                <span className="ai-logo transition-transform group-hover:scale-110">AI</span>
              </Link>
            </div>

            {/* Background Layer with Cutout Match */}
            <div className="nav-background"></div>

            {/* Nav Items */}
            <nav className="nav-content">
              {/* Left Side */}
              <div className="flex gap-4 sm:gap-8">
                {navItems.filter(i => i.position === 'left').map(item => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1 w-12 transition-all duration-300',
                      isActive(item.path) ? 'text-white' : 'text-[#888] hover:text-white'
                    )}
                  >
                    <item.icon
                      className={cn('h-[18px] w-[18px] transition-transform duration-300', isActive(item.path) && 'scale-110')}
                      strokeWidth={isActive(item.path) ? 2.5 : 2}
                    />
                    <span className="text-[10px] font-medium tracking-tight">
                      {item.label}
                    </span>
                  </Link>
                ))}
              </div>

              {/* Right Side */}
              <div className="flex gap-4 sm:gap-8">
                {navItems.filter(i => i.position === 'right').map(item => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1 w-12 transition-all duration-300',
                      isActive(item.path) ? 'text-white' : 'text-[#888] hover:text-white'
                    )}
                  >
                    <item.icon
                      className={cn('h-[18px] w-[18px] transition-transform duration-300', isActive(item.path) && 'scale-110')}
                      strokeWidth={isActive(item.path) ? 2.5 : 2}
                    />
                    <span className="text-[10px] font-medium tracking-tight">
                      {item.label}
                    </span>
                  </Link>
                ))}
              </div>
            </nav>
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileNav;
