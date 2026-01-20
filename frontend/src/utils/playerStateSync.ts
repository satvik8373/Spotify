/**
 * Simplified Player State Synchronization Utilities
 * 
 * Removes complex debouncing that was causing flickering issues
 */

/**
 * Dispatch a global player state change event
 * Simplified version without conflicting debouncing
 */
export const dispatchPlayerStateChange = (isPlaying: boolean, currentSong: any) => {
  window.dispatchEvent(new CustomEvent('playerStateChanged', {
    detail: { 
      isPlaying, 
      currentSong,
      timestamp: Date.now()
    }
  }));
};

/**
 * Sync audio element state with the player store
 * Simplified version that only syncs when there's a clear mismatch
 */
export const syncAudioElementWithStore = (audio: HTMLAudioElement, storeIsPlaying: boolean, setIsPlaying: (playing: boolean) => void) => {
  const actuallyPlaying = !audio.paused && !audio.ended && audio.currentTime > 0;
  
  // Only update if there's a clear mismatch
  if (actuallyPlaying !== storeIsPlaying) {
    setIsPlaying(actuallyPlaying);
    dispatchPlayerStateChange(actuallyPlaying, null);
  }
};

/**
 * Force sync all play/pause buttons across the website
 * Simplified version without delays
 */
export const forceSyncAllPlayButtons = () => {
  const audio = document.querySelector('audio');
  if (!audio) return;
  
  const actuallyPlaying = !audio.paused && !audio.ended && audio.currentTime > 0;
  dispatchPlayerStateChange(actuallyPlaying, null);
};