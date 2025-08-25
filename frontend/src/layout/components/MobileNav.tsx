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

// Format time helper function
const formatTime = (seconds: number) => {
  if (isNaN(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const MobileNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentSong, isPlaying, currentTime, duration } = usePlayerStore();
  const { isAuthenticated, user } = useAuth();
  const { likedSongIds, toggleLikeSong } = useLikedSongsStore();
  const [showSongDetails, setShowSongDetails] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showTimeIndicators, setShowTimeIndicators] = useState(false);
  const albumColors = useAlbumColors(currentSong?.imageUrl);
  const [isAtTop, setIsAtTop] = useState(true);
  
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

  // Disable pinch zoom using touch-action CSS property
  useEffect(() => {
    // Add touch-action CSS to prevent pinch-zoom
    const style = document.createElement('style');
    style.innerHTML = `
      html, body {
        touch-action: pan-x pan-y;
        overscroll-behavior: none;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

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

  // Track scroll to show header only when at top
  useEffect(() => {
    const handleScroll = () => setIsAtTop(window.scrollY <= 0);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  // Show compact top header on specific routes when at top
  const isLibraryRoute = location.pathname.startsWith('/library');
  const isSearchRoute = location.pathname.startsWith('/search');
  const isLikedRoute = location.pathname.startsWith('/liked-songs');
  const showMobileTopHeader = (
    location.pathname === '/home' ||
    location.pathname === '/' ||
    isLibraryRoute ||
    isSearchRoute
  ) && isAtTop;



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
      // Open the song details modal instead of navigating
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
    const dropdownWidth = 144; // w-36 = 144px
    
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

  // Handle seeking when user taps on progress bar
  const handleSeek = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    
    if (!currentSong || !duration) return;
    
    // Show time indicators when interacting with progress bar
    setShowTimeIndicators(true);
    
    // Hide time indicators after 2 seconds
    setTimeout(() => {
      setShowTimeIndicators(false);
    }, 2000);
    
    // Get the progress bar element
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    
    // Calculate the click/touch position
    let clientX: number;
    if ('touches' in e) {
      // Touch event
      clientX = e.touches[0].clientX;
    } else {
      // Mouse event
      clientX = e.clientX;
    }
    
    // Calculate the percentage and new time
    const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newTime = percentage * duration;
    
    // Set the time in the player store
    if (usePlayerStore.getState().setCurrentTime) {
      usePlayerStore.getState().setCurrentTime(newTime);
    }
    
    // Also update any audio element directly
    const audio = document.querySelector('audio');
    if (audio) {
      audio.currentTime = newTime;
    }
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
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2">
                {isAuthenticated ? (
                  <div className="relative">
                    <button 
                      onClick={handleProfileClick}
                      className="h-6 w-6 rounded-full bg-muted flex items-center justify-center overflow-hidden"
                      aria-label="Profile"
                    >
                      {user?.picture ? (
                        <img src={(user.picture || '').replace(/^http:\/\//, 'https://')} alt={user.name || 'User'} className="w-full h-full object-cover" loading="lazy" decoding="async" width="24" height="24" />
                      ) : (
                        <User className="h-3 w-3 text-muted-foreground" />
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
                    className="h-6 w-6 rounded-full bg-muted flex items-center justify-center"
                    aria-label="Sign in"
                  >
                    <LogIn className="h-3 w-3 text-foreground" />
                  </button>
                )}
                <h2 className="text-base font-semibold text-foreground">Your Library</h2>
              </div>
              <div className="flex items-center gap-2">
              </div>
            </div>
          ) : isSearchRoute ? (
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2">
                {isAuthenticated ? (
                  <div className="relative">
                    <button 
                      onClick={handleProfileClick}
                      className="h-6 w-6 rounded-full bg-muted flex items-center justify-center overflow-hidden"
                      aria-label="Profile"
                    >
                      {user?.picture ? (
                        <img src={(user.picture || '').replace(/^http:\/\//, 'https://')} alt={user.name || 'User'} className="w-full h-full object-cover" loading="lazy" decoding="async" width="24" height="24" />
                      ) : (
                        <User className="h-3 w-3 text-muted-foreground" />
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
                    className="h-6 w-6 rounded-full bg-muted flex items-center justify-center"
                    aria-label="Sign in"
                  >
                    <LogIn className="h-3 w-3 text-foreground" />
                  </button>
                )}
                <h2 className="text-base font-semibold text-foreground">Search</h2>
              </div>
              <div className="flex items-center gap-2" />
            </div>
          ) : (
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2">
                {isAuthenticated ? (
                  <div className="relative">
                    <button 
                      onClick={handleProfileClick}
                      className="h-6 w-6 rounded-full bg-muted flex items-center justify-center overflow-hidden"
                      aria-label="Profile"
                    >
                      {user?.picture ? (
                        <img src={(user.picture || '').replace(/^http:\/\//, 'https://')} alt={user.name || 'User'} className="w-full h-full object-cover" loading="lazy" decoding="async" width="24" height="24" />
                      ) : (
                        <User className="h-3 w-3 text-muted-foreground" />
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
                    className="h-6 w-6 rounded-full bg-muted flex items-center justify-center"
                    aria-label="Sign in"
                  >
                    <LogIn className="h-3 w-3 text-foreground" />
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

      {/* Bottom Navigation */}
              <div
          className={cn(
            "fixed bottom-0 left-0 right-0 z-30 md:hidden border-t border-border bg-background dark:bg-[#191414]",
            hasActiveSong ? "player-active" : ""
          )}
        style={{
          paddingBottom: `env(safe-area-inset-bottom, 0px)`,
          ...(hasActiveSong && {
            backgroundColor: albumColors.isLight 
              ? `${albumColors.primary.replace('rgb', 'rgba').replace(')', ', 0.12)')}`
              : `${albumColors.primary.replace('rgb', 'rgba').replace(')', ', 0.12)')}`,
          })
        }}
      >
        {/* Add mini player when song is active */}
        {hasActiveSong && (
          <div 
            className="flex flex-col justify-between transition-colors duration-500"
            style={{
              backgroundColor: albumColors.isLight
                ? `${albumColors.secondary.replace('rgb', 'rgba').replace(')', ', 0.85)')}`
                : `${albumColors.secondary.replace('rgb', 'rgba').replace(')', ', 0.85)')}`,
              color: albumColors.isLight ? '#000' : '#fff'
            }}
          >
            <div className="flex items-center justify-between px-3 py-2">
              <div 
                className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer active:bg-zinc-800/30 rounded-md py-1"
                onClick={handleSongTap}
              >
                <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-md shadow">
                  <img 
                    src={(currentSong.imageUrl || '').replace(/^http:\/\//, 'https://')} 
                    alt={currentSong.title} 
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                    width="40"
                    height="40"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p 
                    className={cn(
                      "text-sm font-medium truncate",
                      "text-black"
                    )}
                  >
                    {currentSong.title}
                  </p>
                  <p 
                    className={cn(
                      "text-xs truncate",
                      "text-black/70"
                    )}
                  >
                    {currentSong.artist}
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <button
                  onClick={handleLikeToggle}
                  className={cn(
                    "mr-2 h-8 w-8 flex items-center justify-center flex-shrink-0 rounded-full transition-colors",
                    "bg-black/20 hover:bg-black/30 dark:bg-white/20 dark:hover:bg-white/30",
                    songLiked ? "text-green-500" : "text-foreground"
                  )}
                >
                  <Heart className="h-4 w-4" fill={songLiked ? 'currentColor' : 'none'} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    usePlayerStore.getState().togglePlay();
                  }}
                  className={cn(
                    "h-9 w-9 flex items-center justify-center flex-shrink-0 rounded-full transition-colors",
                    isPlaying 
                      ? "bg-black/20 hover:bg-black/30 dark:bg-white/20 dark:hover:bg-white/30 text-foreground" 
                      : "bg-green-500 hover:bg-green-400 text-black"
                  )}
                >
                  {isPlaying ? (
                    <Pause className={cn("h-4 w-4")} />
                  ) : (
                    <Play className={cn("h-4 w-4 translate-x-0.5")} />
                  )}
                </button>
              </div>
            </div>
            
            {/* Song progress bar */}
            <div 
              className="relative w-full cursor-pointer"
              onClick={handleSeek}
              onTouchStart={handleSeek}
              onMouseEnter={() => setShowTimeIndicators(true)}
              onMouseLeave={() => setShowTimeIndicators(false)}
            >
              <div className="h-6 w-full absolute bottom-0 opacity-0">
                {/* Invisible touch target to make seeking easier */}
              </div>
              <div 
                className="h-[3px] w-full relative transition-colors duration-500"
                style={{
                  backgroundColor: albumColors.isLight 
                    ? 'rgba(0, 0, 0, 0.4)' 
                    : 'rgba(255, 255, 255, 0.4)'
                }}
              >
                <div 
                  className="h-full bg-green-500" 
                  style={{ width: `${progress || 0}%` }}
                />
                
                {/* Position dot indicator */}
                {showTimeIndicators && (
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 h-3 w-3 bg-green-500 rounded-full shadow-md pointer-events-none" 
                    style={{ left: `calc(${progress || 0}% - 4px)` }}
                  />
                )}
              </div>
              
              {/* Time indicators - conditionally shown */}
              {showTimeIndicators && (
                <div 
                  className={cn(
                    "flex justify-between px-3 py-1 text-[10px]",
                    albumColors.isLight ? "text-black/80" : "text-white/80"
                  )}
                >
                  <span>{formatTime(currentTime || 0)}</span>
                  <span>{formatTime(duration || 0)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-4 h-16 bg-background dark:bg-[#191414]">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center py-1 transition-colors',
                isActive(item.path) 
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
                <div className={cn('flex items-center justify-center h-8 w-8 mb-1')}>
                  <item.icon className={cn(
                    'h-5 w-5', 
                    isActive(item.path) ? 'text-green-500' : 'text-muted-foreground'
                  )} />
                </div>
                              <span className={cn(
                  "text-[11px] font-medium tracking-tight",
                  isActive(item.path) 
                    ? "text-foreground" 
                    : "text-muted-foreground"
                )}>{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
};

export default MobileNav;
