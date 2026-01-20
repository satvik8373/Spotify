import { useEffect, useRef } from 'react';
import {
  isIOS,
  isPWA,
  initAudioContext,
  unlockAudioOnIOS,
  configureAudioForIOS,
  playAudioForIOS
} from '@/utils/iosAudioFix';

/**
 * Hook to handle iOS audio playback issues
 * Automatically initializes audio context and handles user interaction requirements
 */
export const useIOSAudio = (audioElement: HTMLAudioElement | null) => {
  const isUnlocked = useRef(false);
  const isIOSDevice = isIOS();
  const isPWAMode = isPWA();

  useEffect(() => {
    if (!isIOSDevice) return;

    // Initialize audio context
    initAudioContext();

    // Unlock audio on first user interaction
    const unlockAudio = () => {
      if (!isUnlocked.current) {
        unlockAudioOnIOS();
        isUnlocked.current = true;
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
  }, [isIOSDevice]);

  useEffect(() => {
    if (!audioElement || !isIOSDevice) return;

    // Configure audio element for iOS background playback
    configureAudioForIOS(audioElement);

    // Note: We do NOT pause audio on visibility change
    // The configureAudioForIOS function handles background playback

    return () => {
      // Cleanup
    };
  }, [audioElement, isIOSDevice]);

  // Return helper function to play audio with iOS handling
  const playWithIOSFix = async () => {
    if (!audioElement) return;

    try {
      if (isIOSDevice) {
        await playAudioForIOS(audioElement);
      } else {
        await audioElement.play();
      }
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
