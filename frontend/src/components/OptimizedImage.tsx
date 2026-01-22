import React, { useState, useRef, useEffect } from 'react';
import { getOptimizedImageUrl } from '@/services/cloudinaryService';

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

  // Generate optimized URLs for different formats
  const generateImageUrls = () => {
    if (!src || src === fallbackSrc) {
      return { webp: fallbackSrc, jpg: fallbackSrc, original: fallbackSrc };
    }

    // Use standard quality without network restrictions
    const adaptiveQuality = quality;

    // Check if it's already a Cloudinary URL
    const isCloudinaryUrl = src.includes('cloudinary.com');
    
    if (isCloudinaryUrl) {
      // Extract public ID from Cloudinary URL
      const match = src.match(/\/([^/]+)\/?([^/]+)\/([^/]+)$/);
      if (match && match[3]) {
        const publicId = match[3].split('.')[0];
        
        // Support all formats
        const formats = { webp: 'webp', jpg: 'jpg' };
        
        const urls: any = { original: src };
        
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

    // For non-Cloudinary URLs, return original
    return { webp: src, jpg: src, original: src };
  };

  const imageUrls = generateImageUrls();

  useEffect(() => {
    setCurrentSrc(src);
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

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority) {
      setShouldLoad(true);
      return;
    }

    // Standard lazy loading
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
        rootMargin: '50px 0px',
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

  const showPlaceholder = !isLoaded && !hasError;

  return (
    <picture className={className}>
      {/* WebP support */}
      {imageUrls.webp && (
        <source
          srcSet={shouldLoad ? imageUrls.webp : ''}
          type="image/webp"
          sizes={sizes}
        />
      )}
      
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
    </picture>
  );
};

export default OptimizedImage;
