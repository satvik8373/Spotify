import { useNavigate } from 'react-router-dom';
import { Playlist } from '../../types';
import { Play, MoreHorizontal } from 'lucide-react';
import { usePlayerStore } from '../../stores/usePlayerStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePlaylistStore } from '../../stores/usePlaylistStore';
import { useState } from 'react';
import { EditPlaylistDialog } from './EditPlaylistDialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PlaylistCardProps {
  playlist: Playlist;
  isOwner?: boolean;
  size?: 'small' | 'medium' | 'large';
  showDescription?: boolean;
  className?: string;
}

export function PlaylistCard({ 
  playlist, 
  isOwner = false,
  size = 'medium',
  showDescription = true,
  className
}: PlaylistCardProps) {
  const navigate = useNavigate();
  const { playAlbum, isPlaying, currentSong } = usePlayerStore();
  const { deletePlaylist } = usePlaylistStore();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  // Check if this playlist is currently playing
  const isCurrentPlaylist = isPlaying && 
    playlist.songs.some(song => song._id === currentSong?._id);

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playlist.songs.length === 0) {
      toast.error('This playlist has no songs');
      return;
    }
    
    // Play immediately with no delay and start playback
    playAlbum(playlist.songs, 0);
    usePlayerStore.getState().setUserInteracted();
    usePlayerStore.getState().setIsPlaying(true);
  };

  const handleCardClick = () => {
    // Navigate to playlist page immediately on single tap
    navigate(`/playlist/${playlist._id}`);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this playlist?')) {
      await deletePlaylist(playlist._id);
    }
  };

  // Set up size-based styles
  const sizeStyles = {
    small: {
      container: "w-full max-w-[170px]",
      imageWrapper: "aspect-square shadow-md",
      title: "text-sm font-medium mt-2",
      description: "text-xs mt-1 line-clamp-1",
      playButton: "w-10 h-10",
      playIcon: "w-4 h-4"
    },
    medium: {
      container: "w-full max-w-[200px]",
      imageWrapper: "aspect-square shadow-md",
      title: "text-base font-medium mt-3",
      description: "text-xs mt-1 line-clamp-2",
      playButton: "w-12 h-12",
      playIcon: "w-5 h-5 ml-0.5"
    },
    large: {
      container: "w-full max-w-[250px]",
      imageWrapper: "aspect-square shadow-md", 
      title: "text-lg mt-3 font-bold",
      description: "text-sm mt-2 line-clamp-2",
      playButton: "w-14 h-14",
      playIcon: "w-6 h-6 ml-0.5"
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
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Cover Image Container */}
        <div className={cn("relative overflow-hidden rounded-md", styles.imageWrapper)}>
          {/* Image */}
          <div className="w-full h-0 pb-[100%] relative">
            <img
              src={playlist.imageUrl || '/default-playlist.jpg'}
              alt={playlist.name}
              className="absolute inset-0 w-full h-full object-cover transition-all duration-300 group-hover:scale-105 group-hover:brightness-90"
              onError={e => ((e.target as HTMLImageElement).src = '/default-playlist.jpg')}
              loading="lazy"
            />
          </div>
          
          {/* Play Button Overlay */}
          <div 
            className={cn(
              "absolute inset-0 flex items-end justify-end p-2",
              "bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100",
              "transition-opacity duration-300"
            )}
          >
            <button
              className={cn(
                "flex items-center justify-center rounded-full bg-green-500 shadow-xl",
                "transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 hover:scale-105 hover:bg-green-400",
                "transition-all duration-300 ease-out",
                styles.playButton
              )}
              onClick={handlePlay}
              aria-label="Play playlist"
            >
              <Play className={cn("text-black fill-current", styles.playIcon)} />
            </button>
          </div>
            
          {/* Owner Options */}
          {isOwner && (
            <div 
              className={cn(
                "absolute top-2 right-2 z-10",
                "transition-opacity duration-200 opacity-0 group-hover:opacity-100"
              )}
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 hover:bg-black/80 transition-colors"
                    onClick={e => e.stopPropagation()}
                    aria-label="Menu options"
                  >
                    <MoreHorizontal className="h-4 w-4 text-white" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[#282828] border-zinc-700 text-white min-w-[160px]">
                  <DropdownMenuItem
                    className="hover:bg-white/10 text-[14px] py-2.5"
                    onClick={(e: any) => {
                      e.stopPropagation();
                      setShowEditDialog(true);
                    }}
                  >
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="hover:bg-white/10 text-[14px] py-2.5 text-red-400 focus:text-red-400"
                    onClick={handleDelete}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
          
          {/* Now Playing Indicator */}
          {isCurrentPlaylist && (
            <div className="absolute bottom-2 left-2 bg-green-500 text-black text-xs font-medium px-2 py-0.5 rounded-full">
              Playing
            </div>
          )}
        </div>
        
        {/* Playlist Info */}
        <div className="flex-1 flex flex-col pt-2 pb-4">
          <h3 className={cn("font-bold text-white truncate", styles.title)}>{playlist.name}</h3>
          
          {showDescription && (
            <p className={cn("text-zinc-400", styles.description)}>
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
