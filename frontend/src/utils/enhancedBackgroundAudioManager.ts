/**
 * Enhanced Background Audio Manager
 * Spotify Web-like behavior with comprehensive background audio support
 */

interface AudioState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  src: string;
}

class EnhancedBackgroundAudioManager {
  private static instance: EnhancedBackgroundAudioManager;
  private audioElement: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;
  private wakeLock: WakeLockSentinel | null = null;
  private isInitialized = false;
  private userHasInteracted = false;
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private visibilityCheckInterval: NodeJS.Timeout | null = null;
  private lastPlaybackState: AudioState | null = null;

  static getInstance(): EnhancedBackgroundAudioManager {
    if (!EnhancedBackgroundAudioManager.instance) {
      EnhancedBackgroundAudioManager.instance = new EnhancedBackgroundAudioManager();
    }
    return EnhancedBackgroundAudioManager.instance;
  }

  async initialize(audioElement: HTMLAudioElement): Promise<void> {
    if (this.isInitialized) return;

    console.log('🎵 Initializing Enhanced Background Audio Manager');
    this.audioElement = audioElement;

    // Set up audio element for background playback
    this.setupAudioElement();
    
    // Initialize Media Session API
    this.initializeMediaSession();
    
    // Set up visibility and lifecycle handlers
    this.setupVisibilityHandlers();
    
    // Set up audio context management
    this.setupAudioContextManagement();
    
    // Start keep-alive mechanism
    this.startKeepAlive();
    
    this.isInitialized = true;
    console.log('✅ Enhanced Background Audio Manager initialized');
  }

  private setupAudioElement(): void {
    if (!this.audioElement) return;

    const audio = this.audioElement;
    
    // Essential attributes for background playback
    audio.setAttribute('playsinline', 'true');
    audio.setAttribute('webkit-playsinline', 'true');
    audio.setAttribute('preload', 'metadata');
    audio.crossOrigin = 'anonymous';
    
    // Prevent auto-pause on blur (Spotify Web behavior)
    audio.addEventListener('pause', this.handleAudioPause.bind(this));
    audio.addEventListener('play', this.handleAudioPlay.bind(this));
    audio.addEventListener('ended', this.handleAudioEnded.bind(this));
    
    console.log('🔧 Audio element configured for background playback');
  }

  private handleAudioPause(event: Event): void {
    // Only intervene if we should be playing and it's not user-initiated
    if (this.shouldBePlayingInBackground() && !document.hidden) {
      console.log('🔄 Audio paused unexpectedly, attempting to resume');
      setTimeout(() => {
        if (this.audioElement && this.shouldBePlayingInBackground()) {
          this.resumePlayback();
        }
      }, 100);
    }
  }

  private handleAudioPlay(): void {
    console.log('▶️ Audio started playing');
    this.userHasInteracted = true;
    this.requestWakeLock();
    this.updateMediaSessionState();
  }

  private handleAudioEnded(): void {
    console.log('⏹️ Audio ended');
    this.releaseWakeLock();
  }

  private shouldBePlayingInBackground(): boolean {
    // Check if audio should continue playing based on app state
    // This would be connected to your player store
    return this.userHasInteracted && this.audioElement && !this.audioElement.paused;
  }

  private initializeMediaSession(): void {
    if (!('mediaSession' in navigator)) {
      console.warn('⚠️ MediaSession API not supported');
      return;
    }

    // Set up action handlers for lock screen controls
    navigator.mediaSession.setActionHandler('play', () => {
      console.log('🎵 MediaSession: Play action');
      this.resumePlayback();
      this.dispatchPlaybackEvent('play');
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      console.log('⏸️ MediaSession: Pause action');
      this.pausePlayback();
      this.dispatchPlaybackEvent('pause');
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      console.log('⏭️ MediaSession: Next track action');
      this.dispatchPlaybackEvent('nexttrack');
    });

    navigator.mediaSession.setActionHandler('previoustrack', () => {
      console.log('⏮️ MediaSession: Previous track action');
      this.dispatchPlaybackEvent('previoustrack');
    });

    navigator.mediaSession.setActionHandler('seekto', (details) => {
      console.log('🎯 MediaSession: Seek action', details.seekTime);
      if (this.audioElement && details.seekTime !== undefined) {
        this.audioElement.currentTime = details.seekTime;
        this.dispatchPlaybackEvent('seekto', { seekTime: details.seekTime });
      }
    });

    console.log('🎛️ MediaSession API initialized');
  }

