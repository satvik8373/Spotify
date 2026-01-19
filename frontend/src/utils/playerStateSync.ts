/**
 * Player State Synchronization Utilities
 * 
 * This module provides utilities to ensure all play/pause buttons across the website
 * stay synchronized with the actual audio playback state.
 */

/**
 * Dispatch a global player state change event
 * This ensures all components listening for player state changes get updated immediately
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
 * This function checks if the actual audio element state matches the store state
 * and corrects any discrepancies
 */
export const syncAudioElementWithStore = (audio: HTMLAudioElement, storeIsPlaying: boolean, setIsPlaying: (playing: boolean) => void) => {
  const actuallyPlaying = !audio.paused && !audio.ended;
  
  if (actuallyPlaying !== storeIsPlaying) {
    // If there's a mismatch, update the store to match reality
    setIsPlaying(actuallyPlaying);
    dispatchPlayerStateChange(actuallyPlaying, null);
  }
};

/**
 * Force sync all play/pause buttons across the website
 * This can be called when you want to ensure all buttons are in sync
 */
export const forceSyncAllPlayButtons = () => {
  const audio = document.querySelector('audio');
  if (!audio) return;
  
  const actuallyPlaying = !audio.paused && !audio.ended;
  dispatchPlayerStateChange(actuallyPlaying, null);
};