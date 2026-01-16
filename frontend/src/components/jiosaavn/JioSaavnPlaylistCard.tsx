import React from 'react';
import { Play } from 'lucide-react';
import { JioSaavnPlaylist, jioSaavnService } from '@/services/jioSaavnService';
import { cn } from '@/lib/utils';

interface JioSaavnPlaylistCardProps {
  playlist: JioSaavnPlaylist;
  onClick?: (playlist: JioSaavnPlaylist) => void;
  onPlay?: (playlist: JioSaavnPlaylist) => void;
  className?: string;
  showDescription?: boolean;
}

export const JioSaavnPlaylistCard: React.FC<JioSaavnPlaylistCardProps> = ({
  playlist,
  onClick,
  onPlay,
  className,
  showDescription = true,
}) => {
  const imageUrl = jioSaavnService.getBestImageUrl(playlist.image);

  const handleClick = () => {
    onClick?.(playlist);
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPlay?.(playlist);
  };

  return (
    <div
      className={cn(
        "group relative w-full rounded-md cursor-pointer p-1 transition-all duration-200 active:scale-95 active:bg-primary/5",
        className
      )}
      onClick={handleClick}
    >
      <div className="relative">
        {/* Playlist Image */}
        <div className="relative w-full aspect-square mb-2">
          <div className="w-full h-full rounded-md overflow-hidden shadow-lg">
            <img
              src={imageUrl}
              alt={playlist.name}
              className="w-full h-full object-cover rounded-md"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder-playlist.jpg';
              }}
            />
          </div>

          {/* Play Button - Desktop Only */}
          <div className="absolute bottom-1 right-1 hidden md:group-hover:block">
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
              {playlist.songCount} songs
              {playlist.language && ` • ${playlist.language}`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};