/**
 * Audio Test Utilities
 * Helper functions to test audio playback in production environments
 */

import { fixAudioCORS, isAudioFormatSupported, configureProductionAudio } from './productionAudioFix';

/**
 * Test audio playback with a sample URL
 */
export const testAudioPlayback = async (testUrl?: string): Promise<boolean> => {
  const url = testUrl || 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';

  return new Promise((resolve) => {
    const audio = new Audio();
    
    // Configure for production
    configureProductionAudio(audio);
    
    // Process URL
    const processedUrl = fixAudioCORS(url);
    
    // Check format support
    if (!isAudioFormatSupported(processedUrl)) {
      console.warn('Audio format not supported');
      resolve(false);
      return;
    }

    const handleCanPlay = () => {
      cleanup();
      // Try to play
      audio.play()
        .then(() => {
          // Stop immediately after successful play
          audio.pause();
          audio.currentTime = 0;
          resolve(true);
        })
        .catch(() => {
          resolve(false);
        });
    };

    const handleError = () => {
      cleanup();
      resolve(false);
    };

    const cleanup = () => {
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };

    audio.addEventListener('canplay', handleCanPlay, { once: true });
    audio.addEventListener('error', handleError, { once: true });

    audio.src = processedUrl;
    audio.load();

    // Timeout after 5 seconds
    setTimeout(() => {
      cleanup();
      resolve(false);
    }, 5000);
  });
};

/**
 * Test CORS handling for audio URLs
 */
export const testAudioCORS = (url: string): { original: string; fixed: string; isValid: boolean } => {
  const fixed = fixAudioCORS(url);
  const isValid = fixed.startsWith('https://') || fixed.startsWith('data:') || fixed.startsWith('blob:');
  
  return {
    original: url,
    fixed,
    isValid
  };
};

/**
 * Get browser audio capabilities
 */
export const getBrowserAudioCapabilities = (): {
  formats: Record<string, boolean>;
  mediaSession: boolean;
  audioContext: boolean;
  wakeLock: boolean;
} => {
  const audio = document.createElement('audio');
  
  return {
    formats: {
      mp3: audio.canPlayType('audio/mpeg') !== '',
      m4a: audio.canPlayType('audio/mp4') !== '',
      aac: audio.canPlayType('audio/aac') !== '',
      ogg: audio.canPlayType('audio/ogg') !== '',
      wav: audio.canPlayType('audio/wav') !== '',
      flac: audio.canPlayType('audio/flac') !== '',
    },
    mediaSession: 'mediaSession' in navigator,
    audioContext: 'AudioContext' in window || 'webkitAudioContext' in window,
    wakeLock: 'wakeLock' in navigator,
  };
};

/**
 * Log audio debugging information
 */
export const logAudioDebugInfo = (): void => {
  const capabilities = getBrowserAudioCapabilities();
  
  console.group('🎵 Audio Debug Information');
  console.log('User Agent:', navigator.userAgent);
  console.log('Protocol:', window.location.protocol);
  console.log('Supported Formats:', capabilities.formats);
  console.log('Media Session API:', capabilities.mediaSession);
  console.log('Audio Context API:', capabilities.audioContext);
  console.log('Wake Lock API:', capabilities.wakeLock);
  console.groupEnd();
};