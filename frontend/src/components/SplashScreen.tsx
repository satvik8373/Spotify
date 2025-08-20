import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  // Show splash briefly (professional, minimal)
  useEffect(() => {
    const timer = setTimeout(onComplete, 700);
    return () => clearTimeout(timer);
  }, [onComplete]);

  // Prefer lightweight SVG to reduce LCP; fallback to small PNG
  const primaryIcon = '/spotify-icons/spotify-logo-green.svg';
  const fallbackIcon = '/spotify-icons/spotify-icon-192.png';

  return (
    <AnimatePresence>
      <motion.div
        key="splash"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 bg-black flex items-center justify-center z-50"
      >
        {/* Subtle glow */}
        <div className="absolute w-40 h-40 bg-green-500/10 blur-3xl rounded-full" />

        {/* Logo + wordmark */}
        <div className="relative z-10 flex flex-col items-center">
          <motion.img
            src={primaryIcon}
            alt="App Icon"
            className="h-14 w-14 rounded-xl shadow-[0_0_30px_rgba(29,185,84,0.25)]"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallbackIcon; }}
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            loading="eager"
            decoding="async"
            width={56}
            height={56}
          />
          <motion.div
            className="mt-2 text-xl font-semibold tracking-tight text-white"
            initial={{ y: 6, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.12, duration: 0.25 }}
          >
            Mavrixfy
          </motion.div>
          <motion.div
            className="mt-1 h-px w-16 bg-gradient-to-r from-transparent via-green-500/60 to-transparent"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.18, duration: 0.25 }}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SplashScreen;