  updateMediaSessionMetadata(metadata: {
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

      console.log('🎵 MediaSession metadata updated:', metadata.title);
    } catch (error) {
      console.warn('⚠️ Failed to update MediaSession metadata:', error);
    }
  }

  private updateMediaSessionState(): void {
    if (!('mediaSession' in navigator) || !this.audioElement) return;

    navigator.mediaSession.playbackState = this.audioElement.paused ? 'paused' : 'playing';
    
    // Update position state for better scrubbing support
    if (!this.audioElement.paused && this.audioElement.duration) {
      navigator.mediaSession.setPositionState({
        duration: this.audioElement.duration,
        playbackRate: this.audioElement.playbackRate,
        position: this.audioElement.currentTime
      });
    }
  }

  private setupVisibilityHandlers(): void {
    // Handle visibility changes (screen off/on, tab switching)
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    
    // Handle page lifecycle events
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    window.addEventListener('pagehide', this.handlePageHide.bind(this));
    window.addEventListener('pageshow', this.handlePageShow.bind(this));
    
    // Handle focus events (but don't auto-pause on blur)
    window.addEventListener('focus', this.handleFocus.bind(this));
    window.addEventListener('blur', this.handleBlur.bind(this));

    console.log('👁️ Visibility handlers set up');
  }

  private handleVisibilityChange(): void {
    if (document.hidden) {
      console.log('📱 Page hidden - maintaining background audio');
      this.maintainBackgroundPlayback();
    } else {
      console.log('👀 Page visible - syncing audio state');
      this.syncAudioState();
    }
  }

  private handlePageShow(): void {
    console.log('📄 Page show - resuming audio context');
    this.resumeAudioContext();
    
    // Restore playback if it should be playing
    if (this.shouldBePlayingInBackground() && this.audioElement?.paused) {
      this.resumePlayback();
    }
  }

  private handlePageHide(): void {
    console.log('📄 Page hide - maintaining audio state');
    // Don't pause audio - let it continue in background (Spotify Web behavior)
    this.maintainBackgroundPlayback();
  }

  private handleFocus(): void {
    console.log('🎯 Window focused');
    this.resumeAudioContext();
  }

  private handleBlur(): void {
    console.log('🌫️ Window blurred - maintaining background audio');
    // Don't auto-pause on blur (key difference from native apps)
    this.maintainBackgroundPlayback();
  }

  private handleBeforeUnload(): void {
    console.log('🚪 Page unloading - cleaning up');
    this.cleanup();
  }

  private maintainBackgroundPlayback(): void {
    if (!this.audioElement || !this.shouldBePlayingInBackground()) return;

    // Ensure audio context is running
    this.resumeAudioContext();
    
    // Request wake lock to prevent system interference
    this.requestWakeLock();
    
    // Resume playback if paused
    if (this.audioElement.paused && this.audioElement.src) {
      console.log('🔄 Resuming background playback');
      this.resumePlayback();
    }

    // Start periodic checks for background state
    this.startVisibilityChecks();
  }

  private syncAudioState(): void {
    if (!this.audioElement) return;

    // Resume audio context
    this.resumeAudioContext();
    
    // Update MediaSession state
    this.updateMediaSessionState();
    
    // Manage wake lock based on current state
    if (!this.audioElement.paused) {
      this.requestWakeLock();
    } else {
      this.releaseWakeLock();
    }

    // Stop background checks when visible
    this.stopVisibilityChecks();
  }

  private setupAudioContextManagement(): void {
    // Initialize audio context on first user interaction
    const initAudioContext = () => {
      if (this.audioContext) return;

      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AudioContext();
        console.log('🎛️ Audio context initialized');
      } catch (error) {
        console.warn('⚠️ Failed to initialize audio context:', error);
      }
    };

