import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, Library, Heart, LogIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

const MobileNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentSong } = usePlayerStore();
  const { isAuthenticated } = useAuth();

  // Check if we have an active song to add padding to the bottom nav
  const hasActiveSong = !!currentSong;

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

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black to-black/90 border-t border-zinc-800/50 md:hidden"
      style={{
        paddingBottom: `env(safe-area-inset-bottom, 0px)`,
      }}
    >
      {!isAuthenticated && (
        <div className="px-4 py-2 flex justify-center">
          <Button 
            onClick={handleLogin}
            className="bg-white hover:bg-white/90 text-black font-bold rounded-full text-sm px-6 py-2 h-auto w-full"
          >
            <LogIn className="h-4 w-4 mr-2" />
            Log In
          </Button>
        </div>
      )}
      
      <div className={cn(
        "grid grid-cols-4 h-14",
        hasActiveSong && "mb-16" // Add space for the player when a song is active
      )}>
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
  );
};

export default MobileNav;
