import { useCallback, useRef, useEffect } from 'react';

interface UseMobileTapSimpleOptions {
  onTap: () => void;
  tapDelay?: number;
}

export function useMobileTapSimple({
  onTap,
  tapDelay = 50 // Reduced from 150ms to 50ms for faster response
}: UseMobileTapSimpleOptions) {
  const isMobile = useRef(false);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Detect if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      isMobile.current = window.innerWidth < 768 || 
        ('ontouchstart' in window) || 
        (navigator.maxTouchPoints > 0);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
      }
    };
  }, []);

  const handleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    
    // Clear any existing timeout
    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
    }

    // For mobile, execute immediately for better responsiveness
    if (isMobile.current) {
      onTap();
    } else {
      // Add a small delay for desktop to prevent accidental double clicks
      tapTimeoutRef.current = setTimeout(() => {
        onTap();
      }, tapDelay);
    }
  }, [onTap, tapDelay]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Prevent default to avoid 300ms click delay on mobile
    if (isMobile.current) {
      e.preventDefault();
    }
  }, []);

  return {
    isMobile: isMobile.current,
    handleTap,
    handleTouchStart
  };
}