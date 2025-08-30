import { useState, useEffect } from 'react';

interface PWAModeState {
  isPWA: boolean;
  isStandalone: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  canInstall: boolean;
}

export const usePWAMode = (): PWAModeState => {
  const [pwaState, setPwaState] = useState<PWAModeState>({
    isPWA: false,
    isStandalone: false,
    isIOS: false,
    isAndroid: false,
    canInstall: false,
  });

  useEffect(() => {
    const detectPWAMode = () => {
      // Check if running in standalone mode (PWA)
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      
      // Detect platform
      const userAgent = navigator.userAgent || navigator.vendor;
      const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
      const isAndroid = /android/i.test(userAgent);
      
      // Check if PWA can be installed
      const canInstall = 'serviceWorker' in navigator && 'PushManager' in window;
      
      // Determine if this is a PWA
      const isPWA = isStandalone || (canInstall && (isIOS || isAndroid));
      
      setPwaState({
        isPWA,
        isStandalone,
        isIOS,
        isAndroid,
        canInstall,
      });
    };

    detectPWAMode();
    
    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = () => detectPWAMode();
    
    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return pwaState;
};
