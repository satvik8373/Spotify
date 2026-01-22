import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Song } from '@/types';

export type Queue = Song[];

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
      volume: 100,
      hasUserInteracted: false,
      autoplayBlocked: false,
      wasPlayingBeforeInterruption: false,
      interruptionReason: null,
      audioOutputDevice: null,
      lastPlayNextTime: 0,
      skipRestoreUntilTs: 0,

      setCurrentSong: (song) => {
        if (song.audioUrl && song.audioUrl.startsWith('blob:')) {
          return;
        }

        const audio = document.querySelector('audio');
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
          audio.src = '';
          audio.load();
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
        set({ currentTime: time });
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

        const validSongs = songs.filter(song => !song.audioUrl || !song.audioUrl.startsWith('blob:'));

        if (validSongs.length === 0) {
          return;
        }

        const validIndex = Math.max(0, Math.min(initialIndex, validSongs.length - 1));

        const audio = document.querySelector('audio');
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
          audio.src = '';
          audio.load();
        }

        const originalQueue = [...validSongs];
        let playQueue = [...validSongs];
        let playIndex = validIndex;

        const { shuffleMode } = get();
        if (shuffleMode !== 'off' && validSongs.length > 1) {
          const selectedSong = validSongs[validIndex];
          const otherSongs = validSongs.filter((_, i) => i !== validIndex);
          
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

        try {
          const playerState = {
            currentSong: playQueue[playIndex],
            currentTime: 0,
            timestamp: new Date().toISOString()
          };
          localStorage.setItem('player_state', JSON.stringify(playerState));
        } catch (_error) {
          // Error handling without logging
        }
      },

      playNext: () => {
        const { queue, currentIndex, shuffleMode, isRepeating } = get();

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

        const newIndex = shuffleMode !== 'off'
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
        }

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
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentSong: state.currentSong,
        queue: state.queue,
        originalQueue: state.originalQueue,
        currentIndex: state.currentIndex,
        currentTime: state.currentTime,
        isShuffled: state.isShuffled,
        shuffleMode: state.shuffleMode,
        isRepeating: state.isRepeating,
        autoplayBlocked: state.autoplayBlocked,
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
    store.playAlbum([store.currentSong], 0);
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