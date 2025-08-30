import { useState, useEffect, useCallback, useRef } from 'react';
import { performanceService } from '@/services/performanceService';

interface UseOptimizedImageOptions {
  src: string;
  fallbackSrc?: string;
  priority?: boolean;
  sizes?: { sm?: number; md?: number; lg?: number };
  quality?: number;
  format?: 'auto' | 'webp' | 'avif' | 'jpg';
  onLoad?: () => void;
  onError?: () => void;
  lazy?: boolean;
  mobileOptimized?: boolean;
}

interface UseOptimizedImageReturn {
  src: string;
  srcSet?: string;
  sizes?: string;
  isLoading: boolean;
  hasError: boolean;
  isLoaded: boolean;
  retry: () => void;
  isInView: boolean;
}

export const useOptimizedImage = ({
  src,
  fallbackSrc = 'https://placehold.co/400x400/1f1f1f/959595?text=No+Image',
  priority = false,
  sizes,
  quality = 80,
  format = 'auto',
  onLoad,
  onError,
  lazy = true,
  mobileOptimized = true
}: UseOptimizedImageOptions): UseOptimizedImageReturn => {
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const [srcSet, setSrcSet] = useState<string>('');
  const [sizesAttr, setSizesAttr] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setLoaded] = useState(false);
  const [isInView, setIsInView] = useState(!lazy);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Generate optimized image URL with modern formats
  const getOptimizedUrl = useCallback(() => {
    if (!src || src === fallbackSrc) {
      return fallbackSrc;
    }

    // Enhanced Cloudinary optimization
    if (src.includes('cloudinary.com')) {
      const baseUrl = src.split('/upload/')[0];
      const imagePath = src.split('/upload/')[1];
      
      // Mobile-specific optimizations
      const mobileWidth = mobileOptimized ? Math.min(sizes?.md || 400, 400) : sizes?.md || 400;
      const mobileQuality = mobileOptimized ? Math.min(quality, 75) : quality;
      
      const transformations = [
        `w_${mobileWidth}`,
        `h_${sizes?.lg || 400}`,
        `q_${mobileQuality}`,
        `f_${format === 'auto' ? 'auto' : format}`,
        'fl_progressive',
        'fl_force_strip',
        'fl_attachment:flatten'
      ];

      return `${baseUrl}/upload/${transformations.join(',')}/${imagePath}`;
    }

    return src;
  }, [src, fallbackSrc, sizes, quality, format, mobileOptimized]);

  // Generate responsive srcset for better performance
  const generateSrcSet = useCallback(() => {
    if (!src || src === fallbackSrc || !src.includes('cloudinary.com')) {
      return '';
    }

    const baseUrl = src.split('/upload/')[0];
    const imagePath = src.split('/upload/')[1];
    
    const breakpoints = [
      { width: 320, quality: mobileOptimized ? 70 : quality },
      { width: 480, quality: mobileOptimized ? 75 : quality },
      { width: 768, quality: quality },
      { width: 1024, quality: quality },
      { width: 1440, quality: quality }
    ];

    const srcSetParts = breakpoints.map(({ width, quality }) => {
      const transformations = [
        `w_${width}`,
        `q_${quality}`,
        `f_${format === 'auto' ? 'auto' : format}`,
        'fl_progressive',
        'fl_force_strip'
      ];
      return `${baseUrl}/upload/${transformations.join(',')}/${imagePath} ${width}w`;
    });

    return srcSetParts.join(', ');
  }, [src, fallbackSrc, quality, format, mobileOptimized]);

  // Generate sizes attribute
  const generateSizes = useCallback(() => {
    if (!sizes) return '';
    
    return `(max-width: 480px) ${sizes.sm || 320}px, (max-width: 768px) ${sizes.md || 480}px, ${sizes.lg || 1024}px`;
  }, [sizes]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || !imgRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            if (observerRef.current) {
              observerRef.current.unobserve(entry.target);
            }
          }
        });
      },
      {
        rootMargin: '50px 0px',
        threshold: 0.1
      }
    );

    observerRef.current.observe(imgRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [lazy]);

  // Load image with enhanced performance
  const loadImage = useCallback(async () => {
    if (!src || src === fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      setIsLoading(false);
      return;
    }

    if (lazy && !isInView) return;

    setIsLoading(true);
    setHasError(false);
    setLoaded(false);

    try {
      const optimizedUrl = getOptimizedUrl();
      const responsiveSrcSet = generateSrcSet();
      const responsiveSizes = generateSizes();
      
      // Preload critical images
      if (priority) {
        await performanceService.preloadImage(optimizedUrl, 'high');
      }

      setCurrentSrc(optimizedUrl);
      setSrcSet(responsiveSrcSet);
      setSizesAttr(responsiveSizes);
      setIsLoading(false);
      setLoaded(true);
      onLoad?.();
    } catch (error) {
      console.warn('Failed to load image:', error);
      setHasError(true);
      setCurrentSrc(fallbackSrc);
      setIsLoading(false);
      onError?.();
    }
  }, [src, fallbackSrc, priority, getOptimizedUrl, generateSrcSet, generateSizes, lazy, isInView, onLoad, onError]);

  // Retry loading
  const retry = useCallback(() => {
    loadImage();
  }, [loadImage]);

  // Load image when in view or priority
  useEffect(() => {
    if (isInView || priority) {
      loadImage();
    }
  }, [isInView, priority, loadImage]);

  return {
    src: currentSrc,
    srcSet: srcSet || undefined,
    sizes: sizesAttr || undefined,
    isLoading,
    hasError,
    isLoaded,
    retry,
    isInView
  };
};

// Enhanced hook for preloading multiple images with priority
export const usePreloadImages = (images: Array<{ src: string; priority?: 'high' | 'low' }>) => {
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadedCount, setPreloadedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);

  const preloadImages = useCallback(async () => {
    if (images.length === 0) return;

    setIsPreloading(true);
    setPreloadedCount(0);
    setFailedCount(0);

    try {
      // Sort by priority: high > low
      const sortedImages = [...images].sort((a, b) => {
        const priorityOrder = { high: 2, low: 1 };
        return (priorityOrder[b.priority || 'low'] || 1) - (priorityOrder[a.priority || 'low'] || 1);
      });

      const results = await Promise.allSettled(
        sortedImages.map(img => performanceService.preloadImage(img.src, img.priority || 'low'))
      );

      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.filter(result => result.status === 'rejected').length;

      setPreloadedCount(successful);
      setFailedCount(failed);
    } catch (error) {
      console.warn('Failed to preload images:', error);
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
    failedCount,
    totalCount: images.length,
    progress: images.length > 0 ? (preloadedCount / images.length) * 100 : 0,
    successRate: images.length > 0 ? (preloadedCount / images.length) * 100 : 0
  };
};
