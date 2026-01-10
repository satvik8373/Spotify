import { useEffect, useState, useRef } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    // Check if user is already authenticated from cache
    const hasCachedAuth = Boolean(
      localStorage.getItem('auth-store') && 
      JSON.parse(localStorage.getItem('auth-store') || '{}').isAuthenticated
    );
    
    // For cached authenticated users, complete faster
    // For new users, allow time for video animation to play
    const delay = hasCachedAuth ? 800 : 2500;
    
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
    // Start the crossfade transition after video is loaded
    setTimeout(() => {
      setShowVideo(true);
    }, 100); // Small delay to ensure video is ready
  };

  const handleVideoError = () => {
    setVideoError(true);
  };

  const handleVideoEnd = () => {
    if (!completedRef.current) {
      completedRef.current = true;
      setTimeout(onComplete, 300);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black"
      aria-label="Mavrixfy splash screen"
    >
      {/* Container for perfect centering */}
      <div className="relative w-40 h-40">
        {/* Static Logo - Always rendered first */}
        <img
          src="/mavrixfy.png"
          alt="Mavrixfy"
          className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-1000 ease-in-out ${
            showVideo && !videoError ? 'opacity-0' : 'opacity-100'
          }`}
          role="img"
          aria-label="Mavrixfy logo"
        />
        
        {/* Video Animation - Only show when loaded and ready */}
        {videoLoaded && !videoError && (
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-1000 ease-in-out ${
              showVideo ? 'opacity-100' : 'opacity-0'
            }`}
            onLoadedData={handleVideoLoad}
            onError={handleVideoError}
            onEnded={handleVideoEnd}
            aria-label="Mavrixfy loading animation"
            preload="auto"
          >
            <source src="/mavrixfy_loading.mp4" type="video/mp4" />
          </video>
        )}

        {/* Hidden video for preloading */}
        {!videoLoaded && !videoError && (
          <video
            autoPlay
            muted
            loop
            playsInline
            className="opacity-0 absolute inset-0 w-full h-full object-contain"
            onLoadedData={handleVideoLoad}
            onError={handleVideoError}
            aria-label="Mavrixfy loading animation"
            preload="auto"
          >
            <source src="/mavrixfy_loading.mp4" type="video/mp4" />
          </video>
        )}
      </div>
    </div>
  );
};

export default SplashScreen;
