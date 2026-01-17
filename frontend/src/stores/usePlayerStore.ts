import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Song } from '@/types';
import { ensureHttps, warnInsecureUrl } from '@/utils/urlUtils';

export type Queue = Song[];

export type InterruptionReason = 'call' | 'bluetooth' | 'system' | 'notification' | null;

export interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  isShuffled: boolean;
  isRepeating: boolean;
  queue: Song[];
  currentIndex: number;
  currentTime: number;
  duration: number;
  volume: number;
  hasUserInteracted: boolean;
  autoplayBlocked: boolean;
  wasPlayingBeforeInterruption: boolean;
  interruptionReason: InterruptionReason;
  audioOutputDevice: string | null;
  lastPlayNextTime: number;
  skipRestoreUntilTs?: number;

  // Actions
  setCurrentSong: (song: Song) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  togglePlay: () => void;
  playAlbum: (songs: Song[], initialIndex: number) => void;
  playNext: () => void;
  playPrevious: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setUserInteracted: () => void;
  addToQueue: (song: Song) => void;
  playNextInQueue: (song: Song) => void;
  removeFromQueue: (index: number) => void;
}

// Helper to get a random index that's different from the current one
const getRandomIndex = (currentIndex: number, length: number): number => {
  if (length <= 1) return 0;

  // Create array of all possible indices except current
  const potentialIndices = Array.from({ length }, (_, i) => i)
    .filter(i => i !== currentIndex);

  if (potentialIndices.length > 0) {
    return potentialIndices[Math.floor(Math.random() * potentialIndices.length)];
  } else {
    // Fallback (should not happen with length > 1)
    return currentIndex;
  }
};

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      currentSong: null,
      isPlaying: false,
      isShuffled: false,
      isRepeating: false,
      queue: [],
      currentIndex: 0,
      currentTime: 0,
      duration: 0,
      volume: 100,
      hasUserInteracted: false,
      autoplayBlocked: false,
      wasPlayingBeforeInterruption: false,
      interruptionReason: null,
      audioOutputDevice: null,
      lastPlayNextTime: 0,
      skipRestoreUntilTs: 0,

      setCurrentSong: (song) => {
        // Only skip songs with invalid blob URLs, not all blob URLs
        if (song.audioUrl && song.audioUrl.startsWith('blob:') && !song.audioUrl.includes('blob:http')) {
          console.warn('Skipping song with invalid blob URL:', song.title);
          return;
        }

        // Validate and convert URLs to HTTPS for production
        const validatedSong = {
          ...song,
          audioUrl: song.audioUrl ? (() => {
            warnInsecureUrl(song.audioUrl, 'Player audio URL');
            return ensureHttps(song.audioUrl);
          })() : song.audioUrl,
          imageUrl: song.imageUrl ? (() => {
            warnInsecureUrl(song.imageUrl, 'Player image URL');
            return ensureHttps(song.imageUrl);
          })() : song.imageUrl
        };

        // Immediately reset current time when switching songs
        set({
          currentSong: validatedSong,
          currentTime: 0 // Reset time immediately for new song
        });
      },

      setIsPlaying: (isPlaying) => {
        // CRITICAL: Never allow autoplay without user interaction
        if (isPlaying && !get().hasUserInteracted) {
          console.warn('Blocked autoplay - user interaction required');
          set({ autoplayBlocked: true });
          return; // Block the play attempt completely
        }
        set({ isPlaying, autoplayBlocked: false });
      },

      setCurrentTime: (time) => {
        set({ currentTime: time });
        // Removed frequent localStorage writes - only save on pause/song change
      },

      setDuration: (duration) => set({ duration }),

      togglePlay: () => {
        const { isPlaying, hasUserInteracted } = get();
        
        // CRITICAL: Always require user interaction for first play
        if (!hasUserInteracted) {
          set({ hasUserInteracted: true });
        }
        
        set({
          isPlaying: !isPlaying,
          hasUserInteracted: true,
          autoplayBlocked: false
        });
      },

      playAlbum: (songs, initialIndex) => {
        if (songs.length === 0) return;

        // Filter out songs with invalid blob URLs and convert URLs to HTTPS
        const validSongs = songs
          .filter(song =>
            !song.audioUrl ||
            !song.audioUrl.startsWith('blob:') ||
            song.audioUrl.includes('blob:http')
          )
          .map(song => ({
            ...song,
            audioUrl: song.audioUrl ? (() => {
              warnInsecureUrl(song.audioUrl, 'Queue audio URL');
              return ensureHttps(song.audioUrl);
            })() : song.audioUrl,
            imageUrl: song.imageUrl ? (() => {
              warnInsecureUrl(song.imageUrl, 'Queue image URL');
              return ensureHttps(song.imageUrl);
            })() : song.imageUrl
          }));

        if (validSongs.length === 0) {
          console.warn('No valid songs to play (all had blob URLs)');
          return;
        }

        // Adjust initial index if songs were filtered out
        const validIndex = Math.max(0, Math.min(initialIndex, validSongs.length - 1));

        // Set player state
        set({
          queue: validSongs,
          currentIndex: validIndex,
          currentSong: validSongs[validIndex],
          currentTime: 0, // Reset time for new album
          hasUserInteracted: true // Assume user interaction when explicitly playing
        });

        // Save to localStorage as a backup for components that need it directly
        try {
          const playerState = {
            currentSong: validSongs[validIndex],
            currentTime: 0, // Reset time for new album
            timestamp: new Date().toISOString()
          };
          localStorage.setItem('player_state', JSON.stringify(playerState));
        } catch (_error) {
          // Error handling without logging
        }
      },

      playNext: () => {
        const { queue, currentIndex, isShuffled } = get();

        if (queue.length === 0) return;

        // Prevent rapid successive calls
        const now = Date.now();
        const lastPlayNext = get().lastPlayNextTime || 0;
        if (now - lastPlayNext < 500) { // 500ms cooldown
          return;
        }

        const newIndex = isShuffled
          ? getRandomIndex(currentIndex, queue.length)
          : currentIndex >= queue.length - 1 ? 0 : currentIndex + 1;

        // Don't play the same song if it's the only one in queue
        if (newIndex === currentIndex && queue.length > 1) {
          return;
        }

        // Save current state before changing
        const currentState = {
          currentSong: queue[currentIndex],
          currentIndex,
          currentTime: 0, // Reset time for new song
          timestamp: new Date().toISOString()
        };

        // Update state with new song
        set({
          currentIndex: newIndex,
          currentSong: queue[newIndex],
          currentTime: 0, // Reset time for new song
          hasUserInteracted: true,
          isPlaying: true, // Always ensure playback continues
          lastPlayNextTime: now, // Track when we last called playNext
          skipRestoreUntilTs: now + 5000 // prevent time restore for 5s on track change
        });

        // Save to localStorage as a backup
        try {
          const playerState = {
            currentSong: queue[newIndex],
            currentIndex: newIndex,
            timestamp: new Date().toISOString(),
            previousState: currentState, // Store previous state for recovery
            isPlaying: true // Include playback state explicitly
          };
          localStorage.setItem('player_state', JSON.stringify(playerState));
        } catch (_error) {
          // Error handling without logging
        }
      },

      playPrevious: () => {
        const { queue, currentIndex } = get();

        if (queue.length === 0) return;

        const newIndex = (currentIndex - 1 + queue.length) % queue.length;

        set({
          currentIndex: newIndex,
          currentSong: queue[newIndex],
          currentTime: 0, // Reset time for new song
          hasUserInteracted: true,
          isPlaying: true, // Always ensure playback continues
          skipRestoreUntilTs: Date.now() + 5000
        });

        // Save to localStorage as a backup
        try {
          const playerState = {
            currentSong: queue[newIndex],
            currentIndex: newIndex,
            currentTime: 0, // Reset time for new song
            timestamp: new Date().toISOString()
          };
          localStorage.setItem('player_state', JSON.stringify(playerState));
        } catch (_error) {
          // Error handling without logging
        }
      },

      toggleShuffle: () => {
        set(state => ({ isShuffled: !state.isShuffled }));
      },

      toggleRepeat: () => {
        set(state => ({ isRepeating: !state.isRepeating }));
      },

      setUserInteracted: () => {
        set({ hasUserInteracted: true });
      },

      addToQueue: (song: Song) => {
        const { queue } = get();
        set({ queue: [...queue, song] });
      },

      playNextInQueue: (song: Song) => {
        const { queue, currentIndex } = get();
        const newQueue = [...queue];
        newQueue.splice(currentIndex + 1, 0, song);
        set({ queue: newQueue });
      },

      removeFromQueue: (index: number) => {
        const { queue } = get();
        const newQueue = [...queue];
        newQueue.splice(index, 1);
        set({ queue: newQueue });
      }
    }),
    {
      name: 'player-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentSong: state.currentSong,
        queue: state.queue,
        currentIndex: state.currentIndex,
        currentTime: state.currentTime,
        isShuffled: state.isShuffled,
        isRepeating: state.isRepeating,
        hasUserInteracted: state.hasUserInteracted,
        autoplayBlocked: state.autoplayBlocked,
        wasPlayingBeforeInterruption: state.wasPlayingBeforeInterruption,
        interruptionReason: state.interruptionReason,
        audioOutputDevice: state.audioOutputDevice,
      })
    }
  )
);

