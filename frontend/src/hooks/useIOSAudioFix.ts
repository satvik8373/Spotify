import { useEffect, useRef } from 'react';

/**
 * Hook to handle iOS-specific audio playback issues
 * Addresses common iOS Safari audio problems in production
 */
export const useIOSAudioFix = (audioRef: React.RefObject<HTMLAudioElement>) => {
  const hasAppliedFix = useRef(false);

  useEffect(() => {
    // Only run on iOS devices
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (!isIOS || !audioRef.current || hasAppliedFix.current) return;

    const audio = audioRef.current;
    
    // Apply iOS-specific fixes
    const applyIOSFixes = () => {
      // CRITICAL: iOS requires these specific attributes
      audio.setAttribute('playsinline', 'true');
      audio.setAttribute('webkit-playsinline', 'true');
      audio.setAttribute('preload', 'metadata');
      
      // CRITICAL: iOS audio must not be muted and have volume > 0
      audio.muted = false;
      audio.volume = 1.0;
      
      // CRITICAL: Set proper audio session category for iOS
      if ('webkitAudioContext' in window) {
        try {
          const audioContext = new (window as any).webkitAudioContext();
          // Resume audio context on user interaction
          const resumeAudioContext = () => {
            if (audioContext.state === 'suspended') {
              audioContext.resume();
            }
          };
          
          // Add event listeners for user interaction
          document.addEventListener('touchstart', resumeAudioContext, { once: true });
          document.addEventListener('click', resumeAudioContext, { once: true });
        } catch (e) {
          console.warn('Failed to create iOS audio context:', e);
        }
      }
      
      hasAppliedFix.current = true;
    };

    // Apply fixes immediately
    applyIOSFixes();

    // Handle iOS audio interruptions (phone calls, etc.)
    const handleAudioInterruption = () => {
      // iOS may pause audio during interruptions
      // We'll handle this in the main audio component
    };

    // Handle iOS background/foreground transitions
    const handleVisibilityChange = () => {
      if (!document.hidden && audio.paused) {
        // App came back to foreground, audio might need to be resumed
        // But only if we were supposed to be playing
        const playerStore = (window as any).__playerStore;
        if (playerStore && playerStore.getState().isPlaying) {
          setTimeout(() => {
            audio.play().catch(() => {
              // Failed to resume, user might need to interact again
            });
          }, 100);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [audioRef]);

  return {
    isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream,
    hasAppliedFix: hasAppliedFix.current
  };
};