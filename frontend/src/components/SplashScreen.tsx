import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [isAnimating, setIsAnimating] = useState(true);
  
  useEffect(() => {
    // Show splash screen for 3 seconds then fade out
    const timer = setTimeout(() => {
      setIsAnimating(false);
      
      // After fade out animation completes, call onComplete
      setTimeout(() => {
        onComplete();
      }, 500); // This matches the transition duration in the CSS
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 bg-black flex flex-col items-center justify-center z-50 transition-opacity duration-500 ${isAnimating ? 'opacity-100' : 'opacity-0'}`}>
      <div className="flex flex-col items-center justify-center space-y-6">
        {/* Spotify Logo */}
        <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="#1DB954" className="animate-pulse">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
        </svg>
        
        {/* X symbol */}
        <div className="text-white text-3xl font-bold">×</div>
        
        {/* Mavrix logo/text */}
        <div className="bg-gradient-to-r from-green-500 to-blue-500 text-transparent bg-clip-text">
          <h2 className="text-4xl font-extrabold">MAVRIX</h2>
        </div>
        
        {/* Combined text */}
        <h1 className="text-white text-xl font-medium mt-2">Spotify x Mavrix</h1>
        
        {/* Loading indicator */}
        <div className="mt-4 flex space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen; 