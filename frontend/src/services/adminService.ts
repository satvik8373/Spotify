import { auth } from '@/lib/firebase';
import { playlistsService } from './firestore';
import { Playlist } from '@/types';
import { convertFirestorePlaylistToPlaylist } from './playlistService';

// Admin email addresses
const ADMIN_EMAILS = ['satvikpatel8373@gmail.com'];

/**
 * Check if the current user is an admin
 */
export const isUserAdmin = async (): Promise<boolean> => {
  try {
    const currentUser = auth.currentUser;
    
    if (!currentUser || !currentUser.email) {
      return false;
    }
    
    return ADMIN_EMAILS.includes(currentUser.email);
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

/**
 * Get all public playlists that can be managed by admins
 */
export const getAdminManageablePlaylists = async (): Promise<Playlist[]> => {
  try {
    // First check if user is admin
    const isAdmin = await isUserAdmin();
    
    if (!isAdmin) {
      throw new Error('Unauthorized: Only admins can access this feature');
    }
    
    // Get all public playlists
    const firestorePlaylists = await playlistsService.getPublicPlaylists();
    return firestorePlaylists.map(playlist => convertFirestorePlaylistToPlaylist(playlist));
  } catch (error) {
    console.error('Error getting admin manageable playlists:', error);
    throw error;
  }
};

/**
 * Update a playlist as an admin (can edit any public playlist)
 */
export const updatePlaylistAsAdmin = async (
  playlistId: string,
  data: { 
    name?: string; 
    description?: string; 
    isPublic?: boolean; 
    imageUrl?: string;
    featured?: boolean;
  }
): Promise<Playlist> => {
  try {
    // First check if user is admin
    const isAdmin = await isUserAdmin();
    
    if (!isAdmin) {
      throw new Error('Unauthorized: Only admins can update playlists they do not own');
    }
    
    // Update the playlist
    const firestorePlaylist = await playlistsService.update(playlistId, data);
    return convertFirestorePlaylistToPlaylist(firestorePlaylist);
  } catch (error) {
    console.error('Error updating playlist as admin:', error);
    throw error;
  }
};

/**
 * Delete a playlist as an admin (can delete any public playlist)
 */
export const deletePlaylistAsAdmin = async (playlistId: string): Promise<void> => {
  try {
    // First check if user is admin
    const isAdmin = await isUserAdmin();
    
    if (!isAdmin) {
      throw new Error('Unauthorized: Only admins can delete playlists they do not own');
    }
    
    // Delete the playlist
    await playlistsService.delete(playlistId);
  } catch (error) {
    console.error('Error deleting playlist as admin:', error);
    throw error;
  }
};

/**
 * Add a song to a playlist as an admin
 */
export const addSongToPlaylistAsAdmin = async (playlistId: string, song: any): Promise<Playlist> => {
  try {
    // First check if user is admin
    const isAdmin = await isUserAdmin();
    
    if (!isAdmin) {
      throw new Error('Unauthorized: Only admins can modify playlists they do not own');
    }
    
    // Add song to playlist
    const firestorePlaylist = await playlistsService.addSongToPlaylist(playlistId, song);
    return convertFirestorePlaylistToPlaylist(firestorePlaylist);
  } catch (error) {
    console.error('Error adding song to playlist as admin:', error);
    throw error;
  }
};

/**
 * Remove a song from a playlist as an admin
 */
export const removeSongFromPlaylistAsAdmin = async (playlistId: string, songId: string): Promise<Playlist> => {
  try {
    // First check if user is admin
    const isAdmin = await isUserAdmin();
    
    if (!isAdmin) {
      throw new Error('Unauthorized: Only admins can modify playlists they do not own');
    }
    
    // Remove song from playlist
    const firestorePlaylist = await playlistsService.removeSongFromPlaylist(playlistId, songId);
    return convertFirestorePlaylistToPlaylist(firestorePlaylist);
  } catch (error) {
    console.error('Error removing song from playlist as admin:', error);
    throw error;
  }
};

/**
 * Feature or unfeature a playlist as an admin
 */
export const togglePlaylistFeaturedStatus = async (playlistId: string, featured: boolean): Promise<Playlist> => {
  try {
    // First check if user is admin
    const isAdmin = await isUserAdmin();
    
    if (!isAdmin) {
      throw new Error('Unauthorized: Only admins can feature playlists');
    }
    
    // Update the playlist's featured status
    const firestorePlaylist = await playlistsService.update(playlistId, { featured });
    return convertFirestorePlaylistToPlaylist(firestorePlaylist);
  } catch (error) {
    console.error('Error toggling playlist featured status:', error);
    throw error;
  }
}; 