/**
 * Background Audio Manager
 * Handles background audio playback when screen is off or app is in background
 */

class BackgroundAudioManager {
  private static instance: BackgroundAudioManager;
  private wakeLock: WakeLockSentinel | null = null;
  private isInitialized = false;

  static getInstance(): BackgroundAudioManager {
    if (!BackgroundAudioManager.instance) {
      BackgroundAudioManager.instance = new BackgroundAudioManager();
    }
    return BackgroundAudioManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('Initializing Background Audio Manager');

    // Handle visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    
    // Handle page lifecycle events
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    window.addEventListener('pagehide', this.handlePageHide.bind(this));
    window.addEventListener('pageshow', this.handlePageShow.bind(this));

    // Handle focus events
    window.addEventListener('focus', this.handleFocus.bind(this));
    window.addEventListener('blur', this.handleBlur.bind(this));

    this.isInitialized = true;
  }

  private handleVisibilityChange(): void {
    const audio = document.querySelector('audio') as HTMLAudioElement;
    if (!audio) return;

    if (document.hidden) {
      console.log('Page hidden - maintaining audio playback');
      this.maintainAudioPlayback(audio);
    } else {
      console.log('Page visible - syncing audio state');
      this.syncAudioState(audio);
    }
  }

  private handleBeforeUnload(): void {
    // Clean up wake lock before page unloads
    this.releaseWakeLock();
  }

  private handlePageHide(): void {
    console.log('Page hiding - preserving audio state');
    // Don't pause audio when page is hidden
  }

  private handlePageShow(): void {
    console.log('Page showing - resuming audio context');
    const audio = document.querySelector('audio') as HTMLAudioElement;
    if (audio && !audio.paused) {
      this.maintainAudioPlayback(audio);
    }
  }

  private handleFocus(): void {
    console.log('Window focused');
    this.syncAudioState();
  }

  private handleBlur(): void {
    console.log('Window blurred - maintaining background audio');
    const audio = document.querySelector('audio') as HTMLAudioElement;
    if (audio && !audio.paused) {
      this.maintainAudioPlayback(audio);
    }
  }

  private maintainAudioPlayback(audio?: HTMLAudioElement): void {
    const audioElement = audio || document.querySelector('audio') as HTMLAudioElement;
    if (!audioElement) return;

    // Ensure audio continues playing
    if (audioElement.paused && audioElement.src) {
      audioElement.play().catch((error) => {
        console.warn('Failed to maintain audio playback:', error);
      });
    }

    // Request wake lock to prevent system from stopping audio
    this.requestWakeLock();

    // Notify service worker about audio state
    this.notifyServiceWorker('AUDIO_STATE_CHANGED', {
      isPlaying: !audioElement.paused,
      currentTime: audioElement.currentTime,
      duration: audioElement.duration
    });
  }

  private syncAudioState(audio?: HTMLAudioElement): void {
    const audioElement = audio || document.querySelector('audio') as HTMLAudioElement;
    if (!audioElement) return;

    // Re-request wake lock if audio is playing
    if (!audioElement.paused) {
      this.requestWakeLock();
    } else {
      this.releaseWakeLock();
    }
  }

  async requestWakeLock(): Promise<void> {
    if (!('wakeLock' in navigator)) {
      console.warn('Wake Lock API not supported');
      return;
    }

    try {
      // Release existing wake lock first
      if (this.wakeLock) {
        await this.wakeLock.release();
      }

      // Request new wake lock
      this.wakeLock = await navigator.wakeLock.request('screen');
      console.log('Wake lock acquired for background audio');

      this.wakeLock.addEventListener('release', () => {
        console.log('Wake lock released');
        this.wakeLock = null;
      });

    } catch (error) {
      console.warn('Wake lock request failed:', error);
    }
  }

  async releaseWakeLock(): Promise<void> {
    if (this.wakeLock) {
      try {
        await this.wakeLock.release();
        this.wakeLock = null;
        console.log('Wake lock released');
      } catch (error) {
        console.warn('Wake lock release failed:', error);
      }
    }
  }

  private notifyServiceWorker(action: string, data?: any): void {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'BACKGROUND_AUDIO',
        action,
        data
      });
    }
  }

  // Public methods for audio state management
  onAudioPlay(): void {
    console.log('Audio started playing');
    this.requestWakeLock();
    this.notifyServiceWorker('AUDIO_STATE_CHANGED', { isPlaying: true });
  }

  onAudioPause(): void {
    console.log('Audio paused');
    this.releaseWakeLock();
    this.notifyServiceWorker('AUDIO_STATE_CHANGED', { isPlaying: false });
  }

  onAudioEnded(): void {
    console.log('Audio ended');
    this.releaseWakeLock();
    this.notifyServiceWorker('AUDIO_STATE_CHANGED', { isPlaying: false });
  }
}

// Export singleton instance
export const backgroundAudioManager = BackgroundAudioManager.getInstance();

// Auto-initialize when module loads
if (typeof window !== 'undefined') {
  backgroundAudioManager.initialize();
}