/**
 * Audio Manager - Centralized audio utilities for iOS and cross-platform compatibility
 */

let audioContext: AudioContext | null = null;
let hasUserInteracted = false;

/**
 * Check if running on iOS
 */
export const isIOS = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

/**
 * Check if running as PWA
 */
export const isPWA = (): boolean => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
};

/**
 * Initialize audio context for iOS
 */
export const initAudioContext = (): void => {
  if (!audioContext) {
    try {
      // @ts-ignore - AudioContext may need webkit prefix
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioContext = new AudioContextClass();
    } catch (error) {
      // Silent error handling
    }
  }
};

/**
 * Mark that user has interacted with the page
 */
export const markUserInteraction = (): void => {
  hasUserInteracted = true;
  
  // Resume audio context if suspended
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }
};

/**
 * Configure audio element for iOS compatibility
 */
export const configureAudioElement = (audio: HTMLAudioElement): void => {
  if (!isIOS()) return;
  
  // Set attributes for iOS compatibility
  audio.setAttribute('playsinline', 'true');
  audio.setAttribute('webkit-playsinline', 'true');
  audio.preload = 'metadata';
  
  // Enable inline playback
  (audio as any).playsInline = true;
  (audio as any).webkitPlaysInline = true;
  
  // Set crossOrigin for CORS
  audio.crossOrigin = 'anonymous';
  
  // Disable picture-in-picture
  (audio as any).disablePictureInPicture = true;
};

/**
 * Play audio safely with iOS handling
 */
export const playAudioSafely = async (audio: HTMLAudioElement): Promise<void> => {
  if (!hasUserInteracted && isIOS()) {
    throw new Error('USER_INTERACTION_REQUIRED');
  }
  
  // Ensure audio context is running
  if (audioContext && audioContext.state === 'suspended') {
    await audioContext.resume();
  }
  
  // Play the audio
  await audio.play();
};

/**
 * Get audio context instance
 */
export const getAudioContext = (): AudioContext | null => {
  return audioContext;
};

/**
 * Check if user has interacted
 */
export const hasUserInteraction = (): boolean => {
  return hasUserInteracted;
};
