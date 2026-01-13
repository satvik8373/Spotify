import { useEffect, useRef } from 'react';

interface SplashScreenProps {
  onComplete?: () => void; // Made optional since we control timing externally
}

const SplashScreen = ({}: SplashScreenProps) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Cleanup
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
      <div className="relative w-32 h-32 md:w-40 md:h-40 animate-pulse transform transition-transform duration-1000 ease-out scale-100">
        {/* Static logo only */}
        <img
          src="/mavrixfy.png"
          alt="Mavrixfy"
          className="absolute inset-0 w-full h-full object-contain opacity-100"
          role="img"
          aria-label="Mavrixfy logo"
        />
      </div>
    </div>
  );
};

export default SplashScreen;
