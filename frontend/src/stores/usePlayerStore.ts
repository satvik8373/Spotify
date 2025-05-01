import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Song } from '@/types';

export type Queue = Song[];

interface PlayerState {
  currentSong: Song | null;
  queue: Queue;
  currentIndex: number;
  isPlaying: boolean;
  isShuffled: boolean;
  hasUserInteracted: boolean;
  currentTime: number;
  duration: number;
  
  // Actions
  setCurrentSong: (song: Song) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  togglePlay: () => void;
  playAlbum: (songs: Song[], startIndex: number) => void;
  playNext: () => void;
  playPrevious: () => void;
  toggleShuffle: () => void;
  setUserInteracted: () => void;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      currentSong: null,
      queue: [],
      currentIndex: 0,
      isPlaying: false,
      isShuffled: false,
      hasUserInteracted: false,
      currentTime: 0,
      duration: 0,

      setCurrentSong: (song) => {
        set({ currentSong: song });
        
        // Save to localStorage as a backup for components that need it directly
        try {
          const playerState = { 
            currentSong: song,
            timestamp: new Date().toISOString()
          };
          localStorage.setItem('player_state', JSON.stringify(playerState));
        } catch (error) {
          console.error('Error saving player state:', error);
        }
      },
      
      setIsPlaying: (isPlaying) => {
        // If trying to play but user hasn't interacted, don't allow
        if (isPlaying && !get().hasUserInteracted) {
          console.log('Attempted to play without user interaction, setting hasUserInteracted to true');
          set({ isPlaying, hasUserInteracted: true });
        } else {
          set({ isPlaying });
        }
      },
      
      setCurrentTime: (time) => set({ currentTime: time }),
      
      setDuration: (duration) => set({ duration }),
      
      togglePlay: () => {
        const { isPlaying } = get();
        set({ 
          isPlaying: !isPlaying,
          hasUserInteracted: true // User must have interacted to toggle play
        });
      },
      
      playAlbum: (songs, startIndex) => {
        if (songs.length === 0) return;
        
        // Validate index
        const validIndex = Math.max(0, Math.min(startIndex, songs.length - 1));
        
        // Set player state
        set({
          queue: songs,
          currentIndex: validIndex,
          currentSong: songs[validIndex],
          hasUserInteracted: true // Assume user interaction when explicitly playing
        });
        
        // Save to localStorage as a backup for components that need it directly
        try {
          const playerState = { 
            currentSong: songs[validIndex],
            timestamp: new Date().toISOString()
          };
          localStorage.setItem('player_state', JSON.stringify(playerState));
        } catch (error) {
          console.error('Error saving player state:', error);
        }
      },
      
      playNext: () => {
        const { queue, currentIndex, isShuffled } = get();
        
        if (queue.length === 0) return;
        
        let newIndex = 0;
        
        if (isShuffled) {
          // In shuffle mode, pick a random song excluding current
          const potentialIndices = Array.from({ length: queue.length }, (_, i) => i)
            .filter(i => i !== currentIndex);
            
          if (potentialIndices.length > 0) {
            newIndex = potentialIndices[Math.floor(Math.random() * potentialIndices.length)];
          } else {
            // If only one song in queue, play it again
            newIndex = currentIndex;
          }
        } else {
          // In order mode, go to next song or loop back to start
          newIndex = (currentIndex + 1) % queue.length;
        }
        
        console.log(`Playing next song: ${currentIndex} -> ${newIndex} (queue size: ${queue.length})`);
        
        set({
          currentIndex: newIndex,
          currentSong: queue[newIndex],
          hasUserInteracted: true
        });
        
        // Save to localStorage as a backup
        try {
          const playerState = { 
            currentSong: queue[newIndex],
            timestamp: new Date().toISOString()
          };
          localStorage.setItem('player_state', JSON.stringify(playerState));
        } catch (error) {
          console.error('Error saving player state:', error);
        }
      },
      
      playPrevious: () => {
        const { queue, currentIndex } = get();
        
        if (queue.length === 0) return;
        
        const newIndex = (currentIndex - 1 + queue.length) % queue.length;
        
        set({
          currentIndex: newIndex,
          currentSong: queue[newIndex],
          hasUserInteracted: true
        });
        
        // Save to localStorage as a backup
        try {
          const playerState = { 
            currentSong: queue[newIndex],
            timestamp: new Date().toISOString()
          };
          localStorage.setItem('player_state', JSON.stringify(playerState));
        } catch (error) {
          console.error('Error saving player state:', error);
        }
      },
      
      toggleShuffle: () => {
        set(state => ({ isShuffled: !state.isShuffled }));
      },
      
      setUserInteracted: () => {
        set({ hasUserInteracted: true });
      }
    }),
    {
      name: 'player-storage',
      partialize: (state) => ({
        currentSong: state.currentSong,
        queue: state.queue,
        currentIndex: state.currentIndex,
        isShuffled: state.isShuffled
      })
    }
  )
);

// Initialize the store by loading persisted data
setTimeout(() => {
  // Auto-restore interrupted playback state from before refresh
  const store = usePlayerStore.getState();
  console.log('Player store initialized with:', store.currentSong?.title || 'no song');
  
  // If we have a song but no queue, try to reconstruct minimum queue
  if (store.currentSong && store.queue.length === 0) {
    console.log('Detected song but no queue, reconstructing minimal queue');
    store.playAlbum([store.currentSong], 0);
  }
}, 0);
