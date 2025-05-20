import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [isAnimating, setIsAnimating] = useState(true);
  
  // Check for cached authentication to determine splash screen duration
  const hasCachedAuth = Boolean(
    localStorage.getItem('auth-store') && 
    JSON.parse(localStorage.getItem('auth-store') || '{}').isAuthenticated
  );
  
  // Handle animation completion
  const handleAnimationComplete = useCallback(() => {
    setIsAnimating(false);
    // Call onComplete after fade out
    setTimeout(onComplete, 150);
  }, [onComplete]);
  
  // Start exit animation based on authentication status
  useEffect(() => {
    // Shorter display time for authenticated users
    const animationDuration = hasCachedAuth ? 600 : 1400;
    
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
          className="fixed inset-0 bg-gradient-to-b from-black to-zinc-900 flex flex-col items-center justify-center z-50"
        >
          <div className="flex flex-col items-center justify-center relative">
            {/* Circular glow effect */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.6, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="absolute w-52 h-52 rounded-full bg-gradient-to-r from-green-500/30 to-blue-500/30 blur-2xl"
            />
            
            {/* Logo and brand name container */}
            <motion.div
              className="flex flex-col items-center relative z-10"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {/* Modern music wave icon */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="mb-4"
              >
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M32 0C14.36 0 0 14.36 0 32s14.36 32 32 32 32-14.36 32-32S49.64 0 32 0z" fill="#000"/>
                  <path d="M32 4C16.56 4 4 16.56 4 32s12.56 28 28 28 28-12.56 28-28S47.44 4 32 4z" fill="#111"/>
                  <motion.path 
                    d="M45.39 46.24c-.64.96-1.76 1.28-2.72.64-7.52-4.64-16.96-5.6-28.16-3.04-1.11.33-2.08-.48-2.4-1.44-.32-1.12.48-2.08 1.44-2.4 12.16-2.72 22.72-1.6 31.04 3.52 1.12.48 1.28 1.76.8 2.72zM49.23 37.44c-.8 1.12-2.24 1.6-3.36.8-8.64-5.28-21.76-6.88-31.84-3.68-1.28.32-2.72-.32-3.04-1.6-.32-1.28.32-2.72 1.6-3.04 11.6-3.52 26-1.92 36.32 4.16.96.48 1.44 2.08.32 3.36zM49.55 28.48c-10.4-6.16-27.52-6.72-37.44-3.72-1.6.48-3.2-.48-3.68-1.92-.48-1.6.48-3.2 1.92-3.68 11.36-3.36 30.08-2.72 41.92 4.32 1.44.8 1.92 2.72 1.12 4.16-.8 1.12-2.72 1.6-3.84.84z" 
                    fill="#1DB954"
                    animate={{ 
                      opacity: [0.7, 1, 0.7],
                      scale: [0.98, 1.02, 0.98]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                </svg>
              </motion.div>
              
              {/* Brand name with gradient animation */}
              <motion.h1
                className="text-4xl font-bold tracking-tighter"
                style={{ 
                  textShadow: '0 0 15px rgba(29, 185, 84, 0.3)'
                }}
              >
                <motion.span
                  className="bg-gradient-to-r from-green-400 via-blue-500 to-green-400 bg-clip-text text-transparent"
                  style={{ 
                    backgroundSize: '200% 100%'
                  }}
                  animate={{
                    backgroundPosition: ['0% center', '100% center', '0% center']
                  }}
                  transition={{
                    duration: 2,
                    ease: "easeInOut"
                  }}
                >
                  Mavrixfy
                </motion.span>
              </motion.h1>
              
              {/* Tagline with staggered reveal */}
              <motion.p
                className="text-zinc-400 text-sm mt-2 tracking-wide"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Your premium music experience
              </motion.p>
            </motion.div>
            
            {/* Minimal loading indicator */}
            <motion.div
              className="mt-8 relative"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <motion.div 
                className="w-16 h-1 bg-zinc-800 rounded-full overflow-hidden"
              >
                <motion.div 
                  className="h-full bg-gradient-to-r from-green-500 to-blue-500"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ 
                    duration: hasCachedAuth ? 0.5 : 1.2,
                    ease: "easeInOut"
                  }}
                />
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen; 