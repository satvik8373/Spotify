import { useNavigate } from 'react-router-dom';
import { Playlist } from '../../types';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { useState } from 'react';
import { EditPlaylistDialog } from './EditPlaylistDialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Play } from 'lucide-react';

interface PlaylistCardProps {
  playlist: Playlist;
  size?: 'small' | 'medium' | 'large';
  showDescription?: boolean;
  className?: string;
}

export function PlaylistCard({ 
  playlist, 
  size = 'medium',
  showDescription = true,
  className
}: PlaylistCardProps) {
  const navigate = useNavigate();
  const { isPlaying, currentSong } = usePlayerStore();
  const [showEditDialog, setShowEditDialog] = useState(false);

  const isCurrentPlaylist = isPlaying && 
    playlist.songs.some(song => song._id === currentSong?._id);

  const handleCardClick = () => {
    if (playlist.songs.length === 0) {
      toast.error('This playlist has no songs');
      return;
    }
    navigate(`/playlist/${playlist._id}`);
  };

  const sizeStyles = {
    small: {
      container: "w-full",
      imageWrapper: "aspect-square",
      title: "text-[14px] font-medium mt-2 leading-tight line-clamp-2",
      description: "text-[13px] text-muted-foreground mt-1 line-clamp-1",
    },
    medium: {
      container: "w-full",
      imageWrapper: "aspect-square",
      title: "text-[14px] font-medium mt-2 leading-tight line-clamp-2",
      description: "text-[13px] text-muted-foreground mt-1 line-clamp-2",
    },
    large: {
      container: "w-full",
      imageWrapper: "aspect-square", 
      title: "text-[14px] font-medium mt-2 leading-tight line-clamp-2",
      description: "text-[13px] text-muted-foreground mt-1 line-clamp-2",
    }
  };

  const styles = sizeStyles[size];

  return (
    <>
      <div 
        className={cn(
          "group transition-all duration-300",
          "cursor-pointer flex flex-col",
          styles.container,
          className
        )}
        onClick={handleCardClick}
      >
        {/* Cover Image */}
        <div className={cn("relative overflow-hidden rounded-md bg-muted", styles.imageWrapper)}>
          <div className="w-full h-0 pb-[100%] relative">
            <img
              src={playlist.imageUrl || '/default-playlist.jpg'}
              alt={playlist.name}
              className="absolute inset-0 w-full h-full object-cover"
              onError={e => ((e.target as HTMLImageElement).src = '/default-playlist.jpg')}
              loading="lazy"
            />
            {/* Hover play button - Spotify style */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCardClick();
                }}
                className="bg-[#1db954] hover:bg-[#1ed760] rounded-full p-3 shadow-2xl transform translate-y-2 group-hover:translate-y-0 transition-all duration-200"
              >
                <Play className="h-5 w-5 text-black ml-0.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Playlist Info */}
        <div className="flex-1 flex flex-col pt-2 min-h-[60px]">
          <h3 className={cn("text-foreground hover:underline cursor-pointer", styles.title)}>
            {playlist.name}
          </h3>

          {showDescription && (
            <p className={cn(styles.description)}>
              {playlist.description || (
                <>
                  {playlist.createdBy?.fullName || 'Unknown'}
                </>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Optional: edit dialog if you want to trigger it elsewhere */}
      {showEditDialog && (
        <EditPlaylistDialog
          playlist={playlist}
          isOpen={showEditDialog}
          onClose={() => setShowEditDialog(false)}
        />
      )}
    </>
  );
}
