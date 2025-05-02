import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, XCircle, LogOut, User } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMusicStore } from '@/stores/useMusicStore';
import SearchSuggestions from '@/components/SearchSuggestions';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from '@/services/hybridAuthService';
import { debounce } from 'lodash';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  className?: string;
}

const Header = ({ className }: HeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const { searchIndianSongs } = useMusicStore();
  const { user, loading: authLoading, refreshUserData } = useAuth();
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const searchFormRef = useRef<HTMLFormElement>(null);
  const authProcessedRef = useRef(false);

  // Extract search query from URL when navigating to search page
  useEffect(() => {
    if (location.pathname === '/search') {
      const queryParams = new URLSearchParams(location.search);
      const q = queryParams.get('q');
      if (q) {
        setSearchQuery(q);
      }
    } else if (!location.pathname.includes('/search')) {
      setSearchQuery('');
    }
  }, [location]);

  // Handle clicking outside the search form to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchFormRef.current && !searchFormRef.current.contains(event.target as Node)) {
        setShowSearchSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Create a debounced search function
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      if (query.trim().length >= 2) {
        searchIndianSongs(query);
      }
    }, 300),
    [searchIndianSongs]
  );

  useEffect(() => {
    if (!authProcessedRef.current) {
      refreshUserData();
      authProcessedRef.current = true;
    }
  }, [refreshUserData]);

  useEffect(() => {
    if (user?.id && !authLoading) {
      const currentUserId = useAuthStore.getState().userId;
      if (currentUserId !== user.id) {
        useAuthStore.getState().setAuthStatus(true, user.id);
      }
    }
  }, [user, authLoading]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowSearchSuggestions(false);
    }
  };

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.trim().length >= 2) {
      debouncedSearch(query);
      setShowSearchSuggestions(true);
    } else {
      setShowSearchSuggestions(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setShowSearchSuggestions(false);
  };

  const handleSelectSong = (songName: string) => {
    setSearchQuery(songName);
    navigate(`/search?q=${encodeURIComponent(songName.trim())}`);
    setShowSearchSuggestions(false);
  };

  const handleLogout = async () => {
    try {
      // Navigate to welcome page first for faster perceived performance
      navigate('/', { replace: true });
      
      // Then perform the actual logout
      const result = await signOut();
      if (!result.success) {
        console.error('Error during logout:', result.error);
      }
    } catch (error) {
      console.error('Error signing out:', error);
      // Still reset auth store in case of error
      useAuthStore.getState().reset();
    }
  };

  return (
    <header className={`bg-black/95 py-4 px-6 z-50 sticky top-0 ${className}`}>
      <div className="max-w-[1800px] mx-auto flex items-center justify-between">
        {/* Logo and Brand */}
        <Link to={user ? "/home" : "/"} className="flex items-center gap-3 hover:opacity-90 transition-opacity min-w-[200px]">
          <div className="flex items-center">
            <svg viewBox="0 0 16 16" className="h-10 w-10 text-[#1DB954]" aria-label="Spotify">
              <path
                fill="currentColor"
                d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm3.669 11.538a.498.498 0 0 1-.686.165c-1.879-1.147-4.243-1.407-7.028-.77a.499.499 0 0 1-.222-.973c3.048-.696 5.662-.397 7.77.892a.5.5 0 0 1 .166.686zm.979-2.178a.624.624 0 0 1-.858.205c-2.15-1.321-5.428-1.704-7.972-.932a.625.625 0 0 1-.362-1.194c2.905-.881 6.517-.454 8.986 1.063a.624.624 0 0 1 .206.858zm.084-2.268C10.154 5.56 5.9 5.419 3.438 6.166a.748.748 0 1 1-.434-1.432c2.825-.857 7.523-.692 10.492 1.07a.747.747 0 1 1-.764 1.288z"
              />
            </svg>
            <span className="text-white font-bold text-2xl ml-3 tracking-tight">
              Spotify <span className="text-zinc-400 font-normal">x</span> Mavrix
            </span>
          </div>
        </Link>

        {/* Centered Search Bar */}
        <form 
          ref={searchFormRef} 
          className="flex-1 max-w-[600px] mx-auto relative px-4" 
          onSubmit={handleSearch}
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
            <Input
              id="header-search-input"
              type="search"
              placeholder="Search for songs, artists, or albums"
              value={searchQuery}
              onChange={handleQueryChange}
              onClick={() => {
                if (searchQuery.trim().length >= 2) {
                  setShowSearchSuggestions(true);
                }
              }}
              className="w-full rounded-full bg-zinc-800 text-white pl-12 pr-12 h-12 focus:outline-none focus:ring-2 focus:ring-white/20 border-none placeholder:text-zinc-400 hover:bg-zinc-700/80 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <XCircle size={20} />
              </button>
            )}
          </div>

          <SearchSuggestions
            isVisible={showSearchSuggestions}
            query={searchQuery}
            onSelectSong={handleSelectSong}
          />
        </form>

        {/* User Profile */}
        <div className="min-w-[200px] flex justify-end">
          {!authLoading && (
            user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    className="rounded-full bg-zinc-800 hover:bg-zinc-700 text-white border-none flex items-center gap-2 py-1.5 px-2"
                  >
                    <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center overflow-hidden">
                      {user.picture ? (
                        <img src={user.picture} alt={user.name || 'User'} className="w-full h-full object-cover" />
                      ) : (
                        <User className="h-5 w-5 text-zinc-300" />
                      )}
                    </div>
                    <span className="text-sm font-medium truncate max-w-[100px]">{user.name || 'User'}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="min-w-[200px] bg-zinc-800 border-zinc-700">
                  <DropdownMenuSeparator className="bg-zinc-700" />
                  <DropdownMenuItem 
                    className="hover:bg-zinc-700 cursor-pointer text-white" 
                    onClick={() => navigate('/account')}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="hover:bg-zinc-700 cursor-pointer text-red-400" 
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                className="bg-white hover:bg-white/90 text-black font-medium px-8"
                onClick={() => navigate('/login')}
              >
                Log in
              </Button>
            )
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;