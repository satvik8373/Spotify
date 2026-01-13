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
  showDescription?: boolean;
  className?: string;
}

export function PlaylistCard({ 
  playlist, 
  showDescription = true,
  className
}: PlaylistCardProps) {
  const navigate = useNavigate();
  const { setCurrentSong, setIsPlaying } = usePlayerStore();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleCardClick = () => {
    if (playlist.songs.length === 0) {
      toast.error('This playlist has no songs');
      return;
    }
    navigate(`/playlist/${playlist._id}`);
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playlist.songs.length === 0) {
      toast.error('This playlist has no songs');
      return;
    }
    // Play first song in playlist
    setCurrentSong(playlist.songs[0]);
    setIsPlaying(true);
  };

  return (
    <>
      {/* JioSaavn-style playlist card design */}
      <div 
        className={cn(
          "group relative w-full rounded-md transition-colors duration-200 cursor-pointer p-1 md:p-2",
          className
        )}
        onClick={handleCardClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Hover background */}
        <div 
          className={cn(
            "absolute inset-0 bg-card rounded-md transition-opacity duration-200 pointer-events-none",
            isHovered ? "opacity-100" : "opacity-0"
          )}
        />
        
        <div className="relative">
          {/* Playlist Image */}
          <div className="relative w-full aspect-square mb-2">
            <div className="w-full h-full rounded-md overflow-hidden shadow-lg">
              <img
                src={playlist.imageUrl || '/default-playlist.jpg'}
                alt={playlist.name}
                className="w-full h-full object-cover rounded-md"
                onError={e => ((e.target as HTMLImageElement).src = '/default-playlist.jpg')}
                loading="lazy"
              />
            </div>

            {/* Play Button */}
            <div 
              className={cn(
                "absolute bottom-1 right-1 transition-all duration-300 ease-in-out",
                isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
              )}
            >
              <button
                onClick={handlePlayClick}
                className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-primary hover:bg-primary/90 hover:scale-105 flex items-center justify-center shadow-2xl transition-all duration-200"
                aria-label="Play playlist"
              >
                <Play className="w-2.5 h-2.5 md:w-3 md:h-3 ml-0.5 text-primary-foreground" fill="currentColor" stroke="none" />
              </button>
            </div>
          </div>

          {/* Playlist Info */}
          <div className="space-y-0.5">
            <h3 className="text-foreground text-[10px] md:text-xs font-medium line-clamp-2 leading-tight">
              {playlist.name}
            </h3>
            
            {showDescription && (
              <p className="text-muted-foreground text-[8px] md:text-[10px] line-clamp-2">
                {playlist.songs?.length || 0} songs
                {playlist.description && ` • ${playlist.description}`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
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
