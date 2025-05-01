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
  isOwner: boolean;
}

export function PlaylistCard({ playlist, isOwner }: PlaylistCardProps) {
  const navigate = useNavigate();
  const { playAlbum } = usePlayerStore();
  const { deletePlaylist } = usePlaylistStore();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playlist.songs.length === 0) {
      toast.error('This playlist has no songs');
      return;
    }
    playAlbum(playlist.songs, 0);
  };

  const handleCardClick = () => {
    navigate(`/playlist/${playlist._id}`);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this playlist?')) {
      await deletePlaylist(playlist._id);
    }
  };

  return (
    <>
      <div 
        className="relative group bg-zinc-800/40 rounded-md overflow-hidden cursor-pointer hover:bg-zinc-800/70 transition-all duration-300"
        onClick={handleCardClick}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Card Content */}
        <div className="p-3 flex flex-col h-full">
          {/* Cover Image Container */}
          <div className="relative w-full mb-3 rounded-md aspect-square overflow-hidden shadow-md">
            {/* Image */}
            <img
              src={playlist.imageUrl || 'https://placehold.co/400x400/1f1f1f/959595?text=No+Image'}
              alt={playlist.name}
              className={cn(
                "w-full h-full object-cover transition-all duration-300",
                isHovering ? "brightness-80" : "brightness-100"
              )}
              onError={e => ((e.target as HTMLImageElement).src = 'https://placehold.co/400x400/1f1f1f/959595?text=No+Image')}
            />
            
            {/* Play Button Overlay */}
            <div 
              className={cn(
                "absolute inset-0 flex items-end justify-end p-2",
                "transition-all duration-300 ease-in-out",
                isHovering ? "opacity-100" : "opacity-0"
              )}
            >
              <button
                className={cn(
                  "flex items-center justify-center rounded-full bg-green-500 hover:bg-green-400 shadow-xl",
                  "w-10 h-10 transform transition-transform duration-300",
                  isHovering ? "translate-y-0 scale-100" : "translate-y-3 scale-90"
                )}
                onClick={handlePlay}
                aria-label="Play playlist"
              >
                <Play className="h-5 w-5 text-black fill-current" />
              </button>
            </div>
            
            {/* Owner Options */}
            {isOwner && (
              <div 
                className={cn(
                  "absolute top-2 right-2 z-10",
                  "transition-opacity duration-200",
                  isHovering ? "opacity-100" : "opacity-0"
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
          </div>
          
          {/* Playlist Info */}
          <div>
            <h3 className="font-bold text-white text-sm truncate">{playlist.name}</h3>
            <p className="text-xs text-zinc-400 line-clamp-2 mt-2">
              {playlist.description || (
                <>
                  By {playlist.createdBy.fullName}
                  {playlist.songs.length > 0 && (
                    <> • {playlist.songs.length} {playlist.songs.length === 1 ? 'song' : 'songs'}</>
                  )}
                </>
              )}
            </p>
          </div>
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
