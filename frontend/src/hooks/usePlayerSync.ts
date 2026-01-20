import { useEffect, useState, useRef } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';

/**
 * Simplified player sync hook that prevents flickering
 * Removes complex debouncing that was causing conflicts
 */
export const usePlayerSync = () => {
  const { isPlaying, currentSong } = usePlayerStore();
  const [localIsPlaying, setLocalIsPlaying] = useState(isPlaying);
  const [localCurrentSong, setLocalCurrentSong] = useState(currentSong);
  
  // Simple state sync without complex debouncing
  useEffect(() => {
    setLocalIsPlaying(isPlaying);
  }, [isPlaying]);

  useEffect(() => {
    setLocalCurrentSong(currentSong);
  }, [currentSong]);

  // Listen for global player state changes (simplified)
  useEffect(() => {
    const handlePlayerStateChange = (e: Event) => {
      if (e instanceof CustomEvent && e.detail) {
        setLocalIsPlaying(e.detail.isPlaying);
        if (e.detail.currentSong) {
          setLocalCurrentSong(e.detail.currentSong);
        }
      }
    };

    window.addEventListener('playerStateChanged', handlePlayerStateChange);
    
    return () => {
      window.removeEventListener('playerStateChanged', handlePlayerStateChange);
    };
  }, []);

  return {
    isPlaying: localIsPlaying,
    currentSong: localCurrentSong
  };
};