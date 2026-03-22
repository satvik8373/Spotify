import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Song } from '@/types';

export type InterruptionReason = 'call' | 'bluetooth' | 'system' | 'notification' | null;

export type ShuffleMode = 'off' | 'normal' | 'smart';

export interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  isShuffled: boolean;
  shuffleMode: ShuffleMode;
  isRepeating: boolean;
  queue: Song[];
  originalQueue: Song[]; // Store original queue order for shuffle/unshuffle
  currentIndex: number;
  currentTime: number;
  duration: number;
  hasUserInteracted: boolean;
  wasPlayingBeforeInterruption: boolean;
  interruptionReason: InterruptionReason;
  audioOutputDevice: string | null;
  lastPlayNextTime: number;

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
  setShuffleMode: (mode: ShuffleMode) => void;
  toggleRepeat: () => void;
  setUserInteracted: () => void;
  addToQueue: (song: Song) => void;
  playNextInQueue: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  smartShuffle: () => void;
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

// Helper to shuffle an array using Fisher-Yates algorithm (perfect shuffle like liked songs)
const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Smart shuffle algorithm - considers song similarity, artist diversity, etc.
const smartShuffleArray = <T extends Song>(array: T[]): T[] => {
  if (array.length <= 2) return shuffleArray(array);

  const shuffled = [...array];
  const result: T[] = [];
  const artistCounts: { [key: string]: number } = {};

  // First pass: Fisher-Yates shuffle
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Second pass: Smart reordering to avoid artist clustering
  while (shuffled.length > 0) {
    let bestIndex = 0;
    let bestScore = -1;

    for (let i = 0; i < shuffled.length; i++) {
      const song = shuffled[i];
      const artist = song.artist || 'Unknown';
      const artistCount = artistCounts[artist] || 0;

      // Score based on artist diversity and position
      let score = 1 / (artistCount + 1);

      // Avoid same artist back-to-back
      if (result.length > 0) {
        const lastSong = result[result.length - 1];
        if (lastSong.artist === artist) {
          score *= 0.1; // Heavy penalty for same artist
        }
      }

      // Add some randomness
      score *= Math.random();

      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    const selectedSong = shuffled.splice(bestIndex, 1)[0];
    result.push(selectedSong);
    artistCounts[selectedSong.artist || 'Unknown'] = (artistCounts[selectedSong.artist || 'Unknown'] || 0) + 1;
  }

  return result;
};

const persistedStateCache = new Map<string, string>();

const persistedPlayerStorage = createJSONStorage(() => ({
  getItem: (name: string) => localStorage.getItem(name),
  setItem: (name: string, value: string) => {
    if (persistedStateCache.get(name) === value) {
      return;
    }
    persistedStateCache.set(name, value);
    localStorage.setItem(name, value);
  },
  removeItem: (name: string) => {
    persistedStateCache.delete(name);
    localStorage.removeItem(name);
  },
}));

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      currentSong: null,
      isPlaying: false,
      isShuffled: false,
      shuffleMode: 'off',
      isRepeating: false,
      queue: [],
      originalQueue: [],
      currentIndex: 0,
      currentTime: 0,
      duration: 0,
      hasUserInteracted: false,
      wasPlayingBeforeInterruption: false,
      interruptionReason: null,
      audioOutputDevice: null,
      lastPlayNextTime: 0,

      setCurrentSong: (song) => {
        if (song.audioUrl && song.audioUrl.startsWith('blob:')) {
          return;
        }

        set({
          currentSong: song,
          currentTime: 0
        });
      },

      setIsPlaying: (isPlaying) => {
        if (isPlaying && !get().hasUserInteracted) {
          set({ isPlaying: false });
        } else {
          set({ isPlaying });
        }
      },

      setCurrentTime: (time) => {
        // Throttle high-frequency updates to keep UI smooth on mobile.
        const current = get().currentTime;
        if (Math.abs(current - time) > 1) {
          set({ currentTime: time });
        }
      },

      setDuration: (duration) => set({ duration }),

      togglePlay: () => {
        const { isPlaying } = get();
        set({
          isPlaying: !isPlaying,
          hasUserInteracted: true // User must have interacted to toggle play
        });
      },

      playAlbum: (songs, initialIndex) => {
        if (songs.length === 0) return;

        const sanitizedSongs = songs.map((song) => {
          if (!song.audioUrl || !song.audioUrl.startsWith('blob:')) {
            return song;
          }
          return {
            ...song,
            audioUrl: '',
          };
        });

        if (sanitizedSongs.length === 0) {
          return;
        }

        // Get the song that was requested to play
        const requestedSong = sanitizedSongs[initialIndex] || sanitizedSongs[0];

        // Find the requested song in the sanitized array
        let validIndex = sanitizedSongs.findIndex(song => song._id === requestedSong?._id);

        // If not found by ID, try to find by title and artist
        if (validIndex === -1 && requestedSong) {
          validIndex = sanitizedSongs.findIndex(song =>
            song.title === requestedSong.title && song.artist === requestedSong.artist
          );
        }

        // If still not found, use the first song
        if (validIndex === -1) {
          validIndex = 0;
        }

        const originalQueue = [...sanitizedSongs];
        let playQueue = [...sanitizedSongs];
        let playIndex = validIndex;

        const { shuffleMode } = get();
        if (shuffleMode !== 'off' && sanitizedSongs.length > 1) {
          const selectedSong = sanitizedSongs[validIndex];
          const otherSongs = sanitizedSongs.filter((_, i) => i !== validIndex);

          const shuffledOthers = shuffleMode === 'smart'
            ? smartShuffleArray(otherSongs)
            : shuffleArray(otherSongs);

          playQueue = [selectedSong, ...shuffledOthers];
          playIndex = 0;
        }

        set({
          queue: playQueue,
          originalQueue,
          currentIndex: playIndex,
          currentSong: playQueue[playIndex],
          currentTime: 0,
          hasUserInteracted: true
        });
      },

      playNext: () => {
        const { queue, currentIndex, shuffleMode } = get();

        if (queue.length === 0) return;

        // Prevent rapid successive calls
        const now = Date.now();
        const lastPlayNext = get().lastPlayNextTime || 0;
        if (now - lastPlayNext < 250) { // 250ms cooldown
          return;
        }

        const newIndex = shuffleMode !== 'off'
          ? getRandomIndex(currentIndex, queue.length)
          : currentIndex >= queue.length - 1 ? 0 : currentIndex + 1;

        // Don't play the same song if it's the only one in queue
        if (newIndex === currentIndex && queue.length > 1) {
          return;
        }

        // Update state with new song
        set({
          currentIndex: newIndex,
          currentSong: queue[newIndex],
          currentTime: 0, // Reset time for new song
          hasUserInteracted: true,
          isPlaying: true, // Always ensure playback continues
          lastPlayNextTime: now, // Track when we last called playNext
        });
      },

      playPrevious: () => {
        const { queue, currentIndex, isRepeating } = get();

        if (queue.length === 0) return;

        const audio = document.querySelector('audio');
        const elapsedSeconds = audio?.currentTime || 0;

        // Check if current song has played less than 3 seconds
        // If so, go to previous song, otherwise restart current song
        if (elapsedSeconds > 3 && !isRepeating) {
          // If we're more than 3 seconds in, just restart the current song
          if (audio) {
            audio.currentTime = 0;
            audio.play().catch(() => { });
          }
          set({
            currentTime: 0,
            hasUserInteracted: true,
            isPlaying: true,
          });
          return;
        }

        const newIndex = (currentIndex - 1 + queue.length) % queue.length;

        set({
          currentIndex: newIndex,
          currentSong: queue[newIndex],
          currentTime: 0, // Reset time for new song
          hasUserInteracted: true,
          isPlaying: true, // Always ensure playback continues
        });
      },

      toggleShuffle: () => {
        const { shuffleMode, queue, originalQueue, currentSong } = get();

        // Cycle through shuffle modes: off -> normal -> smart -> off
        let newShuffleMode: ShuffleMode;
        switch (shuffleMode) {
          case 'off':
            newShuffleMode = 'normal';
            break;
          case 'normal':
            newShuffleMode = 'smart';
            break;
          case 'smart':
            newShuffleMode = 'off';
            break;
          default:
            newShuffleMode = 'normal';
        }

        const newIsShuffled = newShuffleMode !== 'off';

        if (newIsShuffled) {
          // Turning shuffle ON
          if (queue.length > 1 && currentSong) {
            // Store original queue if not already stored
            const queueToStore = originalQueue.length > 0 ? originalQueue : [...queue];

            // Find current song in the queue
            const currentSongIndex = queue.findIndex(song =>
              song._id === currentSong._id ||
              (song as any).id === (currentSong as any).id
            );

            if (currentSongIndex !== -1) {
              // Create shuffled queue with current song first
              const otherSongs = queue.filter((_, i) => i !== currentSongIndex);
              const shuffledOthers = newShuffleMode === 'smart'
                ? smartShuffleArray(otherSongs)
                : shuffleArray(otherSongs);
              const shuffledQueue = [currentSong, ...shuffledOthers];

              set({
                isShuffled: newIsShuffled,
                shuffleMode: newShuffleMode,
                queue: shuffledQueue,
                originalQueue: queueToStore,
                currentIndex: 0 // Current song is now at index 0
              });
            } else {
              // Fallback: just shuffle the entire queue
              const shuffledQueue = newShuffleMode === 'smart'
                ? smartShuffleArray([...queue])
                : shuffleArray([...queue]);
              set({
                isShuffled: newIsShuffled,
                shuffleMode: newShuffleMode,
                queue: shuffledQueue,
                originalQueue: queueToStore,
                currentIndex: 0
              });
            }
          } else {
            // Just toggle state if queue is too small
            set({
              isShuffled: newIsShuffled,
              shuffleMode: newShuffleMode
            });
          }
        } else {
          // Turning shuffle OFF - restore original order
          if (originalQueue.length > 0 && currentSong) {
            // Find current song in original queue
            const originalIndex = originalQueue.findIndex(song =>
              song._id === currentSong._id ||
              (song as any).id === (currentSong as any).id
            );

            set({
              isShuffled: newIsShuffled,
              shuffleMode: newShuffleMode,
              queue: [...originalQueue],
              currentIndex: originalIndex !== -1 ? originalIndex : 0
            });
          } else {
            // Just toggle state if no original queue
            set({
              isShuffled: newIsShuffled,
              shuffleMode: newShuffleMode
            });
          }
        }
      },

      setShuffleMode: (mode: ShuffleMode) => {
        const { queue, originalQueue, currentSong } = get();
        const newIsShuffled = mode !== 'off';

        if (newIsShuffled && queue.length > 1 && currentSong) {
          // Apply the new shuffle mode
          const queueToStore = originalQueue.length > 0 ? originalQueue : [...queue];
          const currentSongIndex = queue.findIndex(song =>
            song._id === currentSong._id ||
            (song as any).id === (currentSong as any).id
          );

          if (currentSongIndex !== -1) {
            const otherSongs = queue.filter((_, i) => i !== currentSongIndex);
            const shuffledOthers = mode === 'smart'
              ? smartShuffleArray(otherSongs)
              : shuffleArray(otherSongs);
            const shuffledQueue = [currentSong, ...shuffledOthers];

            set({
              isShuffled: newIsShuffled,
              shuffleMode: mode,
              queue: shuffledQueue,
              originalQueue: queueToStore,
              currentIndex: 0
            });
          }
        } else if (!newIsShuffled && originalQueue.length > 0 && currentSong) {
          // Restore original order
          const originalIndex = originalQueue.findIndex(song =>
            song._id === currentSong._id ||
            (song as any).id === (currentSong as any).id
          );

          set({
            isShuffled: newIsShuffled,
            shuffleMode: mode,
            queue: [...originalQueue],
            currentIndex: originalIndex !== -1 ? originalIndex : 0
          });
        } else {
          set({
            isShuffled: newIsShuffled,
            shuffleMode: mode
          });
        }
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

      smartShuffle: () => {
        const { queue, originalQueue } = get();
        if (queue.length === 0) return;

        // Use the perfect shuffle logic from liked songs
        const songsToShuffle = originalQueue.length > 0 ? [...originalQueue] : [...queue];

        // Fisher-Yates shuffle algorithm (perfect like liked songs)
        for (let i = songsToShuffle.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [songsToShuffle[i], songsToShuffle[j]] = [songsToShuffle[j], songsToShuffle[i]];
        }

        // Store original if not already stored
        const queueToStore = originalQueue.length > 0 ? originalQueue : [...queue];

        set({
          queue: songsToShuffle,
          originalQueue: queueToStore,
          currentIndex: 0,
          currentSong: songsToShuffle[0],
          currentTime: 0,
          isShuffled: true,
          shuffleMode: 'smart',
          hasUserInteracted: true,
          // Don't auto-play when shuffling - let user decide
          // isPlaying: true // Removed unwanted autoplay
        });
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
      storage: persistedPlayerStorage,
      partialize: (state) => ({
        currentSong: state.currentSong,
        queue: state.queue,
        originalQueue: state.originalQueue,
        currentIndex: state.currentIndex,
        isShuffled: state.isShuffled,
        shuffleMode: state.shuffleMode,
        isRepeating: state.isRepeating,
        wasPlayingBeforeInterruption: state.wasPlayingBeforeInterruption,
        interruptionReason: state.interruptionReason,
        audioOutputDevice: state.audioOutputDevice,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isPlaying = false;
          state.hasUserInteracted = false;
        }
      }
    }
  )
);

