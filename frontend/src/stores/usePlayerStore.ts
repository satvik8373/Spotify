import { create } from 'zustand';
import { Song } from '@/types';

interface PlayerStore {
  currentSong: Song | null;
  isPlaying: boolean;
  queue: Song[];
  originalQueue: Song[]; // Store original queue order for unshuffling
  currentIndex: number;
  isShuffled: boolean;
  currentTime: number; // Current playback time in seconds
  duration: number; // Total duration of current song in seconds
  userInteracted: boolean; // Track whether user has interacted with the page
  autoplayBlocked: boolean; // Track if autoplay was blocked

  initializeQueue: (songs: Song[]) => void;
  playAlbum: (songs: Song[], startIndex?: number) => void;
  playPlaylist: (songs: Song[], startIndex?: number) => void;
  setCurrentSong: (song: Song | null) => void;
  togglePlay: () => void;
  setIsPlaying: (state: boolean) => void;
  playNext: () => void;
  playPrevious: () => void;
  toggleShuffle: () => void;
  clearQueue: () => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  setCurrentTime: (time: number) => void; // Set current playback time
  setDuration: (time: number) => void; // Set total duration of current song
  setUserInteracted: () => void;
  nextSong: (shuffle?: boolean) => void;
  previousSong: () => void;
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  currentSong: null,
  isPlaying: false,
  queue: [],
  originalQueue: [],
  currentIndex: -1,
  isShuffled: false,
  currentTime: 0,
  duration: 0,
  userInteracted: false, // Track whether user has interacted with the page
  autoplayBlocked: false, // Track if autoplay was blocked

  setUserInteracted: () => {
    set({ userInteracted: true });
  },

  initializeQueue: (songs: Song[]) => {
    set({
      queue: songs,
      originalQueue: [...songs], // Store original order
      currentSong: get().currentSong || songs[0],
      currentIndex: get().currentIndex === -1 ? 0 : get().currentIndex,
      isShuffled: false,
    });
  },

  playAlbum: (songs: Song[], startIndex = 0) => {
    if (songs.length === 0) return;

    const song = songs[startIndex];
    const userInteracted = get().userInteracted;

    set({
      queue: songs,
      originalQueue: [...songs], // Store original order
      currentSong: song,
      currentIndex: startIndex,
      isPlaying: userInteracted, // Only auto-play if user has interacted
      isShuffled: false,
      autoplayBlocked: !userInteracted, // Mark as blocked if trying to play without interaction
    });
  },

  playPlaylist: (songs: Song[], startIndex = 0) => {
    if (songs.length === 0) return;

    const song = songs[startIndex];
    const userInteracted = get().userInteracted;

    set({
      queue: songs,
      originalQueue: [...songs], // Store original order
      currentSong: song,
      currentIndex: startIndex,
      isPlaying: userInteracted, // Only auto-play if user has interacted
      isShuffled: false,
      autoplayBlocked: !userInteracted, // Mark as blocked if trying to play without interaction
    });
  },

  setCurrentSong: (song: Song | null) => {
    if (!song) return;

    const songIndex = get().queue.findIndex(s => {
      // Handle both regular songs and Indian songs
      const songId = (s as any).id || s._id;
      const targetId = (song as any).id || song._id;
      return songId === targetId;
    });

    const userInteracted = get().userInteracted;

    // If the song is not in the queue, add it
    if (songIndex === -1) {
      const updatedQueue = [...get().queue, song];
      set({
        queue: updatedQueue,
        originalQueue: [...updatedQueue], // Update original queue too
        currentSong: song,
        currentIndex: updatedQueue.length - 1,
        isPlaying: userInteracted, // Only auto-play if user has interacted
        autoplayBlocked: !userInteracted, // Mark as blocked if trying to play without interaction
      });
    } else {
      set({
        currentSong: song,
        isPlaying: userInteracted, // Only auto-play if user has interacted
        currentIndex: songIndex,
        autoplayBlocked: !userInteracted, // Mark as blocked if trying to play without interaction
      });
    }
  },

  togglePlay: () => {
    const willStartPlaying = !get().isPlaying;

    // If trying to start playing and autoplay was blocked, mark user as interacted
    if (willStartPlaying) {
      set({
        userInteracted: true,
        autoplayBlocked: false,
      });
    }

    set({
      isPlaying: willStartPlaying,
    });
  },

  playNext: () => {
    const { currentIndex, queue } = get();
    const nextIndex = currentIndex + 1;

    // if there is a next song to play, let's play it
    if (nextIndex < queue.length) {
      const nextSong = queue[nextIndex];
      set({
        currentSong: nextSong,
        currentIndex: nextIndex,
        isPlaying: true,
      });
    } else if (queue.length > 0) {
      // Loop back to the first song if we're at the end
      const firstSong = queue[0];
      set({
        currentSong: firstSong,
        currentIndex: 0,
        isPlaying: true,
      });
    } else {
      // no songs in queue
      set({ isPlaying: false });
    }
  },

