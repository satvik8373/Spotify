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
         (navigator.userAgent.includes('Mac') && 'ontouchend' in document);
};

/**
 * Check if running on Android
 */
export const isAndroid = (): boolean => {
  return /Android/.test(navigator.userAgent);
};

/**
 * Configure audio element for reliable cross-platform background playback
 */
export const configureAudioElement = (audio: HTMLAudioElement): void => {
  console.log('🔧 Configuring audio element for reliable background playback');
  
  // Essential attributes for all platforms
  audio.setAttribute('playsinline', 'true');
  audio.setAttribute('webkit-playsinline', 'true');
  audio.setAttribute('preload', 'metadata');
  audio.setAttribute('controlslist', 'nodownload');
  audio.setAttribute('disablePictureInPicture', 'true');
  audio.crossOrigin = 'anonymous';

  // iOS specific configuration
  if (isIOS()) {
    console.log('📱 Applying iOS-specific configuration');
    audio.setAttribute('x-webkit-airplay', 'allow');
    (audio as any).playsInline = true;
    (audio as any).webkitPlaysInline = true;
    
    try {
      (audio as any).preservesPitch = false;
      (audio as any).webkitPreservesPitch = false;
    } catch (error) {
      console.warn('iOS configuration failed:', error);
    }
  }

  // Android specific configuration
  if (isAndroid()) {
    console.log('🤖 Applying Android-specific configuration');
    try {
      (audio as any).mozPreservesPitch = false;
      (audio as any).webkitPreservesPitch = false;
    } catch (error) {
      console.warn('Android configuration failed:', error);
    }
  }

  // Simple event listeners for debugging
  audio.addEventListener('play', () => {
    console.log('▶️ Audio play event');
  });

  audio.addEventListener('playing', () => {
    console.log('🎵 Audio playing event');
  });

  audio.addEventListener('pause', () => {
    console.log('⏸️ Audio pause event');
  });

  audio.addEventListener('error', (e) => {
    console.error('❌ Audio error event:', e);
  });

  console.log('✅ Audio element configured for reliable background playback');
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
// BACKGROUND AUDIO MANAGEMENT
// ============================================================================

/**
 * Simple and reliable background audio manager
 * Focuses on core functionality that actually works across all platforms
 */
class SimpleBackgroundAudioManager {
  private audio: HTMLAudioElement | null = null;
  private isPlaying = false;
  private wakeLock: any = null;
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private visibilityChangeHandler: (() => void) | null = null;
  private pageHideHandler: (() => void) | null = null;
  private pageShowHandler: (() => void) | null = null;

  /**
   * Initialize with audio element
   */
  initialize(audioElement: HTMLAudioElement): void {
    console.log('🎵 Initializing Simple Background Audio Manager');
    this.audio = audioElement;
    this.setupBackgroundPlayback();
  }

  /**
   * Set playing state and manage background playback
   */
  setPlaying(playing: boolean): void {
    console.log(`🎛️ Setting playing state: ${playing}`);
    this.isPlaying = playing;
    
    // Update MediaSession playback state
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
    }
    
    if (playing) {
      this.enableBackgroundPlayback();
    } else {
      this.disableBackgroundPlayback();
    }
  }

  /**
   * Setup background playback event listeners
   */
  private setupBackgroundPlayback(): void {
    if (!this.audio) return;

    console.log('🔧 Setting up background playback listeners');

    // Simple pause prevention - only prevent system pauses
    this.audio.addEventListener('pause', () => {
      if (!this.audio || this.audio.ended || !this.audio.src || !this.isPlaying) return;
      
      // Only prevent pause if page is hidden (system pause) and we should be playing
      if (document.hidden || document.visibilityState === 'hidden') {
        console.log('🚨 System pause detected while page hidden - resuming');
        
        // Simple resume after short delay
        setTimeout(() => {
          if (this.audio && this.audio.paused && !this.audio.ended && this.isPlaying) {
            this.audio.play().catch((error) => {
              console.warn('Failed to resume after system pause:', error);
            });
          }
        }, 100);
      }
    });

    // Handle visibility changes
    this.visibilityChangeHandler = () => {
      if (document.hidden && this.isPlaying) {
        console.log('📱 Page hidden - maintaining background playback');
        this.maintainBackgroundPlayback();
      } else if (!document.hidden && this.isPlaying) {
        console.log('📱 Page visible - ensuring playback continues');
        this.ensurePlaybackContinues();
      }
    };
    document.addEventListener('visibilitychange', this.visibilityChangeHandler);

    // Handle page lifecycle for better mobile support
    this.pageHideHandler = () => {
      if (this.isPlaying) {
        console.log('🔄 Page hiding - maintaining playback');
        this.maintainBackgroundPlayback();
      }
    };
    window.addEventListener('pagehide', this.pageHideHandler);

    this.pageShowHandler = () => {
      if (this.isPlaying) {
        console.log('🔄 Page showing - ensuring playback');
        this.ensurePlaybackContinues();
      }
    };
    window.addEventListener('pageshow', this.pageShowHandler);
  }

  /**
   * Enable background playback features
   */
  private enableBackgroundPlayback(): void {
    console.log('🚀 Enabling background playback');
    this.requestWakeLock();
    this.startKeepAlive();
  }

  /**
   * Disable background playback features
   */
  private disableBackgroundPlayback(): void {
    console.log('🛑 Disabling background playback');
    this.releaseWakeLock();
    this.stopKeepAlive();
  }

  /**
   * Maintain background playback when page goes hidden
   */
  private maintainBackgroundPlayback(): void {
    if (!this.audio || !this.isPlaying) return;

    console.log('🔥 Maintaining background playback');

    // Ensure audio is playing
    if (this.audio.paused && !this.audio.ended && this.audio.src) {
      this.audio.play().catch((error) => {
        console.warn('Failed to maintain background playback:', error);
      });
    }

    // Request wake lock if not already active
    if (!this.wakeLock) {
      this.requestWakeLock();
    }
  }

  /**
   * Ensure playback continues when page becomes visible
   */
  private ensurePlaybackContinues(): void {
    if (!this.audio || !this.isPlaying) return;

    console.log('🔍 Ensuring playback continues');

    // Check if audio was paused and resume if needed
    if (this.audio.paused && !this.audio.ended && this.audio.src) {
      console.log('⚠️ Audio was paused - resuming');
      this.audio.play().catch((error) => {
        console.warn('Failed to resume playback:', error);
      });
    }
  }

  /**
   * Request wake lock to prevent screen from turning off
   */
  private async requestWakeLock(): Promise<void> {
    if (!('wakeLock' in navigator)) {
      console.log('⚠️ Wake Lock API not supported');
      return;
    }

    if (this.wakeLock) {
      console.log('🔒 Wake lock already active');
      return;
    }

    try {
      this.wakeLock = await (navigator as any).wakeLock.request('screen');
      console.log('🔒 Wake lock acquired');

      this.wakeLock.addEventListener('release', () => {
        console.log('🔓 Wake lock released');
        this.wakeLock = null;
        
        // Try to re-acquire if still playing
        if (this.isPlaying) {
          setTimeout(() => this.requestWakeLock(), 1000);
        }
      });
    } catch (error) {
      console.warn('Wake lock request failed:', error);
    }
  }

  /**
   * Release wake lock
   */
  private async releaseWakeLock(): Promise<void> {
    if (this.wakeLock) {
      try {
        await this.wakeLock.release();
        this.wakeLock = null;
        console.log('🔓 Wake lock released');
      } catch (error) {
        console.warn('Wake lock release failed:', error);
      }
    }
  }

  /**
   * Start keep-alive mechanism to monitor playback
   */
  private startKeepAlive(): void {
    if (this.keepAliveInterval) return;

    console.log('⏰ Starting keep-alive monitoring');

    this.keepAliveInterval = setInterval(() => {
      if (this.isPlaying && this.audio) {
        // Check if audio is unexpectedly paused
        if (this.audio.paused && !this.audio.ended && this.audio.src) {
          console.log('🚨 Audio unexpectedly paused - attempting resume');
          this.audio.play().catch((error) => {
            console.warn('Keep-alive resume failed:', error);
          });
        }

        // Maintain wake lock
        if (!this.wakeLock) {
          this.requestWakeLock();
        }

        // Simple status log
        if (Math.random() < 0.1) { // Log occasionally to avoid spam
          console.log('💓 Keep-alive check:', {
            playing: !this.audio.paused,
            currentTime: this.audio.currentTime.toFixed(1),
            wakeLock: !!this.wakeLock
          });
        }
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Stop keep-alive mechanism
   */
  private stopKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
      console.log('⏰ Stopped keep-alive monitoring');
    }
  }

  /**
   * Setup MediaSession for lock screen controls
   */
  setupMediaSession(metadata: {
    title: string;
    artist: string;
    album?: string;
    artwork?: string;
  }): void {
    if (!('mediaSession' in navigator)) {
      console.log('⚠️ MediaSession API not supported');
      return;
    }

    try {
      // Set metadata for lock screen controls
      navigator.mediaSession.metadata = new MediaMetadata({
        title: metadata.title,
        artist: metadata.artist,
        album: metadata.album || 'Unknown Album',
        artwork: metadata.artwork ? [{
          src: metadata.artwork,
          sizes: '512x512',
          type: 'image/jpeg'
        }] : []
      });

      // Set playback state
      navigator.mediaSession.playbackState = this.isPlaying ? 'playing' : 'paused';

      // Simple action handlers
      navigator.mediaSession.setActionHandler('play', () => {
        console.log('🎵 MediaSession play action');
        if (this.audio && this.audio.paused) {
          this.audio.play().catch(() => {});
        }
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        console.log('⏸️ MediaSession pause action');
        if (this.audio && !this.audio.paused) {
          this.audio.pause();
        }
      });

      console.log('🎛️ MediaSession configured');
    } catch (error) {
      console.warn('MediaSession setup failed:', error);
    }
  }

  /**
   * Cleanup all resources
   */
  cleanup(): void {
    console.log('🧹 Cleaning up background audio manager');
    
    this.disableBackgroundPlayback();
    
    // Remove event listeners
    if (this.visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
      this.visibilityChangeHandler = null;
    }
    
    if (this.pageHideHandler) {
      window.removeEventListener('pagehide', this.pageHideHandler);
      this.pageHideHandler = null;
    }
    
    if (this.pageShowHandler) {
      window.removeEventListener('pageshow', this.pageShowHandler);
      this.pageShowHandler = null;
    }
    
    this.audio = null;
    this.isPlaying = false;
  }
}

// Export singleton instance
export const backgroundAudioManager = new SimpleBackgroundAudioManager();

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
    // Page visibility change - but don't pause for background playback
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Don't interrupt audio for background playback
        // Only handle actual interruptions like phone calls
        console.log('Page hidden - continuing background playback');
      } else if (this.isInterrupted) {
        setTimeout(() => this.handleResume(), 500);
      }
    });

    // Focus/blur events for better background handling
    window.addEventListener('blur', () => {
      // Don't pause on window blur - allow background playback
      console.log('Window blurred - continuing background playback');
    });

    window.addEventListener('focus', () => {
      if (this.isInterrupted) {
        setTimeout(() => this.handleResume(), 300);
      }
    });

    // Handle actual audio interruptions (phone calls, etc.)
    this.setupAudioInterruptionHandling();
    
    // Bluetooth device monitoring
    this.setupBluetoothMonitoring();
  }

  private setupAudioInterruptionHandling(): void {
    // Listen for actual audio interruptions
    if ('mediaSession' in navigator) {
      // Handle media session interruptions
      try {
        navigator.mediaSession.setActionHandler('pause', () => {
          this.handleInterruption('system');
        });
      } catch (error) {
        console.warn('MediaSession interruption handling failed:', error);
      }
    }

    // Handle audio context state changes
    const handleAudioContextStateChange = () => {
      const context = getAudioContext();
      if (context && context.state === 'interrupted') {
        this.handleInterruption('call');
      } else if (context && context.state === 'running' && this.isInterrupted) {
        setTimeout(() => this.handleResume(), 300);
      }
    };

    if (globalAudioContext) {
      globalAudioContext.addEventListener('statechange', handleAudioContextStateChange);
    }
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