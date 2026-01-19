/**
 * Player State Synchronization Utilities
 * 
 * This module provides utilities to ensure all play/pause buttons across the website
 * stay synchronized with the actual audio playback state.
 */

let lastDispatchTime = 0;
let pendingDispatch: NodeJS.Timeout | null = null;

/**
 * Dispatch a global player state change event
 * This ensures all components listening for player state changes get updated immediately
 * Includes debouncing to prevent flickering from rapid state changes
 */
export const dispatchPlayerStateChange = (isPlaying: boolean, currentSong: any) => {
  const now = Date.now();
  
  // Clear any pending dispatch
  if (pendingDispatch) {
    clearTimeout(pendingDispatch);
  }
  
  // If this dispatch is too close to the last one, debounce it
  if (now - lastDispatchTime < 50) {
    pendingDispatch = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('playerStateChanged', {
        detail: { 
          isPlaying, 
          currentSong,
          timestamp: Date.now()
        }
      }));
      lastDispatchTime = Date.now();
      pendingDispatch = null;
    }, 25);
  } else {
    // Dispatch immediately if enough time has passed
    window.dispatchEvent(new CustomEvent('playerStateChanged', {
      detail: { 
        isPlaying, 
        currentSong,
        timestamp: now
      }
    }));
    lastDispatchTime = now;
  }
};

/**
 * Sync audio element state with the player store
 * This function checks if the actual audio element state matches the store state
 * and corrects any discrepancies with anti-flickering measures
 */
export const syncAudioElementWithStore = (audio: HTMLAudioElement, storeIsPlaying: boolean, setIsPlaying: (playing: boolean) => void) => {
  const actuallyPlaying = !audio.paused && !audio.ended;
  
  // Only update if there's actually a mismatch
  if (actuallyPlaying !== storeIsPlaying) {
    // Add a small delay to prevent rapid flickering
    setTimeout(() => {
      // Double-check the state is still mismatched after the delay
      const stillMismatched = (!audio.paused && !audio.ended) !== storeIsPlaying;
      if (stillMismatched) {
        setIsPlaying(actuallyPlaying);
        dispatchPlayerStateChange(actuallyPlaying, null);
      }
    }, 100);
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