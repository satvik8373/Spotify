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

// Initialize audio context for iOS (required for audio playback)
let audioContext: AudioContext | null = null;

export const initAudioContext = (): void => {
  if (isIOS() && !audioContext) {
    try {
      // @ts-ignore - AudioContext might not be in types
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioContext = new AudioContextClass();
      
      // Resume audio context on user interaction
      const resumeAudio = () => {
        if (audioContext && audioContext.state === 'suspended') {
          audioContext.resume();
        }
      };
      
      // Add listeners for user interaction
      document.addEventListener('touchstart', resumeAudio, { once: true });
      document.addEventListener('touchend', resumeAudio, { once: true });
      document.addEventListener('click', resumeAudio, { once: true });
    } catch (error) {
      console.warn('Failed to initialize AudioContext:', error);
    }
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
    if (audioContext && audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
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
  
  // Initialize audio context
  initAudioContext();
  
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

// Initialize on module load
if (typeof window !== 'undefined') {
  initAudioContext();
}

// ============================================================================
// BACKGROUND AUDIO MANAGEMENT - OLD WORKING VERSION
// ============================================================================

/**
 * Simple and reliable background audio manager with iOS-specific enhancements
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
   * Setup background playback event listeners with iOS-specific handling
   */
  private setupBackgroundPlayback(): void {
    if (!this.audio) return;

    console.log('🔧 Setting up background playback listeners');

    // iOS-specific pause prevention (more aggressive for iOS)
    this.audio.addEventListener('pause', () => {
      if (!this.audio || this.audio.ended || !this.audio.src || !this.isPlaying) return;

      // iOS requires more aggressive handling
      if (isIOS()) {
        // On iOS, prevent ALL system pauses when we should be playing
        if (this.isPlaying && !this.audio.seeking) {
          console.log('📱 iOS pause detected - aggressive resume');

          // Immediate resume for iOS
          setTimeout(() => {
            if (this.audio && this.audio.paused && !this.audio.ended && this.isPlaying) {
              this.audio.play().catch((error) => {
                console.warn('iOS resume failed:', error);
              });
            }
          }, 50); // Faster response for iOS

          // Backup resume for iOS
          setTimeout(() => {
            if (this.audio && this.audio.paused && !this.audio.ended && this.isPlaying) {
              this.audio.play().catch((error) => {
                console.warn('iOS backup resume failed:', error);
              });
            }
          }, 200);
        }
      } else {
        // Standard handling for other platforms
        if (document.hidden || document.visibilityState === 'hidden') {
          console.log('🚨 System pause detected while page hidden - resuming');

          setTimeout(() => {
            if (this.audio && this.audio.paused && !this.audio.ended && this.isPlaying) {
              this.audio.play().catch((error) => {
                console.warn('Failed to resume after system pause:', error);
              });
            }
          }, 100);
        }
      }
    });

    // Handle visibility changes with iOS-specific logic
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

    // iOS-specific page lifecycle handling
    this.pageHideHandler = () => {
      if (this.isPlaying) {
        console.log('🔄 Page hiding - maintaining playback');
        if (isIOS()) {
          // iOS needs immediate action on page hide
          this.maintainBackgroundPlayback();
          // Additional iOS-specific handling
          setTimeout(() => {
            if (this.audio && this.audio.paused && this.isPlaying) {
              this.audio.play().catch(() => { });
            }
          }, 100);
        } else {
          this.maintainBackgroundPlayback();
        }
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

    // iOS-specific event listeners
    if (isIOS()) {
      // Handle iOS app state changes
      window.addEventListener('focus', () => {
        if (this.isPlaying) {
          console.log('📱 iOS app focused - checking audio');
          setTimeout(() => this.ensurePlaybackContinues(), 100);
        }
      });

      window.addEventListener('blur', () => {
        if (this.isPlaying) {
          console.log('📱 iOS app blurred - maintaining audio');
          this.maintainBackgroundPlayback();
        }
      });

      // Handle iOS-specific audio interruptions
      document.addEventListener('webkitvisibilitychange', () => {
        if ((document as any).webkitHidden && this.isPlaying) {
          console.log('📱 iOS webkit visibility change - maintaining audio');
          this.maintainBackgroundPlayback();
        }
      });
    }
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
   * Start keep-alive mechanism to monitor playback with iOS-specific handling
   */
  private startKeepAlive(): void {
    if (this.keepAliveInterval) return;

    console.log('⏰ Starting keep-alive monitoring');

    // iOS needs more frequent monitoring
    const interval = isIOS() ? 3000 : 5000; // 3 seconds for iOS, 5 for others

    this.keepAliveInterval = setInterval(() => {
      if (this.isPlaying && this.audio) {
        // Check if audio is unexpectedly paused
        if (this.audio.paused && !this.audio.ended && this.audio.src) {
          console.log('🚨 Audio unexpectedly paused - attempting resume');

          if (isIOS()) {
            // iOS-specific aggressive resume
            console.log('📱 iOS aggressive resume attempt');
            this.audio.play().catch((error) => {
              console.warn('iOS keep-alive resume failed:', error);

              // Try again with a different approach for iOS
              setTimeout(() => {
                if (this.audio && this.audio.paused && !this.audio.ended && this.isPlaying) {
                  // Force reload and play for iOS if needed
                  const currentTime = this.audio.currentTime;
                  this.audio.load();
                  this.audio.currentTime = currentTime;
                  this.audio.play().catch(() => {
                    console.warn('iOS force reload resume also failed');
                  });
                }
              }, 500);
            });
          } else {
            // Standard resume for other platforms
            this.audio.play().catch((error) => {
              console.warn('Keep-alive resume failed:', error);
            });
          }
        }

        // Maintain wake lock (iOS doesn't support wake lock, but keep for other platforms)
        if (!this.wakeLock && !isIOS()) {
          this.requestWakeLock();
        }
      }
    }, interval);
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
   * Setup MediaSession for lock screen controls with iOS-specific enhancements
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

      // iOS-enhanced action handlers
      navigator.mediaSession.setActionHandler('play', () => {
        console.log('🎵 MediaSession play action');
        if (this.audio && this.audio.paused) {
          if (isIOS()) {
            // iOS-specific play handling
            console.log('📱 iOS MediaSession play');
            this.audio.play().then(() => {
              console.log('📱 iOS MediaSession play succeeded');
            }).catch((error) => {
              console.warn('📱 iOS MediaSession play failed:', error);
              // Try alternative approach for iOS
              setTimeout(() => {
                if (this.audio && this.audio.paused) {
                  this.audio.play().catch(() => { });
                }
              }, 100);
            });
          } else {
            this.audio.play().catch(() => { });
          }
        }
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        console.log('⏸️ MediaSession pause action');
        if (this.audio && !this.audio.paused) {
          if (isIOS()) {
            console.log('📱 iOS MediaSession pause');
          }
          this.audio.pause();
        }
      });

      // Seek forward handler (10 seconds default)
      try {
        navigator.mediaSession.setActionHandler('seekforward', (details) => {
          if (this.audio) {
            const seekOffset = details.seekOffset || 10;
            console.log('⏩ MediaSession seek forward:', seekOffset);
            this.audio.currentTime = Math.min(
              this.audio.currentTime + seekOffset,
              this.audio.duration
            );
          }
        });
      } catch (error) {
        console.log('Seek forward not supported');
      }

      // Seek backward handler (10 seconds default)
      try {
        navigator.mediaSession.setActionHandler('seekbackward', (details) => {
          if (this.audio) {
            const seekOffset = details.seekOffset || 10;
            console.log('⏪ MediaSession seek backward:', seekOffset);
            this.audio.currentTime = Math.max(
              this.audio.currentTime - seekOffset,
              0
            );
          }
        });
      } catch (error) {
        console.log('Seek backward not supported');
      }

      console.log('🎛️ MediaSession configured' + (isIOS() ? ' with iOS enhancements' : ''));
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

// Legacy exports for compatibility
export const markUserInteraction = unlockAudioOnIOS;
export const resumeAudioContext = initAudioContext;
export const configureAudioElement = configureAudioForIOS;
export const getAudioContext = () => audioContext;
export { isIOS as isAndroid }; // Keep for compatibility
