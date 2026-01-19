/**
 * Background Audio Service
 * Handles background audio playback and service worker communication
 */

class BackgroundAudioService {
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private isInitialized = false;

  /**
   * Initialize the background audio service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Register service worker if not already registered
      if ('serviceWorker' in navigator) {
        this.serviceWorkerRegistration = await navigator.serviceWorker.register('/service-worker.js');
        console.log('Service Worker registered for background audio');
      }

      // Setup page visibility handling
      this.setupVisibilityHandling();
      
      // Setup beforeunload handling
      this.setupBeforeUnloadHandling();

      this.isInitialized = true;
    } catch (error) {
      console.warn('Failed to initialize background audio service:', error);
    }
  }

  /**
   * Setup page visibility handling for background audio
   */
  private setupVisibilityHandling(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Page is hidden - notify service worker to keep audio alive
        this.notifyServiceWorker('KEEP_ALIVE', { timestamp: Date.now() });
      }
    });
  }

  /**
   * Setup beforeunload handling to prevent audio interruption
   */
  private setupBeforeUnloadHandling(): void {
    window.addEventListener('beforeunload', () => {
      // Don't show confirmation dialog for background audio
      // Just notify service worker
      this.notifyServiceWorker('BACKGROUND_AUDIO', { 
        action: 'KEEP_ALIVE',
        timestamp: Date.now() 
      });
    });
  }

  /**
   * Notify service worker about audio state changes
   */
  private notifyServiceWorker(type: string, data: any): void {
    if (this.serviceWorkerRegistration?.active) {
      this.serviceWorkerRegistration.active.postMessage({
        type,
        data
      });
    }
  }

  /**
   * Enable background audio mode
   */
  enableBackgroundAudio(): void {
    // Request persistent notification permission for background audio
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          console.log('Notification permission granted for background audio');
        }
      });
    }

    // Enable wake lock if available (prevents screen sleep during audio)
    this.requestWakeLock();
  }

  /**
   * Request wake lock to prevent system sleep during audio playback
   */
  private async requestWakeLock(): Promise<void> {
    try {
      if ('wakeLock' in navigator) {
        const wakeLock = await (navigator as any).wakeLock.request('screen');
        console.log('Wake lock acquired for background audio');
        
        // Release wake lock when page becomes hidden
        document.addEventListener('visibilitychange', () => {
          if (document.hidden && wakeLock) {
            wakeLock.release();
          }
        });
      }
    } catch (error) {
      console.warn('Wake lock request failed:', error);
    }
  }

  /**
   * Handle audio state changes
   */
  onAudioStateChange(isPlaying: boolean, currentSong: any): void {
    this.notifyServiceWorker('AUDIO_STATE_CHANGED', {
      isPlaying,
      currentSong: currentSong ? {
        title: currentSong.title,
        artist: currentSong.artist,
        imageUrl: currentSong.imageUrl
      } : null,
      timestamp: Date.now()
    });
  }

  /**
   * Prevent audio interruption on page navigation
   */
  preventAudioInterruption(): void {
    // Override default page unload behavior
    window.addEventListener('pagehide', () => {
      this.notifyServiceWorker('KEEP_ALIVE', { timestamp: Date.now() });
    });
  }
}

// Export singleton instance
export const backgroundAudioService = new BackgroundAudioService();

// Auto-initialize when module loads
if (typeof window !== 'undefined') {
  backgroundAudioService.initialize();
}