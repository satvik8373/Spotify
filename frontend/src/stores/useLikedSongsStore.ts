import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Song } from '../types';
import { toast } from 'sonner';

// Service for managing liked songs in local storage
const likedSongsService = {
  getLikedSongs: (): Song[] => {
    const songs = localStorage.getItem('likedSongs');
    return songs ? JSON.parse(songs) : [];
  },

  addLikedSong: (song: Song): void => {
    const songs = likedSongsService.getLikedSongs();
    const songId = (song as any).id || song._id;

    // Check if song already exists
    if (songs.some((s: Song) => (s as any).id === songId || s._id === songId)) {
      return;
    }

    // Add the song
    songs.push(song);
    localStorage.setItem('likedSongs', JSON.stringify(songs));
  },

  removeLikedSong: (songId: string): void => {
    const songs = likedSongsService.getLikedSongs();
    const filteredSongs = songs.filter(
      (song: Song) => (song as any).id !== songId && song._id !== songId
    );
    localStorage.setItem('likedSongs', JSON.stringify(filteredSongs));
  },

  isLiked: (songId: string): boolean => {
    const songs = likedSongsService.getLikedSongs();
    return songs.some((song: Song) => (song as any).id === songId || song._id === songId);
  },
};

interface LikedSongsStore {
  likedSongs: Song[];
  likedSongIds: Set<string>;
  isLoading: boolean;

  // Actions
  loadLikedSongs: () => void;
  addLikedSong: (song: Song) => void;
  removeLikedSong: (songId: string) => void;
  toggleLikeSong: (song: Song) => void;
}

export const useLikedSongsStore = create<LikedSongsStore>()(
  persist(
    (set, get) => ({
      likedSongs: [],
      likedSongIds: new Set<string>(),
      isLoading: false,

      loadLikedSongs: () => {
        set({ isLoading: true });
        try {
          const songs = likedSongsService.getLikedSongs();
          const songIds = new Set<string>();

          songs.forEach((song: Song) => {
            songIds.add((song as any).id || song._id);
          });

          set({
            likedSongs: songs,
            likedSongIds: songIds,
            isLoading: false,
          });
        } catch (error) {
          console.error('Error loading liked songs:', error);
          set({ isLoading: false });
        }
      },

      addLikedSong: (song: Song) => {
        try {
          const songId = (song as any).id || song._id;

          // Add song to storage
          likedSongsService.addLikedSong(song);

          // Update state
          const likedSongs = [...get().likedSongs, song];
          const likedSongIds = new Set(get().likedSongIds);
          likedSongIds.add(songId);

          set({ likedSongs, likedSongIds });
          toast.success('Added to Liked Songs');
        } catch (error) {
          console.error('Error adding liked song:', error);
          toast.error('Failed to add to Liked Songs');
        }
      },

      removeLikedSong: (songId: string) => {
        try {
          // Remove from storage
          likedSongsService.removeLikedSong(songId);

          // Update state
          const likedSongs = get().likedSongs.filter(
            song => (song as any).id !== songId && song._id !== songId
          );
          const likedSongIds = new Set(get().likedSongIds);
          likedSongIds.delete(songId);

          set({ likedSongs, likedSongIds });
          toast.success('Removed from Liked Songs');
        } catch (error) {
          console.error('Error removing liked song:', error);
          toast.error('Failed to remove from Liked Songs');
        }
      },

      toggleLikeSong: (song: Song) => {
        const songId = (song as any).id || song._id;
        const isLiked = get().likedSongIds.has(songId);

        if (isLiked) {
          get().removeLikedSong(songId);
        } else {
          get().addLikedSong(song);
        }

        // Dispatch event for other components to react
        document.dispatchEvent(new CustomEvent('likedSongsUpdated'));
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
useLikedSongsStore.getState().loadLikedSongs();
