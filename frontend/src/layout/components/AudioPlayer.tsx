import React from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Heart, SkipBack, SkipForward, Play, Pause, Shuffle, Bluetooth, Speaker, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLikedSongsStore } from '@/stores/useLikedSongsStore';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import SongDetailsView from '@/components/SongDetailsView';
import { useMusicStore } from '@/stores/useMusicStore';
import { useAlbumColors } from '@/hooks/useAlbumColors';
import OptimizedImage from '@/components/OptimizedImage';
import { resolveArtist } from '@/lib/resolveArtist';
import { usePhoneInterruption } from '@/hooks/usePhoneInterruption';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { logAudioDebugInfo, checkCommonIssues } from '@/utils/audioDebugger';
import AutoplayBlockedNotice from '@/components/AutoplayBlockedNotice';
import { useIOSAudioFix } from '@/hooks/useIOSAudioFix';

// Helper function to validate URLs - PRODUCTION SAFE
const isValidUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;

  // Allow relative URLs
  if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) return true;

  // Allow blob URLs (they're valid for audio playback)
  if (url.startsWith('blob:')) return true;

  // Allow data URLs
  if (url.startsWith('data:')) return true;

  try {
    const urlObj = new URL(url);
    
    // CRITICAL: In production (HTTPS), only allow secure protocols
    if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
      const allowedProtocols = ['https:', 'blob:', 'data:'];
      if (!allowedProtocols.includes(urlObj.protocol)) {
        console.warn('Insecure protocol detected in production:', urlObj.protocol);
        return false;
      }
    }
    
    // Allow http, https, data, and blob URLs
    return ['http:', 'https:', 'data:', 'blob:'].includes(urlObj.protocol);
  } catch (e) {
    // If URL constructor fails, check if it's a valid-looking URL string
    const isValidPattern = /^(https?|blob|data):\/\/.+/.test(url);
    
    // CRITICAL: In production, be more strict
    if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
      return /^(https|blob|data):\/\/.+/.test(url);
    }
    
    return isValidPattern;
  }
};

