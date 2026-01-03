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
  fallbackSrc = 'https://placehold.co/400x400/1f1f1f/959595?text=No+Image'
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);

  // Generate optimized URLs for different formats
  const generateImageUrls = () => {
    if (!src || src === fallbackSrc) {
      return { webp: fallbackSrc, jpg: fallbackSrc, original: fallbackSrc };
    }

    // Check if it's already a Cloudinary URL
    const isCloudinaryUrl = src.includes('cloudinary.com');
    
    if (isCloudinaryUrl) {
      // Extract public ID from Cloudinary URL
      const match = src.match(/\/([^/]+)\/?([^/]+)\/([^/]+)$/);
      if (match && match[3]) {
        const publicId = match[3].split('.')[0];
        return {
          webp: getOptimizedImageUrl(publicId, { 
            width, 
            height, 
            quality, 
            format: 'webp' 
          }),
          avif: getOptimizedImageUrl(publicId, { 
            width, 
            height, 
            quality, 
            format: 'avif' 
          }),
          jpg: getOptimizedImageUrl(publicId, { 
            width, 
            height, 
            quality, 
            format: 'jpg' 
          }),
          original: src
        };
      }
    }

    // For non-Cloudinary URLs, return as-is
    return { webp: src, jpg: src, original: src };
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

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority) return; // Skip lazy loading for priority images

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && imgRef.current) {
            imgRef.current.src = currentSrc;
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '50px 0px', // Start loading 50px before the image comes into view
        threshold: 0.01
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [currentSrc, priority]);

  // For priority images, set src immediately
  useEffect(() => {
    if (priority && imgRef.current) {
      imgRef.current.src = currentSrc;
    }
  }, [currentSrc, priority]);

  return (
    <picture className={className}>
      {/* AVIF format (best compression) */}
      <source
        srcSet={imageUrls.avif}
        type="image/avif"
        sizes={sizes}
      />
      {/* WebP format (good compression, wide support) */}
      <source
        srcSet={imageUrls.webp}
        type="image/webp"
        sizes={sizes}
      />
      {/* JPEG fallback */}
      <source
        srcSet={imageUrls.jpg}
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
          backgroundColor: placeholder || 'transparent',
          ...(width && height ? { aspectRatio: `${width}/${height}` } : {})
        }}
      />
    </picture>
  );
};

export default OptimizedImage;
