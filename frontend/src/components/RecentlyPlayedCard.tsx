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
  const [isHovered, setIsHovered] = useState(false);
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

  // Simple background - no gradient, no glow

  return (
    <div
      className={cn(
        'group relative h-[48px] md:h-[64px] w-full md:w-[calc(100%-4px)] rounded-[4px] overflow-hidden cursor-pointer',
        'transition-all duration-500 ease-in-out',
        isHovered ? 'bg-white/40' : 'bg-white/10 md:bg-white/15' // Brighter background on desktop default? Or keep verified.
      )}
      onMouseEnter={() => {
        setIsHovered(true);
        // Send primary color when hovering - always send for valid colors
        if (imageLoaded && colors.primary) {
          onHoverChange?.(colors.primary);
        }
      }
      }
      onMouseLeave={() => {
        setIsHovered(false);
        // Reset to Liked Songs color when leaving non-Liked Songs cards
        if (id === 'liked-songs') {
          // Keep Liked Songs color active
          onHoverChange?.(colors.primary || null);
        } else {
          // Return to default
          onHoverChange?.(null);
        }
      }}
      onClick={onClick}
    >

      {/* Content */}
      <div className="relative flex items-center h-full z-10">
        {/* Image with Spotify-style glow effect */}
        <div className="relative w-[48px] md:w-[63px] h-full flex-shrink-0">
          <div className="relative w-full h-full rounded-l-[4px] overflow-hidden shadow-sm">
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
        <div className="hidden md:flex items-center gap-1 pr-2">
          {/* Play button */}
          <button
            className={cn(
              'p-2 bg-green-500 hover:bg-green-400 text-black rounded-full shadow-lg',
              'transition-all duration-400 ease-in-out z-20',
              isHovered
                ? 'opacity-100 translate-y-0 scale-100'
                : 'opacity-0 translate-y-2 scale-90'
            )}
            onClick={handlePlayClick}
            aria-label="Play"
          >
            <Play className="h-3 w-3 fill-black" />
          </button>
        </div>
      </div>

    </div>
  );
}
