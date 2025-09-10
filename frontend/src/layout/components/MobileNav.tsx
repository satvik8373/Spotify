import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, Library, Heart, LogIn, User, LogOut, Play, Pause, SkipBack, SkipForward } from 'lucide-react';
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
 * - Uses Wake Lock API to prevent screen sleep during playback
 * - Implements proper playlist navigation with next/previous controls
 */



const MobileNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentSong, isPlaying, currentTime, duration, playNext, playPrevious, queue } = usePlayerStore();
  const { isAuthenticated, user } = useAuth();
  const { likedSongIds, toggleLikeSong } = useLikedSongsStore();
  const [showSongDetails, setShowSongDetails] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [progress, setProgress] = useState(0);
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

  // Disable pinch zoom and enable background playback
  useEffect(() => {
    // Add touch-action CSS to prevent pinch-zoom and enable background playback
    const style = document.createElement('style');
    style.innerHTML = `
      html, body {
        touch-action: pan-x pan-y;
        overscroll-behavior: none;
      }
      
      /* Enable background playback for mobile browsers */
      audio {
        background-playback: enabled;
      }
      
      /* Prevent page refresh on pull-to-refresh when audio is playing */
      body.playing {
        overscroll-behavior-y: none;
      }
    `;
    document.head.appendChild(style);

    // Add playing class to body when audio is playing for background support
    if (isPlaying) {
      document.body.classList.add('playing');
    } else {
      document.body.classList.remove('playing');
    }

    return () => {
      document.head.removeChild(style);
      document.body.classList.remove('playing');
    };
  }, [isPlaying]);

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

  // Handle visibility change for background playback
  useEffect(() => {
    const handleVisibilityChange = () => {
      // When page becomes hidden (user switches apps/tabs), ensure audio continues
      if (document.hidden && isPlaying) {
        // Dispatch event to audio player to maintain playback
        document.dispatchEvent(new CustomEvent('maintainBackgroundPlayback', {
          detail: { isPlaying, currentSong }
        }));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isPlaying, currentSong]);

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

  // Handle next track
  const handleNextTrack = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playNext) {
      playNext();
    }
  };

  // Handle previous track
  const handlePreviousTrack = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playPrevious) {
      playPrevious();
    }
  };

  // Handle play/pause with background support
  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Request wake lock for background playback on mobile
    if ('wakeLock' in navigator && isPlaying === false) {
      navigator.wakeLock.request('screen').catch(() => {
        // Wake lock failed, but continue with playback
        console.log('Wake lock request failed, continuing without it');
      });
    }

    usePlayerStore.getState().togglePlay();
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
              ? `${albumColors.primary}`
              : `${albumColors.primary}`,
          })
        }}
      >
        {/* Add mini player when song is active */}
        {hasActiveSong && (
          <div
            className="flex flex-col justify-between transition-colors duration-500"
            style={{
              backgroundColor: albumColors.isLight
                ? `${albumColors.secondary}`
                : `${albumColors.secondary}`,
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
                      albumColors.isLight ? "text-black" : "text-white"
                    )}
                  >
                    {currentSong.title}
                  </p>
                  <p
                    className={cn(
                      "text-xs truncate",
                      albumColors.isLight ? "text-black/80" : "text-white/80"
                    )}
                  >
                    {currentSong.artist}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* Previous Track Button */}
                <button
                  onClick={handlePreviousTrack}
                  disabled={!queue || queue.length <= 1}
                  className={cn(
                    "h-8 w-8 flex items-center justify-center flex-shrink-0 rounded-full transition-all duration-200 hover:scale-105",
                    (!queue || queue.length <= 1) && "opacity-50 cursor-not-allowed"
                  )}
                  style={{
                    backgroundColor: albumColors.isLight
                      ? 'rgba(0, 0, 0, 0.15)'
                      : 'rgba(255, 255, 255, 0.15)',
                    color: albumColors.isLight ? '#000000' : '#ffffff'
                  }}
                  onMouseEnter={(e) => {
                    if (queue && queue.length > 1) {
                      e.currentTarget.style.backgroundColor = albumColors.isLight
                        ? 'rgba(0, 0, 0, 0.25)'
                        : 'rgba(255, 255, 255, 0.25)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = albumColors.isLight
                      ? 'rgba(0, 0, 0, 0.15)'
                      : 'rgba(255, 255, 255, 0.15)';
                  }}
                  onTouchStart={(e) => {
                    if (queue && queue.length > 1) {
                      e.currentTarget.style.backgroundColor = albumColors.isLight
                        ? 'rgba(0, 0, 0, 0.25)'
                        : 'rgba(255, 255, 255, 0.25)';
                    }
                  }}
                  onTouchEnd={(e) => {
                    e.currentTarget.style.backgroundColor = albumColors.isLight
                      ? 'rgba(0, 0, 0, 0.15)'
                      : 'rgba(255, 255, 255, 0.15)';
                  }}
                >
                  <SkipBack className="h-4 w-4" />
                </button>

                {/* Play/Pause Button */}
                <button
                  onClick={handlePlayPause}
                  className={cn(
                    "h-9 w-9 flex items-center justify-center flex-shrink-0 rounded-full transition-all duration-200 hover:scale-105"
                  )}
                  style={{
                    backgroundColor: isPlaying
                      ? (albumColors.isLight ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.15)')
                      : '#22c55e',
                    color: isPlaying
                      ? (albumColors.isLight ? '#000000' : '#ffffff')
                      : '#000000'
                  }}
                  onMouseEnter={(e) => {
                    if (isPlaying) {
                      e.currentTarget.style.backgroundColor = albumColors.isLight
                        ? 'rgba(0, 0, 0, 0.25)'
                        : 'rgba(255, 255, 255, 0.25)';
                    } else {
                      e.currentTarget.style.backgroundColor = '#16a34a';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isPlaying) {
                      e.currentTarget.style.backgroundColor = albumColors.isLight
                        ? 'rgba(0, 0, 0, 0.15)'
                        : 'rgba(255, 255, 255, 0.15)';
                    } else {
                      e.currentTarget.style.backgroundColor = '#22c55e';
                    }
                  }}
                  onTouchStart={(e) => {
                    if (isPlaying) {
                      e.currentTarget.style.backgroundColor = albumColors.isLight
                        ? 'rgba(0, 0, 0, 0.25)'
                        : 'rgba(255, 255, 255, 0.25)';
                    } else {
                      e.currentTarget.style.backgroundColor = '#16a34a';
                    }
                  }}
                  onTouchEnd={(e) => {
                    if (isPlaying) {
                      e.currentTarget.style.backgroundColor = albumColors.isLight
                        ? 'rgba(0, 0, 0, 0.15)'
                        : 'rgba(255, 255, 255, 0.15)';
                    } else {
                      e.currentTarget.style.backgroundColor = '#22c55e';
                    }
                  }}
                >
                  {isPlaying ? (
                    <Pause className={cn("h-4 w-4")} />
                  ) : (
                    <Play className={cn("h-4 w-4 translate-x-0.5")} />
                  )}
                </button>

                {/* Next Track Button */}
                <button
                  onClick={handleNextTrack}
                  disabled={!queue || queue.length <= 1}
                  className={cn(
                    "h-8 w-8 flex items-center justify-center flex-shrink-0 rounded-full transition-all duration-200 hover:scale-105",
                    (!queue || queue.length <= 1) && "opacity-50 cursor-not-allowed"
                  )}
                  style={{
                    backgroundColor: albumColors.isLight
                      ? 'rgba(0, 0, 0, 0.15)'
                      : 'rgba(255, 255, 255, 0.15)',
                    color: albumColors.isLight ? '#000000' : '#ffffff'
                  }}
                  onMouseEnter={(e) => {
                    if (queue && queue.length > 1) {
                      e.currentTarget.style.backgroundColor = albumColors.isLight
                        ? 'rgba(0, 0, 0, 0.25)'
                        : 'rgba(255, 255, 255, 0.25)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = albumColors.isLight
                      ? 'rgba(0, 0, 0, 0.15)'
                      : 'rgba(255, 255, 255, 0.15)';
                  }}
                  onTouchStart={(e) => {
                    if (queue && queue.length > 1) {
                      e.currentTarget.style.backgroundColor = albumColors.isLight
                        ? 'rgba(0, 0, 0, 0.25)'
                        : 'rgba(255, 255, 255, 0.25)';
                    }
                  }}
                  onTouchEnd={(e) => {
                    e.currentTarget.style.backgroundColor = albumColors.isLight
                      ? 'rgba(0, 0, 0, 0.15)'
                      : 'rgba(255, 255, 255, 0.15)';
                  }}
                >
                  <SkipForward className="h-4 w-4" />
                </button>

                {/* Like Button */}
                <button
                  onClick={handleLikeToggle}
                  className={cn(
                    "ml-1 h-8 w-8 flex items-center justify-center flex-shrink-0 rounded-full transition-all duration-200 hover:scale-105",
                    songLiked ? "text-green-500" : "text-foreground"
                  )}
                  style={{
                    backgroundColor: albumColors.isLight
                      ? 'rgba(0, 0, 0, 0.15)'
                      : 'rgba(255, 255, 255, 0.15)',
                    color: songLiked
                      ? '#22c55e'
                      : (albumColors.isLight ? '#000000' : '#ffffff')
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = albumColors.isLight
                      ? 'rgba(0, 0, 0, 0.25)'
                      : 'rgba(255, 255, 255, 0.25)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = albumColors.isLight
                      ? 'rgba(0, 0, 0, 0.15)'
                      : 'rgba(255, 255, 255, 0.15)';
                  }}
                  onTouchStart={(e) => {
                    e.currentTarget.style.backgroundColor = albumColors.isLight
                      ? 'rgba(0, 0, 0, 0.25)'
                      : 'rgba(255, 255, 255, 0.25)';
                  }}
                  onTouchEnd={(e) => {
                    e.currentTarget.style.backgroundColor = albumColors.isLight
                      ? 'rgba(0, 0, 0, 0.15)'
                      : 'rgba(255, 255, 255, 0.15)';
                  }}
                >
                  <Heart className="h-3.5 w-3.5" fill={songLiked ? 'currentColor' : 'none'} />
                </button>
              </div>
            </div>

            {/* Song progress bar */}
            <div
              className="relative w-full"
            >
              <div
                className="h-[3px] w-full relative transition-colors duration-500"
                style={{
                  backgroundColor: albumColors.isLight
                    ? 'rgba(0, 0, 0, 0.8)'
                    : 'rgba(255, 255, 255, 0.8)'
                }}
              >
                <div
                  className="h-full bg-green-500"
                  style={{ width: `${progress || 0}%` }}
                />
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-4 h-16 bg-background dark:bg-[#191414] pb-safe">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center py-2 transition-colors',
                isActive(item.path)
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className={cn('flex items-center justify-center h-8 w-8 mb-2')}>
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
