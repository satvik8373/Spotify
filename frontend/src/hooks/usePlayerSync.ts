import { useEffect, useState } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';

/**
 * Custom hook to synchronize play/pause state across all components
 * This ensures that all play/pause buttons update immediately when the state changes
 */
export const usePlayerSync = () => {
  const { isPlaying, currentSong } = usePlayerStore();
  const [localIsPlaying, setLocalIsPlaying] = useState(isPlaying);
  const [localCurrentSong, setLocalCurrentSong] = useState(currentSong);

  // Listen for global player state changes
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

  // Sync local state with store state
  useEffect(() => {
    setLocalIsPlaying(isPlaying);
  }, [isPlaying]);

  useEffect(() => {
    setLocalCurrentSong(currentSong);
  }, [currentSong]);

  return {
    isPlaying: localIsPlaying,
    currentSong: localCurrentSong
  };
};