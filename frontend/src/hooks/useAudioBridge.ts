import { useEffect, useRef, useCallback } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { resolveArtist } from '@/lib/resolveArtist';
import { shallow } from 'zustand/shallow';

const getAudioFromRef = (
  audioRef: React.RefObject<HTMLAudioElement>
): HTMLAudioElement | null => {
  return audioRef.current ?? (document.querySelector('audio') as HTMLAudioElement | null);
};

const TRACK_COMMAND_PAUSE_GUARD_MS = 900;
const AUTO_TRACK_CHANGE_PAUSE_GUARD_MS = 3000;
const INVALID_TEXT_VALUES = new Set(['', 'null', 'undefined', '[object object]']);
const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

const getSafeText = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  const normalized = String(value).trim();
  return INVALID_TEXT_VALUES.has(normalized.toLowerCase()) ? '' : normalized;
};

const getMetadataAlbum = (song: any): string => {
  const album = getSafeText(song?.album);
  if (album) return album;

  const albumId = getSafeText(song?.albumId);
  if (albumId && !OBJECT_ID_PATTERN.test(albumId)) return albumId;

  return 'Unknown Album';
};

const ensurePlaybackWhenExpected = (
  audioRef: React.RefObject<HTMLAudioElement>,
  delayMs: number
): void => {
  window.setTimeout(() => {
    const store = usePlayerStore.getState();
    if (!store.hasUserInteracted || !store.isPlaying) return;

    const audio = getAudioFromRef(audioRef);
    if (!audio || (!audio.paused && !audio.ended)) return;

    void audio.play().catch(() => {
      // Ignore retries that fail due to platform autoplay/focus rules.
    });
  }, delayMs);
};

const updatePositionState = (audio: HTMLAudioElement): void => {
  if (!('mediaSession' in navigator) || !('setPositionState' in navigator.mediaSession)) {
    return;
  }

  const duration = audio.duration || 0;
  const position = audio.currentTime || 0;

  if (!Number.isFinite(duration) || !Number.isFinite(position) || duration <= 0) {
    return;
  }

  try {
    navigator.mediaSession.setPositionState({
      duration,
      playbackRate: audio.playbackRate || 1,
      position: Math.min(position, duration),
    });
  } catch {
    // Ignore unsupported/invalid position updates.
  }
};

const updateMetadata = (song: any): void => {
  if (!('mediaSession' in navigator) || !song) return;

  try {
    const fallbackArtwork = 'https://cdn.iconscout.com/icon/free/png-256/free-music-1779799-1513951.png';
    const rawArtwork = song.imageUrl || fallbackArtwork;
    const artworkUrl = rawArtwork.startsWith('http')
      ? rawArtwork
      : new URL(rawArtwork, window.location.origin).toString();

    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title || 'Unknown Title',
      artist: resolveArtist(song),
      album: getMetadataAlbum(song),
      artwork: [
        { src: artworkUrl, sizes: '96x96', type: 'image/jpeg' },
        { src: artworkUrl, sizes: '128x128', type: 'image/jpeg' },
        { src: artworkUrl, sizes: '192x192', type: 'image/jpeg' },
        { src: artworkUrl, sizes: '256x256', type: 'image/jpeg' },
        { src: artworkUrl, sizes: '512x512', type: 'image/jpeg' },
      ],
    });
  } catch {
    // Ignore metadata update failures.
  }
};

