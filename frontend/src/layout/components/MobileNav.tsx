import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Library, Heart, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlayerStore } from '@/stores/usePlayerStore';

const MobileNav = () => {
  const location = useLocation();
  const { currentSong, isPlaying, togglePlay } = usePlayerStore();

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

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-30 bg-black/95 backdrop-blur-sm border-t border-[#2a2a2a] md:hidden"
      style={{
        paddingBottom: `env(safe-area-inset-bottom, 0px)`,
      }}
    >
      {currentSong && (
        <div 
          className="flex items-center justify-between px-4 py-2 border-b border-[#2a2a2a]"
          onClick={() => window.location.href = '/player'}
        >
          <div className="flex items-center gap-3">
            <img 
              src={currentSong.imageUrl} 
              alt={currentSong.title}
              className="w-10 h-10 rounded"
            />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-white truncate max-w-[150px]">
                {currentSong.title}
              </span>
              <span className="text-xs text-gray-400">
                {currentSong.artist}
              </span>
            </div>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            className="p-2 text-white hover:bg-white/10 rounded-full"
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
        </div>
      )}
      <div className="grid grid-cols-4 h-16">
        {navItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              'flex flex-col items-center justify-center py-2 transition-colors relative',
              isActive(item.path) 
                ? 'text-[#1DB954]' 
                : 'text-[#b3b3b3] hover:text-white'
            )}
          >
            <item.icon className={cn(
              'h-6 w-6 mb-1', 
              isActive(item.path) && 'text-[#1DB954]'
            )} />
            <span className="text-xs font-medium">{item.label}</span>
            
            {/* Active indicator dot */}
            {isActive(item.path) && (
              <span className="absolute bottom-0 w-1 h-1 bg-[#1DB954] rounded-full"></span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default MobileNav;