// Format time helper function
const formatTime = (seconds: number) => {
  if (isNaN(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

// Create a new component for marquee text animation
const MarqueeText = ({ text, className }: { text: string, className?: string }) => {
  const [needsScroll, setNeedsScroll] = useState(false);
  const [startAnimation, setStartAnimation] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkIfScrollNeeded = () => {
      if (containerRef.current && textRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const textWidth = textRef.current.scrollWidth;
        const needsScrolling = textWidth > containerWidth;
        setNeedsScroll(needsScrolling);

        if (needsScrolling) {
          // Start animation after 3 seconds delay
          setStartAnimation(false);
          const timer = setTimeout(() => setStartAnimation(true), 3000);
          return () => clearTimeout(timer);
        } else {
          setStartAnimation(false);
        }
      }
    };

    checkIfScrollNeeded();
    window.addEventListener('resize', checkIfScrollNeeded);
    return () => window.removeEventListener('resize', checkIfScrollNeeded);
  }, [text]);

  if (!needsScroll) {
    return (
      <div ref={containerRef} className="overflow-hidden w-full">
        <div ref={textRef} className={`truncate ${className}`}>
          {text}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="overflow-hidden w-full relative">
      {/* Fade gradients */}
      <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-black/50 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-black/70 to-transparent z-10 pointer-events-none" />

      <div
        ref={textRef}
        className={className}
        style={{
          display: 'inline-block',
          whiteSpace: 'nowrap',
          paddingRight: '50px',
          animation: startAnimation ? 'marqueeScroll 12s ease-in-out infinite' : 'none',
        }}
      >
        {text}
      </div>
    </div>
  );
};

// Check if MediaSession API is supported
const isMediaSessionSupported = () => {
  return 'mediaSession' in navigator;
};

const AudioPlayer = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const prevSongRef = useRef<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const playTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isHandlingPlayback = useRef(false);
  const loadStarted = useRef<boolean>(false);
  const [isFullscreenMobile, setIsFullscreenMobile] = useState(false);
  const [currentTime, setLocalCurrentTime] = useState(0);
  const [duration, setLocalDuration] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [showSongDetails, setShowSongDetails] = useState(false);
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDevice, setCurrentDevice] = useState<string>('');
  const deviceSelectorRef = useRef<HTMLDivElement>(null);

  const {
    currentSong,
    isPlaying,
    queue,
    playNext,
    setCurrentSong,
    setIsPlaying,
    isShuffled,
    toggleShuffle
  } = usePlayerStore();

  const { likedSongIds, toggleLikeSong } = useLikedSongsStore();
  const albumColors = useAlbumColors(currentSong?.imageUrl);

  // Use phone interruption hook for automatic pause/resume during calls
  const audioFocusState = usePhoneInterruption(audioRef);

  // Apply iOS-specific audio fixes
  const { isIOS } = useIOSAudioFix(audioRef);

  // These may not exist in the store based on linter errors
  const playerStore = usePlayerStore();
  const setCurrentTime = playerStore.setCurrentTime;
  const setDuration = playerStore.setDuration;
  const playPrevious = playerStore.playPrevious;
  const { streamingQuality, equalizer } = useSettingsStore();

  // Web Audio API refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const filtersRef = useRef<BiquadFilterNode[]>([]);
  const isAudioContextInitialized = useRef(false);

  // Initialize Web Audio API
  useEffect(() => {
    if (!audioRef.current || isAudioContextInitialized.current) return;

    try {
      // 1. Create AudioContext
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;

      // 2. Create Source Node
      const source = ctx.createMediaElementSource(audioRef.current);
      sourceNodeRef.current = source;

      // 3. Create Filters
      const frequencies = [60, 150, 400, 1000, 2400, 15000];
      const filters = frequencies.map((freq, index) => {
        const filter = ctx.createBiquadFilter();
        filter.frequency.value = freq;

        // Type of filter based on frequency position
        if (index === 0) {
          filter.type = 'lowshelf';
        } else if (index === frequencies.length - 1) {
          filter.type = 'highshelf';
        } else {
          filter.type = 'peaking';
          filter.Q.value = 1; // Default Q factor
        }
        return filter;
      });
      filtersRef.current = filters;

      // 4. Connect Chain: Source -> Filter 1 -> ... -> Filter N -> Destination
      source.connect(filters[0]);
      for (let i = 0; i < filters.length - 1; i++) {
        filters[i].connect(filters[i + 1]);
      }
      filters[filters.length - 1].connect(ctx.destination);

      isAudioContextInitialized.current = true;
    } catch (error) {
      console.warn('Failed to initialize Web Audio API (non-critical):', error);
      // Continue without Web Audio API features
    }

    return () => {
      // Cleanup is tricky with audio contexts attached to elements, usually better to leave it
      // or check if context state needs closing, but often reusing the audio element complicates full cleanup.
      // We'll leave the graph intact as the component seems persistant.
    };
  }, []);

  // Update Filters when settings change
  useEffect(() => {
    if (!filtersRef.current.length) return;

    const eqValues = [
      equalizer['60Hz'],
      equalizer['150Hz'],
      equalizer['400Hz'],
      equalizer['1KHz'],
      equalizer['2.4KHz'],
      equalizer['15KHz']
    ];

    filtersRef.current.forEach((filter, index) => {
      // Smooth transition for gain changes
      filter.gain.setTargetAtTime(eqValues[index], audioContextRef.current?.currentTime || 0, 0.1);
    });
  }, [equalizer]);


  // Debug function for production troubleshooting
  useEffect(() => {
    // Make debug function available globally for production troubleshooting
    (window as any).debugMavrixfyAudio = () => {
      const { hasUserInteracted } = usePlayerStore.getState();
      const info = logAudioDebugInfo(audioRef.current, hasUserInteracted);
      const issues = checkCommonIssues(audioRef.current, hasUserInteracted);
      
      if (issues.length > 0) {
        console.group('🚨 Potential Issues');
        issues.forEach((issue: string) => console.warn('⚠️', issue));
        console.groupEnd();
      } else {
        console.log('✅ No obvious issues detected');
      }
      
      return { info, issues };
    };
    
    // Clean up on unmount
    return () => {
      delete (window as any).debugMavrixfyAudio;
    };
  }, []);
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (audioRef.current && currentSong) {
        try {
          const playerState = {
            currentSong: currentSong,
            currentTime: audioRef.current.currentTime,
            timestamp: new Date().toISOString()
          };
          localStorage.setItem('player_state', JSON.stringify(playerState));
        } catch (error) {
          // Silent error handling
        }
      }
    };

    // Save state before page unload/refresh
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (playTimeoutRef.current) {
        clearTimeout(playTimeoutRef.current);
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentSong]);

  // Update MediaSession metadata and action handlers
  useEffect(() => {
    // Only proceed if MediaSession API is supported and we have a current song
    if (!isMediaSessionSupported() || !currentSong) {
      return;
    }

    // Function to update metadata that we can reuse
    const updateMediaSessionMetadata = () => {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentSong.title || 'Unknown Title',
          artist: resolveArtist(currentSong),
          album: currentSong.albumId ? String(currentSong.albumId) : 'Unknown Album',
          artwork: [
            {
              src: currentSong.imageUrl || 'https://cdn.iconscout.com/icon/free/png-256/free-music-1779799-1513951.png',
              sizes: '512x512',
              type: 'image/jpeg'
            }
          ]
        });

        // Also update position state if possible
        if ('setPositionState' in navigator.mediaSession && audioRef.current) {
          navigator.mediaSession.setPositionState({
            duration: audioRef.current.duration || 0,
            playbackRate: audioRef.current.playbackRate || 1.0,
            position: audioRef.current.currentTime || 0
          });
        }
      } catch (error) {
        // Silent error handling for MediaSession errors
      }
    };

    // Initial metadata update
    updateMediaSessionMetadata();

    // Update metadata when song changes or playing state changes
    // This ensures lock screen controls always show the right info
    const handleAudioChange = () => {
      updateMediaSessionMetadata();
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    };

    // Listen for events that might indicate song changes
    audioRef.current?.addEventListener('loadedmetadata', handleAudioChange);
    audioRef.current?.addEventListener('play', handleAudioChange);
    audioRef.current?.addEventListener('pause', handleAudioChange);

    // Update metadata
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.title || 'Unknown Title',
      artist: resolveArtist(currentSong),
      album: currentSong.albumId ? String(currentSong.albumId) : 'Unknown Album',
      artwork: [
        {
          src: currentSong.imageUrl || 'https://cdn.iconscout.com/icon/free/png-256/free-music-1779799-1513951.png',
          sizes: '512x512',
          type: 'image/jpeg'
        }
      ]
    });

    // Set up media session action handlers with better responsiveness
    navigator.mediaSession.setActionHandler('play', () => {
      setIsPlaying(true);
      // Explicitly attempt to play for more reliable playback
      if (audioRef.current && audioRef.current.paused) {
        audioRef.current.play().catch(() => {
          // Silent error handling
        });
      }
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      setIsPlaying(false);
      // Explicitly pause to ensure state consistency
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
    });

    navigator.mediaSession.setActionHandler('previoustrack', () => {
      // Mark user interaction to allow autoplay
      usePlayerStore.getState().setUserInteracted();
      // Call previous from store directly for better state handling
      if (playPrevious) {
        playPrevious();
        // Force playing state
        setTimeout(() => {
          if (audioRef.current && audioRef.current.paused) {
            audioRef.current.play().catch(() => { });
          }
        }, 100);
      }
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      // Mark user interaction to allow autoplay
      usePlayerStore.getState().setUserInteracted();
      // Call next from store directly
      playNext();
      // Force playing state
      setTimeout(() => {
        if (audioRef.current && audioRef.current.paused) {
          audioRef.current.play().catch(() => { });
        }
      }, 100);
    });

    // Seeking handlers with better reliability
    try {
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (audioRef.current && details.seekTime !== undefined) {
          audioRef.current.currentTime = details.seekTime;
          setLocalCurrentTime(details.seekTime);
          if (setCurrentTime) {
            setCurrentTime(details.seekTime);
          }

          // Update position state after seeking
          if ('setPositionState' in navigator.mediaSession) {
            navigator.mediaSession.setPositionState({
              duration: audioRef.current.duration,
              playbackRate: audioRef.current.playbackRate,
              position: details.seekTime
            });
          }
        }
      });
    } catch (error) {
      // Silent error handling
    }

    // Position state (shows progress on lock screen for supported browsers)
    try {
      if ('setPositionState' in navigator.mediaSession) {
        const updatePositionState = () => {
          if (audioRef.current && !isNaN(audioRef.current.duration)) {
            navigator.mediaSession.setPositionState({
              duration: audioRef.current.duration,
              playbackRate: audioRef.current.playbackRate,
              position: audioRef.current.currentTime
            });
          }
        };

        // Update position state initially and on time update
        updatePositionState();

        // Use a throttled timeupdate listener for better performance
        let lastPositionUpdate = 0;
        const handleTimeUpdate = () => {
          const now = Date.now();
          if (now - lastPositionUpdate > 1000) { // Update once per second is enough for lock screen
            lastPositionUpdate = now;
            updatePositionState();
          }
        };

        audioRef.current?.addEventListener('timeupdate', handleTimeUpdate);

        // Also update position on play/pause to ensure lock screen is in sync
        audioRef.current?.addEventListener('play', updatePositionState);
        audioRef.current?.addEventListener('pause', updatePositionState);

        return () => {
          audioRef.current?.removeEventListener('timeupdate', handleTimeUpdate);
          audioRef.current?.removeEventListener('play', updatePositionState);
          audioRef.current?.removeEventListener('pause', updatePositionState);
        };
      }
    } catch (error) {
      // Silent error handling
    }

    // Make sure we have proper initialization for lock screen controls
    if (currentSong.audioUrl && isPlaying) {
      setTimeout(() => {
        if (audioRef.current && !isNaN(audioRef.current.duration) && 'setPositionState' in navigator.mediaSession) {
          navigator.mediaSession.setPositionState({
            duration: audioRef.current.duration,
            playbackRate: audioRef.current.playbackRate,
            position: audioRef.current.currentTime
          });
        }
      }, 300);
    }

    // Preload next track for smoother transitions
    const preloadNextTrack = () => {
      if (!currentSong || !queue.length) return;

      const currentIndex = queue.findIndex(song => song._id === currentSong._id);
      if (currentIndex === -1) return;

      const nextIndex = (currentIndex + 1) % queue.length;
      const nextSong = queue[nextIndex];

      if (nextSong && nextSong.audioUrl && isValidUrl(nextSong.audioUrl)) {
        // Create a temporary audio element to preload the next song
        const preloadAudio = new Audio();
        preloadAudio.src = nextSong.audioUrl;
        preloadAudio.load();

        // Set up metadata for lock screen to show next track info
        setTimeout(() => {
          // Clean up preload element to avoid memory leaks
          preloadAudio.src = '';
        }, 3000);
      }
    };

    // Call preload function with a delay to not interfere with current playback
    const preloadTimeout = setTimeout(preloadNextTrack, 2000);

    return () => {
      clearTimeout(preloadTimeout);
      // Clean up event listeners
      audioRef.current?.removeEventListener('loadedmetadata', handleAudioChange);
      audioRef.current?.removeEventListener('play', handleAudioChange);
      audioRef.current?.removeEventListener('pause', handleAudioChange);
    };
  }, [currentSong, setIsPlaying, playNext, playPrevious, setCurrentTime, isPlaying, queue]);

  // Optimized song end handling - consolidated event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    let endingDetectionInterval: NodeJS.Timeout | null = null;
    let lastTimeUpdate = 0;
    let isHandlingEnd = false;

    const handleSongEnd = () => {
      if (isHandlingEnd) return;
      isHandlingEnd = true;

      const state = usePlayerStore.getState();
      state.setUserInteracted();

      if (state.isRepeating) {
        audio.currentTime = 0;
        audio.play().catch(() => { });
        isHandlingEnd = false;
        return;
      }

      // Move to next song
      state.playNext();
      state.setIsPlaying(true);

      setTimeout(() => {
        const newAudio = audioRef.current;
        if (newAudio) {
          newAudio.play().catch(() => { });
        }
        isHandlingEnd = false;
      }, 100);
    };

    // Single consolidated timeupdate listener with throttling
    const handleTimeUpdate = () => {
      const now = Date.now();
      if (now - lastTimeUpdate < 500) return; // Reduced frequency to 500ms
      lastTimeUpdate = now;

      if (!audio || isNaN(audio.duration) || audio.duration <= 0) return;

      // Check for song end
      if (audio.currentTime >= audio.duration - 0.3 && !audio.paused) {
        handleSongEnd();
      }
    };

    // Single event listeners
    audio.addEventListener('ended', handleSongEnd);
    audio.addEventListener('timeupdate', handleTimeUpdate);

    // Reduced frequency background monitor
    endingDetectionInterval = setInterval(() => {
      if (!isPlaying || !audio) return;

      // Background/lockscreen end detection
      if (document.hidden && audio.currentTime >= audio.duration - 0.5) {
        handleSongEnd();
      }

      // Resume paused audio
      if (audio.paused && !audio.ended) {
        audio.play().catch(() => { });
      }
    }, 2000); // Reduced from 1000ms to 2000ms

    return () => {
      audio.removeEventListener('ended', handleSongEnd);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      if (endingDetectionInterval) clearInterval(endingDetectionInterval);
    };
  }, [isPlaying]);

  // Enhanced phone call and audio focus handling - NOW HANDLED BY usePhoneInterruption hook
  // The old code (lines 496-612) has been replaced by the usePhoneInterruption hook

  // Optimized background playback monitor - reduced frequency and skip during interruptions
  useEffect(() => {
    if (!currentSong || !audioRef.current) return;

    const backgroundPlaybackMonitor = setInterval(() => {
      const state = usePlayerStore.getState();
      const audio = audioRef.current;
      if (!audio) return;

      // Skip monitoring if we're interrupted (phone call, etc.)
      if (audioFocusState.isInterrupted) {
        return;
      }

      // Simple checks with reduced frequency
      if (audio.paused && state.isPlaying && !audio.ended && !state.wasPlayingBeforeInterruption) {
        audio.play().catch(() => { });
      }

      // Check for song end in background
      if (!isNaN(audio.duration) && audio.duration > 0) {
        if (audio.ended || (audio.currentTime >= audio.duration - 0.5 && audio.currentTime > 0)) {
          state.playNext();
          state.setIsPlaying(true);
          setTimeout(() => audioRef.current?.play().catch(() => { }), 100);
        }
      }
    }, 2000); // Increased from 1000ms to 2000ms for better battery life

    return () => clearInterval(backgroundPlaybackMonitor);
  }, [currentSong, isPlaying, audioFocusState.isInterrupted]);

  // Enhanced Wake Lock API - release during interruptions, request when playing
  useEffect(() => {
    let wakeLock: any = null;

    // Check if Wake Lock API is available
    const requestWakeLock = async () => {
      // Don't request wake lock if interrupted (phone call, etc.)
      if ('wakeLock' in navigator && isPlaying && currentSong && !audioFocusState.isInterrupted) {
        try {
          // Request a screen wake lock
          wakeLock = await (navigator as any).wakeLock.request('screen');
          console.log('Wake lock acquired');

          // Listen for wake lock release
          wakeLock.addEventListener('release', () => {
            console.log('Wake lock released');
            // If we're still playing and not interrupted, request it again
            if (isPlaying && currentSong && !audioFocusState.isInterrupted) {
              setTimeout(requestWakeLock, 1000);
            }
          });
        } catch (err) {
          console.warn('Wake lock request failed:', err);
        }
      }
    };

    const releaseWakeLock = () => {
      if (wakeLock) {
        wakeLock.release()
          .then(() => {
            wakeLock = null;
          })
          .catch(() => { });
      }
    };

    // Request wake lock when playing and not interrupted
    // Release wake lock when paused or interrupted
    if (isPlaying && currentSong && !audioFocusState.isInterrupted) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    return () => {
      releaseWakeLock();
    };
  }, [isPlaying, currentSong, audioFocusState.isInterrupted]);

  // Handle iOS-specific background playback issues 
  useEffect(() => {
    // Only run on iOS devices
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (!isIOS) return;

    // Set up a dedicated iOS background continuation timer
    // This is critical for iOS which has stricter background restrictions
    const iosBackgroundTimer = setInterval(() => {
      if (document.hidden && isPlaying && audioRef.current) {
        const audio = audioRef.current;
        const audioDuration = audio.duration;

        // Check if audio should be playing but isn't
        if (audio.paused && !audio.ended) {
          audio.play().catch(() => { });
        }

        // Check if we need to advance to the next track
        if (!isNaN(audioDuration) && audioDuration > 0) {
          // If we're at or very near the end
          if (audio.currentTime >= audioDuration - 0.3) {
            // Get fresh state to ensure latest data
            const state = usePlayerStore.getState();

            // Move to next track and ensure playback
            state.playNext();
            state.setIsPlaying(true);

            // Give time for state to update before attempting playback
            setTimeout(() => {
              const freshAudio = audioRef.current;
              if (freshAudio) {
                freshAudio.play().catch(() => { });
              }
            }, 200);
          }
        }
      }
    }, 500);

    return () => {
      clearInterval(iosBackgroundTimer);
    };
  }, [isPlaying, currentSong]);

  // Update audio element configuration for better mobile support
  useEffect(() => {
    if (audioRef.current) {
      const audio = audioRef.current;
      
      // CRITICAL: Configure audio element for production browser compatibility
      audio.setAttribute('playsinline', 'true');
      audio.setAttribute('webkit-playsinline', 'true');
      audio.setAttribute('preload', 'metadata'); // Changed from 'auto' to 'metadata'
      audio.crossOrigin = 'anonymous'; // Required for Web Audio API and CORS
      
      // CRITICAL: iOS Safari specific attributes
      audio.setAttribute('x-webkit-airplay', 'allow');
      audio.setAttribute('controlslist', 'nodownload');
      
      // CRITICAL: Ensure audio is not muted (iOS requirement)
      audio.muted = false;
      audio.volume = 1.0;
      
      // CRITICAL: Set proper MIME type handling
      audio.setAttribute('type', 'audio/mpeg');

      // Set up remote commands early
      if (isMediaSessionSupported()) {
        navigator.mediaSession.setActionHandler('play', () => {
          // Only allow if user has interacted
          if (usePlayerStore.getState().hasUserInteracted) {
            setIsPlaying(true);
            if (audioRef.current && audioRef.current.paused) {
              audioRef.current.play().catch(() => { });
            }
          }
        });

        navigator.mediaSession.setActionHandler('pause', () => {
          setIsPlaying(false);
          if (audioRef.current && !audioRef.current.paused) {
            audioRef.current.pause();
          }
        });

        navigator.mediaSession.setActionHandler('previoustrack', () => {
          usePlayerStore.getState().setUserInteracted();
          if (playPrevious) playPrevious();
        });

        navigator.mediaSession.setActionHandler('nexttrack', () => {
          usePlayerStore.getState().setUserInteracted();
          playNext();
        });
      }

      // Ensure audio continues to play when locked and mixed with other sounds
      if ('mozAudioChannelType' in audioRef.current) {
        // Firefox OS
        (audioRef.current as any).mozAudioChannelType = 'content';
      }
    }
  }, []);

  // Handle audio focus changes on mobile
  useEffect(() => {
    // Function to request audio focus and handle focus change events
    const setupAudioFocus = () => {
      // Ensure we run only in browser environments
      if (!window || !navigator) return;

      // Register to handle phone call interruptions (iOS)
      document.addEventListener('pause', () => {
        // App going to background (iOS only event - different from audio pause)
        if (isPlaying) {
          usePlayerStore.setState({ wasPlayingBeforeInterruption: true });
        }
      });

      document.addEventListener('resume', () => {
        // App resuming from background (iOS only event)
        if (usePlayerStore.getState().wasPlayingBeforeInterruption) {
          setTimeout(() => {
            usePlayerStore.getState().setUserInteracted();
            usePlayerStore.getState().setIsPlaying(true);
            usePlayerStore.setState({ wasPlayingBeforeInterruption: false });
          }, 500);
        }
      });
    };

    setupAudioFocus();

    // No cleanup needed for these global event listeners (they're app-level)
  }, [isPlaying]);

  // Add buffering state detection
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleWaiting = () => {
      setIsLoading(true);
    };

    const handlePlaying = () => {
      setIsLoading(false);
    };

    // Handle stalled playback
    const handleStalled = () => {
      // If we're supposed to be playing but stalled
      if (isPlaying) {
        setTimeout(() => {
          // Try to restart the current song
          const currentTime = audio.currentTime;
          audio.currentTime = currentTime;
          audio.play().catch(() => {
            // Error handling without logging
          });
        }, 2000);
      }
    };

    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('stalled', handleStalled);

    return () => {
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('stalled', handleStalled);
    };
  }, [isPlaying]);

  // Update playback state in MediaSession
  useEffect(() => {
    if (isMediaSessionSupported()) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

      // Enhanced MediaSession control for better lock screen support
      // Re-register nexttrack handler to ensure it's always available
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        // Mark user interaction to allow autoplay
        usePlayerStore.getState().setUserInteracted();
        // Call next from store directly
        usePlayerStore.getState().playNext();
        // Force playing state
        usePlayerStore.getState().setIsPlaying(true);

        // Attempt to play with multiple retries for reliability
        setTimeout(() => {
          if (audioRef.current && audioRef.current.paused) {
            const playPromise = audioRef.current.play();
            if (playPromise) {
              playPromise.catch(() => {
                // Try again if first attempt fails
                setTimeout(() => {
                  if (audioRef.current) {
                    audioRef.current.play().catch(() => { });
                  }
                }, 300);
              });
            }
          }
        }, 100);
      });

      // Maintain position state for lock screen display
      if ('setPositionState' in navigator.mediaSession && audioRef.current) {
        try {
          navigator.mediaSession.setPositionState({
            duration: audioRef.current.duration || 0,
            playbackRate: audioRef.current.playbackRate || 1,
            position: audioRef.current.currentTime || 0
          });
        } catch (e) {
          // Ignore position state errors
        }
      }
    }
  }, [isPlaying]);

  // Lock screen specific MediaSession update interval
  useEffect(() => {
    // Only run if MediaSession API is supported and we're playing
    if (!isMediaSessionSupported() || !isPlaying || !currentSong) return;

    // Update MediaSession position state periodically even when app is in background
    const positionUpdateInterval = setInterval(() => {
      if (audioRef.current && 'setPositionState' in navigator.mediaSession) {
        try {
          navigator.mediaSession.setPositionState({
            duration: audioRef.current.duration || 0,
            playbackRate: audioRef.current.playbackRate || 1,
            position: audioRef.current.currentTime || 0
          });
        } catch (e) {
          // Ignore position state errors
        }
      }
    }, 1000);

    return () => {
      clearInterval(positionUpdateInterval);
    };
  }, [isPlaying, currentSong]);

  // Update like status whenever the current song or likedSongIds changes
  useEffect(() => {
    if (!currentSong) return;

    const songId = (currentSong as any).id || currentSong._id;
    const liked = songId ? likedSongIds?.has(songId) : false;

    setIsLiked(liked);
  }, [currentSong, likedSongIds]);

  // Listen for like updates from other components
  useEffect(() => {
    const handleLikeUpdate = (e: Event) => {
      if (!currentSong) return;

      const songId = (currentSong as any).id || currentSong._id;

      // Check if this event includes details about which song was updated
      if (e instanceof CustomEvent && e.detail) {
        // If we have details and it's not for our current song, ignore
        if (e.detail.songId && e.detail.songId !== songId) {
          return;
        }

        // If we have explicit like state in the event, use it
        if (typeof e.detail.isLiked === 'boolean') {
          setIsLiked(e.detail.isLiked);
          return;
        }
      }

      // Otherwise do a fresh check from the store
      const freshCheck = songId ? likedSongIds?.has(songId) : false;
      setIsLiked(freshCheck);
    };

    document.addEventListener('likedSongsUpdated', handleLikeUpdate);
    document.addEventListener('songLikeStateChanged', handleLikeUpdate);

    return () => {
      document.removeEventListener('likedSongsUpdated', handleLikeUpdate);
      document.removeEventListener('songLikeStateChanged', handleLikeUpdate);
    };
  }, [currentSong, likedSongIds]);

  // Keyboard controls for mobile player
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFullscreenMobile) return;

      if (e.code === 'Space') {
        e.preventDefault();
        playerStore.togglePlay();
      } else if (e.code === 'ArrowLeft') {
        playPrevious();
      } else if (e.code === 'ArrowRight') {
        playNext();
      } else if (e.code === 'Escape') {
        setIsFullscreenMobile(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreenMobile, playNext, playPrevious, playerStore]);

  // handle play/pause logic - PRODUCTION SAFE
  useEffect(() => {
    if (!audioRef.current || isLoading || isHandlingPlayback.current) return;

    const audio = audioRef.current;
    const { hasUserInteracted, autoplayBlocked } = usePlayerStore.getState();

    if (isPlaying) {
      // CRITICAL: Block autoplay if user hasn't interacted
      if (!hasUserInteracted) {
        console.warn('Autoplay blocked - user interaction required');
        setIsPlaying(false);
        usePlayerStore.setState({ autoplayBlocked: true });
        return;
      }

      // CRITICAL: Don't attempt play if previously blocked
      if (autoplayBlocked) {
        console.warn('Autoplay still blocked - waiting for user interaction');
        return;
      }

      // Use a flag to prevent concurrent play/pause operations
      isHandlingPlayback.current = true;

      // Clear any existing timeout
      if (playTimeoutRef.current) {
        clearTimeout(playTimeoutRef.current);
      }

      // CRITICAL: Ensure audio is not muted (iOS requirement)
      audio.muted = false;
      audio.volume = 1.0;

      // Small delay to ensure any previous pause operation is complete
      playTimeoutRef.current = setTimeout(() => {
        const playPromise = audio.play();
        if (playPromise) {
          playPromise
            .then(() => {
              isHandlingPlayback.current = false;
              usePlayerStore.setState({ autoplayBlocked: false });
            })
            .catch((err) => {
              console.warn('Play failed:', err.name, err.message);
              
              // Handle specific autoplay policy errors
              if (err.name === 'NotAllowedError') {
                console.warn('Autoplay policy blocked playback');
                setIsPlaying(false);
                usePlayerStore.setState({ autoplayBlocked: true });
              } else if (err && typeof err.message === 'string' && err.message.includes('interrupted')) {
                // If the error was due to interruption, try again after a short delay
                setTimeout(() => {
                  if (hasUserInteracted) {
                    audio.play().catch(() => {
                      setIsPlaying(false);
                    });
                  }
                }, 300);
              } else {
                setIsPlaying(false);
              }
              isHandlingPlayback.current = false;
            });
        } else {
          isHandlingPlayback.current = false;
        }
      }, 250);
    } else {
      // Also handle pause with a flag to prevent conflicts
      isHandlingPlayback.current = true;

      // Clear any existing timeout
      if (playTimeoutRef.current) {
        clearTimeout(playTimeoutRef.current);
      }

      audio.pause();

      // Release the flag after a short delay
      setTimeout(() => {
        isHandlingPlayback.current = false;
      }, 200);
    }
  }, [isPlaying, isLoading, setIsPlaying]);

  // handle song changes
  useEffect(() => {
    if (!audioRef.current || !currentSong) return;

    const audio = audioRef.current;
    let songUrl = currentSong.audioUrl;

    // Append quality parameter if valid HTTP/HTTPS URL
    if (songUrl && !songUrl.startsWith('blob:') && isValidUrl(songUrl)) {
      const separator = songUrl.includes('?') ? '&' : '?';
      const qualityParam = streamingQuality.toLowerCase().replace(/\s+/g, '_');
      songUrl = `${songUrl}${separator}quality=${qualityParam}`;
    }

    // Validate the URL - be more permissive for production
    if (!isValidUrl(songUrl)) {
      console.warn('Invalid audio URL, attempting to find alternative:', songUrl);
      // Try to find audio for this song

      // Use setTimeout to avoid blocking the UI
      setTimeout(async () => {
        try {
          // Search for the song using the music API
          const searchQuery = `${currentSong.title} ${currentSong.artist}`.trim();
          await useMusicStore.getState().searchIndianSongs(searchQuery);

          const results = useMusicStore.getState().indianSearchResults;

          if (results && results.length > 0) {
            // Found a match, update the song with the audio URL
            const foundSong = results[0];

            // Update the currentSong with the found audio URL
            const updatedSong = {
              ...currentSong,
              audioUrl: foundSong.url || '',
              imageUrl: currentSong.imageUrl || foundSong.image
            };

            // Update the song in the queue
            const currentQueue = usePlayerStore.getState().queue;
            const currentIndex = usePlayerStore.getState().currentIndex;

            const updatedQueue = currentQueue.map((song, idx) =>
              idx === currentIndex ? updatedSong : song
            );

            // Update the player store with the new queue and song
            usePlayerStore.setState({
              queue: updatedQueue,
              currentSong: updatedSong
            });

            // Update the player UI state
            setCurrentSong(updatedSong);

            // Give a small delay for the state to update
            setTimeout(() => {
              // Force a play attempt with the new URL
              if (isPlaying) {
                audioRef.current?.load();
                audioRef.current?.play().catch(() => {
                  // Error handling without toast
                });
              }
            }, 100); // Faster loading
          } else {
            // No results found
            // Skip to the next song after a short delay
            setTimeout(() => {
              playNext();
            }, 500); // Faster skipping
          }
        } catch (error) {
          console.warn('Error finding alternative audio source:', error);
          // Skip to the next song after a short delay
          setTimeout(() => {
            playNext();
          }, 500);
        }
      }, 50); // Faster processing

      return;
    }

    // Check if this is actually a new song
    const isSongChange = prevSongRef.current !== songUrl;
    if (isSongChange) {
      try {
        // Use a loading lock to prevent race conditions
        const loadingLock = Date.now();
        const currentLoadingOperation = loadingLock;

        // Store the current loading operation to check for conflicts (guard for null)
        if (audioRef.current) {
          (audioRef.current as any)._currentLoadingOperation = loadingLock;
        }

        // Indicate loading state to prevent play attempts during load
        setIsLoading(true);
        isHandlingPlayback.current = true;

        // Clear any existing timeout
        if (playTimeoutRef.current) {
          clearTimeout(playTimeoutRef.current);
        }

        // Pause current playback before changing source to prevent conflicts
        audio.pause();

        // CRITICAL: Immediately reset currentTime to 0 to stop previous song audio
        audio.currentTime = 0;

        // Force stop any ongoing playback by setting src to empty first
        audio.src = '';
        audio.load();

        // Also reset the local time state immediately
        setLocalCurrentTime(0);
        if (setCurrentTime) {
          setCurrentTime(0);
        }

        // Set up event listeners for this specific load sequence
        const handleCanPlay = () => {
          // Check if audio element still exists
          const currentAudioEl = audioRef.current;
          if (!currentAudioEl) return;
          // Check if this is still the current loading operation
          if ((currentAudioEl as any)._currentLoadingOperation !== currentLoadingOperation) {
            return;
          }

          // Update state
          setIsLoading(false);
          prevSongRef.current = songUrl;

          if (isPlaying) {
            // Wait a bit before playing to avoid interruption errors
            const playDelayMs = 150; // Reduced delay for faster transitions

            playTimeoutRef.current = setTimeout(() => {
              if (!audioRef.current) return;

              // Check again if loading operation is still current
              if ((audioRef.current as any)._currentLoadingOperation !== currentLoadingOperation) {
                return;
              }

              const playPromise = audioRef.current.play();

              if (playPromise !== undefined) {
                playPromise
                  .then(() => {
                    isHandlingPlayback.current = false;

                    // Set up position state for lock screen again
                    if ('setPositionState' in navigator.mediaSession) {
                      try {
                        navigator.mediaSession.setPositionState({
                          duration: audioRef.current?.duration || 0,
                          playbackRate: audioRef.current?.playbackRate || 1,
                          position: audioRef.current?.currentTime || 0
                        });
                      } catch (e) {
                        // Ignore any errors with position state
                      }
                    }
                  })
                  .catch((err) => {
                    // Handle AbortError specifically
                    if (err && err.name === 'AbortError') {
                      // Wait for any pending operations to complete
                      setTimeout(() => {
                        // Only attempt retry if we're still supposed to be playing
                        if (isPlaying && audioRef.current) {
                          audioRef.current.play().catch(() => {
                            setIsPlaying(false);
                          });
                        }
                      }, 250); // Faster retry
                    } else {
                      setIsPlaying(false);
                    }

                    isHandlingPlayback.current = false;
                  });
              } else {
                isHandlingPlayback.current = false;
              }
            }, playDelayMs);
          } else {
            isHandlingPlayback.current = false;
          }

          // Remove the one-time listener
          if (audio) {
            audio.removeEventListener('canplay', handleCanPlay);
          }
        };

        // Listen for the canplay event which indicates the audio is ready
        audio.addEventListener('canplay', handleCanPlay);

        // Set the new source
        audio.src = songUrl;
        audio.load(); // Explicitly call load to begin fetching the new audio

        // Preload the next song if available
        const nextIndex = (usePlayerStore.getState().currentIndex + 1) % usePlayerStore.getState().queue.length;
        const nextSong = usePlayerStore.getState().queue[nextIndex];
        if (nextSong && nextSong.audioUrl) {
          const preloadAudio = new Audio();
          preloadAudio.src = nextSong.audioUrl;
          preloadAudio.load();
          // Discard after preloading starts
          setTimeout(() => {
            preloadAudio.src = '';
          }, 2000);
        }
      } catch (error) {
        setIsLoading(false);
        isHandlingPlayback.current = false;
      }
    }
  }, [currentSong, isPlaying, setIsPlaying, playNext, setCurrentSong, streamingQuality]);

  // Handle audio errors - improved for production
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleError = (e: ErrorEvent) => {
      console.warn('Audio playback error:', e);
      setIsLoading(false);
      setIsPlaying(false);
      isHandlingPlayback.current = false;

      // Try to recover by finding alternative audio source
      if (currentSong) {
        setTimeout(() => {
          // Attempt to find alternative audio source
          const searchQuery = `${currentSong.title} ${currentSong.artist}`.trim();
          useMusicStore.getState().searchIndianSongs(searchQuery).then(() => {
            const results = useMusicStore.getState().indianSearchResults;
            if (results && results.length > 0) {
              const foundSong = results[0];
              const updatedSong = {
                ...currentSong,
                audioUrl: foundSong.url || (foundSong as any).audioUrl || '',
              };

              // Update current song with new audio URL
              usePlayerStore.getState().setCurrentSong(updatedSong);
            } else {
              // No alternative found, skip to next song
              playNext();
            }
          }).catch(() => {
            // Search failed, skip to next song
            playNext();
          });
        }, 1000);
      }
    };

    audio.addEventListener('error', handleError as any);
    return () => audio.removeEventListener('error', handleError as any);
  }, [setIsPlaying, currentSong, playNext]);

  // Try to restore playback state on mount
  useEffect(() => {
    // This ensures we only try to restore on initial page load, not on remounts
    if (!loadStarted.current) {
      loadStarted.current = true;

      try {
        const savedPlayerState = localStorage.getItem('player_state');
        if (savedPlayerState) {
          const playerState = JSON.parse(savedPlayerState);
          if (playerState.currentSong) {
            // Always set current song even if it's already set
            setCurrentSong(playerState.currentSong);

            // Set mini player to show immediately
            if (!currentSong) {
              setIsFullscreenMobile(false);
            }

            // Don't autoplay immediately on page refresh
            setIsPlaying(false);

            // Restore currentTime after a short delay to ensure audio is ready
            if (playerState.currentTime && playerState.currentTime > 0) {
              setTimeout(() => {
                const audio = document.querySelector('audio');
                if (audio && audio.duration > 0 && playerState.currentTime < audio.duration) {
                  console.log('Delayed restoration of playback position:', playerState.currentTime);
                  audio.currentTime = playerState.currentTime;
                  setCurrentTime(playerState.currentTime);
                }
              }, 1000);
            }
          }
        }
      } catch (error) {
        console.error('Error restoring playback state:', error);
      }
    }
  }, [setCurrentSong, currentSong, setIsPlaying, setCurrentTime]);

  // Save player state on song changes and unmount
  useEffect(() => {
    // Only save if we have a current song
    if (currentSong) {
      const playerState = {
        currentSong,
        timestamp: new Date().toISOString()
      };

      try {
        localStorage.setItem('player_state', JSON.stringify(playerState));
      } catch (error) {
        // Error handling without logging
      }
    }

    // Also save on unmount
    return () => {
      if (currentSong) {
        const playerState = {
          currentSong,
          timestamp: new Date().toISOString()
        };

        try {
          localStorage.setItem('player_state', JSON.stringify(playerState));
        } catch (error) {
          // Error handling without logging
        }
      }
    };
  }, [currentSong]);

  // Handle audio element errors
  const handleError = (_e: any) => {
    // If the current song fails to load, try to play the next song
    if (currentSong) {
      setTimeout(() => playNext(), 1000);
    }
  };

  // Share audio time with other components and update MediaSession
  const updateAudioMetadata = () => {
    if (audioRef.current) {
      const currentTime = audioRef.current.currentTime;
      const duration = audioRef.current.duration;

      // Restore saved currentTime if this is a new song load and we haven't restored yet
      if (currentTime === 0 && duration > 0 && !(audioRef.current as any)._hasRestoredTime) {
        try {
          const savedState = localStorage.getItem('player_state');
          if (savedState) {
            const { currentTime: savedTime, currentSong: savedSong } = JSON.parse(savedState);
            // Check if this is the same song and we have a valid saved time
            const skipUntil = usePlayerStore.getState().skipRestoreUntilTs || 0;
            const now = Date.now();
            if (now < skipUntil) {
              // Skip restoring position right after a track change
            } else if (savedTime && savedTime > 0 && savedTime < duration &&
              savedSong && currentSong &&
              (savedSong._id === currentSong._id ||
                (savedSong as any).id === (currentSong as any).id ||
                savedSong.title === currentSong.title)) {

              console.log('Restoring playback position:', savedTime, 'seconds');
              audioRef.current.currentTime = savedTime;
              setLocalCurrentTime(savedTime);
              if (setCurrentTime) {
                setCurrentTime(savedTime);
              }
              // Mark as restored to prevent multiple restorations
              (audioRef.current as any)._hasRestoredTime = true;
            }
          }
        } catch (error) {
          console.error('Error restoring playback position:', error);
        }
      }

      // Update local state
      setLocalCurrentTime(audioRef.current.currentTime);
      if (!isNaN(duration)) {
        setLocalDuration(duration);
      }

      // Only call these functions if they exist in the store
      if (setCurrentTime) {
        setCurrentTime(audioRef.current.currentTime);
      }
      if (setDuration && !isNaN(duration)) {
        setDuration(duration);
      }

      // Update MediaSession position state if supported
      if (isMediaSessionSupported() && 'setPositionState' in navigator.mediaSession && !isNaN(duration)) {
        try {
          navigator.mediaSession.setPositionState({
            duration: duration,
            playbackRate: audioRef.current.playbackRate,
            position: audioRef.current.currentTime
          });
        } catch (error) {
          // Ignore position state errors
        }
      }
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setLocalCurrentTime(value[0]);
      if (setCurrentTime) {
        setCurrentTime(value[0]);
      }

      // Save the new position immediately
      try {
        const playerState = {
          currentSong: currentSong,
          currentTime: value[0],
          timestamp: new Date().toISOString()
        };
        localStorage.setItem('player_state', JSON.stringify(playerState));
      } catch (error) {
        // Silent error handling
      }
    }
  };

  // Volume UI is not used in this component variant

  const handleLikeToggle = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!currentSong) return;

    const songId = (currentSong as any).id || currentSong._id;

    // Optimistically update UI
    setIsLiked(!isLiked);

    // Actually toggle the like status
    toggleLikeSong(currentSong);

    // Also dispatch a direct event for immediate notification
    document.dispatchEvent(new CustomEvent('songLikeStateChanged', {
      detail: {
        songId,
        song: currentSong,
        isLiked: !isLiked,
        timestamp: Date.now(),
        source: 'AudioPlayer'
      }
    }));
  };

  // Toggle play/pause - PRODUCTION SAFE
  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // CRITICAL: Mark user interaction immediately
    usePlayerStore.getState().setUserInteracted();
    
    // Clear any autoplay blocks since user explicitly clicked
    usePlayerStore.setState({ autoplayBlocked: false });
    
    playerStore.togglePlay();
  };

  // Skip back - PRODUCTION SAFE
  const handlePrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // CRITICAL: Mark user interaction
    usePlayerStore.getState().setUserInteracted();
    usePlayerStore.setState({ autoplayBlocked: false });
    
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
    } else {
      playPrevious();
    }
  };

  // Skip forward - PRODUCTION SAFE
  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // CRITICAL: Mark user interaction
    usePlayerStore.getState().setUserInteracted();
    usePlayerStore.setState({ autoplayBlocked: false });
    
    playNext();
  };

  // Function to handle device selection
  const handleDeviceSelection = async (deviceId: string) => {
    try {
      if (!audioRef.current) return;

      // Store current playback state
      const wasPlaying = !audioRef.current.paused;
      const currentTime = audioRef.current.currentTime;

      // Pause current playback
      if (wasPlaying) {
        audioRef.current.pause();
      }

      // Set the audio output device if browser supports it
      if ('setSinkId' in HTMLMediaElement.prototype) {
        await (audioRef.current as any).setSinkId(deviceId);
        setCurrentDevice(deviceId);

        // Create custom event to notify the system about device change
        document.dispatchEvent(new CustomEvent('audioDeviceChanged', {
          detail: { deviceId }
        }));

        // Resume playback if it was playing
        if (wasPlaying) {
          audioRef.current.currentTime = currentTime;
          audioRef.current.play().catch(() => { });
        }

        // Show success toast
        toast.success('Connected to audio device');
      } else {
        toast.error('Your browser does not support audio output device selection');
      }

      // Close the device selector
      setShowDeviceSelector(false);
    } catch (error) {
      console.error('Error setting audio output device:', error);
      toast.error('Failed to connect to device');
    }
  };

  // Handle fetching available devices
  const fetchAvailableDevices = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        toast.error('Media devices not supported by your browser');
        return;
      }

      // Get user permission if needed
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Get all devices
      const devices = await navigator.mediaDevices.enumerateDevices();

      // Filter to only audio output devices
      const audioOutputDevices = devices.filter(device =>
        device.kind === 'audiooutput' && device.deviceId !== 'default'
      );

      if (audioOutputDevices.length === 0) {
        toast('No external audio devices found');
      }

      setAvailableDevices(audioOutputDevices);

      // Get current device
      if (audioRef.current && 'sinkId' in audioRef.current) {
        setCurrentDevice((audioRef.current as any).sinkId);
      }
    } catch (error) {
      console.error('Error enumerating audio devices:', error);
      toast.error('Could not access audio devices');
    }
  };

  // Toggle device selector visibility
  const toggleDeviceSelector = () => {
    if (!showDeviceSelector) {
      fetchAvailableDevices();
    }
    setShowDeviceSelector(prev => !prev);
  };

  // Close device selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (deviceSelectorRef.current && !deviceSelectorRef.current.contains(e.target as Node)) {
        setShowDeviceSelector(false);
      }
    };

    if (showDeviceSelector) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDeviceSelector]);

  // Listen for device changes
  useEffect(() => {
    const handleDeviceChange = () => {
      if (showDeviceSelector) {
        fetchAvailableDevices();
      }
    };

    navigator.mediaDevices?.addEventListener('devicechange', handleDeviceChange);

    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [showDeviceSelector]);

  // Add enhanced background playback support
  useEffect(() => {
    // Only run when we have a song playing
    if (!currentSong || !isPlaying) return;

    // Handle visibility change specifically for playback
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is now hidden (background)
        // console.log("Page hidden, ensuring background playback");

        // Double check media session availability
        if (isMediaSessionSupported()) {
          // Force update position state for lock screen
          if ('setPositionState' in navigator.mediaSession && audioRef.current) {
            try {
              navigator.mediaSession.setPositionState({
                duration: audioRef.current.duration || 0,
                playbackRate: audioRef.current.playbackRate || 1,
                position: audioRef.current.currentTime || 0
              });
            } catch (e) { }
          }

          // Ensure media session handlers are registered
          navigator.mediaSession.setActionHandler('nexttrack', () => {
            // Mark user interaction to allow autoplay
            usePlayerStore.getState().setUserInteracted();
            // Call next from store directly with enhanced reliability
            const state = usePlayerStore.getState();
            state.playNext();
            state.setIsPlaying(true);

            // Try to force audio to play with multiple attempts
            const playAttempts = [0, 200, 500, 1000];
            playAttempts.forEach(delay => {
              setTimeout(() => {
                const audio = document.querySelector('audio');
                if (audio && audio.paused && !audio.ended) {
                  audio.play().catch(() => { });
                }
              }, delay);
            });
          });

          // Re-register play/pause handlers for reliability
          navigator.mediaSession.setActionHandler('play', () => {
            usePlayerStore.getState().setIsPlaying(true);
            const audio = document.querySelector('audio');
            if (audio && audio.paused) {
              audio.play().catch(() => { });
            }
          });

          navigator.mediaSession.setActionHandler('pause', () => {
            usePlayerStore.getState().setIsPlaying(false);
            const audio = document.querySelector('audio');
            if (audio && !audio.paused) {
              audio.pause();
            }
          });
        }

        // If playing, make sure audio element is actually playing
        if (isPlaying && audioRef.current && audioRef.current.paused && !audioRef.current.ended) {
          audioRef.current.play().catch(() => { });
        }
      } else {
        // Page is visible again
        // console.log("Page visible, checking playback state");

        // If we're supposed to be playing but audio is paused, restart it
        if (isPlaying && audioRef.current?.paused && !audioRef.current?.ended) {
          // console.log("Restarting paused audio after visibility change");
          audioRef.current.play().catch(() => { });
        }

        // Check if we need to update the UI state based on actual audio element state
        if (!isPlaying && audioRef.current && !audioRef.current.paused) {
          // Audio is playing but our state says it's not - sync them
          usePlayerStore.getState().setIsPlaying(true);
        }
      }
    };

    // Handle page visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Setup wake lock for improved background playback (where supported)
    let wakeLock: any = null;

    const requestWakeLock = async () => {
      if ('wakeLock' in navigator) {
        try {
          // Request a screen wake lock to improve background playback
          wakeLock = await (navigator as any).wakeLock.request('screen');
          // console.log('Wake lock acquired for improved playback');

          wakeLock.addEventListener('release', () => {
            // console.log('Wake lock released');
            // Try to reacquire if we're still playing
            if (isPlaying) {
              requestWakeLock();
            }
          });
        } catch (err) {
          // Silent fail for unsupported browsers
        }
      }
    };

    // Request wake lock when playing
    if (isPlaying) {
      requestWakeLock();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      // Release wake lock if we have one
      if (wakeLock) {
        wakeLock.release().catch(() => { });
      }
    };
  }, [currentSong, isPlaying]);

  // Add background playback tracking to detect when a song has ended but not properly advanced
  useEffect(() => {
    // Only run if we have a current song and it's playing
    if (!currentSong || !audioRef.current) return;

    let lastKnownPosition = 0;
    let lastKnownDuration = 0;
    let stagnantPositionCount = 0;
    let checkInterval: NodeJS.Timeout;

    const checkPositionAdvancement = () => {
      const audio = audioRef.current;
      if (!audio) return;

      // Capture current position and duration
      const currentPosition = audio.currentTime;
      const currentDuration = audio.duration;

      // If we have valid duration
      if (!isNaN(currentDuration) && currentDuration > 0) {
        // First time, just store values
        if (lastKnownDuration === 0) {
          lastKnownPosition = currentPosition;
          lastKnownDuration = currentDuration;
          return;
        }

        // Check if we're at the same position as before (indicating possible stall)
        if (Math.abs(currentPosition - lastKnownPosition) < 0.1) {
          stagnantPositionCount++;

          // If position hasn't changed for multiple checks AND we're near the end
          if (stagnantPositionCount > 2 && currentPosition > currentDuration - 3) {
            console.log("Detected stalled playback near end of track, forcing next song");

            // Reset counters
            stagnantPositionCount = 0;
            lastKnownPosition = 0;

            // Advance to next song
            const state = usePlayerStore.getState();
            state.setUserInteracted();
            state.playNext();
            state.setIsPlaying(true);
            return;
          }
        } else {
          // Position is advancing normally, reset stagnant counter
          stagnantPositionCount = 0;
        }

        // Update last known position
        lastKnownPosition = currentPosition;

        // If duration has changed (metadata updated), update it
        if (Math.abs(currentDuration - lastKnownDuration) > 0.1) {
          lastKnownDuration = currentDuration;
        }
      }
    };

    // Check more frequently when we know we're playing
    if (isPlaying) {
      checkInterval = setInterval(checkPositionAdvancement, 2000);
    }

    return () => {
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, [currentSong, isPlaying, playNext]);

  // Don't render anything if no current song - the audio element should always be present
  // but just without a src when there's no song

  return (
    <>
      {/* Autoplay blocked notice */}
      <AutoplayBlockedNotice 
        onUserInteraction={() => {
          // Try to resume playback after user interaction
          if (currentSong && audioRef.current) {
            usePlayerStore.getState().setIsPlaying(true);
            audioRef.current.play().catch(() => {
              console.warn('Failed to resume playback after user interaction');
            });
          }
        }}
      />

      {/* Show SongDetailsView using our existing component */}
      <SongDetailsView
        isOpen={showSongDetails}
        onClose={() => setShowSongDetails(false)}
      />

      {/* Device selector dropdown */}
      {showDeviceSelector && (
        <div
          ref={deviceSelectorRef}
          className="fixed bottom-16 right-4 sm:bottom-16 sm:right-4 z-50 bg-zinc-900 rounded-md shadow-lg border border-zinc-800 w-72 overflow-hidden"
        >
          <div className="flex items-center justify-between p-3 border-b border-zinc-800">
            <h3 className="text-sm font-medium">Connect to a device</h3>
            <button
              onClick={() => setShowDeviceSelector(false)}
              className="text-zinc-400 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {availableDevices.length === 0 ? (
              <div className="p-4 text-sm text-zinc-400 text-center">
                No devices found. Make sure your Bluetooth is on.
              </div>
            ) : (
              <ul className="py-1">
                {/* Default device (this device) */}
                <li
                  className={`px-4 py-2 flex items-center hover:bg-zinc-800 cursor-pointer ${currentDevice === '' ? 'bg-zinc-800/50 text-green-500' : 'text-white'}`}
                  onClick={() => handleDeviceSelection('')}
                >
                  <Speaker size={16} className="mr-2" />
                  <span className="text-sm">This device</span>
                  {currentDevice === '' && (
                    <span className="ml-auto text-xs text-green-500">Connected</span>
                  )}
                </li>

                {/* List of other devices */}
                {availableDevices.map((device) => (
                  <li
                    key={device.deviceId}
                    className={`px-4 py-2 flex items-center hover:bg-zinc-800 cursor-pointer ${currentDevice === device.deviceId ? 'bg-zinc-800/50 text-green-500' : 'text-white'}`}
                    onClick={() => handleDeviceSelection(device.deviceId)}
                  >
                    <Bluetooth size={16} className="mr-2" />
                    <span className="text-sm truncate max-w-[180px]">
                      {device.label || `Device (${device.deviceId.slice(0, 8)}...)`}
                    </span>
                    {currentDevice === device.deviceId && (
                      <span className="ml-auto text-xs text-green-500">Connected</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-zinc-800 p-3">
            <button
              onClick={fetchAvailableDevices}
              className="w-full bg-green-600 hover:bg-green-700 text-white text-xs font-medium py-1.5 px-3 rounded-full"
            >
              Refresh Devices
            </button>
          </div>
        </div>
      )}

      {/* Desktop mini player (only shows when not visible on mobile) */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-gradient-to-b from-zinc-900/80 to-black border-t border-zinc-800/50 h-16 z-40 hidden transition-all duration-300"
        onClick={(e) => {
          e.preventDefault();
          setShowSongDetails(true);
        }}
      >
        <div className="relative h-full flex items-center justify-between px-4">
          {/* Song info / left side */}
          <div className="flex items-center gap-3 flex-1 min-w-0 max-w-[45%]">
            {currentSong && (
              <>
                <div className="h-10 w-10 flex-shrink-0 rounded overflow-hidden cursor-pointer">
                  <img
                    src={currentSong.imageUrl}
                    alt={currentSong.title}
                    className="h-full w-full object-cover bg-zinc-800"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://cdn.iconscout.com/icon/free/png-256/free-music-1779799-1513951.png';
                    }}
                  />
                </div>

                {/* Song info */}
                <div className="truncate min-w-0 flex-1">
                  <MarqueeText
                    text={currentSong.title || "Unknown Title"}
                    className="text-sm font-medium text-white"
                  />
                  <MarqueeText
                    text={resolveArtist(currentSong)}
                    className="text-xs text-zinc-300"
                  />
                </div>
              </>
            )}
          </div>

          {/* Playback controls / right side */}
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 text-white p-0"
              onClick={handlePrevious}
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            <Button
              size="icon"
              className="h-10 w-10 rounded-full bg-white text-black flex items-center justify-center p-0"
              onClick={handlePlayPause}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4 translate-x-0.5" />
              )}
            </Button>

            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 text-white p-0"
              onClick={handleNext}
            >
              <SkipForward className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'text-white hover:bg-white/10 h-9 w-9',
                isLiked && 'text-green-500'
              )}
              onClick={handleLikeToggle}
            >
              <Heart
                className="h-4 w-4"
                fill={isLiked ? 'currentColor' : 'none'}
              />
            </Button>

            {/* Bluetooth/Device Connection Button */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'text-white hover:bg-white/10 h-9 w-9 ml-1',
                showDeviceSelector && 'text-green-500 bg-white/10'
              )}
              onClick={(e) => {
                e.stopPropagation();
                toggleDeviceSelector();
              }}
            >
              <Bluetooth className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Progress bar for desktop mini */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
          <div
            className="h-full bg-green-500"
            style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
          />
        </div>
      </div>

      {/* Fullscreen mobile player */}
      {isFullscreenMobile && currentSong && (
        <div
          className="fixed inset-0 z-50 bg-black flex flex-col"
          style={{
            background: albumColors.isLight
              ? `linear-gradient(to bottom, ${albumColors.secondary.replace('rgb', 'rgba').replace(')', ', 0.95)')}, ${albumColors.primary.replace('rgb', 'rgba').replace(')', ', 0.85)')})`
              : `linear-gradient(to bottom, ${albumColors.primary.replace('rgb', 'rgba').replace(')', ', 0.95)')}, ${albumColors.secondary.replace('rgb', 'rgba').replace(')', ', 0.85)')})`
          }}
        >
          {/* Close button */}
          <div className="flex justify-between items-center p-4">
            <button
              onClick={() => setIsFullscreenMobile(false)}
              className="text-white p-2"
            >
              <X className="h-6 w-6" />
            </button>
            <div className="text-white text-sm">Now Playing</div>
            <div className="w-10"></div> {/* Empty div for layout balance */}
          </div>

          {/* Album art */}
          <div className="flex-1 flex items-center justify-center p-6">
            <div
              className="w-full max-w-xs aspect-square rounded-md overflow-hidden shadow-2xl"
              style={{ boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)" }}
            >
              <OptimizedImage
                src={currentSong.imageUrl}
                alt={currentSong.title}
                className="w-full h-full object-cover"
                width={300}
                height={300}
                quality={85}
                priority={true}
                fallbackSrc="https://cdn.iconscout.com/icon/free/png-256/free-music-1779799-1513951.png"
              />
            </div>
          </div>

          {/* Song info */}
          <div className="px-6 pt-4">
            <h2
              className={cn(
                "text-xl font-bold truncate mb-1 audio-title-high-contrast",
                albumColors.isLight ? "audio-title-light" : "audio-title-dark"
              )}
            >
              {currentSong.title}
            </h2>
            <p
              className={cn(
                "text-sm truncate mb-6 audio-title-high-contrast",
                albumColors.isLight ? "audio-title-light" : "audio-title-dark"
              )}
            >
              {currentSong.artist}
            </p>
          </div>

          {/* Progress bar */}
          <div className="px-6 mb-2">
            <div className="flex items-center gap-2">
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={1}
                className="cursor-pointer"
                onValueChange={handleSeek}
              />
            </div>
            <div className="flex justify-between mt-1 mb-6">
              <span
                className={cn(
                  "text-xs",
                  albumColors.isLight ? "text-black/70" : "text-white/70"
                )}
              >
                {formatTime(currentTime)}
              </span>
              <span
                className={cn(
                  "text-xs",
                  albumColors.isLight ? "text-black/70" : "text-white/70"
                )}
              >
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Playback controls */}
          <div className="px-6 pb-12">
            <div className="flex items-center justify-between mb-8">
              <Button
                size="icon"
                variant="ghost"
                className={cn(
                  "h-10 w-10",
                  isShuffled ? "text-green-500" : albumColors.isLight ? "text-black/70" : "text-white/70"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleShuffle();
                }}
              >
                <Shuffle className="h-5 w-5" />
              </Button>

              <Button
                size="icon"
                variant="ghost"
                className={cn(
                  "h-10 w-10",
                  albumColors.isLight ? "text-black" : "text-white"
                )}
                onClick={handlePrevious}
              >
                <SkipBack className="h-6 w-6" />
              </Button>

              <Button
                size="icon"
                className={cn(
                  "h-14 w-14 rounded-full flex items-center justify-center",
                  albumColors.isLight ? "bg-black text-white" : "bg-white text-black"
                )}
                onClick={handlePlayPause}
              >
                {isPlaying ? (
                  <Pause className="h-7 w-7" />
                ) : (
                  <Play className="h-7 w-7 ml-1" />
                )}
              </Button>

              <Button
                size="icon"
                variant="ghost"
                className={cn(
                  "h-10 w-10",
                  albumColors.isLight ? "text-black" : "text-white"
                )}
                onClick={handleNext}
              >
                <SkipForward className="h-6 w-6" />
              </Button>

              <Button
                size="icon"
                variant="ghost"
                className={cn(
                  "h-10 w-10",
                  isLiked ? "text-green-500" : albumColors.isLight ? "text-black/70" : "text-white/70"
                )}
                onClick={handleLikeToggle}
              >
                <Heart className="h-5 w-5" fill={isLiked ? "currentColor" : "none"} />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Single audio element - PRODUCTION SAFE */}
      <audio
        ref={audioRef}
        src={currentSong?.audioUrl && isValidUrl(currentSong.audioUrl) ? 
          // CRITICAL: Ensure HTTPS and proper quality parameter
          (() => {
            let url = currentSong.audioUrl;
            // Force HTTPS for production
            if (url.startsWith('http://')) {
              url = url.replace('http://', 'https://');
            }
            // Add quality parameter if not a blob URL
            if (!url.startsWith('blob:')) {
              const separator = url.includes('?') ? '&' : '?';
              const qualityParam = streamingQuality.toLowerCase().replace(/\s+/g, '_');
              url = `${url}${separator}quality=${qualityParam}`;
            }
            return url;
          })()
          : undefined}
        // CRITICAL: Never autoplay on page load
        autoPlay={false}
        onLoadStart={() => {
          // Reset restoration flag when loading new audio
          if (audioRef.current) {
            (audioRef.current as any)._hasRestoredTime = false;
          }
        }}
        onTimeUpdate={(e) => {
          updateAudioMetadata();

          // Save currentTime to localStorage periodically (every 5 seconds)
          const audio = e.currentTarget;
          const currentTime = audio.currentTime;
          const duration = audio.duration;

          // Save every 5 seconds to ensure persistence
          if (currentTime > 0 && duration > 0 && Math.floor(currentTime) % 5 === 0) {
            try {
              const playerState = {
                currentSong: currentSong,
                currentTime: currentTime,
                timestamp: new Date().toISOString()
              };
              localStorage.setItem('player_state', JSON.stringify(playerState));
            } catch (error) {
              // Silent error handling
            }
          }

          // Check if we're near the end of the song (within last 1.5 seconds)
          // This helps ensure transitions work even in background/lock screen
          if (audio && audio.duration && !isNaN(audio.duration) &&
            audio.currentTime > 0 && !audio.paused &&
            audio.duration - audio.currentTime < 1.5) {

            // Create a flag to prevent multiple triggers
            if (!(audio as any)._isHandlingEndOfSong) {
              (audio as any)._isHandlingEndOfSong = true;

              // Prepare for next song
              console.log("Near end of song, preparing next track");

              // Ensure media session is updated for lock screen
              if (isMediaSessionSupported() && 'setPositionState' in navigator.mediaSession) {
                try {
                  navigator.mediaSession.setPositionState({
                    duration: audio.duration,
                    playbackRate: audio.playbackRate,
                    position: audio.currentTime
                  });
                } catch (e) {
                  // Ignore position state errors
                }
              }

              // Schedule next song to play when current song ends
              setTimeout(() => {
                if (usePlayerStore.getState().isRepeating) {
                  // Reset the current song
                  audio.currentTime = 0;
                  audio.play().catch(() => { });
                } else {
                  console.log("Auto advancing to next song near end");
                  const state = usePlayerStore.getState();
                  state.setUserInteracted();
                  state.playNext();
                  state.setIsPlaying(true);

                  // For background/lock screen playback, we need to be more aggressive
                  // in ensuring the audio element actually starts playing
                  setTimeout(() => {
                    const newAudio = document.querySelector('audio');
                    if (newAudio && newAudio.paused) {
                      // Try multiple times with increasing delays
                      const playAttempts = [0, 100, 300, 700];
                      playAttempts.forEach((delay) => {
                        setTimeout(() => {
                          if (newAudio.paused && !newAudio.ended) {
                            newAudio.play().catch(() => { });
                          }
                        }, delay);
                      });
                    }
                  }, 50);
                }
                // Reset flag after handling
                (audio as any)._isHandlingEndOfSong = false;
              }, 800); // Reduced from 1000ms to 800ms to start transition sooner
            }
          } else {
            // Reset the flag when not at the end
            if ((audio as any)._isHandlingEndOfSong && audio.duration - audio.currentTime >= 1.5) {
              (audio as any)._isHandlingEndOfSong = false;
            }
          }
        }}
        onLoadedMetadata={() => {
          updateAudioMetadata();

          // Additional restoration attempt when metadata is loaded
          setTimeout(() => {
            try {
              const savedState = localStorage.getItem('player_state');
              if (savedState && audioRef.current) {
                const { currentTime: savedTime, currentSong: savedSong } = JSON.parse(savedState);
                const currentTime = audioRef.current.currentTime;
                const duration = audioRef.current.duration;

                const skipUntil2 = usePlayerStore.getState().skipRestoreUntilTs || 0;
                const now2 = Date.now();
                if (now2 < skipUntil2) {
                  // Skip restore while transitioning to a new track
                } else if (savedTime && savedTime > 0 && savedTime < duration &&
                  savedSong && currentSong &&
                  (savedSong._id === currentSong._id ||
                    (savedSong as any).id === (currentSong as any).id ||
                    savedSong.title === currentSong.title) &&
                  currentTime === 0) {

                  console.log('Metadata loaded - restoring playback position:', savedTime);
                  audioRef.current.currentTime = savedTime;
                  setLocalCurrentTime(savedTime);
                  if (setCurrentTime) {
                    setCurrentTime(savedTime);
                  }
                }
              }
            } catch (error) {
              console.error('Error in metadata restoration:', error);
            }
          }, 500);
        }}
        onError={handleError}
        // CRITICAL: Production-safe audio element attributes
        preload="metadata"
        playsInline={true}
        webkit-playsinline="true"
        x-webkit-airplay="allow"
        crossOrigin="anonymous"
        muted={false}
        loop={usePlayerStore.getState().isRepeating}
        data-testid="audio-element"
        onEnded={() => {
          console.log("Audio onEnded event triggered");
          // Clear any existing handler flag
          if (audioRef.current) {
            (audioRef.current as any)._isHandlingEndOfSong = false;
          }

          // Use a more reliable method to play the next song
          const state = usePlayerStore.getState();
          state.setUserInteracted();

          // Delay slightly to avoid race conditions
          setTimeout(() => {
            // Double check that the audio is really ended
            if (audioRef.current && (audioRef.current.ended || audioRef.current.currentTime >= audioRef.current.duration - 0.5)) {
              if (state.isRepeating) {
                // Restart current song
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch(() => { });
              } else {
                // Play next song
                state.playNext();
                state.setIsPlaying(true);

                // Force the audio element to update - use multiple attempts for reliability
                // This is crucial for background/lock screen playback
                const playAttempts = [0, 100, 300, 700, 1500];
                playAttempts.forEach((delay) => {
                  setTimeout(() => {
                    const newAudio = document.querySelector('audio');
                    if (newAudio && newAudio.paused && !newAudio.ended) {
                      newAudio.play().catch(() => { });

                      // Also update MediaSession for lock screen
                      if (isMediaSessionSupported()) {
                        navigator.mediaSession.playbackState = 'playing';
                      }
                    }
                  }, delay);
                });
              }
            }
          }, 50); // Reduced from 100ms to 50ms for faster response
        }}
        onPause={() => {
          // Check if this is an unintended pause (like system-initiated)
          // but only if we're supposed to be playing
          if (isPlaying && !document.hidden) {
            console.log("Detected unintended pause, attempting to resume");
            // Try to resume playback after a short delay
            setTimeout(() => {
              const audio = audioRef.current;
              if (audio && audio.paused && isPlaying && !audio.ended) {
                audio.play().catch(() => { });
              }
            }, 500);
          }
        }}
        onPlay={() => {
          // Ensure store state is in sync with actual audio element state
          if (!isPlaying) {
            usePlayerStore.getState().setIsPlaying(true);
          }
        }}
        onWaiting={() => {
          // Handle waiting/buffering state
          setIsLoading(true);
        }}
        onCanPlay={() => {
          // Handle ready state
          setIsLoading(false);

          // Final restoration attempt when audio can play
          setTimeout(() => {
            try {
              const savedState = localStorage.getItem('player_state');
              if (savedState && audioRef.current) {
                const { currentTime: savedTime, currentSong: savedSong } = JSON.parse(savedState);
                const currentTime = audioRef.current.currentTime;
                const duration = audioRef.current.duration;

                const skipUntil3 = usePlayerStore.getState().skipRestoreUntilTs || 0;
                const now3 = Date.now();
                if (now3 < skipUntil3) {
                  // Skip restore while transitioning to a new track
                } else if (savedTime && savedTime > 0 && savedTime < duration &&
                  savedSong && currentSong &&
                  (savedSong._id === currentSong._id ||
                    (savedSong as any).id === (currentSong as any).id ||
                    savedSong.title === currentSong.title) &&
                  currentTime === 0) {

                  console.log('Can play - restoring playback position:', savedTime);
                  audioRef.current.currentTime = savedTime;
                  setLocalCurrentTime(savedTime);
                  if (setCurrentTime) {
                    setCurrentTime(savedTime);
                  }
                }
              }
            } catch (error) {
              console.error('Error in can play restoration:', error);
            }
          }, 200);

          // Try to play if we're supposed to be playing
          if (isPlaying && audioRef.current?.paused) {
            audioRef.current.play().catch(() => { });
          }
        }}
        controls={false}
      />
    </>
  );
};

export default AudioPlayer;
