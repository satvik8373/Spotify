import React, { useState, useRef, useEffect } from 'react';
import { getOptimizedImageUrl } from '@/services/cloudinaryService';
import { networkOptimizer } from '@/utils/networkOptimizer';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  quality?: number;
  format?: 'auto' | 'webp' | 'jpg' | 'png' | 'avif';
  sizes?: string;
  priority?: boolean;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
  fallbackSrc?: string;
  size?: 'small' | 'medium' | 'large';
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  width,
  height,
  quality = 80,
  format = 'auto',
  sizes = '100vw',
  priority = false,
  placeholder,
  onLoad,
  onError,
  fallbackSrc = 'https://placehold.co/400x400/1f1f1f/959595?text=No+Image',
  size = 'medium'
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const [shouldLoad, setShouldLoad] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);

  // Generate optimized URLs for different formats with network optimization
  const generateImageUrls = () => {
    if (!src || src === fallbackSrc) {
      return { webp: fallbackSrc, jpg: fallbackSrc, original: fallbackSrc };
    }

    // Get network-optimized URL
    const optimizedSrc = networkOptimizer.getOptimizedImageUrl(src, size);
    const networkConfig = networkOptimizer.getConfig();
    
    // Adjust quality based on connection
    const adaptiveQuality = networkConfig.imageQuality === 'low' ? 30 :
                           networkConfig.imageQuality === 'medium' ? 60 : quality;

    // Check if it's already a Cloudinary URL
    const isCloudinaryUrl = optimizedSrc.includes('cloudinary.com');
    
    if (isCloudinaryUrl) {
      // Extract public ID from Cloudinary URL
      const match = optimizedSrc.match(/\/([^/]+)\/?([^/]+)\/([^/]+)$/);
      if (match && match[3]) {
        const publicId = match[3].split('.')[0];
        
        // Skip AVIF on slow connections to reduce processing time
        const formats = networkConfig.imageQuality === 'low' 
          ? { jpg: 'jpg', webp: 'webp' }
          : { avif: 'avif', webp: 'webp', jpg: 'jpg' };
        
        const urls: any = { original: optimizedSrc };
        
        Object.entries(formats).forEach(([key, fmt]) => {
          urls[key] = getOptimizedImageUrl(publicId, { 
            width, 
            height, 
            quality: adaptiveQuality, 
            format: fmt as any
          });
        });
        
        return urls;
      }
    }

    // For non-Cloudinary URLs, return optimized version
    return { webp: optimizedSrc, jpg: optimizedSrc, original: optimizedSrc };
  };

  const imageUrls = generateImageUrls();

  useEffect(() => {
    setCurrentSrc(imageUrls.original);
    setIsLoaded(false);
    setHasError(false);
  }, [src]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    if (currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
    }
    onError?.();
  };

  // Intersection Observer for lazy loading with network-aware thresholds
  useEffect(() => {
    if (priority) {
      setShouldLoad(true);
      return;
    }

    const networkConfig = networkOptimizer.getConfig();
    const rootMargin = networkConfig.enableDataSaver ? '20px 0px' : '50px 0px';
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoad(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin,
        threshold: 0.01
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  // Load image when shouldLoad becomes true
  useEffect(() => {
    if (shouldLoad && imgRef.current && !imgRef.current.src) {
      imgRef.current.src = currentSrc;
    }
  }, [shouldLoad, currentSrc]);

  // For priority images, set src immediately
  useEffect(() => {
    if (priority && imgRef.current) {
      imgRef.current.src = currentSrc;
    }
  }, [currentSrc, priority]);

  const networkConfig = networkOptimizer.getConfig();
  const showPlaceholder = !isLoaded && !hasError;

  return (
    <picture className={className}>
      {/* AVIF format (best compression) - skip on slow connections */}
      {imageUrls.avif && networkConfig.imageQuality !== 'low' && (
        <source
          srcSet={shouldLoad ? imageUrls.avif : ''}
          type="image/avif"
          sizes={sizes}
        />
      )}
      {/* WebP format (good compression, wide support) */}
      <source
        srcSet={shouldLoad ? imageUrls.webp : ''}
        type="image/webp"
        sizes={sizes}
      />
      {/* JPEG fallback */}
      <source
        srcSet={shouldLoad ? imageUrls.jpg : ''}
        type="image/jpeg"
        sizes={sizes}
      />
      {/* Fallback img element */}
      <img
        ref={imgRef}
        src={priority ? currentSrc : ''} // Empty src for lazy loading
        alt={alt}
        className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        style={{
          backgroundColor: showPlaceholder ? (placeholder || '#1f1f1f') : 'transparent',
          ...(width && height ? { aspectRatio: `${width}/${height}` } : {})
        }}
      />
      
      {/* Loading placeholder for slow connections */}
      {showPlaceholder && networkConfig.enableDataSaver && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-gray-800 text-gray-400 text-xs"
          style={{ aspectRatio: width && height ? `${width}/${height}` : undefined }}
        >
          Loading...
        </div>
      )}
    </picture>
  );
};

export default OptimizedImage;
