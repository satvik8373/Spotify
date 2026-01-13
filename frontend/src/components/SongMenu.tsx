import { useEffect, useState } from 'react';
import { Song } from '../types';
import { 
  MoreHorizontal, 
  ListPlus, 
  Heart, 
  Share2, 
  Music 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useLikedSongsStore } from '../stores/useLikedSongsStore';
import { AddToPlaylistDialog } from './playlist/AddToPlaylistDialog';
import { ShareSong } from './ShareSong';
import { toast } from 'sonner';

interface SongMenuProps {
  song: Song;
  className?: string;
  variant?: 'default' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function SongMenu({ song, className, variant = 'ghost', size = 'icon' }: SongMenuProps) {
  const [showAddToPlaylistDialog, setShowAddToPlaylistDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const { likedSongIds, toggleLikeSong } = useLikedSongsStore();
  
  const songId = (song as any).id || song._id;
  const [songLiked, setSongLiked] = useState(likedSongIds.has(songId));
  
  // Update state when likedSongIds changes
  useEffect(() => {
    setSongLiked(likedSongIds.has(songId));
  }, [likedSongIds, songId]);
  
  // Listen for like updates from other components
  useEffect(() => {
    const handleLikeUpdate = (e: Event) => {
      // Check if this event includes details about which song was updated
      if (e instanceof CustomEvent && e.detail) {
        // If we have details and it's not for our current song, ignore
        if (e.detail.songId && e.detail.songId !== songId) {
          return;
        }
        
        // If we have explicit like state in the event, use it
        if (typeof e.detail.isLiked === 'boolean') {
          setSongLiked(e.detail.isLiked);
          return;
        }
      }
      
      // Otherwise do a fresh check from the store
      setSongLiked(likedSongIds.has(songId));
    };
    
    document.addEventListener('likedSongsUpdated', handleLikeUpdate);
    document.addEventListener('songLikeStateChanged', handleLikeUpdate);
    
    return () => {
      document.removeEventListener('likedSongsUpdated', handleLikeUpdate);
      document.removeEventListener('songLikeStateChanged', handleLikeUpdate);
    };
  }, [songId, likedSongIds]);

  const handleLikeSong = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Optimistically update UI
    setSongLiked(!songLiked);
    
    // Perform the toggle
    toggleLikeSong(song);
    
    // Also dispatch an event for other components
    document.dispatchEvent(new CustomEvent('songLikeStateChanged', { 
      detail: {
        songId,
        song,
        isLiked: !songLiked,
        timestamp: Date.now(),
        source: 'SongMenu'
      }
    }));
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowShareDialog(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button 
            className={`flex items-center justify-center rounded-full hover:bg-accent transition-colors ${className}`}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="sr-only">Open song menu</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48">
          <DropdownMenuItem onClick={handleLikeSong}>
            <Heart className={`mr-2 h-4 w-4 ${songLiked ? 'fill-green-500 text-green-500' : ''}`} />
            {songLiked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowAddToPlaylistDialog(true)}>
            <ListPlus className="mr-2 h-4 w-4" />
            Add to Playlist
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleShare}>
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => {
            e.stopPropagation();
            window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(`${song.title} ${song.artist}`)}`, '_blank');
          }}>
            <Music className="mr-2 h-4 w-4" />
            Find on YouTube
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {showAddToPlaylistDialog && (
        <AddToPlaylistDialog
          song={song}
          isOpen={showAddToPlaylistDialog}
          onClose={() => setShowAddToPlaylistDialog(false)}
        />
      )}
    </>
  );
} 