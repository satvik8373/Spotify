import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, XCircle, LogOut, User, Home, Bell } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMusicStore } from '@/stores/useMusicStore';
import SearchSuggestions from '@/components/SearchSuggestions';
import { useAuth } from '@/contexts/AuthContext';
import { signOut } from '@/services/hybridAuthService';
import { debounce } from 'lodash';
import { WhatsNewDialog } from './WhatsNewDialog';

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
  const [showWhatsNew, setShowWhatsNew] = useState(false);

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

  // Optimized debounced search with request cancellation
  const searchAbortController = useRef<AbortController | null>(null);
  
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      if (query.trim().length >= 2) {
        // Cancel previous request
        if (searchAbortController.current) {
          searchAbortController.current.abort();
        }
        
        // Create new abort controller
        searchAbortController.current = new AbortController();
        
        // Perform search with cancellation support
        searchIndianSongs(query);
      }
    }, 500), // Increased debounce delay to reduce API calls
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
    <header
      className={`bg-black flex items-center px-4 relative z-[100]${className ? ` ${className}` : ''}`}
      style={{ height: '64px' }}
    >
      <div className="w-full flex items-center justify-between">
        {/* Left: Logo and Brand Name */}
        <Link to={user ? "/home" : "/"} className="flex-shrink-0 flex items-center gap-3">
          <img
            src="/mavrixfy.png"
            alt="Mavrixfy"
            className="h-10 w-10 object-contain"
            aria-label="Mavrixfy"
          />
          <span className="hidden md:block text-white text-xl font-bold">
            Mavrixfy
          </span>
        </Link>

        {/* Center: Home Button and Search Bar */}
        <div className="hidden md:flex absolute left-1/2 transform -translate-x-1/2 items-center gap-2 z-[100]">
          {/* Home Button */}
          <Link
            to="/home"
            className="flex items-center justify-center rounded-full bg-[#1f1f1f] hover:bg-[#2a2a2a] hover:scale-105 transition-all"
            style={{ width: '48px', height: '48px' }}
          >
            <Home size={24} className="text-white" />
          </Link>

          {/* Search Bar */}
          <form
            ref={searchFormRef}
            className="relative z-[100]"
            style={{ width: '380px' }}
            onSubmit={handleSearch}
          >
            <div className="relative flex items-center">
              <div className="absolute left-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-[#a7a7a7]" />
              </div>
              <Input
                id="header-search-input"
                type="search"
                placeholder="What do you want to play?"
                value={searchQuery}
                onChange={handleQueryChange}
                onClick={() => {
                  if (searchQuery.trim().length >= 2) {
                    setShowSearchSuggestions(true);
                  }
                }}
                className="w-full rounded-full bg-[#242424] hover:bg-[#2a2a2a] hover:ring-1 hover:ring-[#535353] text-white pl-12 pr-10 border-none placeholder:text-[#a7a7a7] text-sm transition-all focus:ring-2 focus:ring-white"
                style={{ height: '48px' }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-4 text-[#a7a7a7] hover:text-white"
                >
                  <XCircle size={18} />
                </button>
              )}
            </div>

            <SearchSuggestions
              isVisible={showSearchSuggestions}
              query={searchQuery}
              onSelectSong={handleSelectSong}
            />
          </form>
        </div>

        {/* Right: Spacer for balance */}
        <div className="flex-shrink-0" style={{ width: '32px' }} />

        {/* Right: User Profile & Bell */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {!authLoading && (
            user ? (
              <>
                <button
                  className="w-8 h-8 rounded-full hover:bg-[#1f1f1f] flex items-center justify-center transition-colors"
                  onClick={() => setShowWhatsNew(true)}
                >
                  <Bell size={20} className="text-[#a7a7a7] hover:text-white transition-colors" />
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-8 h-8 rounded-full bg-[#1f1f1f] hover:scale-105 flex items-center justify-center overflow-hidden transition-transform">
                      {user.picture ? (
                        <img src={user.picture} alt={user.name || 'User'} className="w-full h-full object-cover" />
                      ) : (
                        <User className="h-5 w-5 text-[#a7a7a7]" />
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="min-w-[200px] bg-[#282828] border-none" align="end" sideOffset={8}>
                    <DropdownMenuItem
                      className="cursor-pointer text-white hover:bg-white/10"
                      onClick={() => navigate('/profile')}
                    >
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem
                      className="cursor-pointer text-white hover:bg-white/10"
                      onClick={() => navigate('/about')}
                    >
                      About
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer text-white hover:bg-white/10"
                      onClick={() => navigate('/privacy')}
                    >
                      Privacy Policy
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer text-white hover:bg-white/10"
                      onClick={() => navigate('/terms')}
                    >
                      Terms of Service
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem
                      className="cursor-pointer text-white hover:bg-white/10"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <WhatsNewDialog open={showWhatsNew} onOpenChange={setShowWhatsNew} />
              </>
            ) : (
              <Button
                className="rounded-full bg-white hover:bg-white/90 hover:scale-105 text-black font-bold px-8 text-sm transition-all"
                style={{ height: '48px' }}
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