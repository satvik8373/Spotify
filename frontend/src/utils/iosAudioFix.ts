/**
 * iOS Audio Playback Fixes
 * Handles iOS-specific audio restrictions and issues
 */

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

// Initialize audio context for iOS (lazy - only when needed)
let audioContext: AudioContext | null = null;
let hasUserInteracted = false;

export const initAudioContext = (): void => {
  // Don't create AudioContext immediately - wait for user interaction
  // This prevents autoplay warnings
};

/**
 * Get or create audio context (lazy initialization)
 */
const getOrCreateAudioContext = (): AudioContext | null => {
  if (!isIOS()) return null;
  
  if (!audioContext && hasUserInteracted) {
    try {
      // @ts-ignore - AudioContext might not be in types
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioContext = new AudioContextClass();
    } catch (error) {
      // Silent error handling
    }
  }
  
  return audioContext;
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
    // Mark user interaction
    hasUserInteracted = true;
    
    // Get or create audio context
    const context = getOrCreateAudioContext();
    
    // Resume audio context if suspended
    if (context && context.state === 'suspended') {
      await context.resume();
    }
    
    // Attempt to play
    await audio.play();
  } catch (error: any) {
    // Handle specific iOS errors
    if (error.name === 'NotAllowedError') {
      throw new Error('USER_INTERACTION_REQUIRED');
    } else if (error.name === 'NotSupportedError') {
      throw new Error('FORMAT_NOT_SUPPORTED');
    } else {
      throw error;
    }
  }
};

// Unlock audio on iOS (call this on first user interaction)
export const unlockAudioOnIOS = (): void => {
  if (!isIOS()) return;
  
  // Mark user interaction
  hasUserInteracted = true;
  
  // Get or create audio context
  const context = getOrCreateAudioContext();
  
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

// Don't initialize on module load - wait for user interaction
// This prevents autoplay warnings