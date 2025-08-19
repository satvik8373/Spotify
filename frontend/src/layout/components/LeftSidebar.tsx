import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Search,
  Heart,
  PlusSquare,
  ArrowUpRight,
  List,
  LayoutGrid,
  Plus,
  Music2,
  ListMusic,
  Mic2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { usePlaylistStore } from '../../stores/usePlaylistStore';
import { CreatePlaylistDialog } from '../../components/playlist/CreatePlaylistDialog';
import { useSpotify } from '../../contexts/SpotifyContext';

export const LeftSidebar = () => {
  const { user, isAuthenticated } = useAuth();
  const spotify = useSpotify();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { userPlaylists, fetchUserPlaylists } = usePlaylistStore();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('Playlists');

  useEffect(() => {
    if (isAuthenticated) {
      fetchUserPlaylists();
    }
  }, [isAuthenticated, fetchUserPlaylists]);

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
            className="liquid-glass-button p-2"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus size={20} className="text-muted-foreground hover:text-foreground" />
          </button>
          <button className="liquid-glass-button p-2">
            <ArrowUpRight size={20} className="text-muted-foreground hover:text-foreground" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-2 flex gap-2 overflow-x-auto no-scrollbar">
        {['Playlists', 'Artists', 'Albums'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap',
              activeTab === tab
                ? 'liquid-glass bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Search and View Options */}
      <div className="p-2 flex justify-between items-center mt-1">
        <button className="liquid-glass-button p-2">
          <Search size={20} className="text-muted-foreground hover:text-foreground" />
        </button>
        <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm font-medium">
          <span>Recents</span>
          <List size={20} />
        </button>
      </div>

      {/* Playlists */}
      <div className="flex-1 overflow-y-auto px-2 min-h-0 pb-4">
        <div className="space-y-2 py-2">
          {/* Spotify Section */}
          {spotify.isAuthenticated && (
            <div className="mb-4">
              <h3 className="text-sm text-muted-foreground px-2 mb-2">Spotify</h3>
              <Link
                to="/spotify/songs"
                className={cn(
                  'flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50',
                  isActive('/spotify/songs') ? 'liquid-glass' : ''
                )}
              >
                <div className="liquid-glass-album w-12 h-12 bg-gradient-to-br from-green-500 to-green-700 rounded-md flex items-center justify-center">
                  <Music2 size={20} className="text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground truncate">Spotify Songs</p>
                  <p className="text-sm text-muted-foreground truncate">
                    Songs from your Spotify account
                  </p>
                </div>
              </Link>
              <Link
                to="/spotify/playlists"
                className={cn(
                  'flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50',
                  isActive('/spotify/playlists') ? 'liquid-glass' : ''
                )}
              >
                <div className="liquid-glass-album w-12 h-12 bg-gradient-to-br from-green-500 to-green-700 rounded-md flex items-center justify-center">
                  <ListMusic size={20} className="text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground truncate">Spotify Playlists</p>
                  <p className="text-sm text-muted-foreground truncate">
                    Playlists from your Spotify account
                  </p>
                </div>
              </Link>
            </div>
          )}

          {/* Liked Songs */}
          <Link
            to="/liked-songs"
            className={cn(
              'flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50',
              isActive('/liked-songs') ? 'liquid-glass' : ''
            )}
          >
            <div className="liquid-glass-album w-12 h-12 bg-gradient-to-br from-indigo-600 to-white rounded-md flex items-center justify-center">
              <Heart size={20} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground truncate">Liked Songs</p>
              <p className="text-sm text-muted-foreground truncate">
                Playlist • {userPlaylists.length || '246'} songs
              </p>
            </div>
          </Link>

          {/* User Playlists */}
          {isAuthenticated ? (
            userPlaylists.map((playlist) => (
              <Link
                key={playlist._id}
                to={`/playlist/${playlist._id}`}
                className={cn(
                  'flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50',
                  isActive(`/playlist/${playlist._id}`) ? 'liquid-glass' : ''
                )}
              >
                <div className="liquid-glass-album w-12 h-12 rounded-md flex items-center justify-center flex-shrink-0 overflow-hidden">
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
                  <p className="text-sm text-muted-foreground truncate">
                    Playlist • {user?.name || 'Your playlist'}
                  </p>
                </div>
              </Link>
            ))
          ) : (
            <>
              {/* Sample Playlists */}
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                <div className="liquid-glass-album w-12 h-12 bg-gradient-to-br from-green-500 to-blue-500 rounded-md flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground truncate">Trending Hindi Songs 2025</p>
                  <p className="text-sm text-muted-foreground truncate">Playlist • Feel Magical Vibes</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                <div className="liquid-glass-album w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-500 rounded-md flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground truncate">Trending Now India</p>
                  <p className="text-sm text-muted-foreground truncate">Playlist • Spotify</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <CreatePlaylistDialog isOpen={showCreateDialog} onClose={() => setShowCreateDialog(false)} />
    </div>
  );
};

export default LeftSidebar;
