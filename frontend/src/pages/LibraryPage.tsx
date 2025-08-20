import { useEffect } from 'react';
import { usePlaylistStore } from '@/stores/usePlaylistStore';
import { PlaylistCard } from '@/components/playlist/PlaylistCard';
import { Playlist } from '@/types';

export default function LibraryPage() {
  const { playlists, fetchPublicPlaylists, fetchUserPlaylists, isLoading } = usePlaylistStore();

  useEffect(() => {
    // Fetch both public and user playlists for merged view
    fetchPublicPlaylists();
    fetchUserPlaylists();
  }, [fetchPublicPlaylists, fetchUserPlaylists]);

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-bold mb-4">Playlists</h1>
      {isLoading && (
        <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-b-2 border-primary" />
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {playlists.map((p: Playlist) => (
          <PlaylistCard key={p._id} playlist={p} />
        ))}
      </div>
    </div>
  );
}

