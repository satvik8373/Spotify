import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, XCircle, LayoutDashboardIcon, ChevronDown, LogOut, User } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  className?: string;
}

const Header = ({ className }: HeaderProps) => {
  const { isAdmin } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
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
        setShowSearch(true);
      }
    } else if (!location.pathname.includes('/search')) {
      // Reset search state when not on search page
      setShowSearch(false);
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

  // Refresh user data once when component mounts
  useEffect(() => {
    if (!authProcessedRef.current) {
      refreshUserData();
      authProcessedRef.current = true;
    }
  }, [refreshUserData]);

  // Update auth store when user changes to prevent multiple calls
  useEffect(() => {
    if (user?.id && !authLoading) {
      const currentUserId = useAuthStore.getState().userId;
      // Only update if user ID changed to prevent loops
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
      await signOut();
      // Manually reset auth state
      useAuthStore.getState().reset();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const toggleSearch = () => {
    setShowSearch(!showSearch);
    if (!showSearch) {
      setTimeout(() => {
        const searchInput = document.getElementById('header-search-input');
        if (searchInput) searchInput.focus();
      }, 100);
    }
  };

  return (
    <header className={`bg-gradient-to-b from-black via-black/95 to-transparent py-3 px-4 sm:px-6 z-50 sticky top-0 ${className}`}>
      <div className="flex items-center justify-between max-w-[1800px] mx-auto">
        <div className="flex items-center">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <svg viewBox="0 0 1134 340" className="h-8 text-green-500">
              <title>Spotify</title>
              <path
                fill="currentColor"
                d="M8 171c0 92 76 168 168 168s168-76 168-168S268 4 176 4 8 79 8 171zm230 78c-39-24-89-30-147-17-14 2-16-18-4-20 64-15 118-8 162 19 11 7 0 24-11 18zm17-45c-45-28-114-36-167-20-17 5-23-21-7-25 61-18 136-9 188 23 14 9 0 31-14 22zM80 133c-17 6-28-23-9-30 59-18 159-15 221 22 17 9 1 37-17 27-54-32-144-35-195-19zm379 91c-17 0-33-6-47-20-1 0-1 1-1 1l-16 19c-1 1-1 2 0 3 18 16 40 24 64 24 34 0 55-19 55-47 0-24-15-37-50-46-29-7-34-12-34-22s10-16 23-16 25 5 39 15c0 0 1 1 2 1s1-1 1-1l14-20c1-1 1-1 0-2-16-13-35-20-56-20-31 0-53 19-53 46 0 29 20 38 52 46 28 6 32 12 32 22 0 11-10 17-25 17z"
              />
            </svg>
            <span className="text-white font-bold text-lg hidden sm:inline-block">Spotify</span>
          </Link>
          
          <nav className="hidden md:flex ml-10">
            <ul className="flex gap-6">
              <li>
                <Link to="/" className={cn(
                  "text-zinc-300 hover:text-white text-sm font-medium transition-colors",
                  location.pathname === '/' && "text-white"
                )}>
                  Home
                </Link>
              </li>
              <li>
                <Link to="/search" className={cn(
                  "text-zinc-300 hover:text-white text-sm font-medium transition-colors",
                  location.pathname.startsWith('/search') && "text-white"
                )}>
                  Search
                </Link>
              </li>
              <li>
                <Link to="/library" className={cn(
                  "text-zinc-300 hover:text-white text-sm font-medium transition-colors",
                  location.pathname.startsWith('/library') && "text-white"
                )}>
                  Library
                </Link>
              </li>
            </ul>
          </nav>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Search Input - Always visible on desktop */}
          <form 
            ref={searchFormRef} 
            className="relative hidden md:block" 
            onSubmit={handleSearch}
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                id="header-search-input"
                type="search"
                placeholder="What do you want to listen to?"
                value={searchQuery}
                onChange={handleQueryChange}
                onClick={() => {
                  if (searchQuery.trim().length >= 2) {
                    setShowSearchSuggestions(true);
                  }
                }}
                className="w-[400px] rounded-full bg-white text-zinc-800 pl-10 pr-10 h-12 focus:outline-none focus:ring-1 focus:ring-white/80 border-none placeholder:text-zinc-600"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-700"
                >
                  <XCircle size={18} />
                </button>
              )}
            </div>

            {/* Search Suggestions */}
            <SearchSuggestions
              isVisible={showSearchSuggestions}
              query={searchQuery}
              onSelectSong={handleSelectSong}
            />
          </form>

          {/* Mobile Search Button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full hover:bg-zinc-800 focus:bg-zinc-800 md:hidden"
            onClick={() => navigate('/search')}
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* Admin Dashboard Button (only for admins) */}
          {isAdmin && (
            <Link
              to="/admin"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "mr-2 border-zinc-700 hover:bg-zinc-800 hover:text-white"
              )}
            >
              <LayoutDashboardIcon className="mr-2 h-4 w-4" />
              Admin
            </Link>
          )}

          {/* Premium Link */}
          <a 
            href="#" 
            className="hidden md:flex items-center gap-1 text-sm font-medium bg-transparent px-3 py-0.5 rounded-full transition-all hover:scale-105 border border-zinc-700"
          >
            Premium
          </a>

          {/* User Profile or Login Button */}
          {!authLoading && (
            user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    className="rounded-full bg-black hover:bg-zinc-800 text-white border border-zinc-700 flex items-center gap-2 py-1 px-1 min-w-0"
                  >
                    <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden">
                      {user.picture ? (
                        <img src={user.picture} alt={user.name || 'User'} className="w-full h-full object-cover" />
                      ) : (
                        <User className="h-4 w-4 text-zinc-400" />
                      )}
                    </div>
                    <span className="text-sm font-medium truncate max-w-[80px] hidden sm:inline-block">{user.name || 'User'}</span>
                    <ChevronDown className="h-4 w-4 text-zinc-400 hidden sm:inline-block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="min-w-[180px] bg-zinc-900 border-zinc-700">
                  <DropdownMenuLabel className="text-zinc-400">Account</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-zinc-700" />
                  <DropdownMenuItem 
                    className="hover:bg-zinc-800 cursor-pointer" 
                    onClick={() => navigate('/account')}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="hover:bg-zinc-800 cursor-pointer text-red-500" 
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                className="bg-white hover:bg-opacity-90 text-black font-medium hidden md:flex"
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