/**
 * iOS Background Audio Manager - Research-based solution
 * Based on iOS Safari and PWA background audio requirements
 */

/**
 * iOS Background Audio Manager specifically designed for iOS Safari and PWA
 * Uses Web Audio API and iOS-specific techniques for reliable background playback
 */
class IOSBackgroundAudioManager {
  private audio: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying = false;
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private silentBuffer: AudioBuffer | null = null;
  private silentSource: AudioBufferSourceNode | null = null;
  private isInitialized = false;

  /**
   * Initialize iOS background audio system
   */
  async initialize(audioElement: HTMLAudioElement): Promise<void> {
    console.log('🍎 Initializing iOS Background Audio Manager');
    
    this.audio = audioElement;
    
    // Configure audio element for iOS
    this.configureIOSAudioElement();
    
    // Initialize Web Audio API context
    await this.initializeAudioContext();
    
    // Setup iOS-specific event listeners
    this.setupIOSEventListeners();
    
    // Create silent audio buffer for background keep-alive
    await this.createSilentBuffer();
    
    this.isInitialized = true;
    console.log('✅ iOS Background Audio Manager initialized');
  }

  /**
   * Configure audio element specifically for iOS background audio
   */
  private configureIOSAudioElement(): void {
    if (!this.audio) return;

    console.log('🔧 Configuring audio element for iOS background audio');

    // Essential iOS attributes
    this.audio.setAttribute('playsinline', 'true');
    this.audio.setAttribute('webkit-playsinline', 'true');
    this.audio.setAttribute('preload', 'auto'); // iOS needs auto for background
    this.audio.setAttribute('controls', 'false');
    this.audio.crossOrigin = 'anonymous';

    // iOS-specific properties
    try {
      (this.audio as any).playsInline = true;
      (this.audio as any).webkitPlaysInline = true;
      (this.audio as any).preservesPitch = false;
      (this.audio as any).webkitPreservesPitch = false;
      
      // Critical iOS background audio properties
      (this.audio as any).webkitAudioContext = true;
      (this.audio as any).webkitAllowsAirPlay = true;
      
      // Set audio session for background playback
      if ('webkitAudioSession' in this.audio) {
        (this.audio as any).webkitAudioSession = 'playback';
      }
      
      console.log('✅ iOS audio element configured');
    } catch (error) {
      console.warn('iOS audio element configuration failed:', error);
    }
  }

  /**
   * Initialize Web Audio API context for iOS background audio
   */
  private async initializeAudioContext(): Promise<void> {
    try {
      // Create AudioContext
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();

      // Resume context if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      console.log('🎛️ iOS AudioContext initialized:', this.audioContext.state);
    } catch (error) {
      console.error('Failed to initialize iOS AudioContext:', error);
    }
  }

  /**
   * Create silent audio buffer for background keep-alive
   * This is crucial for iOS background audio
   */
  private async createSilentBuffer(): Promise<void> {
    if (!this.audioContext) return;

    try {
      // Create a 1-second silent buffer
      const sampleRate = this.audioContext.sampleRate;
      const bufferLength = sampleRate * 1; // 1 second
      
      this.silentBuffer = this.audioContext.createBuffer(1, bufferLength, sampleRate);
      
      // Fill with silence (zeros)
      const channelData = this.silentBuffer.getChannelData(0);
      for (let i = 0; i < bufferLength; i++) {
        channelData[i] = 0;
      }
      
      console.log('🔇 Silent buffer created for iOS background keep-alive');
    } catch (error) {
      console.error('Failed to create silent buffer:', error);
    }
  }

