import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, Library, Heart, LogIn, User, LogOut, Play, Pause, Laptop, Speaker, Smartphone, Tv, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useLikedSongsStore } from '@/stores/useLikedSongsStore';
import SongDetailsView from '@/components/SongDetailsView';
import SpotifyConnectView from '@/components/SpotifyConnectView';
import { signOut } from '@/services/hybridAuthService';
import { toast } from 'sonner';

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
  const [showDevices, setShowDevices] = useState(false);
  const [currentDevice, setCurrentDevice] = useState<string>('');
  
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

  // Handle device selection
  const handleSelectDevice = async (deviceId: string) => {
    try {
      const audio = document.querySelector('audio');
      if (!audio) return;
      
      // Toast notification at the beginning to indicate connection attempt
      toast.loading('Connecting to device...');
      
      // Store current playback state
      const wasPlaying = !(audio as HTMLAudioElement).paused;
      
      // Pause current playback
      if (wasPlaying) {
        (audio as HTMLAudioElement).pause();
      }
      
      // Set the audio output device if browser supports it
      if ('setSinkId' in HTMLMediaElement.prototype) {
        await (audio as any).setSinkId(deviceId);
        setCurrentDevice(deviceId);
        
        // Create custom event to notify the system about device change
        document.dispatchEvent(new CustomEvent('audioDeviceChanged', {
          detail: { deviceId }
        }));
        
        // Resume playback if it was playing
        if (wasPlaying) {
          (audio as HTMLAudioElement).play().catch(() => {
            // If play fails, user might need to interact first
            console.log('Play failed after device change');
          });
        }
        
        toast.dismiss();
        toast.success('Connected to audio device');
      } else {
        toast.dismiss();
        toast.error('Your browser does not support audio output device selection');
      }
      
      // Close the device selector
      setShowDevices(false);
    } catch (error) {
      console.error('Error setting audio output device:', error);
      toast.dismiss();
      toast.error('Failed to connect to device');
    }
  };

  return (
    <>
      {/* Song Details View */}
      <SongDetailsView 
        isOpen={showSongDetails} 
        onClose={() => setShowSongDetails(false)} 
      />
      
      {/* Connected Devices Panel */}
      <SpotifyConnectView 
        isOpen={showDevices}
        onClose={() => setShowDevices(false)}
        currentDevice={currentDevice}
        onSelectDevice={handleSelectDevice}
      />
      
      {/* Mobile Header - Spotify style */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-zinc-900 md:hidden">
        <div className="flex items-center justify-end px-4 py-3">
          {/* Logo and Search removed - Only showing profile */}
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
          <div className="flex flex-col justify-between bg-black/50 backdrop-blur-md border-b border-zinc-800/30">
            <div className="flex items-center justify-between px-3 py-2">
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
                {/* Connected Devices Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDevices(true);
                  }}
                  className="mr-2 h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 text-zinc-400 active:bg-zinc-800"
                >
                  <Speaker className="h-4 w-4" />
                </button>
                
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
                    <Pause className="h-4 w-4 text-black" />
                  ) : (
                    <Play className="h-4 w-4 text-black translate-x-0.5" />
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
              <div className="h-[3px] w-full bg-[#0b3d59]/40 relative">
                <div 
                  className="h-full bg-white" 
                  style={{ width: `${progress || 0}%` }}
                />
                
                {/* Position dot indicator */}
                {showTimeIndicators && (
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 h-3 w-3 bg-white rounded-full shadow-md pointer-events-none" 
                    style={{ left: `calc(${progress || 0}% - 4px)` }}
                  />
                )}
              </div>
              
              {/* Time indicators - conditionally shown */}
              {showTimeIndicators && (
                <div className="flex justify-between px-3 py-1 text-[10px] text-white/60">
                  <span>{formatTime(currentTime || 0)}</span>
                  <span>{formatTime(duration || 0)}</span>
                </div>
              )}
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
