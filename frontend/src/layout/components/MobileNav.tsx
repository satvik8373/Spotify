import * as React from 'react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, Library, Heart, LogIn, User, Play, Pause, ListMusic, Bell, Bluetooth, Smartphone, Car, Tv, Headphones, Speaker, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayerSync } from '@/hooks/usePlayerSync';

import SongDetailsView from '@/components/SongDetailsView';
import QueueDrawer from '@/components/QueueDrawer';
import AudioOutputPicker from '@/components/AudioOutputPicker';
import { signOut } from '@/services/hybridAuthService';
import { useAlbumColors } from '@/hooks/useAlbumColors';
import { WhatsNewDialog } from '@/components/WhatsNewDialog';
import ProfileDropdown from '@/components/ProfileDropdown';
import { PingPongScroll } from '@/components/PingPongScroll';
import { useAudioOutputDevice } from '@/hooks/useAudioOutputDevice';
import type { AudioOutputDeviceType } from '@/lib/audioOutputDevice';


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
  const [showOutputPicker, setShowOutputPicker] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [progress, setProgress] = useState(0);
  const albumColors = useAlbumColors(currentSong?.imageUrl);
  const { deviceLabel, deviceType } = useAudioOutputDevice(!!currentSong && isPlaying);

  const renderOutputIcon = (type: AudioOutputDeviceType) => {
    switch (type) {
      case 'car':
        return <Car className="h-4 w-4" />;
      case 'tv':
        return <Tv className="h-4 w-4" />;
      case 'headphones':
        return <Headphones className="h-4 w-4" />;
      case 'speaker':
        return <Speaker className="h-4 w-4" />;
      case 'bluetooth':
        return <Bluetooth className="h-4 w-4" />;
      case 'browser':
        return <Monitor className="h-4 w-4" />;
      default:
        return <Smartphone className="h-4 w-4" />;
    }
  };

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
      <AudioOutputPicker
        isOpen={showOutputPicker}
        onClose={() => setShowOutputPicker(false)}
      />

      <style>{`
        /* Floating Nav & Player Custom CSS */
        .nav-container {
          position: relative;
          width: 96%;
          max-width: 480px;
          margin: 0 auto 4px auto;
          display: flex;
          flex-direction: column;
          border-radius: 12px 12px 32px 32px;
          overflow: hidden;
          box-shadow: 0 8px 24px rgba(0,0,0,0.5);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .nav-background {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(18, 18, 18, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          z-index: 10;
        }

        .nav-content {
          position: relative;
          z-index: 20;
          display: flex;
          justify-content: space-evenly;
          align-items: center;
          height: 48px;
          padding: 0 4px;
        }
      `}</style>

      {/* Mobile Header - Mavrixfy style (only on home) */}
      {showMobileTopHeader && !isLikedRoute && (
        <div className="fixed top-0 left-0 right-0 z-30 bg-[#121212] dark:bg-[#121212] md:hidden pt-[env(safe-area-inset-top,0px)]">
          {isLibraryRoute ? (
            <div className="flex items-center justify-between px-4 h-10">
              <div className="flex items-center gap-2">
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
                          width="26"
                          height="26"
                          className="rounded-full object-cover h-[26px] w-[26px]"
                        />
                      ) : (
                        <User className="h-5 w-5 text-muted-foreground" />
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
                <h2 className="text-sm font-bold text-foreground">Your Library</h2>
              </div>
              <div className="flex items-center gap-2">
              </div>
            </div>
          ) : isSearchRoute ? (
            <div className="flex items-center justify-between px-4 h-10">
              <div className="flex items-center gap-2">
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
                          width="26"
                          height="26"
                          className="rounded-full object-cover h-[26px] w-[26px]"
                        />
                      ) : (
                        <User className="h-5 w-5 text-muted-foreground" />
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
                <h2 className="text-sm font-bold text-foreground">Search</h2>
              </div>
              <div className="flex items-center gap-2" />
            </div>
          ) : (
            <div className="flex items-center justify-between px-4 h-10">
              <div className="flex items-center gap-2">
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
                          width="26"
                          height="26"
                          className="rounded-full object-cover h-[26px] w-[26px]"
                        />
                      ) : (
                        <User className="h-5 w-5 text-muted-foreground" />
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
                  className="w-7 h-7 rounded-full hover:bg-[#1f1f1f] flex items-center justify-center transition-colors"
                  aria-label="What's New"
                >
                  <Bell size={18} className="text-white transition-colors" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom Navigation Wrapper - Fully transparent background */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex flex-col justify-end pointer-events-none md:hidden pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
        {/* Floating Navigation Pill */}
        <div className="w-full flex justify-center pointer-events-auto">
          <div className="nav-container">
            {/* Background Layer */}
            <div className="nav-background"></div>

            {/* Combined Mobile Player Segment */}
            {hasActiveSong && location.pathname !== '/liked-songs/sync' && (
              <div className="relative z-20 w-full border-b border-white/5 bg-[#1a1a1a]/40">
                {/* Album Color Tint */}
                <div
                  className="absolute inset-0 opacity-30 mix-blend-screen"
                  style={{
                    backgroundColor: albumColors.primary || 'transparent',
                    transition: 'background-color 300ms ease',
                  }}
                />

                {/* Player Content */}
                <div className="relative px-3 flex items-center justify-between w-full h-[48px]">
                  {/* Left: Album Art + Song Info */}
                  <div
                    className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                    onClick={handleSongTap}
                  >
                    <div className="h-full w-[42px] -ml-3 flex-shrink-0 overflow-hidden rounded-none shadow-none">
                      <img
                        src={(currentSong.imageUrl || '').replace(/^http:\/\//, 'https://')}
                        alt={currentSong.title}
                        className="w-full h-full object-cover"
                        loading="eager"
                        decoding="async"
                        width="42"
                        height="42"
                      />
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden mr-2">
                      <div className="w-full overflow-hidden mb-0" style={{ color: albumColors.text || '#ffffff' }}>
                        <PingPongScroll
                          text={currentSong.title}
                          className="text-[11px] font-bold leading-tight py-0.5"
                          velocity={15}
                        />
                      </div>
                      <div className="mt-0" style={{ color: 'color-mix(in srgb, ' + (albumColors.text || '#ffffff') + ', transparent 35%)' }}>
                        <PingPongScroll
                          text={currentSong.artist}
                          className="text-[9px] font-medium leading-tight"
                          velocity={12}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right: Controls */}
                    <div className="flex items-center gap-1" style={{ color: albumColors.text || '#ffffff', transition: 'color 300ms ease' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          usePlayerStore.getState().togglePlay();
                        }}
                        className="p-2 transition-transform duration-200 active:scale-90"
                        aria-label={isPlaying ? 'Pause' : 'Play'}
                      >
                        {isPlaying ? (
                          <Pause className="h-4.5 w-4.5" fill="currentColor" />
                        ) : (
                          <Play className="h-4.5 w-4.5 ml-0.5" fill="currentColor" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowOutputPicker(true);
                        }}
                        className="p-1.5 transition-transform duration-200 active:scale-90 opacity-90"
                        aria-label={`Open output devices. Current output: ${deviceLabel}`}
                        title={deviceLabel}
                      >
                        {renderOutputIcon(deviceType)}
                      </button>
                      <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowQueue(true);
                      }}
                        className="p-2 transition-transform duration-200 active:scale-90 opacity-90"
                        aria-label="Open queue"
                      >
                        <ListMusic className="h-4.5 w-4.5" />
                      </button>
                    </div>
                </div>

                {/* Progress Bar Divider */}
                <div className="relative h-[2px] bg-white/5 w-full overflow-hidden">
                  <div
                    className="h-full bg-white absolute top-0 left-0 transition-all duration-100 ease-linear rounded-r-full shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                    style={{ width: `${progress || 0}%` }}
                  />
                </div>
              </div>
            )}

            {/* Nav Items Inline */}
            <nav className="nav-content w-full flex justify-between">
              {/* Left Side */}
              <div className="flex flex-1 justify-evenly items-center">
                {navItems.filter(i => i.position === 'left').map(item => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex flex-col items-center justify-center gap-0.5 transition-all duration-300 flex-1',
                      isActive(item.path) ? 'text-white' : 'text-[#888] hover:text-white'
                    )}
                  >
                    <item.icon
                      className={cn('h-[17px] w-[17px] transition-transform duration-300', isActive(item.path) && 'scale-110')}
                      strokeWidth={isActive(item.path) ? 2.5 : 2}
                    />
                    <span className="text-[7.5px] font-medium tracking-wide">
                      {item.label}
                    </span>
                  </Link>
                ))}
              </div>

              {/* Central AI Button - Icon-only gradient glow (no surrounding gradient circle) */}
              <Link
                to="/mood-playlist"
                aria-label="AI Mood"
                className="flex items-center justify-center group flex-shrink-0 transition-transform duration-300 active:scale-95 px-1.5"
              >
                <span className="relative flex items-center justify-center w-[40px] h-[40px] sm:w-[42px] sm:h-[42px]">
                  <span
                    className="relative z-10 w-[32px] h-[32px] sm:w-[34px] sm:h-[34px] bg-gradient-to-br from-[#ff7de8] via-[#b792ff] to-[#72c8ff] transition-transform duration-300 group-hover:scale-110 drop-shadow-[0_0_8px_rgba(255,132,232,0.52)]"
                    style={{
                      WebkitMaskImage: "url('https://res.cloudinary.com/djqq8kba8/image/upload/v1773035583/Mood-icon_asax7o.svg')",
                      WebkitMaskRepeat: 'no-repeat',
                      WebkitMaskPosition: 'center',
                      WebkitMaskSize: 'contain',
                      maskImage: "url('https://res.cloudinary.com/djqq8kba8/image/upload/v1773035583/Mood-icon_asax7o.svg')",
                      maskRepeat: 'no-repeat',
                      maskPosition: 'center',
                      maskSize: 'contain',
                    }}
                  />
                </span>
              </Link>

              {/* Right Side */}
              <div className="flex flex-1 justify-evenly items-center">
                {navItems.filter(i => i.position === 'right').map(item => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex flex-col items-center justify-center gap-0.5 transition-all duration-300 flex-1',
                      isActive(item.path) ? 'text-white' : 'text-[#888] hover:text-white'
                    )}
                  >
                    <item.icon
                      className={cn('h-[17px] w-[17px] transition-transform duration-300', isActive(item.path) && 'scale-110')}
                      strokeWidth={isActive(item.path) ? 2.5 : 2}
                    />
                    <span className="text-[7.5px] font-medium tracking-wide">
                      {item.label}
                    </span>
                  </Link>
                ))}
              </div>
            </nav>
          </div>
        </div>
      </div >
    </>
  );
};

export default MobileNav;