    // Initialize on first play
    this.audioElement?.addEventListener('play', initAudioContext, { once: true });
  }

  private resumeAudioContext(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      console.log('🔄 Resuming suspended audio context');
      this.audioContext.resume().catch(console.warn);
    }
  }

  private async requestWakeLock(): Promise<void> {
    if (!('wakeLock' in navigator)) return;

    try {
      // Release existing wake lock
      if (this.wakeLock) {
        await this.wakeLock.release();
      }

      // Request new wake lock
      this.wakeLock = await navigator.wakeLock.request('screen');
      console.log('🔒 Wake lock acquired');

      this.wakeLock.addEventListener('release', () => {
        console.log('🔓 Wake lock released');
        this.wakeLock = null;
        
        // Re-request if still playing
        if (this.shouldBePlayingInBackground()) {
          setTimeout(() => this.requestWakeLock(), 1000);
        }
      });

    } catch (error) {
      console.warn('⚠️ Wake lock request failed:', error);
    }
  }

  private async releaseWakeLock(): Promise<void> {
    if (this.wakeLock) {
      try {
        await this.wakeLock.release();
        this.wakeLock = null;
        console.log('🔓 Wake lock released manually');
      } catch (error) {
        console.warn('⚠️ Wake lock release failed:', error);
      }
    }
  }

  private startKeepAlive(): void {
    if (this.keepAliveInterval) return;

    this.keepAliveInterval = setInterval(() => {
      if (this.shouldBePlayingInBackground()) {
        this.performKeepAliveCheck();
      }
    }, 5000); // Check every 5 seconds

    console.log('💓 Keep-alive mechanism started');
  }

  private performKeepAliveCheck(): void {
    if (!this.audioElement) return;

    // Check if audio is unexpectedly paused
    if (this.audioElement.paused && this.audioElement.src && this.shouldBePlayingInBackground()) {
      console.log('🚨 Audio unexpectedly paused, attempting recovery');
      this.resumePlayback();
    }

    // Ensure audio context is running
    this.resumeAudioContext();

    // Send keep-alive to service worker
    this.sendServiceWorkerMessage('KEEP_ALIVE', {
      timestamp: Date.now(),
      isPlaying: !this.audioElement.paused
    });
  }

  private startVisibilityChecks(): void {
    if (this.visibilityCheckInterval) return;

    this.visibilityCheckInterval = setInterval(() => {
      if (document.hidden && this.shouldBePlayingInBackground()) {
        this.performKeepAliveCheck();
      }
    }, 3000); // More frequent checks when in background

    console.log('👁️ Background visibility checks started');
  }

  private stopVisibilityChecks(): void {
    if (this.visibilityCheckInterval) {
      clearInterval(this.visibilityCheckInterval);
      this.visibilityCheckInterval = null;
      console.log('👁️ Background visibility checks stopped');
    }
  }

  private resumePlayback(): void {
    if (!this.audioElement || !this.audioElement.src) return;

    this.audioElement.play().then(() => {
      console.log('▶️ Playback resumed successfully');
      this.updateMediaSessionState();
    }).catch((error) => {
      console.warn('⚠️ Failed to resume playback:', error);
    });
  }

  private pausePlayback(): void {
    if (!this.audioElement) return;

    this.audioElement.pause();
    console.log('⏸️ Playback paused');
    this.updateMediaSessionState();
  }

  private sendServiceWorkerMessage(action: string, data?: any): void {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'BACKGROUND_AUDIO',
        action,
        data
      });
    }
  }

  private dispatchPlaybackEvent(action: string, data?: any): void {
    window.dispatchEvent(new CustomEvent('backgroundAudioAction', {
      detail: { action, data }
    }));
  }

  // Public methods for external control
  setUserInteracted(): void {
    this.userHasInteracted = true;
    console.log('👤 User interaction registered');
  }

  onPlaybackStateChange(isPlaying: boolean): void {
    if (isPlaying) {
      this.requestWakeLock();
      this.startKeepAlive();
    } else {
      this.releaseWakeLock();
    }
    
    this.updateMediaSessionState();
  }

  cleanup(): void {
    console.log('🧹 Cleaning up Enhanced Background Audio Manager');
    
    // Clear intervals
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
    
    if (this.visibilityCheckInterval) {
      clearInterval(this.visibilityCheckInterval);
      this.visibilityCheckInterval = null;
    }
    
    // Release wake lock
    this.releaseWakeLock();
    
    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(console.warn);
    }
    
    // Remove event listeners
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    window.removeEventListener('pagehide', this.handlePageHide);
    window.removeEventListener('pageshow', this.handlePageShow);
    window.removeEventListener('focus', this.handleFocus);
    window.removeEventListener('blur', this.handleBlur);
  }
}

// Export singleton instance
export const enhancedBackgroundAudioManager = EnhancedBackgroundAudioManager.getInstance();