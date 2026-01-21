/**
 * Audio Manager - Unified audio system with iOS background audio support
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
// PLATFORM DETECTION
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

// ============================================================================
// AUDIO ELEMENT CONFIGURATION
// ============================================================================

/**
 * Configure audio element for reliable cross-platform background playback
 * Special focus on iOS background audio requirements
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

  // iOS specific configuration - CRITICAL for background audio
  if (isIOS()) {
    console.log('📱 Applying iOS-specific background audio configuration');

    // Essential iOS attributes
    audio.setAttribute('x-webkit-airplay', 'allow');
    audio.setAttribute('webkit-playsinline', 'true');
    audio.setAttribute('playsinline', 'true');

    // iOS background audio properties
    try {
      (audio as any).playsInline = true;
      (audio as any).webkitPlaysInline = true;
      (audio as any).preservesPitch = false;
      (audio as any).webkitPreservesPitch = false;

      // Critical iOS background audio session properties
      (audio as any).webkitAudioContext = true;
      (audio as any).webkitAllowsAirPlay = true;

      // Set audio session category for background playback (iOS specific)
      if ('webkitAudioSession' in audio) {
        (audio as any).webkitAudioSession = 'playback';
      }

      console.log('✅ iOS background audio properties configured');
    } catch (error) {
      console.warn('iOS configuration failed:', error);
    }

    // iOS-specific event handling for background audio
    audio.addEventListener('webkitbeginfullscreen', () => {
      console.log('📱 iOS fullscreen begin - maintaining audio');
    });

    audio.addEventListener('webkitendfullscreen', () => {
      console.log('📱 iOS fullscreen end - ensuring audio continues');
    });

    // Handle iOS audio session interruptions
    audio.addEventListener('webkitaudiointerrupted', () => {
      console.log('📱 iOS audio interrupted');
    });

    audio.addEventListener('webkitaudioresumed', () => {
      console.log('📱 iOS audio resumed');
    });
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

  console.log('✅ Audio element configured for reliable background playback');
};

// ============================================================================
// BACKGROUND AUDIO MANAGEMENT
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
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.userAgent.includes('Mac') && 'ontouchend' in document);

      if (isIOS) {
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
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
          (navigator.userAgent.includes('Mac') && 'ontouchend' in document);
        
        if (isIOS) {
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
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.userAgent.includes('Mac') && 'ontouchend' in document);

    if (isIOS) {
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
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.userAgent.includes('Mac') && 'ontouchend' in document);
    const interval = isIOS ? 3000 : 5000; // 3 seconds for iOS, 5 for others

    this.keepAliveInterval = setInterval(() => {
      if (this.isPlaying && this.audio) {
        // Check if audio is unexpectedly paused
        if (this.audio.paused && !this.audio.ended && this.audio.src) {
          console.log('🚨 Audio unexpectedly paused - attempting resume');

          if (isIOS) {
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
        if (!this.wakeLock && !isIOS) {
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
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.userAgent.includes('Mac') && 'ontouchend' in document);

      navigator.mediaSession.setActionHandler('play', () => {
        console.log('🎵 MediaSession play action');
        if (this.audio && this.audio.paused) {
          if (isIOS) {
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
          if (isIOS) {
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

      console.log('🎛️ MediaSession configured' + (isIOS ? ' with iOS enhancements' : ''));
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
