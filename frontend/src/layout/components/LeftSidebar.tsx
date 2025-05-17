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
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { usePlaylistStore } from '../../stores/usePlaylistStore';
import { CreatePlaylistDialog } from '../../components/playlist/CreatePlaylistDialog';

export const LeftSidebar = () => {
  const { user, isAuthenticated, isAdmin } = useAuth();
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
    <div className="hidden md:flex flex-col w-[340px] bg-zinc-900 h-full">
      {/* Header */}
      <div className="p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Your Library</h1>
        <div className="flex gap-2">
          <button 
            className="p-2 hover:bg-zinc-800 rounded-full"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus size={20} className="text-zinc-400 hover:text-white" />
          </button>
          <button className="p-2 hover:bg-zinc-800 rounded-full">
            <ArrowUpRight size={20} className="text-zinc-400 hover:text-white" />
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
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-white'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Search and View Options */}
      <div className="p-2 flex justify-between items-center mt-1">
        <button className="p-2 hover:bg-zinc-800 rounded-full">
          <Search size={20} className="text-zinc-400 hover:text-white" />
        </button>
        <button className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm font-medium">
          <span>Recents</span>
          <List size={20} />
        </button>
      </div>

      {/* Playlists */}
      <div className="flex-1 overflow-y-auto px-2 min-h-0">
        <div className="space-y-2 py-2">
          {/* Admin Section - Only visible to admins */}
          {isAdmin && (
            <>
              <div className="mt-2 mb-4">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-2 mb-2">
                  Admin
                </h3>
                <Link
                  to="/admin/playlists"
                  className={cn(
                    'flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50',
                    isActive('/admin/playlists') ? 'bg-zinc-800/50' : ''
                  )}
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-amber-500 rounded-md flex items-center justify-center">
                    <ShieldCheck size={20} className="text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white truncate">Manage Playlists</p>
                    <p className="text-sm text-zinc-400 truncate">
                      Admin • Edit public playlists
                    </p>
                  </div>
                </Link>
              </div>
              <div className="h-px bg-zinc-800 my-2"></div>
            </>
          )}
          
          {/* Liked Songs */}
          <Link
            to="/liked-songs"
            className={cn(
              'flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50',
              isActive('/liked-songs') ? 'bg-zinc-800/50' : ''
            )}
          >
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-white rounded-md flex items-center justify-center">
              <Heart size={20} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-white truncate">Liked Songs</p>
              <p className="text-sm text-zinc-400 truncate">
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
                  'flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50',
                  isActive(`/playlist/${playlist._id}`) ? 'bg-zinc-800/50' : ''
                )}
              >
                <div className="w-12 h-12 bg-zinc-800 rounded-md flex items-center justify-center flex-shrink-0">
                  {playlist.imageUrl ? (
                    <img
                      src={playlist.imageUrl}
                      alt={playlist.name}
                      className="w-full h-full object-cover rounded-md"
                    />
                  ) : (
                    <LayoutGrid size={20} className="text-zinc-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white truncate">{playlist.name}</p>
                  <p className="text-sm text-zinc-400 truncate">
                    Playlist • {user?.name || 'Your playlist'}
                  </p>
                </div>
              </Link>
            ))
          ) : (
            <>
              {/* Sample Playlists */}
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-500 rounded-md flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white truncate">Trending Hindi Songs 2025</p>
                  <p className="text-sm text-zinc-400 truncate">Playlist • Feel Magical Vibes</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-500 rounded-md flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white truncate">Trending Now India</p>
                  <p className="text-sm text-zinc-400 truncate">Playlist • Spotify</p>
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
