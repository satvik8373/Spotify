import { create } from 'zustand';
import axiosInstance from '../lib/axios';
import { Playlist, Song } from '../types';
import { toast } from 'sonner';
import { mockPlaylists, mockUserPlaylists } from '../utils/mockData';

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
  fetchPlaylistById: (id: string) => Promise<void>;
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
      console.log('Fetching playlists from:', axiosInstance.defaults.baseURL + '/playlists');
      const response = await axiosInstance.get('/playlists');
      console.log('Playlists response:', response.data);
      set({ playlists: response.data, isLoading: false });
    } catch (error: any) {
      console.error('Error fetching playlists:', error);
      
      // Use mock data for 404 errors
      if (error.response?.status === 404) {
        console.log('Using mock playlist data as fallback');
        set({ playlists: mockPlaylists, isLoading: false });
      } else {
        toast.error('Failed to fetch playlists');
        set({ isLoading: false });
      }
    }
  },

  fetchUserPlaylists: async () => {
    try {
      set({ isLoading: true });
      console.log('Fetching user playlists from:', axiosInstance.defaults.baseURL + '/playlists/user');
      
      // First try the regular endpoint
      try {
        const response = await axiosInstance.get('/playlists/user');
        console.log('User playlists response:', response.data);
        set({ userPlaylists: response.data, isLoading: false });
        return;
      } catch (err: any) {
        // If the endpoint fails with a 401 or 404, try the test endpoint
        console.warn('Primary endpoint failed, checking auth status:', err.response?.status);
        
        if (err.response?.status === 401 || err.response?.status === 404) {
          try {
            // Skip the auth-debug test endpoint since it's not implemented yet
            // Use mock data as fallback
            console.log('Using mock user playlist data as fallback');
            set({ userPlaylists: mockUserPlaylists, isLoading: false });
            return;
          } catch (testErr) {
            console.error('Auth test failed:', testErr);
            // Use mock data as fallback
            console.log('Using mock user playlist data as fallback');
            set({ userPlaylists: mockUserPlaylists, isLoading: false });
            return;
          }
        }
        // Use mock data for 404 errors
        if (err.response?.status === 404) {
          console.log('Using mock user playlist data as fallback');
          set({ userPlaylists: mockUserPlaylists, isLoading: false });
          return;
        }
        // Re-throw the original error if we couldn't handle it
        throw err;
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
      const response = await axiosInstance.get('/playlists?featured=true');
      set({ featuredPlaylists: response.data, isLoading: false });
    } catch (error: any) {
      console.error('Error fetching featured playlists:', error);
      
      // Use mock data for 404 errors
      if (error.response?.status === 404) {
        console.log('Using mock featured playlist data as fallback');
        // Filter mock playlists to only include featured ones
        const featured = mockPlaylists.filter(playlist => playlist.featured);
        set({ featuredPlaylists: featured, isLoading: false });
      } else {
        toast.error('Failed to fetch featured playlists');
        set({ isLoading: false });
      }
    }
  },

  fetchPlaylistById: async (id: string) => {
    try {
      set({ isLoading: true });
      const response = await axiosInstance.get(`/playlists/${id}`);
      set({ currentPlaylist: response.data, isLoading: false });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching playlist:', error);
      
      // Use mock data for 404 errors
      if (error.response?.status === 404) {
        console.log('Using mock playlist data as fallback');
        // Find a mock playlist with the matching ID
        const mockPlaylist = [...mockPlaylists, ...mockUserPlaylists].find(p => p._id === id);
        if (mockPlaylist) {
          set({ currentPlaylist: mockPlaylist, isLoading: false });
          return mockPlaylist;
        }
      }
      
      toast.error('Failed to fetch playlist');
      set({ isLoading: false });
      return null;
    }
  },

  createPlaylist: async (name: string, description = '', isPublic = true, imageUrl = null) => {
    try {
      set({ isCreating: true });
      const response = await axiosInstance.post('/playlists', {
        name,
        description,
        isPublic,
        imageUrl,
      });

      // Update the user playlists list
      const userPlaylists = [...get().userPlaylists, response.data];
      set({ userPlaylists, isCreating: false });

      toast.success('Playlist created successfully');
      return response.data;
    } catch (error: any) {
      console.error('Error creating playlist:', error);
      
      // For 404 errors, simulate creating a playlist locally
      if (error.response?.status === 404) {
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
        
        toast.success('Playlist created (simulated)');
        return mockPlaylist;
      }
      
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
      const response = await axiosInstance.put(`/playlists/${id}`, data);

      // Update the playlists and userPlaylists lists
      const updatedPlaylist = response.data;
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
      
      // For 404 errors, simulate playlist update locally
      if (error.response?.status === 404) {
        console.log('Using mock data to simulate playlist update');
        
        // Find the playlist in our existing stores
        const currentPlaylist = get().currentPlaylist;
        if (!currentPlaylist) {
          toast.error('Playlist not found');
          set({ isUpdating: false });
          return;
        }
        
        // Create an updated version
        const updatedPlaylist = {
          ...currentPlaylist,
          ...data,
          updatedAt: new Date().toISOString()
        };
        
        // Update all relevant state
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
        
        toast.success('Playlist updated (simulated)');
        return;
      }
      
      toast.error('Failed to update playlist');
      set({ isUpdating: false });
    }
  },

  deletePlaylist: async (id: string) => {
    try {
      set({ isDeleting: true });
      await axiosInstance.delete(`/playlists/${id}`);

      // Remove the playlist from the lists
      const playlists = get().playlists.filter((playlist) => playlist._id !== id);
      const userPlaylists = get().userPlaylists.filter((playlist) => playlist._id !== id);
      
      set({
        playlists,
        userPlaylists,
        currentPlaylist: null,
        isDeleting: false,
      });

      toast.success('Playlist deleted successfully');
    } catch (error: any) {
      console.error('Error deleting playlist:', error);
      
      // For 404 errors, simulate playlist deletion locally
      if (error.response?.status === 404) {
        console.log('Using mock data to simulate playlist deletion');
        
        // Remove the playlist from the lists
        const playlists = get().playlists.filter((playlist) => playlist._id !== id);
        const userPlaylists = get().userPlaylists.filter((playlist) => playlist._id !== id);
        
        set({
          playlists,
          userPlaylists,
          currentPlaylist: null,
          isDeleting: false,
        });
        
        toast.success('Playlist deleted (simulated)');
        return;
      }
      
      toast.error('Failed to delete playlist');
      set({ isDeleting: false });
    }
  },

  addSongToPlaylist: async (playlistId: string, songId: string) => {
    try {
      await axiosInstance.post(`/playlists/${playlistId}/songs`, { songId });
      
      // Get the current playlist and update it if it's the one we're adding to
      const currentPlaylist = get().currentPlaylist;
      if (currentPlaylist && currentPlaylist._id === playlistId) {
        // Fetch the updated playlist
        get().fetchPlaylistById(playlistId);
      }
      
      toast.success('Song added to playlist');
    } catch (error: any) {
      console.error('Error adding song to playlist:', error);
      
      // For 404 errors, simulate adding song to playlist locally
      if (error.response?.status === 404) {
        console.log('Using mock data to simulate adding song to playlist');
        
        // Find the song with the given ID (this would normally come from the backend)
        // Since we don't have access to all songs here, we'll create a placeholder
        const mockSong: Song = {
          _id: songId,
          title: "Demo Track " + songId.substring(0, 4),
          artist: "Spotify Artist",
          albumId: null,
          duration: 210,
          audioUrl: "https://example.com/song.mp3",
          imageUrl: generateImageUrl("Song " + songId.substr(0, 4), "#3D91F4"),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        // Find and update the playlist
        const currentPlaylist = get().currentPlaylist;
        if (currentPlaylist && currentPlaylist._id === playlistId) {
          // Check if song is already in the playlist
          if (currentPlaylist.songs.some(song => song._id === songId)) {
            toast.error('Song is already in the playlist');
            return;
          }
          
          // Create updated playlist with the new song
          const updatedPlaylist = {
            ...currentPlaylist,
            songs: [...currentPlaylist.songs, mockSong],
            updatedAt: new Date().toISOString()
          };
          
          // Update all relevant state
          const playlists = get().playlists.map((playlist) =>
            playlist._id === playlistId ? updatedPlaylist : playlist
          );
          const userPlaylists = get().userPlaylists.map((playlist) =>
            playlist._id === playlistId ? updatedPlaylist : playlist
          );
          
          set({
            playlists,
            userPlaylists,
            currentPlaylist: updatedPlaylist
          });
          
          toast.success('Song added to playlist (simulated)');
        } else {
          toast.error('Playlist not found');
        }
        return;
      }
      
      toast.error('Failed to add song to playlist');
    }
  },

  removeSongFromPlaylist: async (playlistId: string, songId: string) => {
    try {
      const response = await axiosInstance.delete(`/playlists/${playlistId}/songs/${songId}`);

      // Update the current playlist if it's the one we're removing from
      const currentPlaylist = get().currentPlaylist;
      if (currentPlaylist && currentPlaylist._id === playlistId) {
        set({ currentPlaylist: response.data });
      }

      // Update the playlists and userPlaylists lists
      const updatedPlaylist = response.data;
      const playlists = get().playlists.map((playlist) =>
        playlist._id === playlistId ? updatedPlaylist : playlist
      );
      const userPlaylists = get().userPlaylists.map((playlist) =>
        playlist._id === playlistId ? updatedPlaylist : playlist
      );
      
      set({ playlists, userPlaylists });

      toast.success('Song removed from playlist');
    } catch (error: any) {
      console.error('Error removing song from playlist:', error);
      
      // For 404 errors, simulate removing song from playlist locally
      if (error.response?.status === 404) {
        console.log('Using mock data to simulate removing song from playlist');
        
        // Find and update the playlist
        const currentPlaylist = get().currentPlaylist;
        if (currentPlaylist && currentPlaylist._id === playlistId) {
          // Create updated playlist without the song
          const updatedPlaylist = {
            ...currentPlaylist,
            songs: currentPlaylist.songs.filter(song => song._id !== songId),
            updatedAt: new Date().toISOString()
          };
          
          // Update all relevant state
          const playlists = get().playlists.map((playlist) =>
            playlist._id === playlistId ? updatedPlaylist : playlist
          );
          const userPlaylists = get().userPlaylists.map((playlist) =>
            playlist._id === playlistId ? updatedPlaylist : playlist
          );
          
          set({
            playlists,
            userPlaylists,
            currentPlaylist: updatedPlaylist
          });
          
          toast.success('Song removed from playlist (simulated)');
        } else {
          toast.error('Playlist not found');
        }
        return;
      }
      
      toast.error('Failed to remove song from playlist');
    }
  },
}));