  playPrevious: () => {
    const { currentIndex, queue } = get();
    const prevIndex = currentIndex - 1;

    // If we're past the first few seconds of the song, restart it instead of going to previous
    const audio = document.querySelector('audio');
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }

    // theres a prev song
    if (prevIndex >= 0) {
      const prevSong = queue[prevIndex];
      set({
        currentSong: prevSong,
        currentIndex: prevIndex,
        isPlaying: true,
      });
    } else if (queue.length > 0) {
      // Loop to the last song if we're at the beginning
      const lastSong = queue[queue.length - 1];
      set({
        currentSong: lastSong,
        currentIndex: queue.length - 1,
        isPlaying: true,
      });
    } else {
      // no songs in queue
      set({ isPlaying: false });
    }
  },

  toggleShuffle: () => {
    const { isShuffled, queue, originalQueue, currentIndex, currentSong } = get();

    if (isShuffled) {
      // Return to original order
      set({
        queue: [...originalQueue],
        isShuffled: false,
        // Update current index to match the position in the original queue
        currentIndex: originalQueue.findIndex(
          song =>
            (song as any).id === ((currentSong as any)?.id || '') ||
            (song as any)._id === ((currentSong as any)?._id || '')
        ),
      });
    } else {
      // Shuffle the queue keeping current song at current position
      const currentSongId = (currentSong as any)?.id || (currentSong as any)?._id;

      const shuffledQueue = [...originalQueue];
      // Remove current song from the array
      const currentSongIndex = shuffledQueue.findIndex(
        song => (song as any).id === currentSongId || (song as any)._id === currentSongId
      );

      if (currentSongIndex !== -1) {
        const currentSongItem = shuffledQueue.splice(currentSongIndex, 1)[0];

        // Shuffle remaining songs
        for (let i = shuffledQueue.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledQueue[i], shuffledQueue[j]] = [shuffledQueue[j], shuffledQueue[i]];
        }

        // Put current song at current index
        shuffledQueue.splice(currentIndex, 0, currentSongItem);
      } else {
        // If current song not found, just shuffle everything
        for (let i = shuffledQueue.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledQueue[i], shuffledQueue[j]] = [shuffledQueue[j], shuffledQueue[i]];
        }
      }

      set({
        queue: shuffledQueue,
        isShuffled: true,
      });
    }
  },

  clearQueue: () => {
    set({
      queue: [],
      originalQueue: [],
      currentSong: null,
      currentIndex: -1,
      isPlaying: false,
      isShuffled: false,
    });
  },

  addToQueue: (song: Song) => {
    const { queue, originalQueue } = get();
    const updatedQueue = [...queue, song];
    const updatedOriginalQueue = [...originalQueue, song];

    set({
      queue: updatedQueue,
      originalQueue: updatedOriginalQueue,
    });
  },

  removeFromQueue: (index: number) => {
    const { queue, originalQueue, currentIndex } = get();

    // Don't remove currently playing song
    if (index === currentIndex) {
      return;
    }

    const updatedQueue = [...queue];
    updatedQueue.splice(index, 1);

    // Handle removal from originalQueue too (find equivalent item to remove)
    const removedItemId =
      index < queue.length ? (queue[index] as any).id || queue[index]._id : null;
    let updatedOriginalQueue = [...originalQueue];

    if (removedItemId) {
      const originalIndex = updatedOriginalQueue.findIndex(
        s => ((s as any).id || s._id) === removedItemId
      );
      if (originalIndex >= 0) {
        updatedOriginalQueue.splice(originalIndex, 1);
      }
    }

    // Update current index if needed
    let newCurrentIndex = currentIndex;
    if (index < currentIndex) {
      newCurrentIndex -= 1;
    }

    set({
      queue: updatedQueue,
      originalQueue: updatedOriginalQueue,
      currentIndex: newCurrentIndex,
    });
  },

  setIsPlaying: (state: boolean) => {
    set({
      isPlaying: state,
    });
  },

  setCurrentTime: (time: number) => {
    set({
      currentTime: time,
    });
  },

  setDuration: (time: number) => {
    set({
      duration: time,
    });
  },

  nextSong: (shuffle = false) => {
    const { queue, currentIndex } = get();
    if (queue.length === 0) return;

    // Calculate next index
    const nextIndex = (currentIndex + 1) % queue.length;

    set({
      currentSong: queue[nextIndex],
      currentIndex: nextIndex,
      isPlaying: get().userInteracted, // Only auto-play if user has interacted
      autoplayBlocked: !get().userInteracted,
    });
  },

  previousSong: () => {
    const { queue, currentIndex } = get();
    if (queue.length === 0) return;

    // Calculate previous index (with wraparound)
    const prevIndex = (currentIndex - 1 + queue.length) % queue.length;

    set({
      currentSong: queue[prevIndex],
      currentIndex: prevIndex,
      isPlaying: get().userInteracted, // Only auto-play if user has interacted
      autoplayBlocked: !get().userInteracted,
    });
  },
}));
