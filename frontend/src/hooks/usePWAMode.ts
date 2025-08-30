import { useState, useEffect } from 'react';

export const usePWAMode = () => {
  const [isPWA, setIsPWA] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if running in PWA mode
    const checkPWAMode = () => {
      // Check if running in standalone mode (PWA)
      const standalone = window.matchMedia('(display-mode: standalone)').matches;
      setIsStandalone(standalone);

      // Check if running in fullscreen mode
      const fullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
      
      // Check if running in minimal-ui mode
      const minimalUI = window.matchMedia('(display-mode: minimal-ui)').matches;
      
      // Check if running in browser mode
      const browser = window.matchMedia('(display-mode: browser)').matches;
      
      // Determine if we're in PWA mode
      const pwaMode = standalone || fullscreen || minimalUI || !browser;
      setIsPWA(pwaMode);

      // Check if running on iOS
      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
      setIsIOS(ios);

      // Log PWA status for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('PWA Mode Detection:', {
          standalone,
          fullscreen,
          minimalUI,
          browser,
          pwaMode,
          ios,
          userAgent: navigator.userAgent
        });
      }
    };

    // Check immediately
    checkPWAMode();

    // Listen for changes in display mode
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = () => checkPWAMode();
    
    mediaQuery.addEventListener('change', handleChange);

    // Also check on orientation change and resize
    window.addEventListener('orientationchange', checkPWAMode);
    window.addEventListener('resize', checkPWAMode);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
      window.removeEventListener('orientationchange', checkPWAMode);
      window.removeEventListener('resize', checkPWAMode);
    };
  }, []);

  return {
    isPWA,
    isStandalone,
    isIOS,
    // Helper to check if we should apply PWA-specific styles
    shouldApplyPWAStyles: isPWA || isStandalone
  };
};
