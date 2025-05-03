import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
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
  autoplayBlocked: boolean;
  wasInterrupted: boolean;
  systemPaused: boolean;
  lastActiveTime: number;
  volume: number;
  isRepeating: boolean;
  
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
  setSystemInterruption: () => void;
  toggleRepeat: () => void;
  setVolume: (volume: number) => void;
  shouldAutoResume: () => boolean;
}

export const usePlayerStore = create<PlayerState>()(
  devtools(
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
        autoplayBlocked: false,
        wasInterrupted: false,
        systemPaused: false,
        lastActiveTime: Date.now(),
        volume: 75,
        isRepeating: false,

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
          const state = get();
          
          if (isPlaying) {
            // When explicitly playing, mark as active and clear interruption flags
            set({ 
              isPlaying,
              wasInterrupted: false,
              systemPaused: false,
              lastActiveTime: Date.now()
            });
          } else {
            // When pausing, preserve the current interruption state
            set({ isPlaying });
          }
        },
        
        setCurrentTime: (time) => set({ currentTime: time }),
        
        setDuration: (duration) => set({ duration }),
        
        togglePlay: () => {
          const { isPlaying, wasInterrupted, currentSong } = get();
          
          // Only toggle if we have a current song
          if (!currentSong) return;
          
          if (!isPlaying) {
            // When resuming, clear interruption flags
            set({ 
              isPlaying: true, 
              wasInterrupted: false,
              systemPaused: false,
              lastActiveTime: Date.now()
            });
          } else {
            // Normal pause
            set({ isPlaying: false });
          }
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
            hasUserInteracted: true, // Assume user interaction when explicitly playing
            wasInterrupted: false,
            systemPaused: false,
            lastActiveTime: Date.now()
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
          const { queue, currentIndex, isShuffled, isRepeating } = get();
          
          if (queue.length === 0) return;
          
          let nextIndex;
          
          if (isShuffled) {
            // Random index that's different from current
            const random = () => Math.floor(Math.random() * queue.length);
            nextIndex = queue.length > 1 
              ? (() => {
                  let idx = random();
                  while (idx === currentIndex && queue.length > 1) idx = random();
                  return idx;
                })()
              : 0;
          } else {
            // Standard sequential playback
            nextIndex = currentIndex + 1;
            
            // Handle repeat behavior or wrap around
            if (nextIndex >= queue.length) {
              nextIndex = isRepeating ? 0 : 0;
            }
          }
          
          // Update state with the next song
          set({
            currentIndex: nextIndex,
            currentSong: queue[nextIndex],
            // Don't touch isPlaying here - that should be managed separately
          });
        },
        
        playPrevious: () => {
          const { queue, currentIndex, isShuffled } = get();
          
          if (queue.length === 0) return;
          
          let prevIndex;
          
          if (isShuffled) {
            // Random previous song
            prevIndex = Math.floor(Math.random() * queue.length);
          } else {
            // Go to previous song or wrap to end
            prevIndex = currentIndex - 1;
            if (prevIndex < 0) prevIndex = queue.length - 1;
          }
          
          set({
            currentIndex: prevIndex,
            currentSong: queue[prevIndex]
          });
        },
        
        toggleShuffle: () => {
          set(state => ({ isShuffled: !state.isShuffled }));
        },
        
        toggleRepeat: () => {
          const { isRepeating } = get();
          set({ isRepeating: !isRepeating });
        },
        
        setUserInteracted: () => {
          set({ hasUserInteracted: true });
        },
        
        setSystemInterruption: () => {
          set({ 
            isPlaying: false, 
            wasInterrupted: true,
            systemPaused: true,
            lastActiveTime: Date.now()
          });
        },
        
        setVolume: (volume: number) => 
          set({ volume }),
        
        shouldAutoResume: () => {
          const { wasInterrupted, systemPaused, lastActiveTime } = get();
          
          // If it was interrupted by the system, never auto-resume
          if (wasInterrupted || systemPaused) return false;
          
          // Check if the interruption was recent (within last 30 seconds)
          const thirtySecondsAgo = Date.now() - 30000;
          return lastActiveTime > thirtySecondsAgo;
        }
      }),
      {
        name: 'player-storage',
        partialize: (state) => ({
          currentSong: state.currentSong,
          queue: state.queue,
          currentIndex: state.currentIndex,
          isShuffled: state.isShuffled,
          isRepeating: state.isRepeating,
          hasUserInteracted: state.hasUserInteracted,
          lastActiveTime: state.lastActiveTime,
          volume: state.volume,
          autoplayBlocked: state.autoplayBlocked
        })
      }
    )
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
  
  // Check if we should resume playback
  try {
    const savedState = localStorage.getItem('player_state');
    if (savedState) {
      const { timestamp, isPlaying } = JSON.parse(savedState);
      const timeSinceLastUpdate = Date.now() - new Date(timestamp).getTime();
      
      // If the last update was recent (within 5 minutes) and playback was active
      if (timeSinceLastUpdate < 5 * 60 * 1000 && isPlaying) {
        console.log('Resuming playback from saved state');
        store.setIsPlaying(true);
      }
    }
  } catch (error) {
    console.error('Error checking saved playback state:', error);
  }
}, 0);
