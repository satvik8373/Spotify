import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  // Always complete in 1 second regardless of auth state
  useEffect(() => {
    const timer = setTimeout(onComplete, 1000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        className="fixed inset-0 bg-gradient-to-b from-zinc-950 to-black flex items-center justify-center z-50"
        key="splash-screen"
        >
        {/* Background grid lines for modern tech look */}
        <motion.div 
          className="absolute inset-0 opacity-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.05 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-full h-full" 
               style={{ 
                 backgroundImage: 'linear-gradient(to right, #1DB954 1px, transparent 1px), linear-gradient(to bottom, #1DB954 1px, transparent 1px)',
                 backgroundSize: '40px 40px' 
               }} 
          />
        </motion.div>
        
        {/* Main content */}
        <div 
          id="splash-content"
          className="relative transition-all duration-300 ease-out flex flex-col items-center z-10"
        >
          {/* Logo container with subtle reflection */}
            <motion.div
            className="relative mb-3"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            >
            {/* Soft glow effect */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-green-500/20 rounded-full blur-xl" />
              
            {/* Logo with mask reveal effect */}
                <svg 
              width="80" 
              height="80" 
                  viewBox="0 0 24 24" 
              className="drop-shadow-xl relative z-10"
            >
                  <defs>
                    <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#1DB954" />
                  <stop offset="70%" stopColor="#1ED760" />
                      <stop offset="100%" stopColor="#20e7c1" />
                    </linearGradient>
                
                <mask id="revealMask">
                  <motion.rect
                    x="0"
                    y="0"
                    width="24"
                    height="24"
                    fill="white"
                    initial={{ x: -24 }}
                    animate={{ x: 24 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                  />
                </mask>
                  </defs>
              
              <path 
                d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"
                fill="url(#logoGradient)"
                mask="url(#revealMask)"
                style={{ filter: 'drop-shadow(0 0 3px rgba(29, 185, 84, 0.5))' }}
              />
            </svg>
            
            {/* Circular pulse animation */}
            <motion.div 
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.1 }}
            >
                <motion.div
                className="absolute w-0 h-0 rounded-full border-2 border-green-500/30" 
                initial={{ width: 0, height: 0, opacity: 1 }}
                animate={{ width: 100, height: 100, opacity: 0 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                />
            </motion.div>
          </motion.div>
          
          {/* Brand name with modern typography */}
          <motion.div
            className="relative"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.4 }}
          >
            <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">
              Mavrixfy
            </h1>
            
            {/* Animated underline */}
            <motion.div 
              className="h-0.5 bg-gradient-to-r from-green-500/80 to-emerald-500/80 rounded-full mx-auto"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ delay: 0.4, duration: 0.3, ease: "easeOut" }}
            />
          </motion.div>
          
          {/* Tagline with fade in */}
          <motion.p
            className="mt-1.5 text-xs text-zinc-400 font-medium tracking-widest uppercase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            transition={{ delay: 0.5, duration: 0.3 }}
          >
            Premium Music Experience
          </motion.p>
          </div>
        </motion.div>
    </AnimatePresence>
  );
};

export default SplashScreen; 