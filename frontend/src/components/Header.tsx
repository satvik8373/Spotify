import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, XCircle, LayoutDashboardIcon, ChevronDown, LogOut, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMusicStore } from '@/stores/useMusicStore';
import SearchSuggestions from '@/components/SearchSuggestions';
import { useAuth } from '../contexts/AuthContext';
import { logout, getGoogleAuthUrl } from '../services/auth.service';
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

  const handleLogout = () => {
    logout();
    // Manually reset auth state
    useAuthStore.getState().reset();
  };

  const handleGoogleSignIn = () => {
    window.location.href = getGoogleAuthUrl();
  };

  const goBack = () => {
    navigate(-1);
  };

  const goForward = () => {
    navigate(1);
  };

  return (
    <header className={`bg-[#121212] py-4 px-6 z-50 sticky top-0 ${className}`}>
      <div className="flex items-center justify-between max-w-[1800px] mx-auto">
        {/* Left section with navigation arrows and logo */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={goBack}
              className="h-8 w-8 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80"
              aria-label="Go back"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={goForward}
              className="h-8 w-8 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80"
              aria-label="Go forward"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          
          <Link to="/" className="hidden lg:flex items-center gap-2 hover:opacity-80 transition-opacity">
            <svg viewBox="0 0 1134 340" className="h-10 text-[#1DB954]">
              <title>Spotify</title>
              <path
                fill="currentColor"
                d="M8 171c0 92 76 168 168 168s168-76 168-168S268 4 176 4 8 79 8 171zm230 78c-39-24-89-30-147-17-14 2-16-18-4-20 64-15 118-8 162 19 11 7 0 24-11 18zm17-45c-45-28-114-36-167-20-17 5-23-21-7-25 61-18 136-9 188 23 14 9 0 31-14 22zM80 133c-17 6-28-23-9-30 59-18 159-15 221 22 17 9 1 37-17 27-54-32-144-35-195-19zm379 91c-17 0-33-6-47-20-1 0-1 1-1 1l-16 19c-1 1-1 2 0 3 18 16 40 24 64 24 34 0 55-19 55-47 0-24-15-37-50-46-29-7-34-12-34-22s10-16 23-16 25 5 39 15c0 0 1 1 2 1s1-1 1-1l14-20c1-1 1-1 0-2-16-13-35-20-56-20-31 0-53 19-53 46 0 29 20 38 52 46 28 6 32 12 32 22 0 11-10 17-25 17z"
              />
            </svg>
          </Link>
        </div>
        
        {/* Center section (search) - always visible on desktop */}
        <div className="flex-1 max-w-xl mx-4 md:mx-6">
          <form 
            ref={searchFormRef} 
            className="relative w-full hidden md:block" 
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
                className="w-full rounded-full bg-[#242424] text-white pl-10 pr-10 h-10 focus:outline-none focus:ring-1 focus:ring-white/30 border-none placeholder:text-zinc-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  <XCircle size={16} />
                </button>
              )}
            </div>
            <SearchSuggestions
              isVisible={showSearchSuggestions}
              query={searchQuery}
              onSelectSong={handleSelectSong}
            />
          </form>
          
          {/* Mobile search button - Only visible on mobile */}
          <div className="md:hidden flex justify-center">
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full hover:bg-[#2a2a2a] focus:bg-[#2a2a2a]"
              onClick={() => navigate('/search')}
            >
              <Search className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {/* Right section with admin button and user profile */}
        <div className="flex items-center gap-3">
          {/* Admin Dashboard Button (only for admins) */}
          {isAdmin && (
            <Link
              to="/admin"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "mr-2 bg-[#2a2a2a] border-[#333] text-white hover:bg-[#333] hover:text-white"
              )}
            >
              <LayoutDashboardIcon className="mr-2 h-4 w-4" />
              Admin
            </Link>
          )}

          {/* Premium Link */}
          <a 
            href="https://www.spotify.com/premium/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hidden md:block text-sm font-bold text-white hover:scale-105 transition-transform bg-transparent py-1 px-3 rounded-full border border-white/30 hover:border-white"
          >
            Premium
          </a>

          {/* User Profile Dropdown */}
          <div className="flex items-center gap-2 ml-2">
            {!authLoading && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 pl-1 pr-2 rounded-full bg-black hover:bg-[#282828]">
                    <div className="flex items-center gap-2">
                      <img
                        className="w-8 h-8 rounded-full border border-zinc-600"
                        src={user.picture || "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiM1NTUiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIiBmaWxsPSIjZmZmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIj5Vc2VyPC90ZXh0Pjwvc3ZnPg=="}
                        alt="User Profile"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiM1NTUiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIiBmaWxsPSIjZmZmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIj5Vc2VyPC90ZXh0Pjwvc3ZnPg==";
                        }}
                      />
                      <span className="text-sm font-medium hidden sm:inline-block max-w-[100px] truncate">
                        {user.name || "User"}
                      </span>
                      <ChevronDown className="h-4 w-4 text-zinc-400" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-[#282828] border-[#333] text-white mt-1 p-1 rounded-md">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-zinc-400 truncate">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-[#3e3e3e]" />
                  <DropdownMenuItem 
                    className="flex items-center gap-2 text-zinc-200 hover:text-white focus:text-white cursor-pointer rounded-sm my-1 hover:bg-[#3e3e3e] focus:bg-[#3e3e3e]"
                    onClick={() => navigate('/account')}
                  >
                    <User className="h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="flex items-center gap-2 text-zinc-200 hover:text-white focus:text-white cursor-pointer rounded-sm my-1 hover:bg-[#3e3e3e] focus:bg-[#3e3e3e]"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                onClick={handleGoogleSignIn}
                className="h-8 px-4 bg-white text-black hover:bg-gray-200 font-bold text-sm flex items-center justify-center rounded-full"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="mr-2"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Sign in
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;