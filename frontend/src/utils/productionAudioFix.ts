/**
 * Production Audio Fixes
 * Handles production-specific audio issues including CORS, HTTPS, and browser compatibility
 */

/**
 * Initialize audio context for production environment
 * Only marks user interaction - doesn't create AudioContext immediately
 */
export const initProductionAudio = (): void => {
  if (typeof window === 'undefined') return;

  // Use the centralized audio context manager - just mark interaction
  import('./audioContextManager').then(({ markUserInteraction }) => {
    markUserInteraction();
  }).catch(() => {
    console.warn('Failed to import audioContextManager');
  });
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

// Removed unused loadAudioWithFallback function

/**
 * Play audio with production-specific error handling
 */
export const playAudioSafely = async (audio: HTMLAudioElement): Promise<void> => {
  try {
    // Resume audio context if suspended - import dynamically to avoid early creation
    const { resumeAudioContext } = await import('./audioContextManager');
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