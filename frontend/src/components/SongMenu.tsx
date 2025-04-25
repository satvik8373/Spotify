import { useState } from 'react';
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
import { toast } from 'sonner';

interface SongMenuProps {
  song: Song;
  className?: string;
  variant?: 'default' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function SongMenu({ song, className, variant = 'ghost', size = 'icon' }: SongMenuProps) {
  const [showAddToPlaylistDialog, setShowAddToPlaylistDialog] = useState(false);
  const { likedSongIds, toggleLikeSong } = useLikedSongsStore();
  
  const isLiked = likedSongIds.has((song as any).id || song._id);

  const handleLikeSong = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleLikeSong(song);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Create a shareable link
    const shareText = `Check out ${song.title} by ${song.artist}`;
    
    if (navigator.share) {
      navigator.share({
        title: song.title,
        text: shareText,
        url: window.location.href,
      }).catch(error => {
        console.error('Error sharing:', error);
      });
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(`${shareText} - ${window.location.href}`);
      toast.success('Link copied to clipboard');
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button 
            className={`flex items-center justify-center rounded-full hover:bg-accent transition-colors ${className}`}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="sr-only">Open song menu</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleLikeSong}>
            <Heart className={`mr-2 h-4 w-4 ${isLiked ? 'fill-green-500 text-green-500' : ''}`} />
            {isLiked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}
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