import { useNavigate } from 'react-router-dom';
import { Playlist } from '../../types';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { useState } from 'react';
import { EditPlaylistDialog } from './EditPlaylistDialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
      container: "w-full max-w-[170px]",
      imageWrapper: "aspect-square shadow-md",
      title: "text-sm font-medium mt-2",
      description: "text-xs mt-1 line-clamp-1",
    },
    medium: {
      container: "w-full max-w-[200px]",
      imageWrapper: "aspect-square shadow-md",
      title: "text-base font-medium mt-3",
      description: "text-xs mt-1 line-clamp-2",
    },
    large: {
      container: "w-full max-w-[250px]",
      imageWrapper: "aspect-square shadow-md", 
      title: "text-lg mt-3 font-bold",
      description: "text-sm mt-2 line-clamp-2",
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
        <div className={cn("relative overflow-hidden rounded-md", styles.imageWrapper)}>
          <div className="w-full h-0 pb-[100%] relative">
            <img
              src={playlist.imageUrl || '/default-playlist.jpg'}
              alt={playlist.name}
              className="absolute inset-0 w-full h-full object-cover transition-all duration-300 group-hover:scale-105 group-hover:brightness-90"
              onError={e => ((e.target as HTMLImageElement).src = '/default-playlist.jpg')}
              loading="lazy"
            />
          </div>

          {/* Now Playing Indicator */}
          {isCurrentPlaylist && (
            <div className="absolute bottom-2 left-2 bg-green-500 text-black text-xs font-medium px-2 py-0.5 rounded-full">
              Playing
            </div>
          )}
        </div>

        {/* Playlist Info */}
        <div className="flex-1 flex flex-col pt-2 pb-4">
          <h3 className={cn("font-bold text-foreground truncate", styles.title)}>
            {playlist.name}
          </h3>

          {showDescription && (
            <p className={cn("text-muted-foreground", styles.description)}>
              {playlist.description || (
                <>
                  By {playlist.createdBy?.fullName || 'Unknown'}
                  {playlist.songs.length > 0 && (
                    <> • {playlist.songs.length} {playlist.songs.length === 1 ? 'song' : 'songs'}</>
                  )}
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
