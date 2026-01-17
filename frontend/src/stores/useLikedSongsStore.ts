import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Song } from '../types';
import * as likedSongsFirestoreService from '@/services/likedSongsService';
import { useAuthStore } from './useAuthStore';

// Define a helper type for conversion between types
type FirestoreSong = likedSongsFirestoreService.Song;

// Helper function to convert between song types
const convertToLocalSong = (firebaseSong: FirestoreSong): Song => {
  // Convert Firebase Timestamp to ISO string if it exists
  let likedAtString: string | undefined;
  if (firebaseSong.likedAt) {
    try {
      // Handle both Firestore Timestamp and regular Date objects
      if (firebaseSong.likedAt.toDate) {
        likedAtString = firebaseSong.likedAt.toDate().toISOString();
      } else if (firebaseSong.likedAt instanceof Date) {
        likedAtString = firebaseSong.likedAt.toISOString();
      } else if (typeof firebaseSong.likedAt === 'string') {
        likedAtString = firebaseSong.likedAt;
      }
    } catch (error) {
      console.warn('Error converting likedAt timestamp:', error);
    }
  }

  return {
    _id: firebaseSong.id,
    title: firebaseSong.title,
    artist: firebaseSong.artist,
    albumId: null,
    imageUrl: firebaseSong.imageUrl,
    audioUrl: firebaseSong.audioUrl,
    duration: firebaseSong.duration || 0,
    createdAt: likedAtString || new Date().toISOString(),
    updatedAt: likedAtString || new Date().toISOString(),
    likedAt: likedAtString
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
            // Add both _id and id if they exist to handle different song sources
            if (song._id) songIds.add(song._id);
            if (song.id) songIds.add(song.id);
          });

          // Only update state if songs actually changed
          const existingSongs = get().likedSongs;
          const hasChanged =
            existingSongs.length !== songs.length ||
            existingSongs.some((existing, i) => existing._id !== songs[i]?._id);

          if (hasChanged) {
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
          // Get the song ID consistently (handle both _id and id)
          const songId = song._id || (song as any).id;
          if (!songId) {
            console.warn('Cannot like song without ID:', song);
            return;
          }

          // First check if it's already liked
          if (get().likedSongIds.has(songId)) {
            console.log(`Song ${songId} is already liked, skipping`);
            return;
          }

          set({ isSaving: true });

          // Ensure song has _id and likedAt for internal consistency
          const now = new Date().toISOString();
          const songToSave = { 
            ...song, 
            _id: songId,
            likedAt: song.likedAt || now, // Use existing likedAt or set current time
            createdAt: song.createdAt || now,
            updatedAt: now
          };

          // Optimistically update local state immediately for better UX
          const updatedSongs = [songToSave, ...get().likedSongs];
          const updatedSongIds = new Set(get().likedSongIds);
          
          // Add both canonical and alternative IDs for global UI consistency
          updatedSongIds.add(songId);
          if ((song as any).id && (song as any).id !== songId) {
            updatedSongIds.add((song as any).id);
          }
          if (song._id && song._id !== songId) {
            updatedSongIds.add(song._id);
          }

          // Update local state before Firestore to make UI response instant
          set({
            likedSongs: updatedSongs,
            likedSongIds: updatedSongIds
          });

          // Always update local storage as a backup
          localLikedSongsService.addLikedSong(songToSave);

          // Update Firestore if user is authenticated - don't await to prevent UI blocking
          const isAuthenticated = useAuthStore.getState().isAuthenticated;
          if (isAuthenticated) {
            // Pass the song's likedAt date if it exists (for Spotify imports)
            likedSongsFirestoreService.addLikedSong(
              songToSave, 
              'mavrixfy', 
              undefined, 
              songToSave.likedAt
            ).catch(() => {
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

          // Optimistically update local state immediately
          // Filter by checking both _id and id
          const updatedSongs = get().likedSongs.filter(song =>
            song._id !== songId && (song as any).id !== songId
          );

          const updatedSongIds = new Set(get().likedSongIds);
          updatedSongIds.delete(songId);

          // Also remove any alternate id representation present in the set
          // (Code logic for alt removal remains mostly same but verify ID matches against both)
          const altIdsToRemove: string[] = [];
          get().likedSongs.forEach((s: any) => {
            const primary = s._id || s.id;
            if (primary === songId) {
              if (s._id) altIdsToRemove.push(s._id);
              if (s.id) altIdsToRemove.push(s.id);
            }
          });
          altIdsToRemove.forEach(id => updatedSongIds.delete(id));

          // Update local state before Firestore
          set({
            likedSongs: updatedSongs,
            likedSongIds: updatedSongIds
          });

          // Always update local storage as a backup
          localLikedSongsService.removeLikedSong(songId);

          // Update Firestore if user is authenticated
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
        const songId = song._id || (song as any).id;
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
      // Add both _id and id if they exist
      if (song._id) rebuiltIds.add(song._id);
      if (song.id) rebuiltIds.add(song.id);
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
