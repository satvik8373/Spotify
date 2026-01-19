import { useRef, useState, useEffect, useCallback } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { 
  playAudioSafely, 
  configureAudioElement, 
  processAudioURL, 
  isValidAudioURL,
  markUserInteraction,
  audioInterruptionManager,
  InterruptionReason
} from '@/utils/audioManager';
import { resolveArtist } from '@/lib/resolveArtist';

const AudioPlayer = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Store hooks
  const {
    currentSong,
    isPlaying,
    playNext,
    playPrevious,
    setIsPlaying,
    setUserInteracted
  } = usePlayerStore();

  const { streamingQuality } = useSettingsStore();

  // Audio interruption handling
  useEffect(() => {
    const handleInterruption = (_reason: InterruptionReason) => {
      if (isPlaying && audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    };

    const handleResume = () => {
      // Resume playback after interruption if we were playing
      setTimeout(() => {
        if (audioRef.current && audioRef.current.paused) {
          setUserInteracted();
          playAudioSafely(audioRef.current).catch(() => {});
          setIsPlaying(true);
        }
      }, 300);
    };

    audioInterruptionManager.initialize({
      onInterrupted: handleInterruption,
      onResumed: handleResume
    });

    return () => {
      audioInterruptionManager.cleanup();
    };
  }, [isPlaying, setIsPlaying, setUserInteracted]);

  // Initialize audio context on user interaction
  useEffect(() => {
    const handleUserInteraction = () => {
      markUserInteraction();
      setUserInteracted();
    };

    document.addEventListener('click', handleUserInteraction, { once: true, passive: true });
    document.addEventListener('touchstart', handleUserInteraction, { once: true, passive: true });

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, [setUserInteracted]);

  // Configure audio element
  useEffect(() => {
    if (audioRef.current) {
      configureAudioElement(audioRef.current);
    }
  }, []);

  // Handle song changes
  useEffect(() => {
    if (!audioRef.current || !currentSong) return;

    const audio = audioRef.current;
    let songUrl = currentSong.audioUrl;

    // Fix CORS and add quality parameter
    if (songUrl && isValidAudioURL(songUrl)) {
      songUrl = processAudioURL(songUrl);
      
      if (!songUrl.startsWith('blob:')) {
        const separator = songUrl.includes('?') ? '&' : '?';
        const qualityParam = streamingQuality.toLowerCase().replace(/\s+/g, '_');
        songUrl = `${songUrl}${separator}quality=${qualityParam}`;
      }
    }

    // Skip invalid URLs
    if (!isValidAudioURL(songUrl) || songUrl.startsWith('blob:')) {
      console.warn('Invalid audio URL, skipping to next song');
      setTimeout(() => playNext(), 500);
      return;
    }

    // Check if this is the same song (don't reload if same)
    const isSameSong = audio.src === songUrl;
    
    if (!isSameSong) {
      // Only load new song if it's different
      setIsLoading(true);
      audio.pause();
      audio.src = songUrl;
      audio.load();

      const handleCanPlay = () => {
        setIsLoading(false);
        
        if (isPlaying) {
          playAudioSafely(audio).catch((error) => {
            console.error('Playback failed:', error);
            setIsPlaying(false);
          });
        }
        audio.removeEventListener('canplay', handleCanPlay);
      };

      audio.addEventListener('canplay', handleCanPlay);

      return () => {
        audio.removeEventListener('canplay', handleCanPlay);
      };
    }
    // If same song, don't reload - just handle play/pause state
  }, [currentSong, playNext, setIsPlaying, streamingQuality]);

  // Handle play/pause state changes
  useEffect(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;

    if (isPlaying && audio.paused) {
      playAudioSafely(audio).catch((error) => {
        console.error('Playback failed:', error);
        setIsPlaying(false);
      });
    } else if (!isPlaying && !audio.paused) {
      audio.pause();
    }
  }, [isPlaying, setIsPlaying]);

  // Update MediaSession for lock screen controls
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentSong) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title || 'Unknown Title',
        artist: resolveArtist(currentSong),
        album: currentSong.albumId ? String(currentSong.albumId) : 'Unknown Album',
        artwork: [{
          src: currentSong.imageUrl || 'https://cdn.iconscout.com/icon/free/png-256/free-music-1779799-1513951.png',
          sizes: '512x512',
          type: 'image/jpeg'
        }]
      });

      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

      // Set action handlers
      navigator.mediaSession.setActionHandler('play', () => {
        setUserInteracted();
        setIsPlaying(true);
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        setIsPlaying(false);
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        setUserInteracted();
        playPrevious();
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        setUserInteracted();
        playNext();
      });

      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (audioRef.current && details.seekTime !== undefined) {
          audioRef.current.currentTime = details.seekTime;
          setCurrentTime(details.seekTime);
        }
      });

    } catch (error) {
      console.warn('MediaSession setup failed:', error);
    }
  }, [currentSong, isPlaying, setIsPlaying, playNext, playPrevious, setUserInteracted]);

  // Audio event handlers
  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current) return;
    
    const audio = audioRef.current;
    const newCurrentTime = audio.currentTime;
    const newDuration = audio.duration;
    
    setCurrentTime(newCurrentTime);
    
    if (!isNaN(newDuration)) {
      setDuration(newDuration);
    }

    // Update MediaSession position
    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
      try {
        navigator.mediaSession.setPositionState({
          duration: newDuration || 0,
          playbackRate: audio.playbackRate || 1,
          position: newCurrentTime || 0
        });
      } catch (error) {
        // Ignore position state errors
      }
    }
  }, []);

  // Restore saved position when audio is ready
  const restoreSavedPosition = useCallback(() => {
    if (!audioRef.current || !currentSong) return;

    try {
      const savedState = localStorage.getItem('player_state');
      if (savedState) {
        const { currentTime: savedTime, currentSong: savedSong } = JSON.parse(savedState);
        
        // Check if this is the same song
        if (savedTime && savedTime > 0 && savedSong && 
            (savedSong._id === currentSong._id || 
             (savedSong as any).id === (currentSong as any).id ||
             savedSong.title === currentSong.title)) {
          
          const audio = audioRef.current;
          if (audio.duration > 0 && savedTime < audio.duration) {
            audio.currentTime = savedTime;
            setCurrentTime(savedTime);
            console.log('Restored playback position:', savedTime);
          }
        }
      }
    } catch (error) {
      console.error('Error restoring playback position:', error);
    }
  }, [currentSong]);

  const handleSongEnd = useCallback(() => {
    const state = usePlayerStore.getState();
    
    if (state.isRepeating) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
    } else {
      setUserInteracted();
      playNext();
      setIsPlaying(true);
    }
  }, [playNext, setIsPlaying, setUserInteracted]);

  // AudioPlayer should only handle the audio logic, not render UI
  // The PlaybackControls component handles all UI rendering
  return (
    <audio
      ref={audioRef}
      onTimeUpdate={handleTimeUpdate}
      onEnded={handleSongEnd}
      onLoadStart={() => setIsLoading(true)}
      onCanPlay={() => {
        setIsLoading(false);
        // Restore saved position when audio is ready
        restoreSavedPosition();
      }}
      onLoadedMetadata={() => {
        // Also try to restore position when metadata is loaded
        setTimeout(restoreSavedPosition, 100);
      }}
      onWaiting={() => setIsLoading(true)}
      onPlaying={() => setIsLoading(false)}
      onError={() => {
        console.error('Audio error, skipping to next song');
        setTimeout(() => playNext(), 1000);
      }}
      preload="metadata"
      playsInline
      controls={false}
    />
  );
};

export default AudioPlayer;