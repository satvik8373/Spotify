import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Search,
  Heart,
  ArrowUpRight,
  List,
  LayoutGrid,
  Plus,
  Folder,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { usePlaylistStore } from '@/stores/usePlaylistStore';
import { CreatePlaylistDialog } from '../../components/playlist/CreatePlaylistDialog';
// Removed Spotify section per request

export const LeftSidebar = () => {
  const { isAuthenticated } = useAuth();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { userPlaylists, fetchUserPlaylists, fetchPublicPlaylists } = usePlaylistStore();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      fetchUserPlaylists();
    }
    fetchPublicPlaylists();
  }, [isAuthenticated, fetchUserPlaylists, fetchPublicPlaylists]);

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  return (
    <div className="hidden md:flex flex-col h-full bg-background w-full overflow-hidden border-r border-border">
      {/* Header */}
      <div className="p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-foreground">Your Library</h1>
        <div className="flex gap-2">
          <button 
            className="p-2 rounded-full hover:bg-accent transition-colors"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus size={20} className="text-muted-foreground hover:text-foreground" />
          </button>
          <button className="p-2 rounded-full hover:bg-accent transition-colors">
            <ArrowUpRight size={20} className="text-muted-foreground hover:text-foreground" />
          </button>
        </div>
      </div>

      {/* Search and View Options */}
      <div className="px-4 flex justify-between items-center mt-2">
        <button className="p-2 rounded-full hover:bg-accent transition-colors">
          <Search size={18} className="text-muted-foreground hover:text-foreground" />
        </button>
        <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm font-medium px-2 py-1 rounded-md hover:bg-accent transition-colors">
          <span>Recents</span>
          <List size={16} />
        </button>
      </div>

      {/* Playlists */}
      <div className="flex-1 overflow-y-auto min-h-0 pb-4 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/40">
        <div className="space-y-1 py-2">

          {/* Liked Songs */}
          <Link
            to="/liked-songs"
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted/50 transition-colors',
              isActive('/liked-songs') ? 'bg-muted' : ''
            )}
          >
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-green-500 rounded-md flex items-center justify-center flex-shrink-0">
              <Heart size={20} className="text-white" fill="white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground truncate">Liked Songs</p>
              <p className="text-sm text-muted-foreground truncate">
                Playlist • {userPlaylists.length || '246'} songs
              </p>
            </div>
          </Link>

          {/* Favourite Playlists (from local likes) */}
          <FavouritePlaylists />

          {/* Only Favourites (liked playlists) and Liked Songs are shown */}

          {/* Your Playlists */}
          {isAuthenticated && userPlaylists.length > 0 && (
            <div className="mt-2">
              <h3 className="text-sm text-muted-foreground px-4 mb-2 font-medium">Your Playlists</h3>
              {userPlaylists.map((playlist: any) => (
                <Link
                  key={`own-${playlist._id}`}
                  to={`/playlist/${playlist._id}`}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted/50 transition-colors group',
                    isActive(`/playlist/${playlist._id}`) ? 'bg-muted' : ''
                  )}
                >
                  <div className="w-12 h-12 rounded-md flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {playlist.imageUrl ? (
                      <img
                        src={playlist.imageUrl}
                        alt={playlist.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <LayoutGrid size={20} className="text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground truncate">{playlist.name}</p>
                    <p className="text-sm text-muted-foreground truncate">Created by you</p>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <CreatePlaylistDialog isOpen={showCreateDialog} onClose={() => setShowCreateDialog(false)} />
    </div>
  );
};

export default LeftSidebar;

function FavouritePlaylists() {
  let likedIds: string[] = [];
  try {
    likedIds = JSON.parse(localStorage.getItem('liked_playlists') || '[]');
  } catch {}

  const { playlists } = usePlaylistStore();
  const location = useLocation();
  const isActive = (path: string) => location.pathname.startsWith(path);
  const favs = playlists.filter(p => likedIds.includes(p._id)).slice(0, 6);
  if (favs.length === 0) return null;

  return (
    <div className="mt-2">
      <h3 className="text-sm text-muted-foreground px-4 mb-2 font-medium">Favourites</h3>
      {favs.map((playlist) => (
        <Link
          key={`fav-${playlist._id}`}
          to={`/playlist/${playlist._id}`}
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted/50 transition-colors',
            isActive(`/playlist/${playlist._id}`) ? 'bg-muted' : ''
          )}
        >
          <div className="w-12 h-12 rounded-md flex items-center justify-center flex-shrink-0 overflow-hidden">
            {playlist.imageUrl ? (
              <img
                src={playlist.imageUrl}
                alt={playlist.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <LayoutGrid size={20} className="text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground truncate">{playlist.name}</p>
            <p className="text-sm text-muted-foreground truncate">Favourite</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
