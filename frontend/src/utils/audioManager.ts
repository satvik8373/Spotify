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
// Fallback poll interval — only used when native timeupdate isn't available
const PROGRESS_INTERVAL_MS = 500;
// Default seek offset for seekbackward/seekforward (seconds)
const DEFAULT_SEEK_OFFSET = 10;

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
    // Ignore unsupported handlers.
  }
};

class AudioManager {
  private currentSound: Howl | null = null;
  private currentSong: Song | null = null;
  private queue: Song[] = [];
  private currentIndex = -1;
  // Fallback interval — only active when native timeupdate isn't available
  private progressTimer: number | null = null;
  private volume = 1;
  private playRetryCounts = new Map<string, number>();
  private failedSongKeys = new Set<string>();
  private mediaSessionRegistered = false;
  // Bound timeupdate handler so we can remove it cleanly
  private boundTimeUpdate: (() => void) | null = null;

  constructor() {
    Howler.autoUnlock = true;
    Howler.autoSuspend = false; // prevent AudioContext from suspending after 30s idle
    Howler.html5PoolSize = 1;
    this.registerMediaSessionHandlers();
    this.attachDebugHandles();
  }

  private attachDebugHandles() {
    if (typeof window === 'undefined') return;
    const w = window as any;
    w.mavrixfyAudioManager = this;
    w.currentSound = this.currentSound;
    w.mavrixfyFailedSongs = Array.from(this.failedSongKeys);
  }

  private syncDebugHandles() {
    if (typeof window === 'undefined') return;
    const w = window as any;
    w.currentSound = this.currentSound;
    w.mavrixfyFailedSongs = Array.from(this.failedSongKeys);
  }

  private getCurrentNode(): HowlNode | null {
    return ((this.currentSound as any)?._sounds?.[0]?._node as HowlNode | undefined) ?? null;
  }

  // ── Position state ────────────────────────────────────────────────────────
  // Called from native <audio> timeupdate — fires in background, unlike setInterval.
  private syncPositionState() {
    const duration = this.getDuration();
    const position = this.getCurrentTime();

    // Update React store
    usePlayerStore.setState({ currentTime: position, duration });

    // Update lock screen progress bar
    if (
      typeof navigator === 'undefined' ||
      !('mediaSession' in navigator) ||
      !('setPositionState' in navigator.mediaSession)
    ) return;

    if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(position)) return;

