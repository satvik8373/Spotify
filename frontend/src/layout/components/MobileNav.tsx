import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, Library, Heart, LogIn, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useLikedSongsStore } from '@/stores/useLikedSongsStore';
import SongDetailsView from '@/components/SongDetailsView';

const MobileNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentSong, isPlaying } = usePlayerStore();
  const { isAuthenticated, user } = useAuth();
  const { likedSongIds, toggleLikeSong } = useLikedSongsStore();
  const [showSongDetails, setShowSongDetails] = useState(false);

  // Check if we have an active song to add padding to the bottom nav
  const hasActiveSong = !!currentSong;
  
  // Check if current song is liked
  const isLiked = currentSong ? likedSongIds?.has((currentSong as any).id || currentSong._id) : false;

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

  const navItems = [
    {
      label: 'Home',
      icon: Home,
      path: '/',
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
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  // Handle user login
  const handleLogin = () => {
    navigate('/login');
  };

  // Handle opening search
  const handleSearchClick = () => {
    navigate('/search');
  };
  
  // Handle like toggle
  const handleLikeToggle = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening song details
    if (currentSong) {
      toggleLikeSong(currentSong);
    }
  };
  
  // Handle song tap to open song details view
  const handleSongTap = () => {
    if (currentSong) {
      // Open the song details modal instead of navigating
      setShowSongDetails(true);
    }
  };

  return (
    <>
      {/* Song Details View */}
      <SongDetailsView 
        isOpen={showSongDetails} 
        onClose={() => setShowSongDetails(false)} 
      />
    
      {/* Mobile Header - Spotify style */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-zinc-900 md:hidden">
        <div className="flex items-center justify-between px-3 py-2">
          {/* Spotify Logo */}
          <Link to="/" className="flex items-center">
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
              <button 
                onClick={() => navigate('/account')}
                className="h-7 w-7 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden"
              >
                {user?.picture ? (
                  <img src={user.picture} alt={user.name || 'User'} className="w-full h-full object-cover" />
                ) : (
                  <User className="h-3.5 w-3.5 text-zinc-300" />
                )}
              </button>
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
          "fixed bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black to-black/90 border-t border-zinc-800/50 md:hidden",
          hasActiveSong ? "player-active" : ""
        )}
        style={{
          paddingBottom: `env(safe-area-inset-bottom, 0px)`,
        }}
      >
        {/* Add mini player when song is active */}
        {hasActiveSong && (
          <div className="flex items-center justify-between px-3 py-2 bg-zinc-900/90 border-b border-zinc-800/50">
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
                className={`mr-2 h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 ${isLiked ? 'text-green-500' : 'text-zinc-400'} active:bg-zinc-800`}
              >
                <Heart className="h-4 w-4" fill={isLiked ? 'currentColor' : 'none'} />
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

        <div className="grid grid-cols-4 h-14">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center py-1.5 transition-colors',
                isActive(item.path) 
                  ? 'text-green-500' 
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              <item.icon className={cn(
                'h-5 w-5 mb-1', 
                isActive(item.path) && 'text-green-500'
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
