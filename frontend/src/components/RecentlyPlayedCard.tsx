import { useState, useRef, useEffect } from 'react';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAlbumColors } from '@/hooks/useAlbumColors';

interface RecentlyPlayedCardProps {
  id: string;
  title: string;
  imageUrl?: string;
  subtitle?: string;
  type?: 'playlist' | 'album' | 'song';
  onClick?: () => void;
  onPlay?: () => void;
  onHoverChange?: (gradient: string | null) => void;
}

export function RecentlyPlayedCard({
  id,
  title,
  imageUrl,
  // subtitle, // Unused in this compact design
  // type = 'playlist', // Unused in this compact design
  onClick,
  onPlay,
  onHoverChange,
}: RecentlyPlayedCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Extract colors from the image - special processing for Liked Songs
  const colors = useAlbumColors(imageUrl, id === 'liked-songs');

  // Handle image load
  useEffect(() => {
    if (imgRef.current?.complete) {
      setImageLoaded(true);
    }
  }, [imageUrl]);

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPlay?.();
  };

  const handleCardClick = () => {
    onClick?.();
  };

  // Simple background - no gradient, no glow

  return (
    <div
      className={cn(
        'group relative h-[48px] md:h-[64px] w-full rounded-md overflow-hidden cursor-pointer transition-all duration-200 active:scale-95 active:bg-white/20',
        'recently-played-card bg-white/10 md:bg-white/15 md:hover:bg-white/20'
      )}
      onClick={handleCardClick}
    >

      {/* Content */}
      <div className="relative flex items-center h-full z-10">
        {/* Image with Spotify-style glow effect */}
        <div className="relative w-[48px] md:w-[63px] h-full flex-shrink-0">
          <div className="relative w-full h-full rounded-l-md overflow-hidden shadow-sm">
            {imageUrl ? (
              <img
                ref={imgRef}
                src={imageUrl}
                alt={title}
                className="w-full h-full object-cover"
                loading="lazy"
                onLoad={() => setImageLoaded(true)}
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://placehold.co/400x400/1f1f1f/959595?text=No+Image';
                }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-600 to-purple-900 flex items-center justify-center">
                <span className="text-white text-xs font-bold">M</span>
              </div>
            )}
          </div>
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0 pl-2 pr-1 md:px-3 py-2">
          <h3
            className={cn(
              'font-bold text-[11.5px] md:text-[15px] leading-tight line-clamp-2 transition-colors duration-500 ease-in-out',
              'text-white' // Always white text to match image
            )}
            title={title}
          >
            {title}
          </h3>
          {/* Subtitle/Type removed for cleaner look at small size if needed, or kept with simpler styling */}
        </div>

        {/* Action buttons */}
        <div className="hidden md:flex items-center gap-1 pr-3">
          {/* Play button - Perfect Spotify design */}
          <button
            className={cn(
              'w-12 h-12 flex items-center justify-center rounded-full',
              'bg-[#1ed760] hover:bg-[#1fdf64] hover:scale-105',
              'shadow-[0_8px_24px_rgba(0,0,0,0.5)]',
              'transition-all duration-300 ease-in-out z-20',
              'opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-2'
            )}
            onClick={handlePlayClick}
            aria-label="Play"
          >
            <Play className="h-5 w-5 ml-0.5" fill="black" stroke="none" />
          </button>
        </div>
      </div>

    </div>
  );
}
