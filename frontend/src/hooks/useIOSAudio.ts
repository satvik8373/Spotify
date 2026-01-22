import { useEffect, useRef } from 'react';
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
  const isIOSDevice = isIOS();
  const isPWAMode = window.matchMedia('(display-mode: standalone)').matches;

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
            // iOS audio setup failed
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
        // iOS PWA backgrounded
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

    // Handle audio interruptions (phone calls, etc.)
    const handleInterruption = () => {
      if (audioElement && !audioElement.paused) {
        audioElement.pause();
      }
    };

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        handleInterruption();
      }
    });

    return () => {
      // Cleanup
    };
  }, [audioElement, isIOSDevice]);

  // Return helper function to play audio with iOS handling
  const playWithIOSFix = async () => {
    if (!audioElement) return;

    try {
      await playAudioSafely(audioElement);
    } catch (error: any) {
      if (error.message === 'USER_INTERACTION_REQUIRED') {
        // You can show a UI prompt here
      } else {
        // Failed to play audio
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