  /**
   * Setup iOS-specific event listeners
   */
  private setupIOSEventListeners(): void {
    if (!this.audio) return;

    console.log('📱 Setting up iOS-specific event listeners');

    // iOS pause event handling - very aggressive
    this.audio.addEventListener('pause', () => {
      if (!this.audio || this.audio.ended || !this.audio.src || !this.isPlaying) return;

      console.log('🍎 iOS audio paused - immediate resume attempt');
      
      // Immediate resume (no delay for iOS)
      this.forceIOSResume();
      
      // Backup resume attempts
      setTimeout(() => this.forceIOSResume(), 100);
      setTimeout(() => this.forceIOSResume(), 300);
      setTimeout(() => this.forceIOSResume(), 500);
    });

    // iOS-specific visibility handling
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.isPlaying) {
        console.log('🍎 iOS page hidden - activating background audio');
        this.activateIOSBackgroundAudio();
      } else if (!document.hidden && this.isPlaying) {
        console.log('🍎 iOS page visible - ensuring audio continues');
        this.ensureIOSAudioContinues();
      }
    });

    // iOS page lifecycle events
    window.addEventListener('pagehide', () => {
      if (this.isPlaying) {
        console.log('🍎 iOS page hiding - maintaining audio');
        this.activateIOSBackgroundAudio();
      }
    });

    window.addEventListener('pageshow', () => {
      if (this.isPlaying) {
        console.log('🍎 iOS page showing - ensuring audio');
        this.ensureIOSAudioContinues();
      }
    });

    // iOS focus/blur events
    window.addEventListener('blur', () => {
      if (this.isPlaying) {
        console.log('🍎 iOS window blur - background mode');
        this.activateIOSBackgroundAudio();
      }
    });

    window.addEventListener('focus', () => {
      if (this.isPlaying) {
        console.log('🍎 iOS window focus - foreground mode');
        this.ensureIOSAudioContinues();
      }
    });

    // iOS-specific webkit events
    document.addEventListener('webkitvisibilitychange', () => {
      if ((document as any).webkitHidden && this.isPlaying) {
        console.log('🍎 iOS webkit hidden - background mode');
        this.activateIOSBackgroundAudio();
      }
    });

    // iOS audio interruption events
    this.audio.addEventListener('webkitbeginfullscreen', () => {
      console.log('🍎 iOS fullscreen begin');
    });

    this.audio.addEventListener('webkitendfullscreen', () => {
      console.log('🍎 iOS fullscreen end - resuming audio');
      if (this.isPlaying) {
        this.forceIOSResume();
      }
    });
  }

  /**
   * Force iOS audio resume with multiple strategies
   */
  private forceIOSResume(): void {
    if (!this.audio || !this.isPlaying) return;

    console.log('🔥 Force iOS audio resume');

    // Strategy 1: Resume AudioContext first
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().then(() => {
        console.log('✅ iOS AudioContext resumed');
      }).catch(() => {
        console.warn('❌ iOS AudioContext resume failed');
      });
    }

    // Strategy 2: Play audio element
    if (this.audio.paused && !this.audio.ended && this.audio.src) {
      this.audio.play().then(() => {
        console.log('✅ iOS audio element resumed');
      }).catch((error) => {
        console.warn('❌ iOS audio play failed:', error);
        
        // Strategy 3: Force reload and play
        setTimeout(() => {
          if (this.audio && this.audio.paused && !this.audio.ended && this.isPlaying) {
            console.log('🔄 iOS force reload and play');
            const currentTime = this.audio.currentTime;
            this.audio.load();
            this.audio.addEventListener('canplay', () => {
              this.audio!.currentTime = currentTime;
              this.audio!.play().catch(() => {
                console.warn('❌ iOS force reload also failed');
              });
            }, { once: true });
          }
        }, 200);
      });
    }
  }

  /**
   * Activate iOS background audio mode
   */
  private activateIOSBackgroundAudio(): void {
    if (!this.isPlaying || !this.audioContext) return;

    console.log('🍎 Activating iOS background audio mode');

    // Ensure AudioContext is running
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }

    // Connect audio element to Web Audio API if not already connected
    this.connectToWebAudio();

    // Start silent audio keep-alive
    this.startSilentKeepAlive();

    // Force audio to continue
    this.forceIOSResume();

    // Start aggressive monitoring
    this.startIOSKeepAlive();
  }

  /**
   * Connect audio element to Web Audio API
   */
  private connectToWebAudio(): void {
    if (!this.audio || !this.audioContext || this.sourceNode) return;

    try {
      // Create source node from audio element
      this.sourceNode = this.audioContext.createMediaElementSource(this.audio);
      
      // Create gain node for volume control
      this.gainNode = this.audioContext.createGain();
      
      // Connect: audio -> source -> gain -> destination
      this.sourceNode.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);
      
      console.log('🔗 iOS audio connected to Web Audio API');
    } catch (error) {
      console.warn('Failed to connect to Web Audio API:', error);
    }
  }

  /**
   * Start silent audio keep-alive for iOS background audio
   */
  private startSilentKeepAlive(): void {
    if (!this.audioContext || !this.silentBuffer) return;

    try {
      // Stop previous silent source
      if (this.silentSource) {
        this.silentSource.stop();
        this.silentSource.disconnect();
      }

      // Create new silent source
      this.silentSource = this.audioContext.createBufferSource();
      this.silentSource.buffer = this.silentBuffer;
      this.silentSource.loop = true;
      
      // Connect to destination with very low volume
      const silentGain = this.audioContext.createGain();
      silentGain.gain.value = 0.001; // Almost silent
      
      this.silentSource.connect(silentGain);
      silentGain.connect(this.audioContext.destination);
      
      // Start silent playback
      this.silentSource.start();
      
      console.log('🔇 iOS silent keep-alive started');
    } catch (error) {
      console.warn('Failed to start silent keep-alive:', error);
    }
  }

  /**
   * Start iOS-specific keep-alive monitoring
   */
  private startIOSKeepAlive(): void {
    if (this.keepAliveInterval) return;

    console.log('⏰ Starting iOS keep-alive monitoring');

    this.keepAliveInterval = setInterval(() => {
      if (this.isPlaying && this.audio) {
        // Check if audio is paused
        if (this.audio.paused && !this.audio.ended && this.audio.src) {
          console.log('🚨 iOS keep-alive: Audio paused - forcing resume');
          this.forceIOSResume();
        }

        // Ensure AudioContext is running
        if (this.audioContext && this.audioContext.state === 'suspended') {
          console.log('🎛️ iOS keep-alive: Resuming AudioContext');
          this.audioContext.resume().catch(() => {});
        }

        // Restart silent keep-alive if needed
        if (!this.silentSource || this.silentSource.playbackState === 'finished') {
          this.startSilentKeepAlive();
        }

        // Debug logging
        if (Math.random() < 0.3) { // More frequent logging for iOS debugging
          console.log('💓 iOS keep-alive check:', {
            audioPaused: this.audio.paused,
            audioTime: this.audio.currentTime.toFixed(1),
            contextState: this.audioContext?.state,
            silentActive: !!this.silentSource
          });
        }
      }
    }, 2000); // Very frequent monitoring for iOS (2 seconds)
  }

  /**
   * Stop iOS keep-alive monitoring
   */
  private stopIOSKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
      console.log('⏰ Stopped iOS keep-alive monitoring');
    }

    // Stop silent keep-alive
    if (this.silentSource) {
      try {
        this.silentSource.stop();
        this.silentSource.disconnect();
        this.silentSource = null;
        console.log('🔇 Stopped iOS silent keep-alive');
      } catch (error) {
        console.warn('Error stopping silent source:', error);
      }
    }
  }

  /**
   * Ensure iOS audio continues
   */
  private ensureIOSAudioContinues(): void {
    if (!this.audio || !this.isPlaying) return;

    console.log('🔍 Ensuring iOS audio continues');

    // Resume AudioContext
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }

    // Check if audio is paused and resume
    if (this.audio.paused && !this.audio.ended && this.audio.src) {
      console.log('⚠️ iOS audio was paused - resuming');
      this.forceIOSResume();
    }
  }

  /**
   * Set playing state
   */
  setPlaying(playing: boolean): void {
    console.log(`🍎 iOS setting playing state: ${playing}`);
    this.isPlaying = playing;

    if (playing) {
      this.activateIOSBackgroundAudio();
    } else {
      this.stopIOSKeepAlive();
    }

    // Update MediaSession
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
    }
  }

  /**
   * Setup MediaSession for iOS
   */
  setupMediaSession(metadata: {
    title: string;
    artist: string;
    album?: string;
    artwork?: string;
  }): void {
    if (!('mediaSession' in navigator)) return;

    try {
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

      navigator.mediaSession.playbackState = this.isPlaying ? 'playing' : 'paused';

      // iOS-specific action handlers
      navigator.mediaSession.setActionHandler('play', () => {
        console.log('🍎 MediaSession play');
        if (this.audio && this.audio.paused) {
          this.forceIOSResume();
        }
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        console.log('🍎 MediaSession pause');
        if (this.audio && !this.audio.paused) {
          this.audio.pause();
        }
      });

      console.log('🎛️ iOS MediaSession configured');
    } catch (error) {
      console.warn('iOS MediaSession setup failed:', error);
    }
  }

  /**
   * Cleanup iOS background audio manager
   */
  cleanup(): void {
    console.log('🧹 Cleaning up iOS background audio manager');

    this.stopIOSKeepAlive();

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    this.audio = null;
    this.isPlaying = false;
    this.isInitialized = false;
  }
}

// Export singleton instance for iOS
export const iosBackgroundAudioManager = new IOSBackgroundAudioManager();