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
    const animationDuration = hasCachedAuth ? 600 : 1500;
    
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
          transition={{ duration: 0.15 }}
          className="fixed inset-0 bg-gradient-to-b from-zinc-900 to-black flex flex-col items-center justify-center z-50 overflow-hidden"
        >
          {/* Background animated elements */}
          <div className="absolute inset-0 overflow-hidden">
            {/* Music bars */}
            <div className="absolute inset-0 flex justify-evenly items-end opacity-10">
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1 bg-green-500 rounded-t-full"
                  initial={{ height: 0 }}
                  animate={{ 
                    height: [
                      Math.random() * 40 + 10, 
                      Math.random() * 120 + 40, 
                      Math.random() * 40 + 10
                    ] 
                  }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    repeatType: "reverse",
                    delay: i * 0.1,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </div>
            
            {/* Circular gradient backdrop */}
            <motion.div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-green-600/20 via-blue-600/10 to-purple-600/20"
              initial={{ width: 0, height: 0, opacity: 0 }}
              animate={{ width: '150vh', height: '150vh', opacity: 0.6 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>

          <div className="flex flex-col items-center justify-center z-10">
            {/* Logo container with glowing effect */}
            <motion.div
              className="relative mb-6"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ 
                duration: 0.5,
                ease: "easeOut"
              }}
            >
              {/* Glow effect */}
              <motion.div 
                className="absolute inset-0 bg-green-500 rounded-full blur-xl opacity-30"
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.2, 0.4, 0.2]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              
              {/* Logo mark */}
              <div className="relative bg-black p-4 rounded-full shadow-lg border border-zinc-800 flex items-center justify-center">
                <svg 
                  width="60" 
                  height="60" 
                  viewBox="0 0 24 24" 
                  className="drop-shadow"
                >
                  <motion.path 
                    d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"
                    fill="url(#logoGradient)"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ 
                      duration: 0.8,
                      ease: "easeInOut"
                    }}
                  />
                  <defs>
                    <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#1DB954" />
                      <stop offset="100%" stopColor="#20e7c1" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </motion.div>
            
            {/* Brand Name with animated background */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <motion.h1 
                className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-blue-400 to-green-400"
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
                Mavrixfy
              </motion.h1>
              
              {/* Animated underline */}
              <motion.div
                className="h-0.5 bg-gradient-to-r from-green-500 via-blue-500 to-green-500 rounded-full mx-auto mt-1"
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ delay: 0.4, duration: 0.6 }}
              />
            </motion.div>
            
            {/* Loading indicator with streamlined effect */}
            <motion.div 
              className="mt-8 flex space-x-1.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 bg-green-500 rounded-full"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: i * 0.15
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