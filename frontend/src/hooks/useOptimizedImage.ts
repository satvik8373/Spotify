import { useState, useEffect, useCallback } from 'react';
import { performanceService } from '@/services/performanceService';

interface UseOptimizedImageOptions {
  src: string;
  fallbackSrc?: string;
  priority?: boolean;
  sizes?: { sm?: number; md?: number; lg?: number };
  quality?: number;
  onLoad?: () => void;
  onError?: () => void;
}

interface UseOptimizedImageReturn {
  src: string;
  isLoading: boolean;
  hasError: boolean;
  isLoaded: boolean;
  retry: () => void;
}

export const useOptimizedImage = ({
  src,
  fallbackSrc = 'https://placehold.co/400x400/1f1f1f/959595?text=No+Image',
  priority = false,
  sizes,
  quality = 80,
  onLoad,
  onError
}: UseOptimizedImageOptions): UseOptimizedImageReturn => {
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setLoaded] = useState(false);

  // Generate optimized image URL
  const getOptimizedUrl = useCallback(() => {
    if (!src || src === fallbackSrc) {
      return fallbackSrc;
    }

    // If sizes are provided, generate responsive srcset
    if (sizes && src.includes('cloudinary.com')) {
      return performanceService.getResponsiveImageSrc(src, sizes);
    }

    return src;
  }, [src, fallbackSrc, sizes]);

  // Load image
  const loadImage = useCallback(async () => {
    if (!src || src === fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setHasError(false);
    setLoaded(false);

    try {
      const optimizedUrl = getOptimizedUrl();
      
      // Preload image if priority is high
      if (priority) {
        await performanceService.preloadImage(optimizedUrl, 'high');
      }

      setCurrentSrc(optimizedUrl);
      setIsLoading(false);
      setLoaded(true);
      onLoad?.();
    } catch (error) {
      setHasError(true);
      setCurrentSrc(fallbackSrc);
      setIsLoading(false);
      onError?.();
    }
  }, [src, fallbackSrc, priority, getOptimizedUrl, onLoad, onError]);

  // Retry loading
  const retry = useCallback(() => {
    loadImage();
  }, [loadImage]);

  // Load image on mount or when src changes
  useEffect(() => {
    loadImage();
  }, [loadImage]);

  return {
    src: currentSrc,
    isLoading,
    hasError,
    isLoaded,
    retry
  };
};

// Hook for preloading multiple images
export const usePreloadImages = (images: Array<{ src: string; priority?: 'high' | 'low' }>) => {
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadedCount, setPreloadedCount] = useState(0);

  const preloadImages = useCallback(async () => {
    if (images.length === 0) return;

    setIsPreloading(true);
    setPreloadedCount(0);

    try {
      await performanceService.preloadImages(images);
      setPreloadedCount(images.length);
    } catch (error) {
      // Failed to preload some images
    } finally {
      setIsPreloading(false);
    }
  }, [images]);

  useEffect(() => {
    preloadImages();
  }, [preloadImages]);

  return {
    isPreloading,
    preloadedCount,
    totalCount: images.length,
    progress: images.length > 0 ? (preloadedCount / images.length) * 100 : 0
  };
};
