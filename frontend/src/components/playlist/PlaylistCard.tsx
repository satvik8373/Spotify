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
      {/* Spotify-style playlist card - minimal design matching Figma */}
      <div 
        className={cn(
          "group relative",
          "w-full",
          "rounded-sm md:rounded-md",
          "transition-colors duration-200",
          "cursor-pointer",
          "p-3",
          className
        )}
        onClick={handleCardClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Hover background - smaller width */}
        <div 
          className={cn(
            "absolute inset-0",
            "bg-[#1a1a1a] rounded-sm md:rounded-md",
            "transition-opacity duration-200",
            "pointer-events-none",
            isHovered ? "opacity-100" : "opacity-0"
          )}
        />
        
        {/* Content wrapper - relative positioning */}
        <div className="relative">
          {/* Album Art Container */}
          <div className="relative w-full aspect-square mb-1">
          {/* Album Image */}
          <div className="w-full h-full rounded-none md:rounded overflow-hidden shadow-lg">
            <img
              src={playlist.imageUrl || '/default-playlist.jpg'}
              alt={playlist.name}
              className="w-full h-full object-cover"
              onError={e => ((e.target as HTMLImageElement).src = '/default-playlist.jpg')}
              loading="lazy"
            />
          </div>

          {/* Play Button - Spotify Green - Desktop Only */}
          <div 
            className={cn(
              "hidden md:block",
              "absolute bottom-2 right-2",
              "transition-all duration-300 ease-in-out",
              isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            )}
          >
            <button
              onClick={handlePlayClick}
              className={cn(
                "w-12 h-12 rounded-full",
                "bg-[#1ed760] hover:bg-[#1fdf64] hover:scale-105",
                "flex items-center justify-center",
                "shadow-2xl",
                "transition-all duration-200"
              )}
              aria-label="Play playlist"
            >
              <Play 
                className="w-5 h-5 ml-0.5" 
                fill="black"
                stroke="none"
              />
            </button>
          </div>
        </div>

        {/* Playlist Info - Fixed height for consistent hover background */}
        <div className="px-0 mt-2 w-full overflow-hidden h-[40px] flex items-start">
          {/* Playlist Title - using description styling */}
          {showDescription && (
            <p 
              className={cn(
                "text-[#b3b3b3] text-xs font-normal",
                "line-clamp-2",
                "leading-snug",
                "break-words"
              )}
            >
              {playlist.name}
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
