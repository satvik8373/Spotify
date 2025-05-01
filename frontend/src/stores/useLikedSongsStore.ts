import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Song } from '../types';
import { toast } from 'sonner';
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
    songs.push(song);
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
              const firebaseSongs = likedSongsFirestoreService.loadLikedSongs();
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
          songs.forEach(song => {
            if (song._id) {
              songIds.add(song._id);
            }
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
          console.error('Error loading liked songs:', error);
          // Don't clear existing songs on error, just keep what we have
        } finally {
          set({ isLoading: false });
        }
      },

      addLikedSong: async (song: Song) => {
        // Skip if already in progress
        if (get().isSaving) return;
        
        try {
          // Get the song ID consistently
          const songId = song._id;
          if (!songId) {
            console.error('Cannot add song without ID');
            return;
          }
          
          // First check if it's already liked
          if (get().likedSongIds.has(songId)) {
            console.log(`Song ${songId} is already liked, skipping`);
            return;
          }
          
          set({ isSaving: true });
          
          // Optimistically update local state immediately for better UX
          const updatedSongs = [...get().likedSongs, song];
          const updatedSongIds = new Set(get().likedSongIds);
          updatedSongIds.add(songId);
          
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
              albumName: song.albumId || ''
            }).catch(error => {
              console.error('Error adding song to Firestore:', error);
              // We've already updated local state, so just show a warning
              toast.error('Song added locally, but sync failed');
            });
          }
          
          // Notify listeners through event
          document.dispatchEvent(new CustomEvent('likedSongsUpdated'));
          
          toast.success('Added to Liked Songs');
        } catch (error) {
          console.error('Error adding liked song:', error);
          toast.error('Failed to add to Liked Songs');
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
            likedSongsFirestoreService.removeLikedSong(songId).catch(error => {
              console.error('Error removing song from Firestore:', error);
              // We've already updated local state, so just show a warning
              toast.error('Song removed locally, but sync failed');
            });
          }
          
          // Notify listeners through event
          document.dispatchEvent(new CustomEvent('likedSongsUpdated'));
          
          toast.success('Removed from Liked Songs');
        } catch (error) {
          console.error('Error removing liked song:', error);
          toast.error('Failed to remove from Liked Songs');
        } finally {
          set({ isSaving: false });
        }
      },

      toggleLikeSong: async (song: Song) => {
        const songId = song._id;
        if (!songId) {
          console.error('Cannot toggle like for song without ID');
          return;
        }
        
        // Skip if already in progress
        if (get().isSaving) return;
        
        const isLiked = get().likedSongIds.has(songId);
        console.log(`Toggling song ${songId}, current liked status: ${isLiked}`);
        
        try {
          if (isLiked) {
            await get().removeLikedSong(songId);
          } else {
            await get().addLikedSong(song);
          }
        } catch (error) {
          console.error('Error toggling liked song:', error);
          toast.error('Failed to update liked status');
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

// Initialize the store by loading liked songs
// This must be done outside of any component to ensure it's only called once
setTimeout(() => {
  useLikedSongsStore.getState().loadLikedSongs().catch(console.error);
}, 0);
