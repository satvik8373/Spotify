/**
 * Mobile Liked Songs Page
 * 
 * Example page showing how to use the mobile liked songs service
 * in a mobile app context. This page demonstrates:
 * 
 * - Real-time song updates
 * - Sync status display
 * - Search functionality
 * - Song playback integration
 */

import React, { useState } from 'react';
import { MobileSyncedSongs } from '@/components/MobileSyncedSongs';
import { SyncedSong } from '@/services/mobileLikedSongsService';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';

export const MobileLikedSongsPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedSong, setSelectedSong] = useState<SyncedSong | null>(null);

  const handleSongClick = (song: SyncedSong) => {
    setSelectedSong(song);
    
    // Example: Navigate to song detail page
    // navigate(`/song/${song.id}`);
    
    // Example: Play the song
    // playAudio(song.previewUrl || song.audioUrl);
    
    // Example: Open in Spotify
    // if (song.spotifyUrl) {
    //   window.open(song.spotifyUrl, '_blank');
    // }
    
    console.log('Selected song:', song);
  };

  return (
    <div className="flex flex-col h-screen bg-black">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 p-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Liked Songs</h1>
            <p className="text-sm text-zinc-400">Synced from Spotify</p>
          </div>
        </div>
      </div>

      {/* Songs List */}
      <div className="flex-1 overflow-hidden">
        <MobileSyncedSongs
          onSongClick={handleSongClick}
          showSearch={true}
          showSyncStatus={true}
        />
      </div>

      {/* Selected Song Preview (Optional) */}
      {selectedSong && (
        <div className="bg-zinc-900 border-t border-zinc-800 p-4">
          <div className="flex items-center gap-4">
            <img
              src={selectedSong.coverUrl}
              alt={selectedSong.album}
              className="w-12 h-12 rounded-lg"
            />
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">
                {selectedSong.title}
              </p>
              <p className="text-sm text-zinc-400 truncate">
                {selectedSong.artist}
              </p>
            </div>
            {selectedSong.spotifyUrl && (
              <a
                href={selectedSong.spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-green-500 hover:bg-green-600 rounded-lg transition-colors"
              >
                <ExternalLink className="w-5 h-5 text-white" />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileLikedSongsPage;
