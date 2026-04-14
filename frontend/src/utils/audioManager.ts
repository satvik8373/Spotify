import { Howl, Howler } from 'howler';
import type { Song } from '@/types';
import { resolveArtist } from '@/lib/resolveArtist';
import { usePlayerStore } from '@/stores/usePlayerStore';

type HowlNode = HTMLAudioElement & {
  setSinkId?: (sinkId: string) => Promise<void>;
  sinkId?: string;
};

const FALLBACK_ARTWORK = 'https://cdn.iconscout.com/icon/free/png-256/free-music-1779799-1513951.png';
const PLAY_ERROR_RETRY_LIMIT = 1;
const PROGRESS_INTERVAL_MS = 500;

const getSongKey = (song: Song | null | undefined): string =>
  song?._id || `${song?.title ?? 'unknown'}::${song?.artist ?? 'unknown'}`;

const normalizeAudioUrl = (audioUrl?: string): string => {
  if (!audioUrl) return '';
  return audioUrl.replace(/^http:\/\//i, 'https://').trim();
};

const isValidAudioUrl = (audioUrl?: string): boolean => {
  const normalized = normalizeAudioUrl(audioUrl);
  if (!normalized || normalized.startsWith('blob:')) return false;

  try {
    const parsed = new URL(normalized);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

const setMediaSessionHandler = (
  action: MediaSessionAction,
  handler: MediaSessionActionHandler | null,
) => {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

  try {
    navigator.mediaSession.setActionHandler(action, handler);
  } catch {
    // Ignore unsupported handlers on the current browser.
  }
};

class AudioManager {
  private currentSound: Howl | null = null;
  private currentSong: Song | null = null;
  private queue: Song[] = [];
  private currentIndex = -1;
  private progressTimer: number | null = null;
  private volume = 1;
  private playRetryCounts = new Map<string, number>();
  private failedSongKeys = new Set<string>();
  private mediaSessionRegistered = false;

  constructor() {
    Howler.autoUnlock = true;
    Howler.html5PoolSize = 1;
    this.registerMediaSessionHandlers();
    this.attachDebugHandles();
  }

  private attachDebugHandles() {
    if (typeof window === 'undefined') return;

    const debugWindow = window as Window & {
      currentSound?: Howl | null;
      mavrixfyAudioManager?: AudioManager;
      mavrixfyFailedSongs?: string[];
    };

    debugWindow.mavrixfyAudioManager = this;
    debugWindow.currentSound = this.currentSound;
    debugWindow.mavrixfyFailedSongs = Array.from(this.failedSongKeys);
  }

  private syncDebugHandles() {
    if (typeof window === 'undefined') return;

    const debugWindow = window as Window & {
      currentSound?: Howl | null;
      mavrixfyFailedSongs?: string[];
    };

    debugWindow.currentSound = this.currentSound;
    debugWindow.mavrixfyFailedSongs = Array.from(this.failedSongKeys);
  }

  private getCurrentNode(): HowlNode | null {
    const currentNode = this.currentSound?._sounds?.[0]?._node as HowlNode | undefined;
    return currentNode ?? null;
  }

  private clearProgressTimer() {
    if (this.progressTimer !== null) {
      window.clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
  }

  private syncPositionState() {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator) || !('setPositionState' in navigator.mediaSession)) {
      return;
    }

    const duration = this.getDuration();
    const position = this.getCurrentTime();

    if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(position)) {
      return;
    }

    try {
      navigator.mediaSession.setPositionState({
        duration,
        position: Math.min(position, duration),
        playbackRate: 1,
      });
    } catch {
      // Ignore unsupported position state updates.
    }
  }

  private startProgressTimer() {
    this.clearProgressTimer();
    this.progressTimer = window.setInterval(() => {
      const duration = this.getDuration();
      const currentTime = this.getCurrentTime();
      usePlayerStore.setState({
        currentTime,
        duration,
      });
      this.syncPositionState();
    }, PROGRESS_INTERVAL_MS);
  }

  private updateMediaMetadata(song: Song | null) {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    if (!song) {
      navigator.mediaSession.metadata = null;
      return;
    }

    const artworkUrl = song.imageUrl?.startsWith('http')
      ? song.imageUrl
      : song.imageUrl
        ? new URL(song.imageUrl, window.location.origin).toString()
        : FALLBACK_ARTWORK;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title || 'Unknown Title',
        artist: resolveArtist(song),
        album: song.album || 'Unknown Album',
        artwork: [
          { src: artworkUrl, sizes: '96x96', type: 'image/jpeg' },
          { src: artworkUrl, sizes: '192x192', type: 'image/jpeg' },
          { src: artworkUrl, sizes: '512x512', type: 'image/jpeg' },
        ],
      });
    } catch {
      // Ignore metadata failures.
    }
  }

  private async applyPreferredOutputDevice() {
    const preferredOutputId = usePlayerStore.getState().audioOutputDevice;
    if (!preferredOutputId) return;

    const node = this.getCurrentNode();
    if (!node || typeof node.setSinkId !== 'function') return;

    try {
      await node.setSinkId(preferredOutputId);
    } catch (error) {
      console.warn('[audioManager] Unable to switch output device', error);
    }
  }

  private disposeCurrentSound() {
    this.clearProgressTimer();

    if (!this.currentSound) {
      this.syncDebugHandles();
      return;
    }

    try {
      this.currentSound.off();
      this.currentSound.stop();
      this.currentSound.unload();
    } catch (error) {
      console.warn('[audioManager] Failed to dispose previous sound', error);
    }

    this.currentSound = null;
    this.syncDebugHandles();
  }

  private registerMediaSessionHandlers() {
    if (typeof navigator === 'undefined' || this.mediaSessionRegistered || !('mediaSession' in navigator)) return;

    this.mediaSessionRegistered = true;

    setMediaSessionHandler('play', () => {
      void this.resumeSong();
    });

    setMediaSessionHandler('pause', () => {
      this.pauseSong();
    });

    setMediaSessionHandler('nexttrack', () => {
      // Reset debounce guard so lock screen next always works
      usePlayerStore.setState({ lastPlayNextTime: 0 });
      usePlayerStore.getState().playNext();
    });

    setMediaSessionHandler('previoustrack', () => {
      usePlayerStore.getState().playPrevious();
    });

    setMediaSessionHandler('seekto', (details) => {
      if (typeof details.seekTime !== 'number') return;
      this.seekTo(details.seekTime);
    });

    setMediaSessionHandler('seekbackward', null);
    setMediaSessionHandler('seekforward', null);
  }

  private handlePlaybackFailure(song: Song, phase: 'load' | 'play', error: unknown) {
    const songKey = getSongKey(song);
    this.failedSongKeys.add(songKey);
    this.syncDebugHandles();

    console.error(`[audioManager] ${phase} failure`, {
      song,
      error,
    });

    usePlayerStore.setState({
      isPlaying: false,
      currentTime: 0,
      duration: 0,
    });

    const store = usePlayerStore.getState();
    const hasNextTrack = store.queue.length > 1;

    if (hasNextTrack) {
      store.playNext();
      return;
    }

    this.stopSong();
  }

  private handleTrackEnd() {
    const store = usePlayerStore.getState();

    if (store.isRepeating && this.currentSound) {
      this.seekTo(0);
      void this.resumeSong();
      return;
    }

    if (store.queue.length <= 1) {
      this.stopSong();
      usePlayerStore.setState({
        isPlaying: false,
        currentTime: 0,
      });
      return;
    }

    // Reset debounce guard so auto-advance on track end is never blocked
    usePlayerStore.setState({ lastPlayNextTime: 0 });
    store.playNext();
  }

  private buildHowl(song: Song) {
    const audioUrl = normalizeAudioUrl(song.audioUrl);
    const songKey = getSongKey(song);

    const howl = new Howl({
      src: [audioUrl],
      html5: true,
      preload: true,
      volume: this.volume,
      onplay: () => {
        this.currentSong = song;
        this.currentSound = howl;
        this.startProgressTimer();
        this.syncDebugHandles();
        this.updateMediaMetadata(song);

        usePlayerStore.setState({
          currentSong: song,
          isPlaying: true,
          duration: howl.duration() || usePlayerStore.getState().duration,
        });

        if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'playing';
        }

        void this.applyPreferredOutputDevice();
        this.syncPositionState();
      },
      onpause: () => {
        this.clearProgressTimer();
        usePlayerStore.setState({
          isPlaying: false,
          currentTime: this.getCurrentTime(),
          duration: this.getDuration(),
        });

        if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'paused';
        }
      },
      onstop: () => {
        this.clearProgressTimer();

        if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'none';
        }
      },
      onload: () => {
        usePlayerStore.setState({
          duration: howl.duration() || 0,
        });
        this.syncPositionState();
      },
      onseek: () => {
        const currentTime = this.getCurrentTime();
        usePlayerStore.setState({ currentTime });
        this.syncPositionState();
      },
      onend: () => {
        this.clearProgressTimer();
        usePlayerStore.setState({
          currentTime: howl.duration() || 0,
        });
        this.handleTrackEnd();
      },
      onloaderror: (_soundId, error) => {
        this.handlePlaybackFailure(song, 'load', error);
      },
      onplayerror: (_soundId, error) => {
        const retryCount = this.playRetryCounts.get(songKey) ?? 0;

        if (retryCount < PLAY_ERROR_RETRY_LIMIT) {
          this.playRetryCounts.set(songKey, retryCount + 1);

          howl.once('unlock', () => {
            howl.play();
          });

          window.setTimeout(() => {
            try {
              howl.play();
            } catch (retryError) {
              this.handlePlaybackFailure(song, 'play', retryError);
            }
          }, 250);

          return;
        }

        this.handlePlaybackFailure(song, 'play', error);
      },
    });

    return howl;
  }

  setQueue(songs: Song[], startIndex = 0) {
    this.queue = [...songs];
    this.currentIndex = songs.length === 0
      ? -1
      : Math.max(0, Math.min(startIndex, songs.length - 1));
  }

  async playSong(song: Song) {
    if (!song || !isValidAudioUrl(song.audioUrl)) {
      console.error('[audioManager] Refusing to play invalid audioUrl', song);
      this.handlePlaybackFailure(song, 'load', new Error('Invalid audio URL'));
      return;
    }

    // Always sync internal queue from store before playing so background/lock screen state is fresh
    const storeState = usePlayerStore.getState();
    if (storeState.queue.length > 0) {
      const storeIndex = storeState.currentIndex >= 0 ? storeState.currentIndex : 0;
      this.queue = [...storeState.queue];
      this.currentIndex = storeIndex;
    }

    const currentSongKey = getSongKey(this.currentSong);
    const nextSongKey = getSongKey(song);

    if (this.currentSound && currentSongKey === nextSongKey) {
      if (this.currentSound.state() === 'loading') {
        return;
      }

      if (!this.currentSound.playing()) {
        this.currentSound.play();
      }
      return;
    }

    this.playRetryCounts.delete(nextSongKey);
    Howler.stop();
    this.disposeCurrentSound();

    this.currentSong = song;
    this.updateMediaMetadata(song);
    this.currentSound = this.buildHowl(song);
    this.syncDebugHandles();

    usePlayerStore.setState({
      currentSong: song,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
    });

    this.currentSound.play();
  }

  pauseSong() {
    this.currentSound?.pause();
  }

  async resumeSong() {
    const store = usePlayerStore.getState();
    const song = store.currentSong ?? this.currentSong;

    if (!song) return;

    // Resume suspended AudioContext (common after backgrounding on mobile)
    if (Howler.ctx && Howler.ctx.state === 'suspended') {
      try {
        await Howler.ctx.resume();
      } catch {
        // Ignore — will retry on next interaction
      }
    }

    if (!this.currentSound || getSongKey(song) !== getSongKey(this.currentSong)) {
      this.setQueue(store.queue, store.currentIndex);
      await this.playSong(song);
      return;
    }

    if (this.currentSound.state() === 'loading' || this.currentSound.playing()) {
      return;
    }

    if (!this.currentSound.playing()) {
      this.currentSound.play();
    }
  }

  stopSong() {
    this.disposeCurrentSound();
    this.currentSong = null;
    this.syncDebugHandles();

    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'none';
    }
  }

  seekTo(timeInSeconds: number) {
    if (!this.currentSound) return;

    const duration = this.currentSound.duration() || 0;
    const nextTime = Math.max(0, Math.min(timeInSeconds, duration || timeInSeconds));
    this.currentSound.seek(nextTime);
    usePlayerStore.setState({ currentTime: nextTime });
    this.syncPositionState();
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(volume, 1));
    this.currentSound?.volume(this.volume);
  }

  getVolume() {
    return this.volume;
  }

  getCurrentTime() {
    if (!this.currentSound) return 0;
    const currentTime = this.currentSound.seek();
    return typeof currentTime === 'number' ? currentTime : 0;
  }

  getDuration() {
    return this.currentSound?.duration() || 0;
  }

  isPlaying() {
    return Boolean(this.currentSound?.playing());
  }

  getCurrentSong() {
    return this.currentSong;
  }

  getQueue() {
    return [...this.queue];
  }

  getCurrentIndex() {
    return this.currentIndex;
  }

  getCurrentNodeForOutput() {
    return this.getCurrentNode();
  }

  async setOutputDevice(deviceId: string) {
    const node = this.getCurrentNode();
    if (!node || typeof node.setSinkId !== 'function') return false;

    try {
      await node.setSinkId(deviceId);
      return true;
    } catch (error) {
      console.warn('[audioManager] Unable to set sinkId', error);
      return false;
    }
  }

  async resumeIfPausedUnexpectedly() {
    const store = usePlayerStore.getState();
    if (!store.isPlaying || !store.currentSong) return;

    if (!this.currentSound) {
      await this.playSong(store.currentSong);
      return;
    }

    if (!this.currentSound.playing()) {
      this.currentSound.play();
    }
  }
}

export const audioManager = new AudioManager();

export const playSong = (song: Song) => audioManager.playSong(song);
export const pauseSong = () => audioManager.pauseSong();
export const resumeSong = () => audioManager.resumeSong();
export const stopSong = () => audioManager.stopSong();
export const setQueue = (songs: Song[], startIndex = 0) => audioManager.setQueue(songs, startIndex);
