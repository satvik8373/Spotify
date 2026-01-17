/**
 * Background Playback Service
 * Handles audio playback in background, lock screen, and interruption scenarios
 */

import { audioFocusManager, type InterruptionReason } from '@/utils/AudioFocusManager';

export interface BackgroundPlaybackCallbacks {
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (position: number) => void;
  getCurrentSong: () => {
    title: string;
    artist: string;
    album?: string;
    artwork?: string;
    duration?: number;
  } | null;
  getCurrentTime: () => number;
  getDuration: () => number;
  getIsPlaying: () => boolean;
}

class BackgroundPlaybackService {
  private callbacks: BackgroundPlaybackCallbacks | null = null;
  private isInitialized = false;
  private mediaSessionUpdateInterval: number | null = null;
  private wakeLock: any = null; // Screen Wake Lock API

  /**
   * Initialize background playback service
   */
  async initialize(callbacks: BackgroundPlaybackCallbacks): Promise<void> {
    if (this.isInitialized) return;

    this.callbacks = callbacks;

    // Initialize audio focus manager
    await audioFocusManager.initialize({
      onAudioFocusLoss: this.handleAudioFocusLoss.bind(this),
      onAudioFocusGain: this.handleAudioFocusGain.bind(this),
      onAudioOutputChange: this.handleAudioOutputChange.bind(this)
    });

    // Setup MediaSession API for lock screen controls
    this.setupMediaSession();

    // Setup visibility change handling
    this.setupVisibilityHandling();

    // Setup wake lock for preventing sleep during playback
    this.setupWakeLock();

    this.isInitialized = true;
  }

