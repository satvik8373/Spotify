/**
 * Audio Manager - Unified audio system for production
 * Consolidates all audio-related functionality into a single, professional module
 */

// ============================================================================
// AUDIO CONTEXT MANAGEMENT
// ============================================================================

let globalAudioContext: AudioContext | null = null;
let isAudioContextInitialized = false;
let userHasInteracted = false;

/**
 * Initialize AudioContext only after user interaction
 */
export const initAudioContext = (): void => {
  if (isAudioContextInitialized || typeof window === 'undefined') return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    globalAudioContext = new AudioContextClass();
    isAudioContextInitialized = true;

    if (globalAudioContext.state === 'suspended') {
      globalAudioContext.resume().catch(() => {
        console.warn('Failed to resume AudioContext');
      });
    }
  } catch (error) {
    console.warn('Failed to initialize AudioContext:', error);
  }
};

/**
 * Get the global AudioContext
 */
export const getAudioContext = (): AudioContext | null => {
  if (!userHasInteracted) {
    console.warn('AudioContext not available - user interaction required');
    return null;
  }

  if (!isAudioContextInitialized) {
    initAudioContext();
  }

  return globalAudioContext;
};

/**
 * Mark user interaction and initialize AudioContext
 */
export const markUserInteraction = (): void => {
  if (userHasInteracted) return;

  userHasInteracted = true;
  initAudioContext();
};

/**
 * Resume AudioContext if suspended
 */
export const resumeAudioContext = async (): Promise<void> => {
  const context = getAudioContext();
  if (context && context.state === 'suspended') {
    try {
      await context.resume();
    } catch (error) {
      console.warn('Failed to resume AudioContext:', error);
    }
  }
};

// ============================================================================
// AUDIO CONFIGURATION
// ============================================================================

/**
 * Check if running on iOS
 */
export const isIOS = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

/**
 * Check if running on Android
 */
export const isAndroid = (): boolean => {
  return /Android/.test(navigator.userAgent);
};

/**
 * Configure audio element for cross-platform compatibility
 */
export const configureAudioElement = (audio: HTMLAudioElement): void => {
  // Essential attributes for all platforms
  audio.setAttribute('playsinline', 'true');
  audio.setAttribute('webkit-playsinline', 'true');
  audio.setAttribute('preload', 'metadata');
  audio.setAttribute('controlslist', 'nodownload');
  audio.setAttribute('disablePictureInPicture', 'true');
  audio.crossOrigin = 'anonymous';

  // iOS specific configuration
  if (isIOS()) {
    audio.setAttribute('x-webkit-airplay', 'allow');
    (audio as any).playsInline = true;
    (audio as any).webkitPlaysInline = true;
  }

  // Android specific configuration
  if (isAndroid()) {
    audio.setAttribute('preload', 'none'); // Reduce data usage
  }
};

// ============================================================================
// AUDIO URL PROCESSING
// ============================================================================

/**
 * Fix CORS issues and convert URLs for production
 */
export const processAudioURL = (url: string): string => {
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
 * Validate if URL is valid
 */
export const isValidAudioURL = (url: string): boolean => {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// ============================================================================
// AUDIO PLAYBACK
// ============================================================================

/**
 * Play audio with proper error handling
 */
export const playAudioSafely = async (audio: HTMLAudioElement): Promise<void> => {
  try {
    await resumeAudioContext();
    const playPromise = audio.play();
    if (playPromise) {
      await playPromise;
    }
  } catch (error: any) {
    if (error.name === 'NotAllowedError') {
      throw new Error('USER_INTERACTION_REQUIRED');
    } else if (error.name === 'NotSupportedError') {
      throw new Error('FORMAT_NOT_SUPPORTED');
    } else if (error.name === 'AbortError') {
      // Retry once for AbortError
      setTimeout(() => {
        audio.play().catch(() => {});
      }, 300);
    } else {
      throw error;
    }
  }
};

/**
 * Load audio with fallback URLs
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
        if (currentUrlIndex < urls.length) {
          setTimeout(tryNextUrl, 500);
        } else {
          reject(new Error('Failed to load audio from all sources'));
        }
      };

      const cleanup = () => {
        audio.removeEventListener('canplay', handleCanPlay);
        audio.removeEventListener('error', handleError);
      };

      configureAudioElement(audio);
      audio.addEventListener('canplay', handleCanPlay, { once: true });
      audio.addEventListener('error', handleError, { once: true });

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

// ============================================================================
// INTERRUPTION HANDLING
// ============================================================================

export type InterruptionReason = 'call' | 'bluetooth' | 'system' | 'notification' | null;

export interface AudioInterruptionCallbacks {
  onInterrupted: (reason: InterruptionReason) => void;
  onResumed: () => void;
}

class AudioInterruptionManager {
  private callbacks: AudioInterruptionCallbacks | null = null;
  private isInterrupted = false;
  private interruptionReason: InterruptionReason = null;

  initialize(callbacks: AudioInterruptionCallbacks): void {
    this.callbacks = callbacks;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Visibility change detection
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.handleInterruption('system');
      } else if (this.isInterrupted) {
        setTimeout(() => this.handleResume(), 500);
      }
    });

    // Bluetooth device monitoring
    this.setupBluetoothMonitoring();
  }

  private setupBluetoothMonitoring(): void {
    if (!navigator.mediaDevices?.enumerateDevices) return;

    let previousDeviceCount = 0;

    const checkDeviceChanges = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioOutputs = devices.filter(d => d.kind === 'audiooutput');

        if (audioOutputs.length < previousDeviceCount) {
          this.handleInterruption('bluetooth');
        }

        previousDeviceCount = audioOutputs.length;
      } catch (error) {
        // Silent error handling
      }
    };

    setInterval(checkDeviceChanges, 3000);
    navigator.mediaDevices?.addEventListener?.('devicechange', checkDeviceChanges);
  }

  private handleInterruption(reason: InterruptionReason): void {
    if (this.isInterrupted) return;

    this.isInterrupted = true;
    this.interruptionReason = reason;

    if (this.callbacks?.onInterrupted) {
      this.callbacks.onInterrupted(reason);
    }
  }

  private handleResume(): void {
    if (!this.isInterrupted) return;

    this.isInterrupted = false;
    this.interruptionReason = null;

    if (this.callbacks?.onResumed) {
      this.callbacks.onResumed();
    }
  }

  getCurrentState(): { isInterrupted: boolean; reason: InterruptionReason } {
    return {
      isInterrupted: this.isInterrupted,
      reason: this.interruptionReason
    };
  }

  cleanup(): void {
    this.callbacks = null;
    this.isInterrupted = false;
    this.interruptionReason = null;
  }
}

export const audioInterruptionManager = new AudioInterruptionManager();

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the audio system
 */
export const initializeAudioSystem = (): void => {
  if (typeof window === 'undefined') return;

  const handleUserInteraction = () => {
    markUserInteraction();
    
    // Remove listeners after first interaction
    document.removeEventListener('touchstart', handleUserInteraction);
    document.removeEventListener('click', handleUserInteraction);
    document.removeEventListener('keydown', handleUserInteraction);
  };

  // Setup user interaction listeners
  document.addEventListener('touchstart', handleUserInteraction, { once: true, passive: true });
  document.addEventListener('click', handleUserInteraction, { once: true, passive: true });
  document.addEventListener('keydown', handleUserInteraction, { once: true, passive: true });
};

// Auto-initialize when module loads
if (typeof window !== 'undefined') {
  initializeAudioSystem();
}