import { useNavigate } from 'react-router-dom';
import { Playlist } from '../../types';
import { Card, CardContent, CardFooter } from '../ui/card';
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
  const { playPlaylist } = usePlayerStore();
  const { deletePlaylist } = usePlaylistStore();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playlist.songs.length === 0) {
      toast.error('This playlist has no songs');
      return;
    }
    playPlaylist(playlist.songs);
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
      <Card
        className={cn(
          'group relative overflow-hidden transition-all duration-300 border-none bg-zinc-800/40 hover:bg-zinc-700/50 cursor-pointer rounded-xl shadow-md',
          isHovering && 'shadow-xl'
        )}
        onClick={handleCardClick}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <CardContent className="p-4">
          <div className="relative aspect-square w-full overflow-hidden rounded-xl transition-transform duration-300 group-hover:scale-[1.02]">
            <div className="absolute inset-0 bg-black/10 transition-opacity z-10"></div>
            <img
              src={playlist.imageUrl || 'https://placehold.co/400x400/1f1f1f/959595?text=No+Image'}
              alt={playlist.name}
              className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
              onError={e =>
                ((e.target as HTMLImageElement).src =
                  'https://placehold.co/400x400/1f1f1f/959595?text=No+Image')
              }
            />
            <button
              className={cn(
                'absolute bottom-2 right-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-500 text-black shadow-lg z-20 transition-all duration-300 transform',
                isHovering ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              )}
              onClick={handlePlay}
            >
              <Play className="h-6 w-6" />
            </button>
          </div>
          <div className="pt-4">
            <h3 className="font-semibold truncate text-white">{playlist.name}</h3>
            <p className="text-sm text-zinc-400 truncate mt-1">
              {playlist.songs.length} {playlist.songs.length === 1 ? 'song' : 'songs'} •{' '}
              {playlist.createdBy.fullName}
            </p>
          </div>
        </CardContent>
        {isOwner && (
          <CardFooter className="flex items-center p-4 pt-0">
            <div className="ml-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-zinc-600/70 transition-colors"
                    onClick={e => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-zinc-800 border-zinc-700">
                  <DropdownMenuItem
                    className="hover:bg-zinc-700/70 text-white"
                    onClick={(e: any) => {
                      e.stopPropagation();
                      setShowEditDialog(true);
                    }}
                  >
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-400 focus:text-red-400 hover:bg-zinc-700/70"
                    onClick={handleDelete}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardFooter>
        )}
      </Card>

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
