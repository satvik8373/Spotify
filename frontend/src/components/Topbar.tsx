import { Search, BellIcon, XCircle, LayoutDashboardIcon } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState, useEffect, useRef } from 'react';
import { useMusicStore } from '@/stores/useMusicStore';
import SearchSuggestions from '@/components/SearchSuggestions';
import { useAuth } from '../contexts/AuthContext';
import { logout } from '../services/auth.service';
import { getGoogleAuthUrl } from '../services/auth.service';

const Topbar = () => {
  const { isAdmin } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const { searchIndianSongs, isIndianMusicLoading } = useMusicStore();
  const { user, loading: authLoading, refreshUserData } = useAuth();
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const searchFormRef = useRef<HTMLFormElement>(null);

  // Extract search query from URL when navigating to search page
  useEffect(() => {
    if (location.pathname === '/search') {
      const queryParams = new URLSearchParams(location.search);
      const q = queryParams.get('q');
      if (q) {
        setSearchQuery(q);
      }
    } else {
      // Clear search query when not on search page
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

  // Refresh user data when component mounts
  useEffect(() => {
    refreshUserData();
  }, [refreshUserData]);

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
      searchIndianSongs(query);
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
  };

  const handleGoogleSignIn = () => {
    window.location.href = getGoogleAuthUrl();
  };

  return (
    <header className="sticky top-0 z-10 bg-zinc-900/90 backdrop-blur-sm border-b border-zinc-800">
      <div className="px-4 flex h-16 items-center justify-between">
        {/* Search Box */}
        <form ref={searchFormRef} className="relative w-full max-w-md" onSubmit={handleSearch}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              type="search"
              placeholder="What do you want to listen to?"
              value={searchQuery}
              onChange={handleQueryChange}
              onClick={() => {
                if (searchQuery.trim().length >= 2) {
                  setShowSearchSuggestions(true);
                }
              }}
              className="w-full rounded-full bg-zinc-800 pl-10 pr-10 h-10 focus:outline-none focus:ring-1 focus:ring-green-500 border-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              >
                <XCircle size={16} />
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

        {/* Admin Dashboard Button (only for admins) */}
        {isAdmin && (
          <Link
            to="/admin"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "ml-auto mr-2"
            )}
          >
            <LayoutDashboardIcon className="mr-2 h-4 w-4" />
            Admin
          </Link>
        )}

        {/* User Profile */}
        <div className="flex items-center gap-4 ml-4">
          {!authLoading && user ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-full bg-zinc-800 p-1 pr-4">
                <img
                  src={user.picture || "https://via.placeholder.com/32"}
                  alt="User"
                  className="h-8 w-8 rounded-full"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://via.placeholder.com/32";
                  }}
                />
                <span className="text-sm font-medium">{user.name || "User"}</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="h-8 px-2"
              >
                Sign out
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleGoogleSignIn}
              className="h-8 px-3 bg-white text-black hover:bg-gray-200 font-medium flex items-center justify-center gap-2"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
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
    </header>
  );
};

export default Topbar;
