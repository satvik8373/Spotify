import React, { useState } from 'react';
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
  const [isHovered, setIsHovered] = useState(false);
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
        "group relative w-full rounded-sm md:rounded-md transition-colors duration-200 cursor-pointer p-2",
        className
      )}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Hover background */}
      <div 
        className={cn(
          "absolute inset-0 bg-card rounded-sm md:rounded-md transition-opacity duration-200 pointer-events-none",
          isHovered ? "opacity-100" : "opacity-0"
        )}
      />
      
      <div className="relative">
        {/* Playlist Image */}
        <div className="relative w-full aspect-square mb-3">
          <div className="w-full h-full rounded-md overflow-hidden shadow-lg">
            <img
              src={imageUrl}
              alt={playlist.name}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder-playlist.jpg';
              }}
            />
          </div>

          {/* Play Button */}
          <div 
            className={cn(
              "absolute bottom-2 right-2 transition-all duration-300 ease-in-out",
              isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            )}
          >
            <button
              onClick={handlePlayClick}
              className="w-10 h-10 rounded-full bg-primary hover:bg-primary/90 hover:scale-105 flex items-center justify-center shadow-2xl transition-all duration-200"
              aria-label="Play playlist"
            >
              <Play className="w-4 h-4 ml-0.5 text-primary-foreground" fill="currentColor" stroke="none" />
            </button>
          </div>
        </div>

        {/* Playlist Info */}
        <div className="space-y-1">
          <h3 className="text-foreground text-sm font-medium line-clamp-2 leading-tight">
            {playlist.name}
          </h3>
          
          {showDescription && (
            <p className="text-muted-foreground text-xs line-clamp-2">
              {playlist.songCount} songs
              {playlist.language && ` • ${playlist.language}`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};