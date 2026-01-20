import { useEffect, useMemo, useRef, useState } from 'react';
import { 
  isIOS, 
  initAudioContext, 
  markUserInteraction,
  configureAudioElement,
  playAudioSafely
} from '@/utils/audioManager';

/**
 * Hook to handle iOS audio playback issues
 * Automatically initializes audio context and handles user interaction requirements
 */
export const useIOSAudio = (audioElement: HTMLAudioElement | null) => {
  const isUnlocked = useRef(false);
  // Avoid any runtime crashes during render (e.g. missing window/matchMedia)
  const isIOSDevice = useMemo(() => {
    try {
      return typeof window !== 'undefined' && typeof document !== 'undefined' ? isIOS() : false;
    } catch {
      return false;
    }
  }, []);

  const [isPWAMode, setIsPWAMode] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const mql = window.matchMedia?.('(display-mode: standalone)');
      setIsPWAMode(!!mql?.matches);
    } catch {
      setIsPWAMode(false);
    }
  }, []);

  useEffect(() => {
    if (!isIOSDevice) return;

    // Initialize audio context
    initAudioContext();

    // Unlock audio on first user interaction
    const unlockAudio = () => {
      if (!isUnlocked.current) {
        markUserInteraction();
        isUnlocked.current = true;
        
        // Basic iOS audio setup
        if (audioElement) {
          try {
            audioElement.setAttribute('x-webkit-airplay', 'allow');
          } catch (error) {
            console.warn('iOS audio setup failed:', error);
          }
        }
      }
    };

    // Listen for user interactions
    const events = ['touchstart', 'touchend', 'click', 'keydown'];
    events.forEach(event => {
      document.addEventListener(event, unlockAudio, { once: true, passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, unlockAudio);
      });
    };
  }, [isIOSDevice, audioElement]);

  // Handle iOS PWA state changes
  useEffect(() => {
    if (!isIOSDevice || !isPWAMode || !audioElement) return;

    const handleAppStateChange = () => {
      // Basic state change handling
      if (document.hidden) {
        console.log('iOS PWA backgrounded');
      }
    };

    document.addEventListener('visibilitychange', handleAppStateChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleAppStateChange);
    };
  }, [isIOSDevice, isPWAMode, audioElement]);

  useEffect(() => {
    if (!audioElement || !isIOSDevice) return;

    // Configure audio element for iOS
    configureAudioElement(audioElement);
    // Do NOT pause audio automatically when the document becomes hidden.
    // Background playback (lock screen / PWA) relies on the audio continuing
    // while the page is in the background, so we avoid any visibility-based
    // interruption logic here. Actual interruptions (calls, system audio)
    // are handled by the background audio manager and MediaSession.
  }, [audioElement, isIOSDevice]);

  // Return helper function to play audio with iOS handling
  const playWithIOSFix = async () => {
    if (!audioElement) return;

    try {
      await playAudioSafely(audioElement);
    } catch (error: any) {
      if (error.message === 'USER_INTERACTION_REQUIRED') {
        console.warn('User interaction required to play audio');
        // You can show a UI prompt here
      } else {
        console.error('Failed to play audio:', error);
      }
      throw error;
    }
  };

  return {
    isIOSDevice,
    isPWAMode,
    isUnlocked: isUnlocked.current,
    playWithIOSFix
  };
};
