import { useRef, useState, useEffect, useCallback } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { resolveArtist } from '@/lib/resolveArtist';

const AudioPlayer = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const filtersRef = useRef<BiquadFilterNode[]>([]);
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

  // Simple audio configuration
  useEffect(() => {
    if (audioRef.current) {
      const audio = audioRef.current;
      audio.setAttribute('playsinline', 'true');
      audio.setAttribute('preload', 'metadata');
      audio.crossOrigin = 'anonymous';
      
      // Initialize audio context on first user interaction
      const handleFirstPlay = () => {
        initializeAudioContext();
        audio.removeEventListener('play', handleFirstPlay);
      };
      audio.addEventListener('play', handleFirstPlay);

      // Apply initial settings
      applyStreamingQuality();
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

  // Handle play/pause state changes - simplified
  useEffect(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;

    if (isPlaying && audio.paused && audio.src) {
      setUserInteracted();
      audio.play().catch((error) => {
        console.error('Playback failed:', error);
        setIsPlaying(false);
      });
    } else if (!isPlaying && !audio.paused) {
      audio.pause();
    }
  }, [isPlaying, setIsPlaying, setUserInteracted]);

  // Simple MediaSession setup
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentSong) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title || 'Unknown Title',
        artist: resolveArtist(currentSong),
        artwork: [{
          src: currentSong.imageUrl || '',
          sizes: '512x512',
          type: 'image/jpeg'
        }]
      });

      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

      // Simple action handlers
      navigator.mediaSession.setActionHandler('play', () => {
        setUserInteracted();
        setIsPlaying(true);
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        setIsPlaying(false);
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        setUserInteracted();
        playNext();
      });

    } catch (error) {
      console.warn('MediaSession setup failed:', error);
    }
  }, [currentSong, isPlaying, setIsPlaying, playNext, setUserInteracted]);

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

  // Cleanup audio context on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(console.warn);
      }
    };
  }, []);

  return (
    <audio
      ref={audioRef}
      onTimeUpdate={handleTimeUpdate}
      onEnded={handleSongEnd}
      onCanPlay={handleCanPlay}
      onError={handleError}
      onLoadStart={() => setIsLoading(true)}
      onWaiting={() => setIsLoading(true)}
      onPlaying={() => setIsLoading(false)}
      preload="metadata"
      playsInline
      controls={false}
    />
  );
};

export default AudioPlayer;