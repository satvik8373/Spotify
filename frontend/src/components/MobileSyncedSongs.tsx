/**
 * Mobile Synced Songs Component
 * 
 * This component is designed for the mobile app to display
 * synced liked songs from Firestore without Spotify authentication.
 * 
 * Features:
 * - Real-time updates
 * - Pull-to-refresh
 * - Search functionality
 * - Sync status display
 */

import React, { useState, useEffect } from 'react';
import { Music, RefreshCw, Search, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { 
  useMobileLikedSongs, 
  useMobileSyncMetadata,
  formatMobileSyncStatus,
  searchMobileLikedSongs,
  SyncedSong 
} from '@/services/mobileLikedSongsService';

interface MobileSyncedSongsProps {
  onSongClick?: (song: SyncedSong) => void;
  showSearch?: boolean;
  showSyncStatus?: boolean;
}

export const MobileSyncedSongs: React.FC<MobileSyncedSongsProps> = ({
  onSongClick,
  showSearch = true,
  showSyncStatus = true
}) => {
  const { songs, loading: songsLoading, error: songsError } = useMobileLikedSongs();
  const { metadata, loading: metadataLoading } = useMobileSyncMetadata();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredSongs, setFilteredSongs] = useState<SyncedSong[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (searchTerm.trim()) {
      setIsSearching(true);
      const timeoutId = setTimeout(async () => {
        const results = await searchMobileLikedSongs(searchTerm);
        setFilteredSongs(results);
        setIsSearching(false);
      }, 300);
      
      return () => clearTimeout(timeoutId);
    } else {
      setFilteredSongs(songs);
    }
  }, [searchTerm, songs]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (songsLoading || metadataLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
        <RefreshCw className="w-12 h-12 text-green-500 animate-spin mb-4" />
        <p className="text-zinc-400">Loading your music...</p>
      </div>
    );
  }

  if (songsError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-white font-medium mb-2">Failed to load songs</p>
        <p className="text-zinc-400 text-sm text-center">{songsError.message}</p>
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
        <Music className="w-16 h-16 text-zinc-600 mb-4" />
        <p className="text-white font-medium mb-2">No synced songs yet</p>
        <p className="text-zinc-400 text-sm text-center max-w-md">
          Connect your Spotify account on the web app to sync your liked songs
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sync Status */}
      {showSyncStatus && (
        <div className="bg-zinc-900 border-b border-zinc-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {metadata.syncStatus === 'completed' && (
                <CheckCircle className="w-5 h-5 text-green-500" />
              )}
              {metadata.syncStatus === 'failed' && (
                <AlertCircle className="w-5 h-5 text-red-500" />
              )}
              {metadata.syncStatus === 'in_progress' && (
                <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
              )}
              {metadata.syncStatus === 'never' && (
                <Clock className="w-5 h-5 text-zinc-500" />
              )}
              
              <div>
                <p className="text-sm font-medium text-white">
                  {metadata.totalSongs} songs
                </p>
                <p className="text-xs text-zinc-400">
                  {formatMobileSyncStatus(metadata)}
                </p>
              </div>
            </div>
            
            {metadata.error && (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
          </div>
        </div>
      )}

      {/* Search Bar */}
      {showSearch && (
        <div className="bg-zinc-900 border-b border-zinc-800 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search songs, artists, albums..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-800 text-white pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            {isSearching && (
              <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 animate-spin" />
            )}
          </div>
        </div>
      )}

      {/* Songs List */}
      <div className="flex-1 overflow-y-auto">
        {filteredSongs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12">
            <Search className="w-12 h-12 text-zinc-600 mb-4" />
            <p className="text-zinc-400">No songs found</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {filteredSongs.map((song) => (
              <div
                key={song.id}
                onClick={() => onSongClick?.(song)}
                className="flex items-center gap-4 p-4 hover:bg-zinc-800/50 active:bg-zinc-800 transition-colors cursor-pointer"
              >
                {/* Album Cover */}
                <div className="relative flex-shrink-0">
                  <img
                    src={song.coverUrl || '/placeholder-album.png'}
                    alt={song.album}
                    className="w-14 h-14 rounded-lg object-cover"
                    loading="lazy"
                  />
                  {song.previewUrl && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg opacity-0 hover:opacity-100 transition-opacity">
                      <Music className="w-6 h-6 text-white" />
                    </div>
                  )}
                </div>

                {/* Song Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium truncate">
                    {song.title}
                  </h3>
                  <p className="text-sm text-zinc-400 truncate">
                    {song.artist}
                  </p>
                  {song.album && (
                    <p className="text-xs text-zinc-500 truncate">
                      {song.album}
                    </p>
                  )}
                </div>

                {/* Duration */}
                <div className="flex-shrink-0 text-sm text-zinc-400">
                  {formatDuration(song.duration)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      {filteredSongs.length > 0 && (
        <div className="bg-zinc-900 border-t border-zinc-800 p-4">
          <p className="text-xs text-zinc-500 text-center">
            {filteredSongs.length} of {songs.length} songs
            {searchTerm && ' (filtered)'}
          </p>
        </div>
      )}
    </div>
  );
};

/**
 * Compact version for smaller displays
 */
export const MobileSyncedSongsCompact: React.FC<MobileSyncedSongsProps> = ({
  onSongClick
}) => {
  const { songs, loading } = useMobileLikedSongs();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <RefreshCw className="w-6 h-6 text-green-500 animate-spin" />
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <div className="text-center p-4">
        <p className="text-zinc-400 text-sm">No synced songs</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {songs.slice(0, 5).map((song) => (
        <div
          key={song.id}
          onClick={() => onSongClick?.(song)}
          className="flex items-center gap-3 p-2 hover:bg-zinc-800/50 rounded-lg cursor-pointer"
        >
          <img
            src={song.coverUrl || '/placeholder-album.png'}
            alt={song.album}
            className="w-10 h-10 rounded object-cover"
            loading="lazy"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white font-medium truncate">
              {song.title}
            </p>
            <p className="text-xs text-zinc-400 truncate">
              {song.artist}
            </p>
          </div>
        </div>
      ))}
      
      {songs.length > 5 && (
        <p className="text-xs text-zinc-500 text-center pt-2">
          +{songs.length - 5} more songs
        </p>
      )}
    </div>
  );
};