    try {
      navigator.mediaSession.setPositionState({
        duration,
        position: Math.min(position, duration),
        playbackRate: 1,
      });
    } catch {
      // Ignore.
    }
  }

  // ── Native timeupdate listener ────────────────────────────────────────────
  // Attaches directly to the <audio> element so it fires even when the tab is
  // backgrounded / screen is locked. This is the official approach per MDN.
  private attachNativeTimeUpdate() {
    this.detachNativeTimeUpdate();
    const node = this.getCurrentNode();
    if (!node) {
      // Fallback: use interval if native node not yet available
      this.startFallbackTimer();
      return;
    }
    this.boundTimeUpdate = () => this.syncPositionState();
    node.addEventListener('timeupdate', this.boundTimeUpdate);
  }

  private detachNativeTimeUpdate() {
    const node = this.getCurrentNode();
    if (node && this.boundTimeUpdate) {
      node.removeEventListener('timeupdate', this.boundTimeUpdate);
    }
    this.boundTimeUpdate = null;
    this.clearFallbackTimer();
  }

  // ── Fallback interval (desktop / non-html5 mode) ──────────────────────────
  private clearFallbackTimer() {
    if (this.progressTimer !== null) {
      window.clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
  }

  private startFallbackTimer() {
    this.clearFallbackTimer();
    this.progressTimer = window.setInterval(() => this.syncPositionState(), PROGRESS_INTERVAL_MS);
  }

  // ── Metadata ──────────────────────────────────────────────────────────────
  private updateMediaMetadata(song: Song | null) {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    if (!song) { navigator.mediaSession.metadata = null; return; }

    const artworkUrl = song.imageUrl?.startsWith('http')
      ? song.imageUrl
      : song.imageUrl
        ? new URL(song.imageUrl, window.location.origin).toString()
        : FALLBACK_ARTWORK;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title || 'Unknown Title',
        artist: resolveArtist(song),
        album: (song as any).album || '',
        artwork: [
          { src: artworkUrl, sizes: '96x96',   type: 'image/jpeg' },
          { src: artworkUrl, sizes: '192x192', type: 'image/jpeg' },
          { src: artworkUrl, sizes: '512x512', type: 'image/jpeg' },
        ],
      });
    } catch {
      // Ignore.
    }
  }

  // ── Media Session action handlers ─────────────────────────────────────────
  // Registered once at construction. All handlers are kept alive for the
  // lifetime of the app — this is the official pattern per web.dev/media-session.
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
      usePlayerStore.setState({ lastPlayNextTime: 0 });
      usePlayerStore.getState().playNext();
    });

    setMediaSessionHandler('previoustrack', () => {
      usePlayerStore.getState().playPrevious();
    });

    // seekto — lock screen progress bar scrubbing
    setMediaSessionHandler('seekto', (details) => {
      if (typeof details.seekTime !== 'number') return;
      this.seekTo(details.seekTime);
      // Immediately update position state so lock screen reflects new position
      this.syncPositionState();
    });

    // seekbackward / seekforward — headset buttons, lock screen skip buttons
    setMediaSessionHandler('seekbackward', (details) => {
      const offset = details.seekOffset ?? DEFAULT_SEEK_OFFSET;
      const next = Math.max(0, this.getCurrentTime() - offset);
      this.seekTo(next);
      this.syncPositionState();
    });

    setMediaSessionHandler('seekforward', (details) => {
      const offset = details.seekOffset ?? DEFAULT_SEEK_OFFSET;
      const duration = this.getDuration();
      const next = duration > 0 ? Math.min(duration, this.getCurrentTime() + offset) : this.getCurrentTime() + offset;
      this.seekTo(next);
      this.syncPositionState();
    });
  }

  // ── Output device ─────────────────────────────────────────────────────────
  private async applyPreferredOutputDevice() {
    const preferredOutputId = usePlayerStore.getState().audioOutputDevice;
    if (!preferredOutputId) return;
    const node = this.getCurrentNode();
    if (!node || typeof node.setSinkId !== 'function') return;
    try { await node.setSinkId(preferredOutputId); } catch { /* ignore */ }
  }

  // ── Sound lifecycle ───────────────────────────────────────────────────────
  private disposeCurrentSound() {
    this.detachNativeTimeUpdate();
    if (!this.currentSound) { this.syncDebugHandles(); return; }
    try {
      this.currentSound.off();
      this.currentSound.stop();
      this.currentSound.unload();
    } catch { /* ignore */ }
    this.currentSound = null;
    this.syncDebugHandles();
  }

  private handlePlaybackFailure(song: Song, phase: 'load' | 'play', error: unknown) {
    const songKey = getSongKey(song);
    this.failedSongKeys.add(songKey);
    this.syncDebugHandles();
    console.error(`[audioManager] ${phase} failure`, { song, error });
    usePlayerStore.setState({ isPlaying: false, currentTime: 0, duration: 0 });
    const store = usePlayerStore.getState();
    if (store.queue.length > 1) { store.playNext(); return; }
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
      usePlayerStore.setState({ isPlaying: false, currentTime: 0 });
      return;
    }
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
        this.syncDebugHandles();

        // Attach native timeupdate AFTER play starts so the node exists
        this.attachNativeTimeUpdate();

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
        // Sync position immediately so lock screen shows correct time from the start
        this.syncPositionState();
      },

      onpause: () => {
        usePlayerStore.setState({
          isPlaying: false,
          currentTime: this.getCurrentTime(),
          duration: this.getDuration(),
        });
        if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'paused';
        }
        // Keep timeupdate attached during pause so position stays accurate
      },

      onstop: () => {
        this.detachNativeTimeUpdate();
        if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'none';
        }
      },

      onload: () => {
        const dur = howl.duration() || 0;
        usePlayerStore.setState({ duration: dur });
        // Duration is now known — update position state
        this.syncPositionState();
      },

      onseek: () => {
        usePlayerStore.setState({ currentTime: this.getCurrentTime() });
        this.syncPositionState();
      },

      onend: () => {
        this.detachNativeTimeUpdate();
        usePlayerStore.setState({ currentTime: howl.duration() || 0 });
        this.handleTrackEnd();
      },

      onloaderror: (_id, error) => {
        this.handlePlaybackFailure(song, 'load', error);
      },

      onplayerror: (_id, error) => {
        const retryCount = this.playRetryCounts.get(songKey) ?? 0;
        if (retryCount < PLAY_ERROR_RETRY_LIMIT) {
          this.playRetryCounts.set(songKey, retryCount + 1);
          howl.once('unlock', () => howl.play());
          window.setTimeout(() => {
            try { howl.play(); } catch (e) { this.handlePlaybackFailure(song, 'play', e); }
          }, 250);
          return;
        }
        this.handlePlaybackFailure(song, 'play', error);
      },
    });

    return howl;
  }

  // ── Public API ────────────────────────────────────────────────────────────

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

    // Sync queue from store so background/lock screen state is always fresh
    const storeState = usePlayerStore.getState();
    if (storeState.queue.length > 0) {
      this.queue = [...storeState.queue];
      this.currentIndex = storeState.currentIndex >= 0 ? storeState.currentIndex : 0;
    }

    const currentSongKey = getSongKey(this.currentSong);
    const nextSongKey = getSongKey(song);

    if (this.currentSound && currentSongKey === nextSongKey) {
      if (this.currentSound.state() === 'loading') return;
      if (!this.currentSound.playing()) this.currentSound.play();
      return;
    }

    this.playRetryCounts.delete(nextSongKey);
    Howler.stop();
    this.disposeCurrentSound();

    this.currentSong = song;
    this.updateMediaMetadata(song);
    this.currentSound = this.buildHowl(song);
    this.syncDebugHandles();

    usePlayerStore.setState({ currentSong: song, isPlaying: false, currentTime: 0, duration: 0 });
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
      try { await Howler.ctx.resume(); } catch { /* ignore */ }
    }

    if (!this.currentSound || getSongKey(song) !== getSongKey(this.currentSong)) {
      this.setQueue(store.queue, store.currentIndex);
      await this.playSong(song);
      return;
    }

    if (this.currentSound.state() === 'loading' || this.currentSound.playing()) return;
    this.currentSound.play();
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
    const next = Math.max(0, Math.min(timeInSeconds, duration || timeInSeconds));
    this.currentSound.seek(next);
    usePlayerStore.setState({ currentTime: next });
    this.syncPositionState();
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(volume, 1));
    this.currentSound?.volume(this.volume);
  }

  getVolume() { return this.volume; }

  getCurrentTime() {
    if (!this.currentSound) return 0;
    const t = this.currentSound.seek();
    return typeof t === 'number' ? t : 0;
  }

  getDuration() { return this.currentSound?.duration() || 0; }
  isPlaying() { return Boolean(this.currentSound?.playing()); }
  getCurrentSong() { return this.currentSong; }
  getQueue() { return [...this.queue]; }
  getCurrentIndex() { return this.currentIndex; }
  getCurrentNodeForOutput() { return this.getCurrentNode(); }

  async setOutputDevice(deviceId: string) {
    const node = this.getCurrentNode();
    if (!node || typeof node.setSinkId !== 'function') return false;
    try { await node.setSinkId(deviceId); return true; } catch { return false; }
  }

  async resumeIfPausedUnexpectedly() {
    const store = usePlayerStore.getState();
    if (!store.isPlaying || !store.currentSong) return;
    if (!this.currentSound) { await this.playSong(store.currentSong); return; }
    if (!this.currentSound.playing()) this.currentSound.play();
  }
}

export const audioManager = new AudioManager();

export const playSong = (song: Song) => audioManager.playSong(song);
export const pauseSong = () => audioManager.pauseSong();
export const resumeSong = () => audioManager.resumeSong();
export const stopSong = () => audioManager.stopSong();
export const setQueue = (songs: Song[], startIndex = 0) => audioManager.setQueue(songs, startIndex);