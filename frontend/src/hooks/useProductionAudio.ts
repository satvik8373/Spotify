import { useRef, useEffect, useState, useCallback } from 'react';

interface UseProductionAudioOptions {
  onTimeUpdate?: (currentTime: number) => void;
  onDurationChange?: (duration: number) => void;
  onEnded?: () => void;
  onError?: (error: string) => void;
}

interface UseProductionAudioReturn {
  audioRef: React.RefObject<HTMLAudioElement>;
  play: () => Promise<void>;
  pause: () => void;
  setSource: (url: string) => void;
  hasUserInteracted: boolean;
  needsUserInteraction: boolean;
  error: string | null;
  isLoading: boolean;
}

/**
 * Production-safe audio hook that handles all common audio issues
 */
export const useProductionAudio = (options: UseProductionAudioOptions = {}): UseProductionAudioReturn => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [needsUserInteraction, setNeedsUserInteraction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Configure audio element for production
  useEffect(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;
    
    // CRITICAL: Production-safe configuration
    audio.setAttribute('playsinline', 'true');
    audio.setAttribute('webkit-playsinline', 'true');
    audio.setAttribute('preload', 'metadata');
    audio.crossOrigin = 'anonymous';
    audio.muted = false;
    audio.volume = 1.0;

    // Event listeners
    const handleTimeUpdate = () => {
      if (options.onTimeUpdate) {
        options.onTimeUpdate(audio.currentTime);
      }
    };

    const handleLoadedMetadata = () => {
      setIsLoading(false);
      if (options.onDurationChange) {
        options.onDurationChange(audio.duration);
      }
    };

    const handleEnded = () => {
      if (options.onEnded) {
        options.onEnded();
      }
    };

    const handleError = () => {
      setIsLoading(false);
      const errorMsg = audio.error ? audio.error.message : 'Audio playback failed';
      setError(errorMsg);
      if (options.onError) {
        options.onError(errorMsg);
      }
    };

    const handleLoadStart = () => {
      setIsLoading(true);
      setError(null);
    };

    // Add event listeners
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadstart', handleLoadStart);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('loadstart', handleLoadStart);
    };
  }, [options]);

  // Production-safe play function
  const play = useCallback(async (): Promise<void> => {
    if (!audioRef.current) {
      throw new Error('Audio element not available');
    }

    const audio = audioRef.current;

    // Check if user has interacted
    if (!hasUserInteracted) {
      setNeedsUserInteraction(true);
      throw new Error('User interaction required');
    }

    try {
      // CRITICAL: Ensure audio is properly configured for iOS
      audio.muted = false;
      audio.volume = 1.0;

      // Attempt to play
      await audio.play();
      setError(null);
      setNeedsUserInteraction(false);
    } catch (err: any) {
      const errorMessage = err.message || 'Playback failed';
      
      if (err.name === 'NotAllowedError') {
        setNeedsUserInteraction(true);
        throw new Error('User interaction required for playback');
      } else {
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    }
  }, [hasUserInteracted]);

  // Pause function
  const pause = useCallback((): void => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  // Set audio source with production-safe URL handling
  const setSource = useCallback((url: string): void => {
    if (!audioRef.current) return;

    // CRITICAL: Force HTTPS in production
    let safeUrl = url;
    if (window.location.protocol === 'https:' && url.startsWith('http://')) {
      safeUrl = url.replace('http://', 'https://');
      console.warn('Converted HTTP URL to HTTPS for production safety:', url, '->', safeUrl);
    }

    audioRef.current.src = safeUrl;
    audioRef.current.load();
    setError(null);
  }, []);

  // Handle user interaction
  useEffect(() => {
    const handleUserInteraction = () => {
      if (!hasUserInteracted) {
        setHasUserInteracted(true);
        setNeedsUserInteraction(false);
      }
    };

    // Listen for any user interaction
    document.addEventListener('click', handleUserInteraction, { once: true });
    document.addEventListener('touchstart', handleUserInteraction, { once: true });
    document.addEventListener('keydown', handleUserInteraction, { once: true });

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, [hasUserInteracted]);

  return {
    audioRef,
    play,
    pause,
    setSource,
    hasUserInteracted,
    needsUserInteraction,
    error,
    isLoading
  };
};