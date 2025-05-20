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
    const animationDuration = hasCachedAuth ? 500 : 1200;
    
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
          className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50"
        >
          <div className="flex flex-col items-center justify-center">
            {/* Music wave animation */}
            <motion.div 
              className="w-40 h-16 mb-6 flex items-end justify-center space-x-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className={`w-2 bg-green-500 rounded-t-sm ${i === 2 ? 'h-12' : 'h-8'}`}
                  animate={{
                    height: i % 2 === 0 ? ['2rem', '3rem', '2rem'] : ['3rem', '1.5rem', '3rem'],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.1
                  }}
                />
              ))}
            </motion.div>
            
            {/* Brand name with simpler animation */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="mb-8 relative"
            >
              <h1 className="text-5xl font-bold text-white">
                mavrixfy
                <span className="text-green-500">.</span>
              </h1>
              <motion.div 
                className="absolute -bottom-1 left-0 h-0.5 bg-green-500"
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 0.5, delay: 0.3 }}
              />
            </motion.div>
            
            {/* Simple loading indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.4 }}
              className="flex items-center space-x-1.5"
            >
              <motion.div 
                className="w-1.5 h-1.5 rounded-full bg-zinc-400" 
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
              />
              <motion.div 
                className="w-1.5 h-1.5 rounded-full bg-zinc-400" 
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
              />
              <motion.div 
                className="w-1.5 h-1.5 rounded-full bg-zinc-400" 
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: 0.8 }}
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen; 