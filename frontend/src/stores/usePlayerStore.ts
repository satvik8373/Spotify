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

        // Prevent rapid successive calls
        const now = Date.now();
        const lastPlayNext = get().lastPlayNextTime || 0;
        if (now - lastPlayNext < 500) { // 500ms cooldown
          return;
        }

        // Immediately stop current audio and reset time
        const audio = document.querySelector('audio');
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
          // Clear the src to completely stop the previous song
          audio.src = '';
          audio.load();
        }

        // First check if we should repeat the current song
        if (isRepeating) {
          // Just restart the current song
          if (audio) {
            audio.currentTime = 0;
            audio.dataset.ending = 'false'; // Reset ending flag
            audio.play().catch(() => { });
          }
          return;
        }

        const newIndex = isShuffled
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
          skipRestoreUntilTs: now + 5000 // prevent time restore for 5s on track change
        });

        // More reliable method to ensure the audio element updates
        // especially important for background/lock screen playback
        const playNextAudio = () => {
          const audio = document.querySelector('audio');
          if (audio) {
            // Reset ending flag to prevent conflicts
            audio.dataset.ending = 'false';

            // CRITICAL: Reset currentTime to 0 immediately
            audio.currentTime = 0;

            // Ensure the audio element has the latest src and is playing
            const newAudioUrl = queue[newIndex].audioUrl || (queue[newIndex] as any).url;
            if (audio.src !== newAudioUrl && newAudioUrl) {
              audio.src = newAudioUrl;
              audio.load(); // Important for mobile browsers
              // Reset currentTime again after load
              audio.currentTime = 0;
            }

            // Use a more forceful approach to ensure playback
            const playPromise = audio.play();
            if (playPromise !== undefined) {
              playPromise.catch(() => {
                // Retry playing after a short delay
                setTimeout(() => {
                  audio.play().catch(() => {
                    // If it still fails, try with user activation flag
                    set({ hasUserInteracted: true });
                    setTimeout(() => audio.play().catch(() => { }), 100);
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

              // Re-register media session handlers for better reliability in background
              navigator.mediaSession.setActionHandler('nexttrack', () => {
                // Directly access the store to avoid closure issues
                const store = get();
                store.setUserInteracted();
                store.playNext();
              });

              navigator.mediaSession.setActionHandler('previoustrack', () => {
                // Directly access the store to avoid closure issues
                const store = get();
                store.setUserInteracted();
                store.playPrevious();
              });

              navigator.mediaSession.setActionHandler('play', () => {
                set({ isPlaying: true });
                if (audio.paused) {
                  audio.play().catch(() => { });
                }
              });

              navigator.mediaSession.setActionHandler('pause', () => {
                set({ isPlaying: false });
                if (!audio.paused) {
                  audio.pause();
                }
              });
            }
          }
        };

        // Try playing immediately
        playNextAudio();

        // And also after a small delay to ensure it works in lock screen
        setTimeout(playNextAudio, 50);

        // Additional attempts with increasing delays for better reliability
        [200, 500, 1000].forEach(delay => {
          setTimeout(() => {
            const audio = document.querySelector('audio');
            if (audio && audio.paused && !audio.ended) {
              audio.play().catch(() => { });
            }
          }, delay);
        });
      },

      playPrevious: () => {
        const { queue, currentIndex, isRepeating } = get();

        if (queue.length === 0) return;

        // Immediately stop current audio and reset time
        const audio = document.querySelector('audio');
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
          // Clear the src to completely stop the previous song
          audio.src = '';
          audio.load();
        }

        // Check if current song has played less than 3 seconds
        // If so, go to previous song, otherwise restart current song
        const currentTime = audio?.currentTime || 0;

        if (currentTime > 3 && !isRepeating) {
          // If we're more than 3 seconds in, just restart the current song
          if (audio) {
            audio.currentTime = 0;
            audio.play().catch(() => { });
          }
          return;
        }

        const newIndex = (currentIndex - 1 + queue.length) % queue.length;

        set({
          currentIndex: newIndex,
          currentSong: queue[newIndex],
          currentTime: 0, // Reset time for new song
          hasUserInteracted: true,
          isPlaying: true, // Always ensure playback continues
          skipRestoreUntilTs: Date.now() + 5000
        });

        // CRITICAL: Reset audio currentTime immediately
        if (audio) {
          audio.currentTime = 0;
          const newAudioUrl = queue[newIndex].audioUrl || (queue[newIndex] as any).url;
          if (audio.src !== newAudioUrl && newAudioUrl) {
            audio.src = newAudioUrl;
            audio.load();
            audio.currentTime = 0;
          }
          audio.play().catch(() => { });

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