  /**
   * Setup MediaSession API for lock screen and notification controls
   */
  private setupMediaSession(): void {
    if (!('mediaSession' in navigator)) {
      console.warn('MediaSession API not supported');
      return;
    }

    // Set up action handlers
    navigator.mediaSession.setActionHandler('play', () => {
      this.callbacks?.onPlay();
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      this.callbacks?.onPause();
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      this.callbacks?.onNext();
    });

    navigator.mediaSession.setActionHandler('previoustrack', () => {
      this.callbacks?.onPrevious();
    });

    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) {
        this.callbacks?.onSeek(details.seekTime);
      }
    });

    // Set up position updates
    this.startPositionUpdates();
  }

  /**
   * Update MediaSession metadata
   */
  updateMediaSession(song: {
    title: string;
    artist: string;
    album?: string;
    artwork?: string;
    duration?: number;
  }, isPlaying: boolean): void {
    if (!('mediaSession' in navigator)) return;

    // Update metadata
    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title || 'Unknown Title',
      artist: song.artist || 'Unknown Artist',
      album: song.album || 'Unknown Album',
      artwork: song.artwork ? [
        {
          src: song.artwork,
          sizes: '96x96',
          type: 'image/jpeg'
        },
        {
          src: song.artwork,
          sizes: '128x128',
          type: 'image/jpeg'
        },
        {
          src: song.artwork,
          sizes: '192x192',
          type: 'image/jpeg'
        },
        {
          src: song.artwork,
          sizes: '256x256',
          type: 'image/jpeg'
        },
        {
          src: song.artwork,
          sizes: '384x384',
          type: 'image/jpeg'
        },
        {
          src: song.artwork,
          sizes: '512x512',
          type: 'image/jpeg'
        }
      ] : []
    });

    // Update playback state
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }

  /**
   * Start periodic position updates for MediaSession
   */
  private startPositionUpdates(): void {
    if (this.mediaSessionUpdateInterval) {
      clearInterval(this.mediaSessionUpdateInterval);
    }

    this.mediaSessionUpdateInterval = window.setInterval(() => {
      if (!('mediaSession' in navigator) || !('setPositionState' in navigator.mediaSession)) {
        return;
      }

      const currentTime = this.callbacks?.getCurrentTime() || 0;
      const duration = this.callbacks?.getDuration() || 0;
      const isPlaying = this.callbacks?.getIsPlaying() || false;

      if (duration > 0 && isPlaying) {
        try {
          navigator.mediaSession.setPositionState({
            duration: duration,
            playbackRate: 1.0,
            position: currentTime
          });
        } catch (error) {
          // Ignore position state errors
        }
      }
    }, 1000);
  }

  /**
   * Setup visibility change handling for background playback
   */
  private setupVisibilityHandling(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // App going to background - ensure audio continues
        this.handleAppBackground();
      } else {
        // App coming to foreground
        this.handleAppForeground();
      }
    });

    // Handle page focus/blur
    window.addEventListener('blur', () => {
      this.handleAppBackground();
    });

    window.addEventListener('focus', () => {
      this.handleAppForeground();
    });
  }

  /**
   * Setup wake lock to prevent device sleep during playback
   */
  private async setupWakeLock(): Promise<void> {
    if (!('wakeLock' in navigator)) {
      console.warn('Wake Lock API not supported');
      return;
    }

    try {
      // Request wake lock when playing
      this.requestWakeLock();
    } catch (error) {
      console.warn('Wake lock failed:', error);
    }
  }

  /**
   * Request wake lock to prevent screen sleep
   */
  private async requestWakeLock(): Promise<void> {
    if (!('wakeLock' in navigator)) return;

    try {
      // @ts-ignore - Wake Lock API might not be in types yet
      this.wakeLock = await navigator.wakeLock.request('screen');
      
      this.wakeLock.addEventListener('release', () => {
        console.log('Wake lock released');
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
      } catch (error) {
        console.warn('Wake lock release failed:', error);
      }
    }
  }

  /**
   * Handle app going to background
   */
  private handleAppBackground(): void {
    const isPlaying = this.callbacks?.getIsPlaying();
    
    if (isPlaying) {
      // Ensure MediaSession is properly set up for background playback
      const currentSong = this.callbacks?.getCurrentSong();
      if (currentSong) {
        this.updateMediaSession(currentSong, true);
      }

      // Request audio focus to maintain playback
      audioFocusManager.requestAudioFocus();
    }
  }

  /**
   * Handle app coming to foreground
   */
  private handleAppForeground(): void {
    // Refresh MediaSession state
    const isPlaying = this.callbacks?.getIsPlaying();
    const currentSong = this.callbacks?.getCurrentSong();
    
    if (currentSong) {
      this.updateMediaSession(currentSong, isPlaying || false);
    }
  }

  /**
   * Handle audio focus loss (phone calls, other apps)
   */
  private handleAudioFocusLoss(reason: InterruptionReason): void {
    console.log('Audio focus lost:', reason);
    
    // Pause playback when focus is lost
    this.callbacks?.onPause();
    
    // Release wake lock
    this.releaseWakeLock();
  }

  /**
   * Handle audio focus gain (after interruption)
   */
  private handleAudioFocusGain(): void {
    console.log('Audio focus gained');
    
    // Resume playback if it was playing before interruption
    // Note: We let the AudioFocusManager handle the logic of whether to resume
    this.callbacks?.onPlay();
    
    // Request wake lock again
    this.requestWakeLock();
  }

  /**
   * Handle audio output device change (Bluetooth connect/disconnect)
   */
  private handleAudioOutputChange(deviceId: string): void {
    console.log('Audio output changed to device:', deviceId);
    
    // Could implement device-specific logic here if needed
    // For now, just ensure playback continues
    const isPlaying = this.callbacks?.getIsPlaying();
    if (isPlaying) {
      // Small delay to allow device switch
      setTimeout(() => {
        this.callbacks?.onPlay();
      }, 500);
    }
  }

  /**
   * Notify service that playback started
   */
  onPlaybackStart(): void {
    audioFocusManager.requestAudioFocus();
    this.requestWakeLock();
    
    const currentSong = this.callbacks?.getCurrentSong();
    if (currentSong) {
      this.updateMediaSession(currentSong, true);
    }
  }

  /**
   * Notify service that playback stopped
   */
  onPlaybackStop(): void {
    audioFocusManager.releaseAudioFocus();
    this.releaseWakeLock();
    
    const currentSong = this.callbacks?.getCurrentSong();
    if (currentSong) {
      this.updateMediaSession(currentSong, false);
    }
  }

  /**
   * Notify service that song changed
   */
  onSongChange(): void {
    const currentSong = this.callbacks?.getCurrentSong();
    const isPlaying = this.callbacks?.getIsPlaying();
    
    if (currentSong) {
      this.updateMediaSession(currentSong, isPlaying || false);
    }
  }

  /**
   * Clean up service
   */
  cleanup(): void {
    if (this.mediaSessionUpdateInterval) {
      clearInterval(this.mediaSessionUpdateInterval);
      this.mediaSessionUpdateInterval = null;
    }

    this.releaseWakeLock();
    audioFocusManager.cleanup();
    
    this.isInitialized = false;
    this.callbacks = null;
  }
}

// Export singleton instance
export const backgroundPlaybackService = new BackgroundPlaybackService();