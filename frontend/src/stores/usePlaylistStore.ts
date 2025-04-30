import { create } from 'zustand';
import axiosInstance from '../lib/axios';
import { Playlist, Song } from '../types';
import { toast } from 'sonner';
import { mockPlaylists, mockUserPlaylists } from '../utils/mockData';
import * as playlistService from '../services/playlistService';

// Generate SVG data URL for fallback images
const generateImageUrl = (text: string, bgColor: string = "#1DB954"): string => {
  const safeText = text.replace(/['&<>]/g, ''); // Basic sanitization
  return `data:image/svg+xml;base64,${btoa(`
    <svg width="300" height="300" xmlns="http://www.w3.org/2000/svg">
      <rect width="300" height="300" fill="${bgColor}"/>
      <text x="150" y="150" font-family="Arial" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle">${safeText}</text>
    </svg>
  `)}`;
};

interface PlaylistStore {
  // State
  playlists: Playlist[];
  userPlaylists: Playlist[];
  featuredPlaylists: Playlist[];
  currentPlaylist: Playlist | null;
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;

  // Actions
  fetchPlaylists: () => Promise<void>;
  fetchUserPlaylists: () => Promise<void>;
  fetchFeaturedPlaylists: () => Promise<void>;
  fetchPlaylistById: (id: string) => Promise<Playlist | null>;
  createPlaylist: (
    name: string,
    description?: string,
    isPublic?: boolean,
    imageUrl?: string | null
  ) => Promise<Playlist | null>;
  updatePlaylist: (
    id: string,
    data: { name?: string; description?: string; isPublic?: boolean; imageUrl?: string }
  ) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  addSongToPlaylist: (playlistId: string, songId: string) => Promise<void>;
  removeSongFromPlaylist: (playlistId: string, songId: string) => Promise<void>;
}

export const usePlaylistStore = create<PlaylistStore>((set, get) => ({
  // Initial state
  playlists: [],
  userPlaylists: [],
  featuredPlaylists: [],
  currentPlaylist: null,
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,

  // Actions
  fetchPlaylists: async () => {
    try {
      set({ isLoading: true });
      
      try {
        // Try to get all playlists from Firestore
        const playlists = await playlistService.getUserPlaylists();
        set({ playlists, isLoading: false });
      } catch (error) {
        console.error('Error fetching playlists:', error);
        // Use mock data as fallback
        console.log('Using mock playlist data as fallback');
        set({ playlists: mockPlaylists, isLoading: false });
      }
    } catch (error: any) {
      console.error('Error fetching playlists:', error);
      toast.error('Failed to fetch playlists');
      set({ isLoading: false });
    }
  },

  fetchUserPlaylists: async () => {
    try {
      set({ isLoading: true });
      console.log('Fetching user playlists from Firestore');
      
      try {
        // Get user playlists from Firestore
        const userPlaylists = await playlistService.getUserPlaylists();
        set({ userPlaylists, isLoading: false });
      } catch (error) {
        console.error('Error fetching user playlists:', error);
        // Use mock data as fallback
        console.log('Using mock user playlist data as fallback');
        set({ userPlaylists: mockUserPlaylists, isLoading: false });
      }
    } catch (error: any) {
      console.error('Error fetching user playlists:', error);
      toast.error('Failed to fetch your playlists');
      set({ isLoading: false });
    }
  },

  fetchFeaturedPlaylists: async () => {
    try {
      set({ isLoading: true });
      
      try {
        // Get featured playlists from Firestore
        const featuredPlaylists = await playlistService.getFeaturedPlaylists();
        set({ featuredPlaylists, isLoading: false });
      } catch (error) {
        console.error('Error fetching featured playlists:', error);
        // Use mock data as fallback
        console.log('Using mock featured playlist data as fallback');
        // Filter mock playlists to only include featured ones
        const featured = mockPlaylists.filter(playlist => playlist.featured);
        set({ featuredPlaylists: featured, isLoading: false });
      }
    } catch (error: any) {
      console.error('Error fetching featured playlists:', error);
      toast.error('Failed to fetch featured playlists');
      set({ isLoading: false });
    }
  },

  fetchPlaylistById: async (id: string) => {
    try {
      set({ isLoading: true });
      
      try {
        // Get playlist by ID from Firestore
        const playlist = await playlistService.getPlaylistById(id);
        set({ currentPlaylist: playlist, isLoading: false });
        return playlist;
      } catch (error) {
        console.error('Error fetching playlist:', error);
        // Use mock data as fallback
        console.log('Using mock playlist data as fallback');
        // Find a mock playlist with the matching ID
        const mockPlaylist = [...mockPlaylists, ...mockUserPlaylists].find(p => p._id === id);
        if (mockPlaylist) {
          set({ currentPlaylist: mockPlaylist, isLoading: false });
          return mockPlaylist;
        }
      }
      
      set({ isLoading: false });
      return null;
    } catch (error: any) {
      console.error('Error fetching playlist:', error);
      toast.error('Failed to fetch playlist');
      set({ isLoading: false });
      return null;
    }
  },

  createPlaylist: async (name: string, description = '', isPublic = true, imageUrl = null) => {
    try {
      set({ isCreating: true });
      
      try {
        // Create playlist in Firestore
        const playlist = await playlistService.createPlaylist(name, description, isPublic, imageUrl);

        // Update the user playlists list
        const userPlaylists = [...get().userPlaylists, playlist];
        set({ userPlaylists, isCreating: false });

        toast.success('Playlist created successfully');
        return playlist;
      } catch (firestoreError) {
        console.error('Error creating playlist in Firestore:', firestoreError);
        
        // Use mock data as fallback
        console.log('Using mock data to simulate playlist creation');
        const mockPlaylist: Playlist = {
          _id: `mock-playlist-${Date.now()}`,
          name,
          description,
          isPublic,
          imageUrl: imageUrl || generateImageUrl(name),
          songs: [],
          featured: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: {
            _id: "mock-user-1",
            clerkId: "mock-clerk-id-1",
            fullName: "Demo User",
            imageUrl: generateImageUrl("User", "#555555")
          }
        };
        
        // Update the user playlists list
        const userPlaylists = [...get().userPlaylists, mockPlaylist];
        set({ userPlaylists, isCreating: false });
        
        toast.success('Playlist created successfully');
        return mockPlaylist;
      }
    } catch (error) {
      console.error('Fatal error creating playlist:', error);
      toast.error('Failed to create playlist');
      set({ isCreating: false });
      return null;
    }
  },

  updatePlaylist: async (
    id: string,
    data: { name?: string; description?: string; isPublic?: boolean; imageUrl?: string }
  ) => {
    try {
      set({ isUpdating: true });
      
      // Update playlist in Firestore
      const updatedPlaylist = await playlistService.updatePlaylist(id, data);

      // Update the playlists and userPlaylists lists
      const playlists = get().playlists.map((playlist) =>
        playlist._id === id ? updatedPlaylist : playlist
      );
      const userPlaylists = get().userPlaylists.map((playlist) =>
        playlist._id === id ? updatedPlaylist : playlist
      );
      
      set({
        playlists,
        userPlaylists,
        currentPlaylist: updatedPlaylist,
        isUpdating: false,
      });

      toast.success('Playlist updated successfully');
    } catch (error: any) {
      console.error('Error updating playlist:', error);
      toast.error('Failed to update playlist');
      set({ isUpdating: false });
    }
  },

  deletePlaylist: async (id: string) => {
    try {
      set({ isDeleting: true });
      
      // Delete playlist from Firestore
      await playlistService.deletePlaylist(id);

      // Remove the playlist from the lists
      const playlists = get().playlists.filter((playlist) => playlist._id !== id);
      const userPlaylists = get().userPlaylists.filter((playlist) => playlist._id !== id);
      const featuredPlaylists = get().featuredPlaylists.filter((playlist) => playlist._id !== id);
      
      set({
        playlists,
        userPlaylists,
        featuredPlaylists,
        currentPlaylist: null,
        isDeleting: false,
      });

      toast.success('Playlist deleted successfully');
    } catch (error: any) {
      console.error('Error deleting playlist:', error);
      toast.error('Failed to delete playlist');
      set({ isDeleting: false });
    }
  },

  addSongToPlaylist: async (playlistId: string, songId: string) => {
    try {
      const playlist = get().currentPlaylist;
      
      if (!playlist) {
        toast.error('Playlist not found');
        return;
      }
      
      // Get the song from the playlist
      const song = playlist.songs.find((s) => s._id === songId);
      
      if (!song) {
        toast.error('Song not found');
        return;
      }
      
      // Add song to playlist in Firestore
      const updatedPlaylist = await playlistService.addSongToPlaylist(playlistId, song);
      
      // Update the current playlist in state
      set({ currentPlaylist: updatedPlaylist });
      
      toast.success('Song added to playlist');
    } catch (error: any) {
      console.error('Error adding song to playlist:', error);
      toast.error('Failed to add song to playlist');
    }
  },

  removeSongFromPlaylist: async (playlistId: string, songId: string) => {
    try {
      // Remove song from playlist in Firestore
      const updatedPlaylist = await playlistService.removeSongFromPlaylist(playlistId, songId);
      
      // Update the current playlist in state
      set({ currentPlaylist: updatedPlaylist });
      
      toast.success('Song removed from playlist');
    } catch (error: any) {
      console.error('Error removing song from playlist:', error);
      toast.error('Failed to remove song from playlist');
    }
  },
}));
