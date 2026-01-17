/**
 * iOS Audio Playbook Fixes
 * Handles iOS-specific audio restrictions and issues
 */

import { markUserInteraction, getAudioContext, resumeAudioContext } from './audioContextManager';

// Check if running on iOS
export const isIOS = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

// Check if running as PWA
export const isPWA = (): boolean => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
};

// Initialize audio context for iOS (required for audio playback)
export const initAudioContext = (): void => {
  if (isIOS()) {
    // Use the centralized audio context manager
    markUserInteraction();
  }
};

// Configure audio element for iOS compatibility
export const configureAudioForIOS = (audio: HTMLAudioElement): void => {
  if (!isIOS()) return;
  
  // Set attributes for iOS compatibility
  audio.setAttribute('playsinline', 'true');
  audio.setAttribute('webkit-playsinline', 'true');
  audio.preload = 'metadata'; // Changed from 'auto' to reduce data usage
  
  // Enable inline playback (prevents fullscreen on iOS)
  (audio as any).playsInline = true;
  (audio as any).webkitPlaysInline = true;
  
  // Set crossOrigin for CORS
  audio.crossOrigin = 'anonymous';
  
  // Disable picture-in-picture
  (audio as any).disablePictureInPicture = true;
};

// Handle audio loading with iOS-specific fixes
export const loadAudioForIOS = async (
  audio: HTMLAudioElement, 
  url: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!url) {
      reject(new Error('No audio URL provided'));
      return;
    }
    
    // Configure audio element
    configureAudioForIOS(audio);
    
    // Set up event listeners
    const handleCanPlay = () => {
      cleanup();
      resolve();
    };
    
    const handleError = (e: Event) => {
      cleanup();
      reject(new Error('Failed to load audio'));
    };
    
    const cleanup = () => {
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };
    
    audio.addEventListener('canplay', handleCanPlay, { once: true });
    audio.addEventListener('error', handleError, { once: true });
    
    // Set source and load
    audio.src = url;
    audio.load();
    
    // Timeout after 10 seconds
    setTimeout(() => {
      cleanup();
      reject(new Error('Audio load timeout'));
    }, 10000);
  });
};

// Play audio with iOS-specific handling
export const playAudioForIOS = async (audio: HTMLAudioElement): Promise<void> => {
  if (!isIOS()) {
    return audio.play();
  }
  
  try {
    // Resume audio context if suspended
    await resumeAudioContext();
    
    // Attempt to play
    await audio.play();
  } catch (error: any) {
    // Handle specific iOS errors
    if (error.name === 'NotAllowedError') {
      console.warn('Playback blocked - user interaction required');
      throw new Error('USER_INTERACTION_REQUIRED');
    } else if (error.name === 'NotSupportedError') {
      console.warn('Audio format not supported');
      throw new Error('FORMAT_NOT_SUPPORTED');
    } else {
      console.warn('Playback failed:', error);
      throw error;
    }
  }
};

// Unlock audio on iOS (call this on first user interaction)
export const unlockAudioOnIOS = (): void => {
  if (!isIOS()) return;
  
  // Mark user interaction for audio context manager
  markUserInteraction();
  
  // Create a silent audio element and play it
  const silentAudio = new Audio();
  silentAudio.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADhAC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAA4T/////////////////////////////////////////////////';
  configureAudioForIOS(silentAudio);
  
  silentAudio.play()
    .then(() => {
      silentAudio.pause();
      silentAudio.remove();
    })
    .catch(() => {
      // Silent error - this is expected on first load
    });
};

// Fix for service worker interfering with audio
export const bypassServiceWorkerForAudio = (url: string): string => {
  if (!isIOS() || !isPWA()) return url;
  
  // Add cache-busting parameter to bypass service worker
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_t=${Date.now()}`;
};

// Initialize on module load - but don't create AudioContext immediately
if (typeof window !== 'undefined') {
  // Just setup the user interaction listeners, don't create AudioContext yet
  // The audioContextManager will handle this properly
}
