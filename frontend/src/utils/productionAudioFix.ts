/**
 * Production Audio Fixes
 * Handles production-specific audio issues including CORS, HTTPS, and browser compatibility
 */

import { markUserInteraction, getAudioContext, resumeAudioContext } from './audioContextManager';

/**
 * Initialize audio context for production environment
 * Only creates AudioContext after user interaction to comply with autoplay policy
 */
export const initProductionAudio = (): void => {
  if (typeof window === 'undefined') return;

  // Use the centralized audio context manager
  markUserInteraction();
};
    
    // Remove listeners after first interaction
    document.removeEventListener('touchstart', handleUserInteraction);
    document.removeEventListener('touchend', handleUserInteraction);
    document.removeEventListener('click', handleUserInteraction);
    document.removeEventListener('keydown', handleUserInteraction);
  };

  // Add listeners for user interaction (required for autoplay policy)
  document.addEventListener('touchstart', handleUserInteraction, { once: true, passive: true });
  document.addEventListener('touchend', handleUserInteraction, { once: true, passive: true });
  document.addEventListener('click', handleUserInteraction, { once: true, passive: true });
  document.addEventListener('keydown', handleUserInteraction, { once: true, passive: true });
};

/**
 * Configure audio element for production compatibility
 */
export const configureProductionAudio = (audio: HTMLAudioElement): void => {
  // Essential attributes for production
  audio.setAttribute('playsinline', 'true');
  audio.setAttribute('webkit-playsinline', 'true');
  audio.setAttribute('preload', 'metadata');
  audio.setAttribute('controlslist', 'nodownload');
  audio.setAttribute('disablePictureInPicture', 'true');
  audio.crossOrigin = 'anonymous';

  // iOS specific fixes
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
    audio.setAttribute('x-webkit-airplay', 'allow');
    (audio as any).playsInline = true;
    (audio as any).webkitPlaysInline = true;
  }

  // Android specific fixes
  if (/Android/.test(navigator.userAgent)) {
    audio.setAttribute('preload', 'none'); // Reduce data usage on mobile
  }
};

/**
 * Handle audio loading with production-specific error recovery
 */
export const loadAudioWithFallback = async (
  audio: HTMLAudioElement,
  url: string,
  fallbackUrls: string[] = []
): Promise<void> => {
  return new Promise((resolve, reject) => {
    let currentUrlIndex = 0;
    const urls = [url, ...fallbackUrls].filter(Boolean);

    const tryNextUrl = () => {
      if (currentUrlIndex >= urls.length) {
        reject(new Error('All audio URLs failed to load'));
        return;
      }

      const currentUrl = urls[currentUrlIndex];
      currentUrlIndex++;

      const handleCanPlay = () => {
        cleanup();
        resolve();
      };

      const handleError = () => {
        cleanup();
        // Try next URL or reject if no more URLs
        if (currentUrlIndex < urls.length) {
          setTimeout(tryNextUrl, 500); // Small delay before trying next URL
        } else {
          reject(new Error(`Failed to load audio from all sources`));
        }
      };

      const cleanup = () => {
        audio.removeEventListener('canplay', handleCanPlay);
        audio.removeEventListener('error', handleError);
      };

      // Configure audio for production
      configureProductionAudio(audio);

      // Set up event listeners
      audio.addEventListener('canplay', handleCanPlay, { once: true });
      audio.addEventListener('error', handleError, { once: true });

      // Set source and load
      audio.src = currentUrl;
      audio.load();
    };

    tryNextUrl();

    // Timeout after 15 seconds
    setTimeout(() => {
      reject(new Error('Audio load timeout'));
    }, 15000);
  });
};

/**
 * Play audio with production-specific error handling
 */
export const playAudioSafely = async (audio: HTMLAudioElement): Promise<void> => {
  try {
    // Resume audio context if suspended
    await resumeAudioContext();

    // Attempt to play
    const playPromise = audio.play();
    if (playPromise) {
      await playPromise;
    }
  } catch (error: any) {
    // Handle specific production errors
    if (error.name === 'NotAllowedError') {
      throw new Error('USER_INTERACTION_REQUIRED');
    } else if (error.name === 'NotSupportedError') {
      throw new Error('FORMAT_NOT_SUPPORTED');
    } else if (error.name === 'AbortError') {
      // Retry once for AbortError
      setTimeout(() => {
        audio.play().catch(() => {
          // Silent error on retry failure
        });
      }, 300);
    } else {
      throw error;
    }
  }
};

/**
 * Fix CORS issues for audio URLs
 */
export const fixAudioCORS = (url: string): string => {
  if (!url) return url;

  // Convert HTTP to HTTPS for production
  if (url.startsWith('http://')) {
    url = url.replace('http://', 'https://');
  }

  // Add cache-busting for problematic domains
  if (url.includes('saavncdn.com') || url.includes('jiosaavn.com')) {
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}_cb=${Date.now()}`;
  }

  return url;
};

/**
 * Check if audio format is supported in current browser
 */
export const isAudioFormatSupported = (url: string): boolean => {
  if (!url) return false;

  const audio = document.createElement('audio');
  const extension = url.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'mp3':
      return audio.canPlayType('audio/mpeg') !== '';
    case 'm4a':
    case 'aac':
      return audio.canPlayType('audio/mp4') !== '';
    case 'ogg':
      return audio.canPlayType('audio/ogg') !== '';
    case 'wav':
      return audio.canPlayType('audio/wav') !== '';
    case 'flac':
      return audio.canPlayType('audio/flac') !== '';
    default:
      return true; // Assume supported if unknown
  }
};

/**
 * Get preferred audio format for current browser
 */
export const getPreferredAudioFormat = (): string => {
  const audio = document.createElement('audio');

  // Check support in order of preference
  if (audio.canPlayType('audio/mpeg')) return 'mp3';
  if (audio.canPlayType('audio/mp4')) return 'm4a';
  if (audio.canPlayType('audio/ogg')) return 'ogg';
  if (audio.canPlayType('audio/wav')) return 'wav';

  return 'mp3'; // Default fallback
};

// Initialize on module load - but don't create AudioContext immediately
if (typeof window !== 'undefined') {
  // Just setup the user interaction listeners, don't create AudioContext yet
  // The audioContextManager will handle this properly
}