import { useEffect, useState, useRef } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const completedRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Ensure splash screen never gets stuck - maximum 2.5 seconds
  useEffect(() => {
    const maxTimeout = setTimeout(() => {
      if (!completedRef.current) {
        console.log('Splash screen timeout - forcing completion');
        completedRef.current = true;
        onComplete();
      }
    }, 2500);

    return () => clearTimeout(maxTimeout);
  }, [onComplete]);

  // Handle video loading
  const handleVideoLoad = () => {
    setVideoLoaded(true);
  };

  const handleVideoError = () => {
    console.warn('Video failed to load, showing fallback');
    setVideoError(true);
    setVideoLoaded(false);
    
    // Complete splash screen after showing fallback briefly
    if (!completedRef.current) {
      timeoutRef.current = setTimeout(() => {
        completedRef.current = true;
        onComplete();
      }, 800);
    }
  };

  const handleVideoEnd = () => {
    if (!completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  };

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black"
      aria-label="Mavrixfy splash screen"
    >
      {/* Container for perfect centering */}
      <div className="relative w-40 h-40">
        {/* Video Animation */}
        {!videoError && (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-300 ${
              videoLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoadedData={handleVideoLoad}
            onCanPlayThrough={handleVideoLoad}
            onError={handleVideoError}
            onEnded={handleVideoEnd}
            aria-label="Mavrixfy loading animation"
            preload="auto"
          >
            <source src="/mavrixfy_loading.mp4" type="video/mp4" />
          </video>
        )}
        
        {/* Fallback static logo - always show if video fails or as backup */}
        <img
          src="/mavrixfy.png"
          alt="Mavrixfy"
          className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-300 ${
            videoError || !videoLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          role="img"
          aria-label="Mavrixfy logo"
        />
      </div>
    </div>
  );
};

export default SplashScreen;
