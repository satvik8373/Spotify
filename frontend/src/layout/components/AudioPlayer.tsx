import { useRef, useState, useEffect, useCallback } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { resolveArtist } from '@/lib/resolveArtist';
import { backgroundAudioManager } from '@/utils/backgroundAudioManager';

const AudioPlayer = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const filtersRef = useRef<BiquadFilterNode[]>([]);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Store hooks
  const {
    currentSong,
    isPlaying,
    playNext,
    setIsPlaying,
    setUserInteracted,
    setCurrentTime: setStoreCurrentTime,
    setDuration: setStoreDuration
  } = usePlayerStore();

  const { streamingQuality, equalizer } = useSettingsStore();

  // Wake Lock management for background audio
  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator) || !isPlaying) return;

    try {
      // Release existing wake lock first
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      }

      // Request new wake lock for screen
      wakeLockRef.current = await navigator.wakeLock.request('screen');
      console.log('Wake lock acquired for background audio');

      // Handle wake lock release and re-request if needed
      wakeLockRef.current.addEventListener('release', () => {
        console.log('Wake lock released');
        wakeLockRef.current = null;
        
        // Re-request wake lock if still playing
        if (isPlaying) {
          setTimeout(() => {
            requestWakeLock();
          }, 1000);
        }
      });

    } catch (error) {
      console.warn('Wake lock request failed:', error);
      
      // Retry wake lock request after a delay
      if (isPlaying) {
        setTimeout(() => {
          requestWakeLock();
        }, 2000);
      }
    }
  }, [isPlaying]);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        console.log('Wake lock released manually');
      } catch (error) {
        console.warn('Wake lock release failed:', error);
      }
    }
  }, []);

  // Manage wake lock based on playing state
  useEffect(() => {
    if (isPlaying) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
  }, [isPlaying, requestWakeLock, releaseWakeLock]);

  // Handle visibility change and page lifecycle for background audio
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!audioRef.current) return;

      const audio = audioRef.current;
      
      if (document.hidden) {
        // Page is hidden (screen off, tab switched, etc.)
        console.log('Page hidden - ensuring audio continues');
        
        // Ensure audio context is running
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume().catch(console.warn);
        }

        // Keep audio playing if it should be playing
        if (isPlaying && audio.paused && audio.src) {
          console.log('Resuming audio playback after screen off');
          audio.play().catch(console.warn);
        }

        // Request wake lock to prevent system interference
        requestWakeLock();
      } else {
        // Page is visible again
        console.log('Page visible - syncing audio state');
        
        // Ensure audio context is running
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume().catch(console.warn);
        }
        
        // Re-request wake lock if playing
        if (isPlaying && !audio.paused) {
          requestWakeLock();
        }
      }
    };

    const handlePageShow = () => {
      console.log('Page show event - resuming audio context');
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(console.warn);
      }
      
      // Ensure audio continues if it should be playing
      if (isPlaying && audioRef.current && audioRef.current.paused && audioRef.current.src) {
        console.log('Resuming audio on page show');
        audioRef.current.play().catch(console.warn);
      }
    };

    const handlePageHide = () => {
      console.log('Page hide event - maintaining audio state');
      // Don't pause audio on page hide - let it continue in background
      // But ensure wake lock is active
      if (isPlaying) {
        requestWakeLock();
      }
    };

    const handleFocus = () => {
      console.log('Window focused - ensuring audio continues');
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(console.warn);
      }
    };

    const handleBlur = () => {
      console.log('Window blurred - maintaining background audio');
      if (isPlaying) {
        requestWakeLock();
      }
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isPlaying, requestWakeLock]);

  // Initialize audio context and equalizer
  const initializeAudioContext = useCallback(() => {
    if (!audioRef.current || audioContextRef.current) return;

    try {
      console.log('Initializing audio context and equalizer...');
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContext();
      const source = audioContext.createMediaElementSource(audioRef.current);
      const gainNode = audioContext.createGain();

      // Create equalizer filters
      const frequencies = [60, 150, 400, 1000, 2400, 15000];
      const filters = frequencies.map((freq, index) => {
        const filter = audioContext.createBiquadFilter();
        filter.type = index === 0 ? 'lowshelf' : index === frequencies.length - 1 ? 'highshelf' : 'peaking';
        filter.frequency.value = freq;
        filter.Q.value = 1;
        filter.gain.value = 0;
        return filter;
      });

      // Connect audio nodes
      source.connect(filters[0]);
      for (let i = 0; i < filters.length - 1; i++) {
        filters[i].connect(filters[i + 1]);
      }
      filters[filters.length - 1].connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Store references
      audioContextRef.current = audioContext;
      sourceNodeRef.current = source;
      gainNodeRef.current = gainNode;
      filtersRef.current = filters;

      console.log('Audio context initialized successfully');
      
      // Apply current equalizer settings
      const frequencies_hz = ['60Hz', '150Hz', '400Hz', '1KHz', '2.4KHz', '15KHz'];
      frequencies_hz.forEach((freq, index) => {
        if (filters[index]) {
          const gainValue = equalizer[freq] || 0;
          filters[index].gain.value = gainValue;
          console.log(`Set ${freq} to ${gainValue}dB`);
        }
      });

    } catch (error) {
      console.warn('Audio context initialization failed:', error);
    }
  }, [equalizer]);

  // Apply equalizer settings
  const applyEqualizerSettings = useCallback(() => {
    if (!filtersRef.current.length) return;

    console.log('Applying equalizer settings:', equalizer);
    const frequencies = ['60Hz', '150Hz', '400Hz', '1KHz', '2.4KHz', '15KHz'];
    frequencies.forEach((freq, index) => {
      if (filtersRef.current[index]) {
        const gainValue = equalizer[freq] || 0;
        filtersRef.current[index].gain.value = gainValue;
        console.log(`Set ${freq} to ${gainValue}dB`);
      }
    });
  }, [equalizer]);

  // Apply streaming quality (affects audio element properties)
  const applyStreamingQuality = useCallback(() => {
    if (!audioRef.current) return;

    console.log('Applying streaming quality:', streamingQuality);
    const audio = audioRef.current;
    
    // Set audio quality preferences based on streaming quality setting
    switch (streamingQuality) {
      case 'Low':
        audio.setAttribute('preload', 'none');
        break;
      case 'Normal':
        audio.setAttribute('preload', 'metadata');
        break;
      case 'High':
      case 'Very High':
        audio.setAttribute('preload', 'auto');
        break;
      default: // Automatic
        audio.setAttribute('preload', 'metadata');
        break;
    }
  }, [streamingQuality]);

  // Simple audio configuration with background playback support
  useEffect(() => {
    if (audioRef.current) {
      const audio = audioRef.current;
      
      // Essential attributes for background audio
      audio.setAttribute('playsinline', 'true');
      audio.setAttribute('preload', 'metadata');
      audio.setAttribute('webkit-playsinline', 'true');
      audio.crossOrigin = 'anonymous';
      
      // Prevent unexpected pauses (system interruptions)
      const handleUnexpectedPause = (e: Event) => {
        // Only intervene if we should be playing and page is visible
        if (isPlaying && !document.hidden && audio.src) {
          console.log('Audio paused unexpectedly, attempting to resume');
          setTimeout(() => {
            if (isPlaying && audio.paused && audio.src) {
              console.log('Resuming audio after unexpected pause');
              audio.play().catch(console.warn);
            }
          }, 100);
        }
      };
      
      audio.addEventListener('pause', handleUnexpectedPause);
      
      // Initialize audio context on first user interaction
      const handleFirstPlay = () => {
        initializeAudioContext();
        audio.removeEventListener('play', handleFirstPlay);
      };
      audio.addEventListener('play', handleFirstPlay);

      // Apply initial settings
      applyStreamingQuality();

      return () => {
        audio.removeEventListener('pause', handleUnexpectedPause);
        audio.removeEventListener('play', handleFirstPlay);
      };
    }
  }, [initializeAudioContext, applyStreamingQuality, isPlaying]);

  // Apply equalizer settings when they change
  useEffect(() => {
    applyEqualizerSettings();
  }, [equalizer, applyEqualizerSettings]);

  // Apply streaming quality when it changes
  useEffect(() => {
    applyStreamingQuality();
  }, [streamingQuality, applyStreamingQuality]);

  // Handle song changes - simplified
  useEffect(() => {
    if (!audioRef.current || !currentSong) return;

    const audio = audioRef.current;
    let songUrl = currentSong.audioUrl || (currentSong as any).url;

    if (!songUrl) {
      console.warn('No audio URL found');
      return;
    }

    // Convert HTTP to HTTPS
    if (songUrl.startsWith('http://')) {
      songUrl = songUrl.replace('http://', 'https://');
    }

    // Check if this is the same song
    const isSameSong = audio.src === songUrl;

    if (!isSameSong) {
      setIsLoading(true);
      audio.pause();
      audio.currentTime = 0;
      audio.src = songUrl;
      audio.load();
    }
  }, [currentSong]);

  // Handle play/pause state changes - with detailed logging
  useEffect(() => {
    console.log('Play/pause effect triggered:', { isPlaying, hasAudio: !!audioRef.current });
    
    if (!audioRef.current) {
      console.log('No audio element found');
      return;
    }

    const audio = audioRef.current;
    console.log('Audio state:', { 
      paused: audio.paused, 
      src: !!audio.src, 
      readyState: audio.readyState,
      currentTime: audio.currentTime 
    });

    if (isPlaying && audio.paused && audio.src) {
      console.log('Attempting to start playback...');
      setUserInteracted();
      
      // Resume audio context if suspended
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        console.log('Resuming suspended audio context');
        audioContextRef.current.resume().catch(console.warn);
      }

      audio.play().then(() => {
        console.log('Audio play() succeeded');
      }).catch((error) => {
        console.error('Playback failed:', error);
        setIsPlaying(false);
      });
    } else if (!isPlaying && !audio.paused) {
      console.log('Pausing playback...');
      audio.pause();
    } else {
      console.log('No action needed:', { 
        shouldPlay: isPlaying, 
        isPaused: audio.paused, 
        hasSrc: !!audio.src 
      });
    }
  }, [isPlaying, setIsPlaying, setUserInteracted]);

  // Enhanced MediaSession setup for background audio
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentSong) return;

    try {
      // Set metadata
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title || 'Unknown Title',
        artist: resolveArtist(currentSong),
        album: currentSong.albumId || 'Unknown Album',
        artwork: [{
          src: currentSong.imageUrl || '',
          sizes: '512x512',
          type: 'image/jpeg'
        }]
      });

      // Set playback state
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

      // Enhanced action handlers for background control
      navigator.mediaSession.setActionHandler('play', () => {
        console.log('MediaSession play action');
        setUserInteracted();
        setIsPlaying(true);
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        console.log('MediaSession pause action');
        setIsPlaying(false);
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        console.log('MediaSession next track action');
        setUserInteracted();
        playNext();
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        console.log('MediaSession previous track action');
        setUserInteracted();
        // Add previous track functionality if available
      });

      // Seek handlers for better control
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (audioRef.current && details.seekTime !== undefined) {
          audioRef.current.currentTime = details.seekTime;
          setStoreCurrentTime(details.seekTime);
        }
      });

    } catch (error) {
      console.warn('MediaSession setup failed:', error);
    }
  }, [currentSong, isPlaying, setIsPlaying, playNext, setUserInteracted, setStoreCurrentTime]);

  // Background audio keep-alive mechanism
  useEffect(() => {
    if (!isPlaying) return;

    const keepAliveInterval = setInterval(() => {
      if (audioRef.current && isPlaying) {
        const audio = audioRef.current;
        
        // Check if audio is unexpectedly paused
        if (audio.paused && audio.src) {
          console.log('Audio paused unexpectedly, attempting to resume');
          audio.play().catch(console.warn);
        }
        
        // Ensure audio context is running
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume().catch(console.warn);
        }
        
        // Send keep-alive to service worker
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'BACKGROUND_AUDIO',
            action: 'KEEP_ALIVE',
            data: { timestamp: Date.now() }
          });
        }
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(keepAliveInterval);
  }, [isPlaying]);

  // Simple event handlers
  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current) return;
    const audio = audioRef.current;
    setStoreCurrentTime(audio.currentTime);
    if (!isNaN(audio.duration)) {
      setStoreDuration(audio.duration);
    }
  }, [setStoreCurrentTime, setStoreDuration]);

  const handleSongEnd = useCallback(() => {
    setUserInteracted();
    playNext();
  }, [playNext, setUserInteracted]);

  const handleCanPlay = useCallback(() => {
    setIsLoading(false);
    
    // Resume audio context if suspended (required for some browsers)
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(console.warn);
    }
    
    if (isPlaying && audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  }, [isPlaying]);

  const handleError = useCallback(() => {
    console.error('Audio error, skipping to next song');
    setTimeout(() => playNext(), 1000);
  }, [playNext]);

  // Cleanup audio context and wake lock on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(console.warn);
      }
      releaseWakeLock();
    };
  }, [releaseWakeLock]);

  return (
    <audio
      ref={audioRef}
      onTimeUpdate={handleTimeUpdate}
      onEnded={handleSongEnd}
      onCanPlay={handleCanPlay}
      onError={handleError}
      onLoadStart={() => setIsLoading(true)}
      onWaiting={() => setIsLoading(true)}
      onPlaying={() => {
        console.log('Audio playing event');
        setIsLoading(false);
      }}
      onPause={() => {
        console.log('Audio pause event');
      }}
      onPlay={() => {
        console.log('Audio play event');
      }}
      preload="metadata"
      playsInline
      controls={false}
    />
  );
};

export default AudioPlayer;