const registerMediaSessionHandlers = (
  audioRef: React.RefObject<HTMLAudioElement>,
  pauseGuardUntilRef: React.MutableRefObject<number>
): void => {
  if (!('mediaSession' in navigator)) return;

  const setHandler = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
    try {
      navigator.mediaSession.setActionHandler(action, handler);
    } catch {
      // Ignore unsupported action handlers on current platform.
    }
  };

  setHandler('play', async () => {
    const store = usePlayerStore.getState();
    store.setUserInteracted();
    store.setIsPlaying(true);

    const audio = getAudioFromRef(audioRef);
    if (!audio || (!audio.paused && !audio.ended)) return;

    try {
      await audio.play();
    } catch {
      store.setIsPlaying(false);
    }
  });

  setHandler('pause', () => {
    const store = usePlayerStore.getState();
    const now = Date.now();
    const isRecentTrackChange = now - (store.lastPlayNextTime || 0) < AUTO_TRACK_CHANGE_PAUSE_GUARD_MS;
    const audio = getAudioFromRef(audioRef);
    const isTransitionPhase = !audio || audio.paused || audio.ended || audio.readyState < 2;

    if (isTransitionPhase && (now < pauseGuardUntilRef.current || isRecentTrackChange)) {
      return;
    }

    store.setIsPlaying(false);

    if (audio && !audio.paused) {
      audio.pause();
    }
  });

  setHandler('nexttrack', () => {
    pauseGuardUntilRef.current = Date.now() + TRACK_COMMAND_PAUSE_GUARD_MS;

    const store = usePlayerStore.getState();
    store.setUserInteracted();
    store.setIsPlaying(true);
    store.playNext();

    ensurePlaybackWhenExpected(audioRef, 0);
    ensurePlaybackWhenExpected(audioRef, 350);
  });

  setHandler('previoustrack', () => {
    pauseGuardUntilRef.current = Date.now() + TRACK_COMMAND_PAUSE_GUARD_MS;

    const store = usePlayerStore.getState();
    store.setUserInteracted();
    store.setIsPlaying(true);

    const audio = getAudioFromRef(audioRef);
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      store.setCurrentTime(0);
      if (!audio.paused) {
        void audio.play().catch(() => {});
      }
      return;
    }

    store.playPrevious();
    ensurePlaybackWhenExpected(audioRef, 0);
    ensurePlaybackWhenExpected(audioRef, 350);
  });

  setHandler('seekto', (details) => {
    const audio = getAudioFromRef(audioRef);
    if (!audio || details.seekTime === undefined) return;

    const seekTime = Math.max(0, Math.min(details.seekTime, audio.duration || 0));
    audio.currentTime = seekTime;
    const store = usePlayerStore.getState();
    store.setCurrentTime(seekTime);
    if (store.isPlaying && audio.paused) {
      void audio.play().catch(() => {});
    }
    updatePositionState(audio);
  });

  // Keep previous/next visible on iOS lock screen by clearing seek +/- actions.
  setHandler('seekbackward', null);
  setHandler('seekforward', null);
};

export const useAudioBridge = (audioRef: React.RefObject<HTMLAudioElement>) => {
  const positionUpdateInterval = useRef<NodeJS.Timeout | null>(null);
  const pauseGuardUntilRef = useRef(0);
  const { currentSong, isPlaying } = usePlayerStore(
    (state) => ({
      currentSong: state.currentSong,
      isPlaying: state.isPlaying,
    }),
    shallow
  );

  const initializeBridge = useCallback(() => {
    if (!audioRef.current) return;

    registerMediaSessionHandlers(audioRef, pauseGuardUntilRef);
  }, [audioRef, pauseGuardUntilRef]);

  // Ensure handlers exist whenever the audio element becomes available.
  useEffect(() => {
    if (audioRef.current) {
      registerMediaSessionHandlers(audioRef, pauseGuardUntilRef);
    }
  }, [audioRef, pauseGuardUntilRef]);

  // Keep lock-screen metadata and playback state in sync with store transitions,
  // even when React render timing is throttled in iOS background mode.
  useEffect(() => {
    const unsubscribe = usePlayerStore.subscribe((state, prevState) => {
      if (state.currentSong !== prevState.currentSong && state.currentSong) {
        if (state.isPlaying) {
          pauseGuardUntilRef.current = Math.max(
            pauseGuardUntilRef.current,
            Date.now() + AUTO_TRACK_CHANGE_PAUSE_GUARD_MS
          );
        }

        updateMetadata(state.currentSong);

        if (state.isPlaying) {
          ensurePlaybackWhenExpected(audioRef, 0);
          ensurePlaybackWhenExpected(audioRef, 350);
          ensurePlaybackWhenExpected(audioRef, 900);
          ensurePlaybackWhenExpected(audioRef, 1800);
        }
      }

      if (state.isPlaying !== prevState.isPlaying && 'mediaSession' in navigator) {
        navigator.mediaSession.playbackState = state.isPlaying ? 'playing' : 'paused';
      }

      if (
        state.currentSong !== prevState.currentSong &&
        state.isPlaying &&
        'mediaSession' in navigator
      ) {
        navigator.mediaSession.playbackState = 'playing';
      }
    });

    return unsubscribe;
  }, [audioRef, pauseGuardUntilRef]);

  useEffect(() => {
    if (currentSong) {
      updateMetadata(currentSong);
    }
  }, [currentSong]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  useEffect(() => {
    if (positionUpdateInterval.current) {
      clearInterval(positionUpdateInterval.current);
      positionUpdateInterval.current = null;
    }

    if (!isPlaying || !currentSong) return;

    const updatePosition = () => {
      const audio = getAudioFromRef(audioRef);
      if (audio) {
        updatePositionState(audio);
      }
    };

    updatePosition();
    positionUpdateInterval.current = setInterval(updatePosition, 1000);

    return () => {
      if (positionUpdateInterval.current) {
        clearInterval(positionUpdateInterval.current);
      }
    };
  }, [audioRef, currentSong, isPlaying]);

  useEffect(() => {
    return () => {
      if (positionUpdateInterval.current) {
        clearInterval(positionUpdateInterval.current);
      }
    };
  }, []);

  return {
    initializeBridge,
  };
};

export default useAudioBridge;
