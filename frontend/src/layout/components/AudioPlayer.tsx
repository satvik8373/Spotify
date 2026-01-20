import { useRef, useEffect, useCallback } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { resolveArtist } from '@/lib/resolveArtist';
import { backgroundAudioManager, configureAudioElement } from '@/utils/audioManager';

const AudioPlayer = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const filtersRef = useRef<BiquadFilterNode[]>([]);

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
      const frequencies_hz = ['60Hz', '150Hz', '400Hz', '1KHz', '2.4KHz', '15KHz'] as const;
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
    const frequencies = ['60Hz', '150Hz', '400Hz', '1KHz', '2.4KHz', '15KHz'] as const;
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

  // Initialize audio element with background audio support
  useEffect(() => {
    if (audioRef.current) {
      const audio = audioRef.current;
      
      console.log('🎵 Initializing reliable background audio system');
      
      // Configure audio element for background playback
      configureAudioElement(audio);
      
      // Initialize background audio manager
      backgroundAudioManager.initialize(audio);
      
      // Initialize audio context on first user interaction
      const handleFirstPlay = () => {
        console.log('🎯 First play detected - initializing audio context');
        initializeAudioContext();
        audio.removeEventListener('play', handleFirstPlay);
      };
      audio.addEventListener('play', handleFirstPlay);

      // Apply initial settings
      applyStreamingQuality();

      // Add debugging listeners
      audio.addEventListener('loadstart', () => {
        console.log('📥 Audio load start');
      });

      audio.addEventListener('loadeddata', () => {
        console.log('📊 Audio data loaded');
      });

      audio.addEventListener('canplaythrough', () => {
        console.log('🚀 Audio can play through');
      });

      return () => {
        audio.removeEventListener('play', handleFirstPlay);
      };
    }
  }, [initializeAudioContext, applyStreamingQuality]);

  // Apply equalizer settings when they change
  useEffect(() => {
    applyEqualizerSettings();
  }, [equalizer, applyEqualizerSettings]);

  // Apply streaming quality when it changes
  useEffect(() => {
    applyStreamingQuality();
  }, [streamingQuality, applyStreamingQuality]);

  // Handle song changes
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
      console.log('🎵 Loading new song:', currentSong.title);
      audio.pause();
      audio.currentTime = 0;
      audio.src = songUrl;
      audio.load();
    }
  }, [currentSong]);

  // Handle play/pause state changes and sync with background audio manager
  useEffect(() => {
    console.log('🎛️ Play/pause effect triggered:', { isPlaying, hasAudio: !!audioRef.current });
    
    if (!audioRef.current) {
      console.log('❌ No audio element found');
      return;
    }

    const audio = audioRef.current;
    
    // Update background audio manager
    backgroundAudioManager.setPlaying(isPlaying);
    
    console.log('📊 Audio state:', { 
      paused: audio.paused, 
      src: !!audio.src, 
      readyState: audio.readyState,
      currentTime: audio.currentTime,
      duration: audio.duration,
      networkState: audio.networkState
    });

    if (isPlaying && audio.paused && audio.src) {
      console.log('▶️ Attempting to start playback...');
      setUserInteracted();
      
      // Resume audio context if suspended
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        console.log('🎛️ Resuming suspended audio context');
        audioContextRef.current.resume().catch(console.warn);
      }

      audio.play().then(() => {
        console.log('✅ Audio play() succeeded');
      }).catch((error) => {
        console.error('❌ Playback failed:', error);
        
        // Try again after a short delay
        setTimeout(() => {
          if (audio.paused && audio.src && isPlaying) {
            console.log('🔄 Retrying playback after error');
            audio.play().catch(() => {
              console.error('❌ Retry also failed');
              setIsPlaying(false);
            });
          }
        }, 500);
      });
    } else if (!isPlaying && !audio.paused) {
      console.log('⏸️ Pausing playback...');
      audio.pause();
    } else {
      console.log('ℹ️ No action needed:', { 
        shouldPlay: isPlaying, 
        isPaused: audio.paused, 
        hasSrc: !!audio.src 
      });
    }
  }, [isPlaying, setIsPlaying, setUserInteracted]);

  // MediaSession setup for lock screen controls
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentSong) return;

    // Use the background audio manager's MediaSession setup
    backgroundAudioManager.setupMediaSession({
      title: currentSong.title || 'Unknown Title',
      artist: resolveArtist(currentSong),
      album: currentSong.albumId || 'Unknown Album',
      artwork: currentSong.imageUrl || ''
    });

    // Set additional action handlers that need store access
    try {
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
      console.warn('MediaSession action handlers setup failed:', error);
    }
  }, [currentSong, isPlaying, setIsPlaying, playNext, setUserInteracted, setStoreCurrentTime]);

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

  // Cleanup audio context and background audio manager on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(console.warn);
      }
      backgroundAudioManager.cleanup();
    };
  }, []);

  return (
    <audio
      ref={audioRef}
      onTimeUpdate={handleTimeUpdate}
      onEnded={handleSongEnd}
      onCanPlay={handleCanPlay}
      onError={handleError}
      onLoadStart={() => {
        console.log('📥 Audio load start');
      }}
      onWaiting={() => {
        console.log('⏳ Audio waiting');
      }}
      onPlaying={() => {
        console.log('Audio playing event');
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
