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
import { signOut } from '@/services/hybridAuthService';

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

  const handleSelectPlaylist = (playlistId: string) => {
    setSearchQuery('');
    navigate(`/playlist/${playlistId}`);
    setShowSearchSuggestions(false);
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
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
            onSelectPlaylist={handleSelectPlaylist}
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
              className="h-8 px-3 bg-white text-black hover:bg-gray-200 font-medium flex items-center justify-center gap-2"
              onClick={() => navigate('/login')}
            >
              Sign in
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