// Initialize the store by loading persisted data
setTimeout(() => {
  const store = usePlayerStore.getState();

  if (store.isPlaying) {
    store.setIsPlaying(false);
  }

  if (store.hasUserInteracted) {
    usePlayerStore.setState({ hasUserInteracted: false });
  }

  if (store.currentSong && store.currentSong.audioUrl && store.currentSong.audioUrl.startsWith('blob:')) {
    store.setCurrentSong({ ...store.currentSong, audioUrl: '' });
  }

  if (store.queue.length > 0) {
    const cleanQueue = store.queue.filter(song => !song.audioUrl || !song.audioUrl.startsWith('blob:'));
    if (cleanQueue.length !== store.queue.length) {
      usePlayerStore.setState({ queue: cleanQueue });
    }
  }

  if (store.currentSong && store.queue.length === 0) {
    usePlayerStore.setState({
      queue: [store.currentSong],
      originalQueue: [store.currentSong],
      currentIndex: 0,
    });
  }

  try {
    const savedState = localStorage.getItem('player_state');
    if (savedState) {
      const { currentTime: savedTime } = JSON.parse(savedState);
      if (savedTime && savedTime > 0) {
        store.setCurrentTime(savedTime);
      }
    }
  } catch (_error) {
    // Error handling without logging
  }
}, 0);
