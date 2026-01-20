/**
 * Background Audio Service - Disabled to prevent lock screen flickering
 * This service was causing conflicts with lock screen state management
 */

class BackgroundAudioService {
  private isInitialized = false;

  /**
   * Initialize the background audio service - DISABLED
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log('Background Audio Service disabled to prevent lock screen flickering');
    this.isInitialized = true;
  }

  /**
   * All methods are now no-ops to prevent interference
   */
  enableBackgroundAudio(): void {
    // Disabled - no-op
  }

  onAudioStateChange(isPlaying: boolean, currentSong: any): void {
    // Disabled - no-op
  }

  preventAudioInterruption(): void {
    // Disabled - no-op
  }
}

// Export singleton instance
export const backgroundAudioService = new BackgroundAudioService();

// Auto-initialize when module loads (but it's disabled)
if (typeof window !== 'undefined') {
  backgroundAudioService.initialize();
}