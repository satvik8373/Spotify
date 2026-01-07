import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Song } from '../types';
import * as likedSongsFirestoreService from '@/services/likedSongsService';
import { useAuthStore } from './useAuthStore';

// Define a helper type for conversion between types
type FirestoreSong = likedSongsFirestoreService.Song;

// Helper function to convert between song types
const convertToLocalSong = (firebaseSong: FirestoreSong): Song => {
  return {
    _id: firebaseSong.id,
    title: firebaseSong.title,
    artist: firebaseSong.artist,
    albumId: null,
    imageUrl: firebaseSong.imageUrl,
    audioUrl: firebaseSong.audioUrl,
    duration: firebaseSong.duration || 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
};

// Local backup service for offline or error scenarios
const localLikedSongsService = {
  getLikedSongs: (): Song[] => {
    const songs = localStorage.getItem('likedSongs');
    return songs ? JSON.parse(songs) : [];
  },

  addLikedSong: (song: Song): void => {
    const songs = localLikedSongsService.getLikedSongs();
    const songId = song._id;

    // Check if song already exists
    if (songs.some((s: Song) => s._id === songId)) {
      return;
    }

    // Add the song
    songs.unshift(song);
    localStorage.setItem('likedSongs', JSON.stringify(songs));
  },

  removeLikedSong: (songId: string): void => {
    const songs = localLikedSongsService.getLikedSongs();
    const filteredSongs = songs.filter((song: Song) => song._id !== songId);
    localStorage.setItem('likedSongs', JSON.stringify(filteredSongs));
  },

  isLiked: (songId: string): boolean => {
    const songs = localLikedSongsService.getLikedSongs();
    return songs.some((song: Song) => song._id === songId);
  }
};

interface LikedSongsStore {
  likedSongs: Song[];
  likedSongIds: Set<string>;
  isLoading: boolean;
  isSaving: boolean;

  // Actions
  loadLikedSongs: () => Promise<void>;
  addLikedSong: (song: Song) => Promise<void>;
  removeLikedSong: (songId: string) => Promise<void>;
  toggleLikeSong: (song: Song) => Promise<void>;
}

export const useLikedSongsStore = create<LikedSongsStore>()(
  persist(
    (set, get) => ({
      likedSongs: [],
      likedSongIds: new Set<string>(),
      isLoading: false,
      isSaving: false,

      loadLikedSongs: async () => {
        // Skip if already loading
        if (get().isLoading) return;

        set({ isLoading: true });

        try {
          let songs: Song[] = [];
          const isAuthenticated = useAuthStore.getState().isAuthenticated;

          // Try Firestore first if user is authenticated
          if (isAuthenticated) {
            try {
              // Fetch from Firestore sorted by most recent first
              const firebaseSongs = await likedSongsFirestoreService.loadLikedSongs();
              songs = firebaseSongs.map(convertToLocalSong);
            } catch (firebaseError) {
              console.warn('Failed to load from Firebase, falling back to local storage', firebaseError);
              // Fall back to local storage if Firestore fails
              songs = localLikedSongsService.getLikedSongs();
            }
          } else {
            // Use local storage for anonymous users
            songs = localLikedSongsService.getLikedSongs();
          }

          // Build songIds set for efficient lookups
          const songIds = new Set<string>();
          songs.forEach((song: any) => {
            const possibleIds = [song._id, song.id].filter(Boolean) as string[];
            possibleIds.forEach((sid) => songIds.add(sid));
          });

          // Only update state if songs actually changed
          const existingSongs = get().likedSongs;
          const hasChanged =
            existingSongs.length !== songs.length ||
            existingSongs.some((existing, i) => existing._id !== songs[i]?._id);

          // Always update if we have songs (force refresh after Spotify sync)
          if (hasChanged || songs.length > 0) {
            console.log(`Store loaded ${songs.length} liked songs, ${songIds.size} unique IDs`);
            set({ likedSongs: songs, likedSongIds: songIds });
          }
        } catch (error) {
          // Don't clear existing songs on error, just keep what we have
        } finally {
          set({ isLoading: false });
          // Broadcast that liked songs are loaded/updated so all hearts can refresh
          try {
            document.dispatchEvent(new CustomEvent('likedSongsUpdated', {
              detail: {
                source: 'useLikedSongsStore.loadLikedSongs',
                timestamp: Date.now(),
                count: get().likedSongs.length
              }
            }));
          } catch { }
        }
      },

      addLikedSong: async (song: Song) => {
        // Skip if already in progress
        if (get().isSaving) return;

        try {
          // Get the song ID consistently
          const songId = song._id;
          if (!songId) {
            return;
          }

          // First check if it's already liked
          if (get().likedSongIds.has(songId)) {
            console.log(`Song ${songId} is already liked, skipping`);
            return;
          }

          set({ isSaving: true });

          // Optimistically update local state immediately for better UX
          const updatedSongs = [song, ...get().likedSongs];
          const updatedSongIds = new Set(get().likedSongIds);
          // Add both canonical and alternative IDs for global UI consistency
          updatedSongIds.add(songId);
          const altId = (song as any).id;
          if (altId) updatedSongIds.add(altId);

          // Update local state before Firestore to make UI response instant
          set({
            likedSongs: updatedSongs,
            likedSongIds: updatedSongIds
          });

          // Always update local storage as a backup
          localLikedSongsService.addLikedSong(song);

          // Update Firestore if user is authenticated - don't await to prevent UI blocking
          const isAuthenticated = useAuthStore.getState().isAuthenticated;
          if (isAuthenticated) {
            likedSongsFirestoreService.addLikedSong({
              id: songId,
              title: song.title,
              artist: song.artist,
              imageUrl: song.imageUrl,
              audioUrl: song.audioUrl,
              duration: song.duration,
              album: song.albumId || ''
            }).catch(() => {
              // Error handled silently
            });
          }

          // Notify listeners through event
          document.dispatchEvent(new CustomEvent('likedSongsUpdated'));

          // Success without notification
        } catch (error) {
          // Error handled silently
        } finally {
          set({ isSaving: false });
        }
      },

      removeLikedSong: async (songId: string) => {
        // Skip if already in progress
        if (get().isSaving) return;

        try {
          set({ isSaving: true });

          // Optimistically update local state immediately for better UX
          const updatedSongs = get().likedSongs.filter(song => song._id !== songId);
          const updatedSongIds = new Set(get().likedSongIds);
          updatedSongIds.delete(songId);
          // Also remove any alternate id representation present in the set
          const altIdsToRemove: string[] = [];
          get().likedSongs.forEach((s: any) => {
            const alt = s.id || s._id;
            if (alt && alt !== songId && updatedSongIds.has(alt)) {
              // if this song was removed and alt id matches, remove it
              if (!updatedSongs.some(us => (us as any)._id === alt || (us as any).id === alt)) {
                altIdsToRemove.push(alt);
              }
            }
          });
          altIdsToRemove.forEach(id => updatedSongIds.delete(id));

          // Update local state before Firestore to make UI response instant
          set({
            likedSongs: updatedSongs,
            likedSongIds: updatedSongIds
          });

          // Always update local storage as a backup
          localLikedSongsService.removeLikedSong(songId);

          // Update Firestore if user is authenticated - don't await to prevent UI blocking
          const isAuthenticated = useAuthStore.getState().isAuthenticated;
          if (isAuthenticated) {
            likedSongsFirestoreService.removeLikedSong(songId).catch(() => {
              // Error handled silently
            });
          }

          // Notify listeners through event
          document.dispatchEvent(new CustomEvent('likedSongsUpdated'));

          // Success without notification
        } catch (error) {
          // Error handled silently
        } finally {
          set({ isSaving: false });
        }
      },

      toggleLikeSong: async (song: Song) => {
        const songId = song._id;
        if (!songId) {
          return;
        }

        // Skip if already in progress
        if (get().isSaving) return;

        const isLiked = get().likedSongIds.has(songId);

        try {
          if (isLiked) {
            await get().removeLikedSong(songId);
          } else {
            await get().addLikedSong(song);
          }

          // Dispatch a CustomEvent with detailed information for better listener handling
          const detail = {
            songId,
            song,
            isLiked: !isLiked,
            timestamp: Date.now()
          };
          document.dispatchEvent(new CustomEvent('likedSongsUpdated', { detail }));
          document.dispatchEvent(new CustomEvent('songLikeStateChanged', { detail }));
        } catch (error) {
          // Error handled silently
        }
      },
    }),
    {
      name: 'liked-songs-storage',
      // Only persist specific parts of the state
      partialize: state => ({
        likedSongs: state.likedSongs,
      }),
    }
  )
);

// Hydrate likedSongIds from persisted storage immediately so hearts render filled on refresh
try {
  const persistedRaw = localStorage.getItem('liked-songs-storage');
  if (persistedRaw) {
    const persisted = JSON.parse(persistedRaw);
    const songs: any[] = persisted?.state?.likedSongs || [];
    const rebuiltIds = new Set<string>();
    songs.forEach((song: any) => {
      const primaryId = song?._id || song?.id;
      if (primaryId) rebuiltIds.add(primaryId);
      const altId = primaryId === song?._id ? song?.id : song?._id;
      if (altId) rebuiltIds.add(altId);
    });
    useLikedSongsStore.setState({ likedSongs: songs, likedSongIds: rebuiltIds });
    document.dispatchEvent(new CustomEvent('likedSongsUpdated', {
      detail: {
        source: 'useLikedSongsStore.initialHydration',
        timestamp: Date.now(),
        count: songs.length
      }
    }));
  }
} catch { }

// Initialize the store by loading liked songs
// This must be done outside of any component to ensure it's only called once
setTimeout(() => {
  useLikedSongsStore.getState().loadLikedSongs().catch(() => {
    // Error handling without logging
  });
}, 0);
