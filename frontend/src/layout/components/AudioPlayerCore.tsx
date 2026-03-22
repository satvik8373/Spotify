import React, { useRef, useEffect, useCallback } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { usePhoneInterruption } from '../../hooks/usePhoneInterruption';
import { unlockAudioOnIOS, isIOS } from '@/utils/iosAudioFix';
import { useAudioBridge } from '@/hooks/useAudioBridge';
import { precacheUpcomingTracks, cacheAudioUrl } from '@/utils/audioCache';
import { shallow } from 'zustand/shallow';

const isValidUrl = (url: string): boolean => {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const normalizeAudioUrl = (url?: string): string => {
  if (!url || url.startsWith('blob:')) return '';
  return url.replace(/^http:\/\//, 'https://');
};

const isAbortError = (error: unknown): boolean => {
  return error instanceof DOMException && error.name === 'AbortError';
};

interface AudioPlayerCoreProps {
  audioRef: React.RefObject<HTMLAudioElement>;
  onTimeUpdate: (currentTime: number, duration: number) => void;
  onLoadingChange: (loading: boolean) => void;
}

const AudioPlayerCore: React.FC<AudioPlayerCoreProps> = ({
  audioRef,
  onTimeUpdate,
  onLoadingChange,
}) => {
  const loadStartedRef = useRef(false);
  const pendingRestoreTimeRef = useRef<number | null>(null);
  const isSourceChangingRef = useRef(false);
  const playRequestIdRef = useRef(0);
  const lastTimeUpdateRef = useRef(0);

  const {
    currentSong,
    isPlaying,
    isRepeating,
    setCurrentSong,
    setIsPlaying,
    setCurrentTime,
    setDuration,
  } = usePlayerStore(
    (state) => ({
      currentSong: state.currentSong,
      isPlaying: state.isPlaying,
      isRepeating: state.isRepeating,
      setCurrentSong: state.setCurrentSong,
      setIsPlaying: state.setIsPlaying,
      setCurrentTime: state.setCurrentTime,
      setDuration: state.setDuration,
    }),
    shallow
  );

  const { initializeBridge } = useAudioBridge(audioRef);

  // Keep interruption handling active (side effects are required for phone/Bluetooth focus changes).
  usePhoneInterruption(audioRef);

  const attemptPlay = useCallback(
    async (audio: HTMLAudioElement) => {
      const requestId = ++playRequestIdRef.current;

      try {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          await playPromise;
        }

        if (playRequestIdRef.current !== requestId) {
          return;
        }

        const store = usePlayerStore.getState();
        if (!store.isPlaying) {
          store.setIsPlaying(true);
        }
        isSourceChangingRef.current = false;
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }

        if (playRequestIdRef.current === requestId) {
          usePlayerStore.getState().setIsPlaying(false);
          isSourceChangingRef.current = false;
        }
      }
    },
    []
  );

  // Initialize lock-screen handlers on first interaction.
  useEffect(() => {
    const handleFirstInteraction = () => {
      if (isIOS()) {
        unlockAudioOnIOS();
      }
      initializeBridge();
    };

    document.addEventListener('touchstart', handleFirstInteraction, {
      once: true,
      passive: true,
    });
    document.addEventListener('click', handleFirstInteraction, { once: true });
    document.addEventListener('keydown', handleFirstInteraction, { once: true });

    return () => {
      document.removeEventListener('touchstart', handleFirstInteraction);
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
  }, [initializeBridge]);

  // Persist current playback point before unload.
  useEffect(() => {
    const handleBeforeUnload = () => {
      const audio = audioRef.current;
      const song = usePlayerStore.getState().currentSong;

      if (!audio || !song) return;

      try {
        localStorage.setItem(
          'player_state',
          JSON.stringify({
            currentSong: song,
            currentTime: audio.currentTime,
            timestamp: new Date().toISOString(),
          })
        );
      } catch {
        // Ignore localStorage write errors.
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [audioRef]);

  // Restore persisted song and position on first mount (no autoplay).
  useEffect(() => {
    if (loadStartedRef.current) return;
    loadStartedRef.current = true;

    try {
      const saved = localStorage.getItem('player_state');
      if (!saved) return;

      const parsed = JSON.parse(saved);
      if (parsed.currentSong) {
        setCurrentSong(parsed.currentSong);
        setIsPlaying(false);
      }

      if (typeof parsed.currentTime === 'number' && parsed.currentTime > 0) {
        pendingRestoreTimeRef.current = parsed.currentTime;
        setCurrentTime(parsed.currentTime);
      }
    } catch {
      // Ignore localStorage parse errors.
    }
  }, [setCurrentSong, setCurrentTime, setIsPlaying]);

  const audioUrl = normalizeAudioUrl(currentSong?.audioUrl);

  // Load new source only when URL changes; avoid aggressive pause/play loops.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const currentAttrSrc = audio.getAttribute('src') || '';

    if (!audioUrl) {
      playRequestIdRef.current += 1;
      isSourceChangingRef.current = true;
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      isSourceChangingRef.current = false;
      onLoadingChange(false);
      onTimeUpdate(0, 0);
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    if (currentAttrSrc === audioUrl) {
      return;
    }

    isSourceChangingRef.current = true;
    playRequestIdRef.current += 1;
    onLoadingChange(true);

    audio.pause();
    audio.currentTime = 0;
    audio.setAttribute('src', audioUrl);
    audio.load();

    const handleCanPlay = () => {
      onLoadingChange(false);

      const store = usePlayerStore.getState();
      if (store.isPlaying && store.hasUserInteracted) {
        void attemptPlay(audio);
      } else {
        isSourceChangingRef.current = false;
      }
    };

    const handleLoadError = () => {
      isSourceChangingRef.current = false;
      onLoadingChange(false);
      usePlayerStore.getState().setIsPlaying(false);
    };

    audio.addEventListener('canplay', handleCanPlay, { once: true });
    audio.addEventListener('error', handleLoadError, { once: true });

    return () => {
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleLoadError);
    };
  }, [audioRef, audioUrl, attemptPlay, onLoadingChange, onTimeUpdate, setCurrentTime, setDuration]);

  // React to play/pause state from store.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const store = usePlayerStore.getState();

    if (isPlaying) {
      if (!store.hasUserInteracted) {
        store.setIsPlaying(false);
        return;
      }

      if (audio.readyState >= 2) {
        void attemptPlay(audio);
        return;
      }

      const handleCanPlay = () => {
        const freshStore = usePlayerStore.getState();
        if (freshStore.isPlaying) {
          void attemptPlay(audio);
        }
      };

      audio.addEventListener('canplay', handleCanPlay, { once: true });
      return () => {
        audio.removeEventListener('canplay', handleCanPlay);
      };
    }

    playRequestIdRef.current += 1;
    if (!audio.paused) {
      audio.pause();
    }
  }, [audioRef, attemptPlay, isPlaying]);

  // Single authoritative audio event wiring.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const applyPendingRestoreTime = () => {
      const restoreTime = pendingRestoreTimeRef.current;
      if (restoreTime === null) return;

      const duration = audio.duration;
      if (!Number.isFinite(duration) || duration <= 0 || restoreTime >= duration) {
        pendingRestoreTimeRef.current = null;
        return;
      }

      audio.currentTime = restoreTime;
      setCurrentTime(restoreTime);
      onTimeUpdate(restoreTime, duration);
      pendingRestoreTimeRef.current = null;
    };

    const handleTimeUpdate = () => {
      const now = performance.now();
      if (now - lastTimeUpdateRef.current < 250) return;
      lastTimeUpdateRef.current = now;

      const currentTime = audio.currentTime || 0;
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;

      setCurrentTime(currentTime);
      if (duration > 0) {
        setDuration(duration);
      }
      onTimeUpdate(currentTime, duration);
    };

    const handleLoadedMetadata = () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      setDuration(duration);
      applyPendingRestoreTime();
      onTimeUpdate(audio.currentTime || 0, duration);
    };

    const handleDurationChange = () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      setDuration(duration);
    };

    const handleEnded = () => {
      const store = usePlayerStore.getState();

      if (store.isRepeating) {
        audio.currentTime = 0;
        if (store.isPlaying) {
          void attemptPlay(audio);
        }
        return;
      }

      store.setUserInteracted();
      store.playNext();
    };

    const handlePlay = () => {
      const store = usePlayerStore.getState();
      if (!store.isPlaying) {
        store.setIsPlaying(true);
      }

      usePlayerStore.setState({
        wasPlayingBeforeInterruption: false,
        interruptionReason: null,
      });

      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }

      if (store.currentSong?.audioUrl) {
        cacheAudioUrl(store.currentSong.audioUrl);
      }
      if (store.queue.length > 1) {
        precacheUpcomingTracks(store.queue, store.currentIndex, 3);
      }
    };

    const handlePause = () => {
      if (isSourceChangingRef.current) return;

      const store = usePlayerStore.getState();
      if (store.isPlaying && !audio.ended) {
        store.setIsPlaying(false);
      }

      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = audio.ended ? 'none' : 'paused';
      }
    };

    const handleWaiting = () => {
      onLoadingChange(true);
    };

    const handlePlaying = () => {
      isSourceChangingRef.current = false;
      onLoadingChange(false);
    };

    const handleError = () => {
      onLoadingChange(false);
      usePlayerStore.getState().setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('error', handleError);
    };
  }, [audioRef, attemptPlay, onLoadingChange, onTimeUpdate, setCurrentTime, setDuration]);

  if (audioUrl && !isValidUrl(audioUrl)) {
    return (
      <audio
        ref={audioRef}
        preload="none"
        playsInline
        webkit-playsinline="true"
        x-webkit-airplay="allow"
        crossOrigin="anonymous"
        controls={false}
        style={{ display: 'none' }}
        data-testid="audio-element"
      />
    );
  }

  return (
    <audio
      ref={audioRef}
      src={audioUrl || undefined}
      preload={audioUrl ? 'auto' : 'none'}
      playsInline
      webkit-playsinline="true"
      x-webkit-airplay="allow"
      crossOrigin="anonymous"
      controls={false}
      loop={isRepeating}
      style={{ display: 'none' }}
      data-testid="audio-element"
    />
  );
};

export default AudioPlayerCore;
