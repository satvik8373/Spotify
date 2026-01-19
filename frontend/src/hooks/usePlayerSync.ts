import { useEffect, useState, useRef } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';

/**
 * Custom hook to synchronize play/pause state across all components
 * This ensures that all play/pause buttons update immediately when the state changes
 * Includes anti-flickering measures for lock screen scenarios
 */
export const usePlayerSync = () => {
  const { isPlaying, currentSong } = usePlayerStore();
  const [localIsPlaying, setLocalIsPlaying] = useState(isPlaying);
  const [localCurrentSong, setLocalCurrentSong] = useState(currentSong);
  
  // Refs to track last update timestamps to prevent flickering
  const lastUpdateRef = useRef<number>(0);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced state update function to prevent flickering
  const updateStateDebounced = (newIsPlaying: boolean, newCurrentSong: any) => {
    const now = Date.now();
    
    // Clear any pending updates
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    // If this update is too close to the last one, debounce it
    if (now - lastUpdateRef.current < 100) {
      updateTimeoutRef.current = setTimeout(() => {
        setLocalIsPlaying(newIsPlaying);
        if (newCurrentSong) {
          setLocalCurrentSong(newCurrentSong);
        }
        lastUpdateRef.current = Date.now();
      }, 50);
    } else {
      // Update immediately if enough time has passed
      setLocalIsPlaying(newIsPlaying);
      if (newCurrentSong) {
        setLocalCurrentSong(newCurrentSong);
      }
      lastUpdateRef.current = now;
    }
  };

  // Listen for global player state changes
  useEffect(() => {
    const handlePlayerStateChange = (e: Event) => {
      if (e instanceof CustomEvent && e.detail) {
        updateStateDebounced(e.detail.isPlaying, e.detail.currentSong);
      }
    };

    window.addEventListener('playerStateChanged', handlePlayerStateChange);
    
    return () => {
      window.removeEventListener('playerStateChanged', handlePlayerStateChange);
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  // Sync local state with store state (with debouncing)
  useEffect(() => {
    updateStateDebounced(isPlaying, null);
  }, [isPlaying]);

  useEffect(() => {
    updateStateDebounced(localIsPlaying, currentSong);
  }, [currentSong]);

  return {
    isPlaying: localIsPlaying,
    currentSong: localCurrentSong
  };
};