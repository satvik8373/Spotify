import React, { useState, useEffect, useRef } from 'react';
import { performanceService } from '../services/performanceService';

interface MobileOptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  quality?: number;
  priority?: boolean;
  fallbackSrc?: string;
  mobileBreakpoint?: number;
}

const MobileOptimizedImage: React.FC<MobileOptimizedImageProps> = ({
  src,
  alt,
  className = '',
  width = 300,
  height = 300,
  quality = 85,
  priority = false,
  fallbackSrc,
  mobileBreakpoint = 768
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= mobileBreakpoint);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [mobileBreakpoint]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!imgRef.current) return;

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
  }, []);

  // Preload critical images
  useEffect(() => {
    if (priority && src) {
      performanceService.preloadImage(src);
    }
  }, [priority, src]);

  const generateMobileOptimizedSrc = (originalSrc: string): string => {
    if (!originalSrc) return '';
    
    // Mobile-specific optimizations
    const mobileWidth = Math.min(width, 400); // Cap mobile width
    const mobileQuality = Math.min(quality, 80); // Lower quality for mobile
    
    // Add mobile-specific transformations
    const transformations = [
      `w_${mobileWidth}`,
      `h_${height}`,
      `q_${mobileQuality}`,
      'f_auto', // Auto format selection
      'fl_progressive', // Progressive loading
      'fl_force_strip', // Strip metadata
      'fl_attachment:flatten' // Flatten layers
    ];

    if (originalSrc.includes('cloudinary')) {
      const baseUrl = originalSrc.split('/upload/')[0];
      const imagePath = originalSrc.split('/upload/')[1];
      return `${baseUrl}/upload/${transformations.join(',')}/${imagePath}`;
    }

    return originalSrc;
  };

  const handleLoad = () => {
    setIsLoaded(true);
    setIsError(false);
  };

  const handleError = () => {
    setIsError(true);
    if (fallbackSrc && imgRef.current) {
      imgRef.current.src = fallbackSrc;
    }
  };

  const optimizedSrc = isMobile ? generateMobileOptimizedSrc(src) : src;
  const displaySrc = isInView || priority ? optimizedSrc : '';

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!isLoaded && !isError && (
        <div 
          className="flex items-center justify-center bg-gray-100 rounded-lg"
          style={{
            width: `${width}px`,
            height: `${height}px`
          }}
        >
          <div className="w-5 h-5 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}
      
      <img
        ref={imgRef}
        src={displaySrc}
        alt={alt}
        className={`block max-w-full h-auto rounded-lg transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        } ${isError ? 'opacity-50' : ''} ${
          isMobile ? 'w-full h-auto' : ''
        }`}
        style={{
          width: isMobile ? '100%' : `${width}px`,
          height: isMobile ? 'auto' : `${height}px`,
          objectFit: 'cover'
        }}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
};

export default MobileOptimizedImage;
