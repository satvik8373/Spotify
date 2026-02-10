import { useEffect, useState, useRef, useMemo } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';

/**
 * Ultra-optimized player sync hook with minimal re-renders
 * Uses shallow comparison and memoization
 */
export const usePlayerSync = () => {
  const { isPlaying, currentSong } = usePlayerStore();
  const [localIsPlaying, setLocalIsPlaying] = useState(isPlaying);
  const [localCurrentSong, setLocalCurrentSong] = useState(currentSong);
  const updateTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Debounced state sync to prevent rapid updates
  useEffect(() => {
    if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
    
    updateTimeoutRef.current = setTimeout(() => {
      setLocalIsPlaying(isPlaying);
    }, 16); // ~60fps update rate
    
    return () => {
      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
    };
  }, [isPlaying]);

  useEffect(() => {
    // Only update if song actually changed
    if (currentSong?._id !== localCurrentSong?._id) {
      setLocalCurrentSong(currentSong);
    }
  }, [currentSong?._id]);

  // Listen for global player state changes (optimized)
  useEffect(() => {
    const handlePlayerStateChange = (e: Event) => {
      if (e instanceof CustomEvent && e.detail) {
        setLocalIsPlaying(e.detail.isPlaying);
        if (e.detail.currentSong?._id !== localCurrentSong?._id) {
          setLocalCurrentSong(e.detail.currentSong);
        }
      }
    };

    window.addEventListener('playerStateChanged', handlePlayerStateChange, { passive: true });
    
    return () => {
      window.removeEventListener('playerStateChanged', handlePlayerStateChange);
    };
  }, [localCurrentSong?._id]);

  // Memoize return value to prevent object recreation
  return useMemo(() => ({
    isPlaying: localIsPlaying,
    currentSong: localCurrentSong
  }), [localIsPlaying, localCurrentSong]);
};