// Initialize the store by loading persisted data
setTimeout(() => {
  // Auto-restore interrupted playback state from before refresh
  const store = usePlayerStore.getState();

  // Clean up any invalid blob URLs from the current song and queue
  if (store.currentSong && store.currentSong.audioUrl &&
    store.currentSong.audioUrl.startsWith('blob:') &&
    !store.currentSong.audioUrl.includes('blob:http')) {
    console.log('Cleaning up invalid blob URL from current song');
    store.setCurrentSong({ ...store.currentSong, audioUrl: '' });
  }

  if (store.queue.length > 0) {
    const cleanQueue = store.queue.filter(song =>
      !song.audioUrl ||
      !song.audioUrl.startsWith('blob:') ||
      song.audioUrl.includes('blob:http')
    );
    if (cleanQueue.length !== store.queue.length) {
      console.log('Cleaned up blob URLs from queue');
      usePlayerStore.setState({ queue: cleanQueue });
    }
  }

  // console.log('Player store initialized with:', store.currentSong?.title || 'no song');

  // If we have a song but no queue, try to reconstruct minimum queue
  if (store.currentSong && store.queue.length === 0) {
    // console.log('Detected song but no queue, reconstructing minimal queue');
    store.playAlbum([store.currentSong], 0);
  }

  // Check if we should resume playback and restore currentTime
  try {
    const savedState = localStorage.getItem('player_state');
    if (savedState) {
      const { timestamp, isPlaying, currentTime: savedTime } = JSON.parse(savedState);
      const timeSinceLastUpdate = Date.now() - new Date(timestamp).getTime();

      // Restore currentTime if it exists and is valid
      if (savedTime && savedTime > 0) {
        store.setCurrentTime(savedTime);
      }

      // If the last update was recent (within 5 minutes) and playback was active
      if (timeSinceLastUpdate < 5 * 60 * 1000 && isPlaying) {
        // console.log('Resuming playback from saved state');
        store.setIsPlaying(true);
      }
    }
  } catch (_error) {
    // Error handling without logging
  }
}, 0);
