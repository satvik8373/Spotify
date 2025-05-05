import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [isAnimating, setIsAnimating] = useState(true);
  const [showContent, setShowContent] = useState(false);
  
  // Check for cached authentication to determine splash screen duration
  const hasCachedAuth = Boolean(
    localStorage.getItem('auth-store') && 
    JSON.parse(localStorage.getItem('auth-store') || '{}').isAuthenticated
  );
  
  // Preload critical assets
  useEffect(() => {
    // Preload logo SVG
    const logo = new Image();
    logo.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%231DB954'%3E%3Cpath d='M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z'/%3E%3C/svg%3E";
    
    // Show content after a brief delay to ensure smooth animation
    const contentTimer = setTimeout(() => {
      setShowContent(true);
    }, 100);
    
    return () => clearTimeout(contentTimer);
  }, []);
  
  // Handle animation completion
  const handleAnimationComplete = useCallback(() => {
    setIsAnimating(false);
    // Call onComplete after fade out
    setTimeout(onComplete, 200);
  }, [onComplete]);
  
  // Start exit animation based on authentication status
  useEffect(() => {
    // Shorter display time for authenticated users
    const animationDuration = hasCachedAuth ? 800 : 2000;
    
    const timer = setTimeout(handleAnimationComplete, animationDuration);
    return () => clearTimeout(timer);
  }, [handleAnimationComplete, hasCachedAuth]);

  return (
    <AnimatePresence>
      {isAnimating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50"
        >
          <div className="flex flex-col items-center justify-center space-y-8">
            {/* Spotify Logo with optimized animation */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ 
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: 0.1
              }}
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="80" 
                height="80" 
                viewBox="0 0 24 24" 
                fill="#1DB954"
                className="drop-shadow-lg"
              >
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
            </motion.div>
            
            {/* X symbol with fade-in */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-white text-3xl font-bold"
            >
              ×
            </motion.div>
            
            {/* Mavrix logo with gradient animation */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="relative"
            >
              <motion.h2 
                className="text-4xl font-extrabold bg-gradient-to-r from-green-500 via-blue-500 to-green-500 text-transparent bg-clip-text"
                animate={{
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear"
                }}
                style={{
                  backgroundSize: '200% 100%'
                }}
              >
                MAVRIX
              </motion.h2>
            </motion.div>
            
            {/* Combined text with staggered animation */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-center"
            >
              <h1 className="text-white text-xl font-medium">Spotify x Mavrix</h1>
            </motion.div>
            
            {/* Loading indicator with optimized animation */}
            <motion.div 
              className="mt-4 flex space-x-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 bg-green-500 rounded-full"
                  animate={{
                    y: [0, -10, 0],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: i * 0.2
                  }}
                />
              ))}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen; 