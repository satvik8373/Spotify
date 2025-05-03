import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, Library, Heart, LogIn, User, LogOut, Download, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useLikedSongsStore } from '@/stores/useLikedSongsStore';
import SongDetailsView from '@/components/SongDetailsView';
import { signOut } from '@/services/hybridAuthService';

/**
 * Mobile Navigation with Profile Menu and Lockscreen Controls
 * 
 * Features:
 * - Profile dropdown with logout functionality
 * - Integration with Media Session API in AudioPlayer.tsx for lockscreen controls
 * - Background audio playback support (iOS/Android)
 * - App installation banner for Android users
 * 
 * Note: For full lockscreen controls to work properly on mobile devices:
 * - iOS: Activate video to fullscreen mode, then swipe up to home screen
 * - Android: Enable background play in browser settings (Menu > Settings > Media > Background play)
 */

const MobileNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentSong, isPlaying } = usePlayerStore();
  const { isAuthenticated, user } = useAuth();
  const { likedSongIds, toggleLikeSong } = useLikedSongsStore();
  const [showSongDetails, setShowSongDetails] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  // PWA installation states
  const [isAndroid, setIsAndroid] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Check if we have an active song to add padding to the bottom nav
  const hasActiveSong = !!currentSong;
  
  // Check if current song is liked
  const isLiked = currentSong ? likedSongIds?.has((currentSong as any).id || currentSong._id) : false;
  
  // State to track liked status independently
  const [songLiked, setSongLiked] = useState(isLiked);

  // Detect Android devices and handle PWA installation
  useEffect(() => {
    // Check if this is an Android device
    const userAgent = navigator.userAgent.toLowerCase();
    const isAndroidDevice = /android/.test(userAgent);
    setIsAndroid(isAndroidDevice);
    
    // Don't show the banner if already installed or previously dismissed
    const installBannerDismissed = localStorage.getItem('installBannerDismissed');
    if (isAndroidDevice && !installBannerDismissed) {
      setShowInstallBanner(true);
    }
    
    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      // Show the install banner
      setShowInstallBanner(true);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Handle app installation
  const handleInstallApp = async () => {
    if (deferredPrompt) {
      // Show the installation prompt
      deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        // User accepted the install prompt
        setShowInstallBanner(false);
      }
      
      // Clear the saved prompt since it can't be used again
      setDeferredPrompt(null);
    } else {
      // If no prompt is available but we're on Android, we can direct to a manual installation guide
      alert('To install the app: tap the menu button in your browser and select "Add to Home screen" or "Install App"');
    }
  };
  
  // Handle dismissing the install banner
  const handleDismissBanner = () => {
    setShowInstallBanner(false);
    // Remember this choice for 7 days
    localStorage.setItem('installBannerDismissed', Date.now().toString());
    
    // Cleanup after 7 days
    setTimeout(() => {
      localStorage.removeItem('installBannerDismissed');
    }, 7 * 24 * 60 * 60 * 1000); // 7 days in milliseconds
  };

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
    const handleClickOutside = (e: MouseEvent) => {
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

  // Handle opening search
  const handleSearchClick = () => {
    navigate('/search');
  };
  
  // Handle like toggle
  const handleLikeToggle = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening song details
    if (currentSong) {
      // Get the song ID consistently
      const songId = (currentSong as any).id || currentSong._id;
      
      // Optimistically update UI
      setSongLiked(!songLiked);
      
      // Perform the actual toggle
      toggleLikeSong(currentSong);
      
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

  return (
    <>
      {/* Song Details View */}
      <SongDetailsView 
        isOpen={showSongDetails} 
        onClose={() => setShowSongDetails(false)} 
      />
      
      {/* Android Install App Banner */}
      {isAndroid && showInstallBanner && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-green-500 text-white py-2 px-3 flex items-center justify-between">
          <div className="flex items-center">
            <Download className="h-5 w-5 mr-2" />
            <span className="text-sm font-medium">Install app for better experience</span>
          </div>
          <div className="flex items-center">
            <button 
              className="bg-white text-green-500 text-xs font-medium px-3 py-1 rounded-full mr-2"
              onClick={handleInstallApp}
            >
              Install
            </button>
            <button 
              className="text-white p-1"
              onClick={handleDismissBanner}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    
      {/* Mobile Header - Spotify style */}
      <div className={cn(
        "fixed left-0 right-0 z-30 bg-zinc-900 md:hidden",
        isAndroid && showInstallBanner ? "top-10" : "top-0"
      )}>
        <div className="flex items-center justify-between px-3 py-2">
          {/* Spotify Logo */}
          <Link to={isAuthenticated ? "/home" : "/"} className="flex items-center">
            <svg viewBox="0 0 16 16" className="h-6 w-6 text-[#1DB954]" aria-label="Spotify">
              <path
                fill="currentColor"
                d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm3.669 11.538a.498.498 0 0 1-.686.165c-1.879-1.147-4.243-1.407-7.028-.77a.499.499 0 0 1-.222-.973c3.048-.696 5.662-.397 7.77.892a.5.5 0 0 1 .166.686zm.979-2.178a.624.624 0 0 1-.858.205c-2.15-1.321-5.428-1.704-7.972-.932a.625.625 0 0 1-.362-1.194c2.905-.881 6.517-.454 8.986 1.063a.624.624 0 0 1 .206.858zm.084-2.268C10.154 5.56 5.9 5.419 3.438 6.166a.748.748 0 1 1-.434-1.432c2.825-.857 7.523-.692 10.492 1.07a.747.747 0 1 1-.764 1.288z"
              />
            </svg>
          </Link>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button 
              onClick={handleSearchClick}
              className="flex items-center justify-center h-7 w-7 rounded-full bg-zinc-800 text-white"
            >
              <Search className="h-3.5 w-3.5" />
            </button>
            
            {isAuthenticated ? (
              <div className="relative">
                <button 
                  onClick={handleProfileClick}
                  className="h-7 w-7 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden"
                >
                  {user?.picture ? (
                    <img src={user.picture} alt={user.name || 'User'} className="w-full h-full object-cover" />
                  ) : (
                    <User className="h-3.5 w-3.5 text-zinc-300" />
                  )}
                </button>
                
                {/* Profile Menu */}
                {showProfileMenu && (
                  <div className="absolute right-0 top-full mt-1 w-36 bg-zinc-800 rounded-md shadow-lg overflow-hidden z-50">
                    <div className="py-1">
                      <Link 
                        to="/account" 
                        className="block px-4 py-2 text-sm text-white hover:bg-zinc-700"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        Profile
                      </Link>
                      <button 
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-white hover:bg-zinc-700 flex items-center"
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
                className="h-7 w-7 rounded-full bg-zinc-800 flex items-center justify-center"
              >
                <LogIn className="h-3.5 w-3.5 text-white" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/90 to-transparent backdrop-blur-md border-t border-zinc-800/20 md:hidden",
          hasActiveSong ? "player-active" : ""
        )}
        style={{
          paddingBottom: `env(safe-area-inset-bottom, 0px)`,
        }}
      >
        {/* Add mini player when song is active */}
        {hasActiveSong && (
          <div className="flex items-center justify-between px-3 py-2 bg-black/50 backdrop-blur-md border-b border-zinc-800/30">
            <div 
              className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer active:bg-zinc-800/30 rounded-md py-1"
              onClick={handleSongTap}
            >
              <img 
                src={currentSong.imageUrl} 
                alt={currentSong.title} 
                className="h-10 w-10 rounded-md object-cover flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">{currentSong.title}</p>
                <p className="text-xs text-zinc-400 truncate">{currentSong.artist}</p>
              </div>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleLikeToggle}
                className={`mr-2 h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 ${songLiked ? 'text-green-500' : 'text-zinc-400'} active:bg-zinc-800`}
              >
                <Heart className="h-4 w-4" fill={songLiked ? 'currentColor' : 'none'} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  usePlayerStore.getState().togglePlay();
                }}
                className="h-8 w-8 rounded-full bg-white flex items-center justify-center flex-shrink-0 active:bg-gray-200"
              >
                {isPlaying ? (
                  <span className="h-3 w-3 border-l-2 border-r-2 border-black"></span>
                ) : (
                  <span className="h-0 w-0 border-t-4 border-b-4 border-r-0 border-l-6 border-transparent border-l-black ml-0.5"></span>
                )}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-4 h-14 bg-black/70">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center py-1.5 transition-colors',
                isActive(item.path) 
                  ? 'text-white' 
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              <item.icon className={cn(
                'h-5 w-5 mb-1', 
                isActive(item.path) && 'text-white'
              )} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
};

export default MobileNav;
