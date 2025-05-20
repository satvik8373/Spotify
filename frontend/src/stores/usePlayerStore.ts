import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Song } from '@/types';

export type Queue = Song[];

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
          // Error handling without logging
        }
      },
      
      setIsPlaying: (isPlaying) => {
        // If trying to play but user hasn't interacted, don't allow
        if (isPlaying && !get().hasUserInteracted) {
          // console.log('Attempted to play without user interaction, setting hasUserInteracted to true');
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
      
      playAlbum: (songs, initialIndex) => {
        if (songs.length === 0) return;
        
        // Validate index
        const validIndex = Math.max(0, Math.min(initialIndex, songs.length - 1));
        
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
          // Error handling without logging
        }
      },
      
      playNext: () => {
        const { queue, currentIndex, isShuffled, isRepeating } = get();
        
        if (queue.length === 0) return;
        
        // First check if we should repeat the current song
        if (isRepeating) {
          // Just restart the current song
          const audio = document.querySelector('audio');
          if (audio) {
            audio.currentTime = 0;
            audio.play().catch(() => {});
          }
          return;
        }
        
        const newIndex = isShuffled 
          ? getRandomIndex(currentIndex, queue.length)
          : currentIndex >= queue.length - 1 ? 0 : currentIndex + 1;
        
        // Save current state before changing
        const currentState = {
          currentSong: queue[currentIndex],
          currentIndex,
          timestamp: new Date().toISOString()
        };
        
        // Update state with new song
        set({
          currentIndex: newIndex,
          currentSong: queue[newIndex],
          hasUserInteracted: true,
          isPlaying: true // Always ensure playback continues
        });
        
        // More reliable method to ensure the audio element updates
        // especially important for background/lock screen playback
        const playNextAudio = () => {
          const audio = document.querySelector('audio');
          if (audio) {
            // Ensure the audio element has the latest src and is playing
            if (audio.src !== queue[newIndex].audioUrl) {
              audio.src = queue[newIndex].audioUrl;
              audio.load(); // Important for mobile browsers
            }
            
            // Use a more forceful approach to ensure playback
            const playPromise = audio.play();
            if (playPromise !== undefined) {
              playPromise.catch((error) => {
                // Retry playing after a short delay
                setTimeout(() => {
                  audio.play().catch(() => {
                    // If it still fails, try with user activation flag
                    set({ hasUserInteracted: true });
                    setTimeout(() => audio.play().catch(() => {}), 100);
                  });
                }, 200);
              });
            }
            
            // Update MediaSession for lock screen controls if available
            if ('mediaSession' in navigator) {
              navigator.mediaSession.metadata = new MediaMetadata({
                title: queue[newIndex].title || 'Unknown Title',
                artist: queue[newIndex].artist || 'Unknown Artist',
                album: queue[newIndex].albumId ? String(queue[newIndex].albumId) : 'Unknown Album',
                artwork: [
                  {
                    src: queue[newIndex].imageUrl || 'https://cdn.iconscout.com/icon/free/png-256/free-music-1779799-1513951.png',
                    sizes: '512x512',
                    type: 'image/jpeg'
                  }
                ]
              });
              
              // Update playback state
              navigator.mediaSession.playbackState = 'playing';
              
              // Update position state if supported
              if ('setPositionState' in navigator.mediaSession) {
                try {
                  // Initially set to 0 position for the new track
                  navigator.mediaSession.setPositionState({
                    duration: audio.duration || 0,
                    playbackRate: audio.playbackRate || 1,
                    position: 0
                  });
                } catch (e) {
                  // Ignore position state errors
                }
              }
            }
          }
        };
        
        // Try playing immediately
        playNextAudio();
        
        // And also after a small delay to ensure it works in lock screen
        setTimeout(playNextAudio, 50);
        
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
        } catch (error) {
          // Error handling without logging
        }
      },
      
      playPrevious: () => {
        const { queue, currentIndex, isRepeating } = get();
        
        if (queue.length === 0) return;
        
        // Check if current song has played less than 3 seconds
        // If so, go to previous song, otherwise restart current song
        const audio = document.querySelector('audio');
        const currentTime = audio?.currentTime || 0;
        
        if (currentTime > 3 && !isRepeating) {
          // If we're more than 3 seconds in, just restart the current song
          if (audio) {
            audio.currentTime = 0;
            audio.play().catch(() => {});
          }
          return;
        }
        
        const newIndex = (currentIndex - 1 + queue.length) % queue.length;
        
        set({
          currentIndex: newIndex,
          currentSong: queue[newIndex],
          hasUserInteracted: true,
          isPlaying: true // Always ensure playback continues
        });
        
        // Save to localStorage as a backup
        try {
          const playerState = { 
            currentSong: queue[newIndex],
            currentIndex: newIndex,
            timestamp: new Date().toISOString()
          };
          localStorage.setItem('player_state', JSON.stringify(playerState));
        } catch (error) {
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
      }
    }),
    {
      name: 'player-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentSong: state.currentSong,
        queue: state.queue,
        currentIndex: state.currentIndex,
        isShuffled: state.isShuffled,
        isRepeating: state.isRepeating,
        hasUserInteracted: state.hasUserInteracted,
        autoplayBlocked: state.autoplayBlocked,
        wasPlayingBeforeInterruption: state.wasPlayingBeforeInterruption,
      })
    }
  )
);

// Initialize the store by loading persisted data
setTimeout(() => {
  // Auto-restore interrupted playback state from before refresh
  const store = usePlayerStore.getState();
  // console.log('Player store initialized with:', store.currentSong?.title || 'no song');
  
  // If we have a song but no queue, try to reconstruct minimum queue
  if (store.currentSong && store.queue.length === 0) {
    // console.log('Detected song but no queue, reconstructing minimal queue');
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
        // console.log('Resuming playback from saved state');
        store.setIsPlaying(true);
      }
    }
  } catch (error) {
    // Error handling without logging
  }
}, 0);
