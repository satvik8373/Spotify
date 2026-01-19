/**
 * Background Playback Manager
 * Handles audio playback when app is minimized or screen is locked
 * Fixes issues with audio stopping during screen lock or app backgrounding
 */

import { usePlayerStore } from '@/stores/usePlayerStore';

export interface BackgroundPlaybackState {
  isActive: boolean;
  wakeLock: any | null;
  mediaSession: MediaSession | null;
  backgroundTimer: NodeJS.Timeout | null;
  visibilityTimer: NodeJS.Timeout | null;
}

class BackgroundPlaybackManager {
  private state: BackgroundPlaybackState = {
    isActive: false,
    wakeLock: null,
    mediaSession: null,
    backgroundTimer: null,
    visibilityTimer: null,
  };

  private audioRef: React.RefObject<HTMLAudioElement> | null = null;

  /**
   * Initialize background playback manager
   */
  initialize(audioRef: React.RefObject<HTMLAudioElement>): void {
    this.audioRef = audioRef;
    this.setupMediaSession();
    this.setupVisibilityHandlers();
    this.setupWakeLock();
    
    // Don't initialize AudioContext here - let it be created on demand
    console.log('Background playback manager initialized');
  }

  /**
   * Setup MediaSession API for lock screen controls
   */
  private setupMediaSession(): void {
    if (!('mediaSession' in navigator)) {
      console.warn('MediaSession API not supported');
      return;
    }

    this.state.mediaSession = navigator.mediaSession;

    // Set up action handlers
    navigator.mediaSession.setActionHandler('play', () => {
      this.handleMediaSessionPlay();
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      this.handleMediaSessionPause();
    });

    navigator.mediaSession.setActionHandler('previoustrack', () => {
      this.handleMediaSessionPrevious();
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      this.handleMediaSessionNext();
    });

    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime && this.audioRef?.current) {
        this.audioRef.current.currentTime = details.seekTime;
      }
    });

    console.log('MediaSession API initialized');
  }

  /**
   * Setup visibility change handlers for app backgrounding
   */
  private setupVisibilityHandlers(): void {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        this.handleAppBackgrounded();
      } else {
        this.handleAppForegrounded();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Also handle page focus/blur
    window.addEventListener('blur', () => this.handleAppBackgrounded());
    window.addEventListener('focus', () => this.handleAppForegrounded());
  }

  /**
   * Setup Wake Lock API to prevent screen sleep during playback
   */
  private setupWakeLock(): void {
    if (!('wakeLock' in navigator)) {
      console.warn('Wake Lock API not supported');
      return;
    }
  }

  /**
   * Handle app going to background
   */
  private handleAppBackgrounded(): void {
    const { isPlaying, currentSong } = usePlayerStore.getState();

    if (!isPlaying || !currentSong || !this.audioRef?.current) return;

    console.log('App backgrounded - starting background playback monitoring');

    // Release wake lock when backgrounded to save battery
    this.releaseWakeLock();

    // Start aggressive background monitoring
    this.startBackgroundMonitoring();

    // Update MediaSession for lock screen
    this.updateMediaSessionMetadata();
  }

  /**
   * Handle app coming to foreground
   */
  private handleAppForegrounded(): void {
    console.log('App foregrounded - stopping background monitoring');

    // Stop background monitoring
    this.stopBackgroundMonitoring();

    // Request wake lock again if playing
    const { isPlaying } = usePlayerStore.getState();
    if (isPlaying) {
      this.requestWakeLock();
    }
  }

  /**
   * Start background playback monitoring
   */
  private startBackgroundMonitoring(): void {
    this.stopBackgroundMonitoring(); // Clear any existing timer

    // More frequent monitoring when in background
    this.state.backgroundTimer = setInterval(() => {
      this.checkBackgroundPlayback();
    }, 1000); // Check every second in background

    // Additional iOS-specific timer for stricter background restrictions
    if (this.isIOS()) {
      this.state.visibilityTimer = setInterval(() => {
        this.checkIOSBackgroundPlayback();
      }, 500); // More frequent checks on iOS
    }
  }

  /**
   * Stop background playback monitoring
   */
  private stopBackgroundMonitoring(): void {
    if (this.state.backgroundTimer) {
      clearInterval(this.state.backgroundTimer);
      this.state.backgroundTimer = null;
    }

    if (this.state.visibilityTimer) {
      clearInterval(this.state.visibilityTimer);
      this.state.visibilityTimer = null;
    }
  }

  /**
   * Check background playback status
   */
  private checkBackgroundPlayback(): void {
    if (!this.audioRef?.current) return;

    const audio = this.audioRef.current;
    const { isPlaying, currentSong, playNext } = usePlayerStore.getState();

    // Skip if no song or not supposed to be playing
    if (!currentSong || !isPlaying) return;

    // Check if audio is stalled
    if (audio.paused && !audio.ended) {
      console.log('Audio stalled in background - attempting to resume');
      audio.play().catch((error) => {
        console.warn('Failed to resume audio in background:', error);
      });
    }

    // Check if song ended and needs to advance
    if (audio.ended || (audio.duration > 0 && audio.currentTime >= audio.duration - 0.5)) {
      console.log('Song ended in background - advancing to next');
      playNext();
      
      // Ensure next song starts playing
      setTimeout(() => {
        if (this.audioRef?.current) {
          this.audioRef.current.play().catch((error) => {
            console.warn('Failed to start next song in background:', error);
          });
        }
      }, 100);
    }

    // Update MediaSession position
    this.updateMediaSessionPosition();
  }

  /**
   * iOS-specific background playback checks
   */
  private checkIOSBackgroundPlayback(): void {
    if (!this.isIOS() || !this.audioRef?.current) return;

    const audio = this.audioRef.current;
    const { isPlaying } = usePlayerStore.getState();

    // iOS has stricter background restrictions
    if (isPlaying && audio.paused && !audio.ended) {
      // Try to resume playback
      audio.play().catch(() => {
        // Silent failure - iOS may block background playback
      });
    }
  }

  /**
   * Request wake lock to prevent screen sleep
   */
  private async requestWakeLock(): Promise<void> {
    if (!('wakeLock' in navigator) || this.state.wakeLock) return;

    try {
      this.state.wakeLock = await (navigator as any).wakeLock.request('screen');
      console.log('Wake lock acquired');

      this.state.wakeLock.addEventListener('release', () => {
        console.log('Wake lock released');
        this.state.wakeLock = null;
      });
    } catch (error) {
      console.warn('Failed to acquire wake lock:', error);
    }
  }

  /**
   * Release wake lock
   */
  private releaseWakeLock(): void {
    if (this.state.wakeLock) {
      this.state.wakeLock.release()
        .then(() => {
          this.state.wakeLock = null;
          console.log('Wake lock released');
        })
        .catch((error: any) => {
          console.warn('Failed to release wake lock:', error);
        });
    }
  }

  /**
   * Update MediaSession metadata for lock screen
   */
  private updateMediaSessionMetadata(): void {
    if (!this.state.mediaSession) return;

    const { currentSong } = usePlayerStore.getState();
    if (!currentSong) return;

    try {
      this.state.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title || 'Unknown Title',
        artist: currentSong.artist || 'Unknown Artist',
        album: currentSong.album || 'Unknown Album',
        artwork: currentSong.image ? [
          { src: currentSong.image, sizes: '96x96', type: 'image/jpeg' },
          { src: currentSong.image, sizes: '128x128', type: 'image/jpeg' },
          { src: currentSong.image, sizes: '192x192', type: 'image/jpeg' },
          { src: currentSong.image, sizes: '256x256', type: 'image/jpeg' },
          { src: currentSong.image, sizes: '384x384', type: 'image/jpeg' },
          { src: currentSong.image, sizes: '512x512', type: 'image/jpeg' },
        ] : undefined,
      });
    } catch (error) {
      console.warn('Failed to update MediaSession metadata:', error);
    }
  }

  /**
   * Update MediaSession position state
   */
  private updateMediaSessionPosition(): void {
    if (!this.state.mediaSession || !this.audioRef?.current) return;

    const audio = this.audioRef.current;

    try {
      this.state.mediaSession.setPositionState({
        duration: audio.duration || 0,
        playbackRate: audio.playbackRate || 1,
        position: audio.currentTime || 0,
      });
    } catch (error) {
      // Ignore position state errors
    }
  }

  /**
   * Handle MediaSession play action
   */
  private handleMediaSessionPlay(): void {
    const { setIsPlaying } = usePlayerStore.getState();
    
    if (this.audioRef?.current) {
      this.audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((error) => {
          console.warn('MediaSession play failed:', error);
        });
    }
  }

  /**
   * Handle MediaSession pause action
   */
  private handleMediaSessionPause(): void {
    const { setIsPlaying } = usePlayerStore.getState();
    
    if (this.audioRef?.current) {
      this.audioRef.current.pause();
      setIsPlaying(false);
    }
  }

  /**
   * Handle MediaSession previous track action
   */
  private handleMediaSessionPrevious(): void {
    const { playPrevious } = usePlayerStore.getState();
    playPrevious();
  }

  /**
   * Handle MediaSession next track action
   */
  private handleMediaSessionNext(): void {
    const { playNext } = usePlayerStore.getState();
    playNext();
  }

  /**
   * Start background playback for current song
   */
  startPlayback(): void {
    this.state.isActive = true;
    this.updateMediaSessionMetadata();
    this.requestWakeLock();
  }

  /**
   * Stop background playback
   */
  stopPlayback(): void {
    this.state.isActive = false;
    this.stopBackgroundMonitoring();
    this.releaseWakeLock();
  }

  /**
   * Check if running on iOS
   */
  private isIOS(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  /**
   * Cleanup all resources
   */
  cleanup(): void {
    this.stopPlayback();
    
    // Remove event listeners
    document.removeEventListener('visibilitychange', () => {});
    window.removeEventListener('blur', () => {});
    window.removeEventListener('focus', () => {});
  }
}

// Export singleton instance
export const backgroundPlaybackManager = new BackgroundPlaybackManager();