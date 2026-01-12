import { useEffect, useState, useRef } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    // Check if user is already authenticated from cache
    const hasCachedAuth = Boolean(
      localStorage.getItem('auth-store') && 
      JSON.parse(localStorage.getItem('auth-store') || '{}').isAuthenticated
    );
    
    // Reduced timing for faster completion - don't get stuck
    const delay = hasCachedAuth ? 600 : 1200;
    
    const timer = setTimeout(() => {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete();
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [onComplete]);

  const handleVideoLoad = () => {
    setVideoLoaded(true);
  };

  const handleVideoError = () => {
    console.warn('Video failed to load, showing fallback');
    setVideoError(true);
    // If video fails, complete splash screen immediately
    if (!completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  };

  const handleVideoEnd = () => {
    if (!completedRef.current) {
      completedRef.current = true;
      setTimeout(onComplete, 100);
    }
  };

  // Preload video on component mount
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.load(); // Force video to start loading
    }
  }, []);

  // Fallback mechanism - ensure splash screen never gets stuck
  useEffect(() => {
    const maxWaitTime = 3000; // Maximum 3 seconds
    const fallbackTimer = setTimeout(() => {
      if (!completedRef.current) {
        console.warn('Splash screen timeout, forcing completion');
        completedRef.current = true;
        onComplete();
      }
    }, maxWaitTime);

    return () => clearTimeout(fallbackTimer);
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black"
      aria-label="Mavrixfy splash screen"
    >
      {/* Container for perfect centering */}
      <div className="relative w-40 h-40">
        {/* Video Animation - Show only video, no static image */}
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-300 ease-out ${
            videoLoaded && !videoError ? 'opacity-100' : 'opacity-0'
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
        
        {/* Fallback static logo only if video fails to load */}
        {videoError && (
          <img
            src="/mavrixfy.png"
            alt="Mavrixfy"
            className="absolute inset-0 w-full h-full object-contain opacity-100 animate-[fadeIn_0.3s_ease-out]"
            role="img"
            aria-label="Mavrixfy logo"
          />
        )}
      </div>
    </div>
  );
};

export default SplashScreen;
