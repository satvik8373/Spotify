import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Song } from '@/types';
import { dispatchPlayerStateChange } from '@/utils/playerStateSync';

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

      setCurrentSong: (song) => {
        const currentState = get();
        const isSameSong = currentState.currentSong && 
          (currentState.currentSong._id === song._id || 
           (currentState.currentSong as any).id === (song as any).id);

        // Get the current audio element
        const audio = document.querySelector('audio');
        
        // If it's a different song, stop current playback immediately
        if (audio && !isSameSong) {
          audio.pause();
          audio.currentTime = 0;
        }

        // Simple state update without complex logic
        set({
          currentSong: song,
          currentTime: isSameSong ? currentState.currentTime : 0,
          isPlaying: true,
          hasUserInteracted: true // Ensure user interaction is set
        });
        
        // Dispatch state change
        dispatchPlayerStateChange(true, song);
      },

      setIsPlaying: (isPlaying) => {
        const currentState = get();
        
        // Simple state update without complex timing logic
        set({ 
          isPlaying,
          hasUserInteracted: true
        });
        
        // Dispatch state change
        dispatchPlayerStateChange(isPlaying, currentState.currentSong);
      },

      setCurrentTime: (time) => {
        set({ currentTime: time });
      },

      setDuration: (duration) => set({ duration }),

      togglePlay: () => {
        const currentState = get();
        const newIsPlaying = !currentState.isPlaying;
        
        console.log('togglePlay called:', { 
          currentIsPlaying: currentState.isPlaying, 
          newIsPlaying,
          currentSong: currentState.currentSong?.title 
        });
        
        set({
          isPlaying: newIsPlaying,
          hasUserInteracted: true
        });
        
        // Dispatch state change
        dispatchPlayerStateChange(newIsPlaying, currentState.currentSong);
      },

      playAlbum: (songs, initialIndex) => {
        if (songs.length === 0) return;

        // Stop current audio
        const audio = document.querySelector('audio');
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }

        // Validate index
        const validIndex = Math.max(0, Math.min(initialIndex, songs.length - 1));

        // Set player state
        set({
          queue: songs,
          currentIndex: validIndex,
          currentSong: songs[validIndex],
          currentTime: 0,
          hasUserInteracted: true,
          isPlaying: true
        });
      },

      playNext: () => {
        const { queue, currentIndex, isShuffled, isRepeating } = get();

        if (queue.length === 0) return;

        // Prevent rapid calls
        const now = Date.now();
        const lastPlayNext = get().lastPlayNextTime || 0;
        if (now - lastPlayNext < 500) {
          return;
        }

        // Stop current audio
        const audio = document.querySelector('audio');
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }

        // Handle repeat mode
        if (isRepeating) {
          if (audio) {
            audio.currentTime = 0;
            audio.play().catch(() => {});
          }
          return;
        }

        // Calculate next index
        const newIndex = isShuffled
          ? getRandomIndex(currentIndex, queue.length)
          : currentIndex >= queue.length - 1 ? 0 : currentIndex + 1;

        // Update state
        set({
          currentIndex: newIndex,
          currentSong: queue[newIndex],
          currentTime: 0,
          hasUserInteracted: true,
          isPlaying: true,
          lastPlayNextTime: now
        });

        // Play new song
        if (audio) {
          const newAudioUrl = queue[newIndex].audioUrl || (queue[newIndex] as any).url;
          if (newAudioUrl) {
            audio.src = newAudioUrl;
            audio.currentTime = 0;
            audio.play().catch(() => {});
          }
        }
      },

      playPrevious: () => {
        const { queue, currentIndex } = get();

        if (queue.length === 0) return;

        // Stop current audio
        const audio = document.querySelector('audio');
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }

        // Check if we should restart current song (if played > 3 seconds)
        const currentTime = audio?.currentTime || 0;
        if (currentTime > 3) {
          if (audio) {
            audio.currentTime = 0;
            audio.play().catch(() => {});
          }
          return;
        }

        // Go to previous song
        const newIndex = (currentIndex - 1 + queue.length) % queue.length;

        set({
          currentIndex: newIndex,
          currentSong: queue[newIndex],
          currentTime: 0,
          hasUserInteracted: true,
          isPlaying: true
        });

        // Play new song
        if (audio) {
          const newAudioUrl = queue[newIndex].audioUrl || (queue[newIndex] as any).url;
          if (newAudioUrl) {
            audio.src = newAudioUrl;
            audio.currentTime = 0;
            audio.play().catch(() => {});
          }
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

// Simplified initialization
setTimeout(() => {
  const store = usePlayerStore.getState();
  console.log('Player store initialized with:', store.currentSong?.title || 'no song');
}, 0);
