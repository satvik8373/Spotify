import { useEffect, useState, useRef } from 'react';
import { useMusicStore } from '@/stores/useMusicStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { Sparkles, TrendingUp, Music2 } from 'lucide-react';

interface NewsItem {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  category: string;
  source?: string;
  icon?: 'new' | 'trending' | 'music';
}

export const MusicNewsCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const { indianNewReleases, indianTrendingSongs, fetchIndianNewReleases, fetchIndianTrendingSongs } = useMusicStore();
  const { setCurrentSong } = usePlayerStore();

  // Fetch data
  useEffect(() => {
    if (!indianNewReleases || indianNewReleases.length === 0) {
      fetchIndianNewReleases().catch(() => {});
    }
    if (!indianTrendingSongs || indianTrendingSongs.length === 0) {
      fetchIndianTrendingSongs().catch(() => {});
    }
  }, [indianNewReleases, indianTrendingSongs, fetchIndianNewReleases, fetchIndianTrendingSongs]);

  // Filter and curate only items with high-quality images
  const getHighQualityImage = (imageUrl: string) => {
    // Ensure we get the highest quality image from JioSaavn
    if (imageUrl && imageUrl.includes('c.saavncdn.com')) {
      // Replace image quality parameters to get 500x500 or higher
      return imageUrl.replace(/150x150|50x50/g, '500x500');
    }
    return imageUrl;
  };

  // Show ALL Indian music - Trending and New Releases
  const carouselItems: NewsItem[] = [
    // ALL Trending Songs - Most popular right now
    ...(indianTrendingSongs
      ?.filter(song => song.image && song.image.startsWith('http'))
      .map(song => ({
        id: song.id,
        title: song.title,
        subtitle: song.artist || 'Various Artists',
        image: getHighQualityImage(song.image),
        category: 'TRENDING NOW',
        icon: 'trending' as const,
        data: song,
      })) || []),
    
    // ALL New Releases - Fresh music
    ...(indianNewReleases
      ?.filter(song => song.image && song.image.startsWith('http'))
      .map(song => ({
        id: song.id,
        title: song.title,
        subtitle: song.artist || 'Various Artists',
        image: getHighQualityImage(song.image),
        category: 'NEW RELEASE',
        icon: 'new' as const,
        data: song,
      })) || []),
  ].filter(item => item.image && item.image.startsWith('http')); // Only items with valid HTTP images

  // Auto-slide - Much slower for better viewing
  useEffect(() => {
    if (isAutoPlaying && !isPaused && carouselItems.length > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % carouselItems.length);
      }, 8000); // Increased to 8s for very slow, smooth transitions
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isAutoPlaying, isPaused, carouselItems.length]);

  // Handle touch swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      goToNext();
    }
    if (isRightSwipe) {
      goToPrev();
    }

    setTouchStart(0);
    setTouchEnd(0);
  };

  const goToNext = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev + 1) % carouselItems.length);
    setIsAutoPlaying(false);
    setTimeout(() => {
      setIsTransitioning(false);
      setIsAutoPlaying(true);
    }, 12000); // Longer pause after manual swipe
  };

  const goToPrev = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev - 1 + carouselItems.length) % carouselItems.length);
    setIsAutoPlaying(false);
    setTimeout(() => {
      setIsTransitioning(false);
      setIsAutoPlaying(true);
    }, 12000); // Longer pause after manual swipe
  };

  const handleItemClick = (item: any) => {
    if (item.data) {
      const convertedSong = useMusicStore.getState().convertIndianSongToAppSong(item.data);
      setCurrentSong(convertedSong);
    }
  };

  if (carouselItems.length === 0) {
    return null;
  }

  const currentItem = carouselItems[currentIndex];

  const getCategoryIcon = (icon?: string) => {
    switch (icon) {
      case 'new':
        return <Sparkles className="h-3 w-3" />;
      case 'trending':
        return <TrendingUp className="h-3 w-3" />;
      case 'music':
        return <Music2 className="h-3 w-3" />;
      default:
        return <Music2 className="h-3 w-3" />;
    }
  };

  return (
    <div className="mb-4">
      <div
        className="relative rounded-xl overflow-hidden group cursor-pointer shadow-lg hover:shadow-xl transition-all duration-500"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => handleItemClick(currentItem)}
      >
        {/* Main carousel - Much taller for full image display */}
        <div className="relative h-52 sm:h-56 md:h-64 lg:h-72 overflow-hidden">
          {/* Single image display with fade transition */}
          <div className="absolute inset-0">
            {carouselItems.map((item, index) => (
              <div
                key={item.id}
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                  index === currentIndex ? 'opacity-100' : 'opacity-0'
                }`}
              >
                {/* High-quality background image */}
                <img
                  src={item.image}
                  alt={item.title}
                  loading={index === currentIndex ? 'eager' : 'lazy'}
                  className="w-full h-full object-cover transition-all duration-700 ease-out"
                  style={{
                    filter: isPaused && index === currentIndex ? 'brightness(1.15) saturate(1.3)' : 'brightness(1.05) saturate(1.1)',
                    transform: isPaused && index === currentIndex ? 'scale(1.05)' : 'scale(1)',
                  }}
                  onError={(e) => {
                    // Hide broken images
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                {/* Gradient overlay - optimized for visibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/15 via-transparent to-transparent" />
              </div>
            ))}
          </div>

          {/* Content - Premium layout */}
          <div className="absolute inset-0 flex flex-col justify-between p-4 sm:p-5 md:p-6">
            {/* Top section - Category badge */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-lg">
                  {getCategoryIcon(currentItem.icon)}
                  <span className="text-[10px] font-bold tracking-wider text-white uppercase">
                    {currentItem.category}
                  </span>
                </div>
              </div>
              
              {/* Slide indicator - top right */}
              <div className="flex items-center gap-1.5">
                {carouselItems.map((_, index) => (
                  <div
                    key={index}
                    className={`h-1 rounded-full transition-all duration-500 ${
                      index === currentIndex
                        ? 'w-5 bg-white shadow-lg'
                        : 'w-1.5 bg-white/30'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Bottom section - Content */}
            <div className="space-y-2 sm:space-y-3">
              {/* Title */}
              <h3 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-white line-clamp-2 leading-tight drop-shadow-lg">
                {currentItem.title}
              </h3>

              {/* Subtitle */}
              <p className="text-sm sm:text-base text-white/90 line-clamp-1 font-medium drop-shadow-md">
                {currentItem.subtitle}
              </p>
            </div>
          </div>

          {/* Hover overlay - subtle */}
          <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-all duration-500 pointer-events-none" />
        </div>
      </div>
    </div>
  );
};
