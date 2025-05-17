import { create } from 'zustand';
import { Playlist } from '@/types';
import { 
  isUserAdmin, 
  getAdminManageablePlaylists,
  updatePlaylistAsAdmin,
  deletePlaylistAsAdmin,
  addSongToPlaylistAsAdmin,
  removeSongFromPlaylistAsAdmin,
  togglePlaylistFeaturedStatus
} from '@/services/adminService';

interface AdminStore {
  // State
  isAdmin: boolean;
  isAdminChecked: boolean;
  adminPlaylists: Playlist[];
  isLoading: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  
  // Actions
  checkAdminStatus: () => Promise<boolean>;
  fetchAdminPlaylists: () => Promise<void>;
  updatePlaylist: (playlistId: string, data: Partial<Playlist>) => Promise<Playlist | null>;
  deletePlaylist: (playlistId: string) => Promise<boolean>;
  addSongToPlaylist: (playlistId: string, song: any) => Promise<Playlist | null>;
  removeSongFromPlaylist: (playlistId: string, songId: string) => Promise<Playlist | null>;
  featurePlaylist: (playlistId: string, featured: boolean) => Promise<Playlist | null>;
}

export const useAdminStore = create<AdminStore>((set, get) => ({
  // Initial state
  isAdmin: false,
  isAdminChecked: false,
  adminPlaylists: [],
  isLoading: false,
  isUpdating: false,
  isDeleting: false,
  
  // Actions
  checkAdminStatus: async (): Promise<boolean> => {
    try {
      const admin = await isUserAdmin();
      set({ isAdmin: admin, isAdminChecked: true });
      return admin;
    } catch (error) {
      set({ isAdmin: false, isAdminChecked: true });
      return false;
    }
  },
  
  fetchAdminPlaylists: async (): Promise<void> => {
    try {
      set({ isLoading: true });
      
      // Check admin status first
      const isAdmin = get().isAdminChecked ? get().isAdmin : await get().checkAdminStatus();
      
      if (!isAdmin) {
        set({ isLoading: false });
        return;
      }
      
      const playlists = await getAdminManageablePlaylists();
      set({ adminPlaylists: playlists, isLoading: false });
    } catch (error) {
      console.error('Error fetching admin playlists:', error);
      set({ isLoading: false });
    }
  },
  
  updatePlaylist: async (playlistId: string, data: Partial<Playlist>): Promise<Playlist | null> => {
    try {
      set({ isUpdating: true });
      
      // Check admin status first
      const isAdmin = get().isAdminChecked ? get().isAdmin : await get().checkAdminStatus();
      
      if (!isAdmin) {
        set({ isUpdating: false });
        return null;
      }
      
      // Convert data to the format expected by the service
      const updateData = {
        name: data.name,
        description: data.description,
        isPublic: data.isPublic,
        imageUrl: data.imageUrl,
        featured: data.featured
      };
      
      const updatedPlaylist = await updatePlaylistAsAdmin(playlistId, updateData);
      
      // Update the playlists list
      const adminPlaylists = get().adminPlaylists.map((playlist) =>
        playlist._id === playlistId ? updatedPlaylist : playlist
      );
      
      set({ adminPlaylists, isUpdating: false });
      return updatedPlaylist;
    } catch (error) {
      console.error('Error updating playlist as admin:', error);
      set({ isUpdating: false });
      return null;
    }
  },
  
  deletePlaylist: async (playlistId: string): Promise<boolean> => {
    try {
      set({ isDeleting: true });
      
      // Check admin status first
      const isAdmin = get().isAdminChecked ? get().isAdmin : await get().checkAdminStatus();
      
      if (!isAdmin) {
        set({ isDeleting: false });
        return false;
      }
      
      await deletePlaylistAsAdmin(playlistId);
      
      // Remove the playlist from the list
      const adminPlaylists = get().adminPlaylists.filter(
        (playlist) => playlist._id !== playlistId
      );
      
      set({ adminPlaylists, isDeleting: false });
      return true;
    } catch (error) {
      console.error('Error deleting playlist as admin:', error);
      set({ isDeleting: false });
      return false;
    }
  },
  
  addSongToPlaylist: async (playlistId: string, song: any): Promise<Playlist | null> => {
    try {
      set({ isUpdating: true });
      
      // Check admin status first
      const isAdmin = get().isAdminChecked ? get().isAdmin : await get().checkAdminStatus();
      
      if (!isAdmin) {
        set({ isUpdating: false });
        return null;
      }
      
      const updatedPlaylist = await addSongToPlaylistAsAdmin(playlistId, song);
      
      // Update the playlists list
      const adminPlaylists = get().adminPlaylists.map((playlist) =>
        playlist._id === playlistId ? updatedPlaylist : playlist
      );
      
      set({ adminPlaylists, isUpdating: false });
      return updatedPlaylist;
    } catch (error) {
      console.error('Error adding song to playlist as admin:', error);
      set({ isUpdating: false });
      return null;
    }
  },
  
  removeSongFromPlaylist: async (playlistId: string, songId: string): Promise<Playlist | null> => {
    try {
      set({ isUpdating: true });
      
      // Check admin status first
      const isAdmin = get().isAdminChecked ? get().isAdmin : await get().checkAdminStatus();
      
      if (!isAdmin) {
        set({ isUpdating: false });
        return null;
      }
      
      const updatedPlaylist = await removeSongFromPlaylistAsAdmin(playlistId, songId);
      
      // Update the playlists list
      const adminPlaylists = get().adminPlaylists.map((playlist) =>
        playlist._id === playlistId ? updatedPlaylist : playlist
      );
      
      set({ adminPlaylists, isUpdating: false });
      return updatedPlaylist;
    } catch (error) {
      console.error('Error removing song from playlist as admin:', error);
      set({ isUpdating: false });
      return null;
    }
  },
  
  featurePlaylist: async (playlistId: string, featured: boolean): Promise<Playlist | null> => {
    try {
      set({ isUpdating: true });
      
      // Check admin status first
      const isAdmin = get().isAdminChecked ? get().isAdmin : await get().checkAdminStatus();
      
      if (!isAdmin) {
        set({ isUpdating: false });
        return null;
      }
      
      const updatedPlaylist = await togglePlaylistFeaturedStatus(playlistId, featured);
      
      // Update the playlists list
      const adminPlaylists = get().adminPlaylists.map((playlist) =>
        playlist._id === playlistId ? updatedPlaylist : playlist
      );
      
      set({ adminPlaylists, isUpdating: false });
      return updatedPlaylist;
    } catch (error) {
      console.error('Error featuring playlist as admin:', error);
      set({ isUpdating: false });
      return null;
    }
  }
})); 