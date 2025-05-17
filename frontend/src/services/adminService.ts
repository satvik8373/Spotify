import { auth, db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { Playlist } from '@/types';
import { convertFirestorePlaylistToPlaylist } from './playlistService';
import { playlistsService } from './firestore';

// Admin email that has special privileges
const ADMIN_EMAIL = 'satvikpatel8373@gmail.com';

/**
 * Check if the current user is an admin
 * @returns {Promise<boolean>} True if user is admin
 */
export const isAdmin = async (): Promise<boolean> => {
  try {
    const currentUser = auth.currentUser;
    
    if (!currentUser || !currentUser.email) {
      return false;
    }
    
    // Check if user's email matches the admin email
    return currentUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

/**
 * Get all public playlists for admin management
 * @returns {Promise<Playlist[]>} List of all public playlists
 */
export const getAllPublicPlaylists = async (): Promise<Playlist[]> => {
  try {
    // First check if user is admin
    const adminStatus = await isAdmin();
    if (!adminStatus) {
      throw new Error('Unauthorized: Admin access required');
    }
    
    const firestorePlaylists = await playlistsService.getPublicPlaylists();
    return firestorePlaylists.map(playlist => convertFirestorePlaylistToPlaylist(playlist));
  } catch (error) {
    console.error('Error getting public playlists for admin:', error);
    throw error;
  }
};

/**
 * Update a public playlist as admin
 * @param {string} playlistId - ID of the playlist to update
 * @param {Object} data - Data to update
 * @returns {Promise<Playlist>} Updated playlist
 */
export const updatePublicPlaylist = async (
  playlistId: string,
  data: {
    name?: string;
    description?: string;
    isPublic?: boolean;
    featured?: boolean;
    imageUrl?: string;
  }
): Promise<Playlist> => {
  try {
    // First check if user is admin
    const adminStatus = await isAdmin();
    if (!adminStatus) {
      throw new Error('Unauthorized: Admin access required');
    }
    
    // Update the playlist
    const updatedFirestorePlaylist = await playlistsService.update(playlistId, {
      ...data,
      updatedAt: new Date().toISOString()
    });
    
    return convertFirestorePlaylistToPlaylist(updatedFirestorePlaylist);
  } catch (error) {
    console.error('Error updating public playlist as admin:', error);
    throw error;
  }
};

/**
 * Delete a public playlist as admin
 * @param {string} playlistId - ID of the playlist to delete
 * @returns {Promise<void>}
 */
export const deletePublicPlaylist = async (playlistId: string): Promise<void> => {
  try {
    // First check if user is admin
    const adminStatus = await isAdmin();
    if (!adminStatus) {
      throw new Error('Unauthorized: Admin access required');
    }
    
    // Delete the playlist
    await playlistsService.delete(playlistId);
  } catch (error) {
    console.error('Error deleting public playlist as admin:', error);
    throw error;
  }
};

/**
 * Feature or unfeature a playlist as admin
 * @param {string} playlistId - ID of the playlist
 * @param {boolean} featured - Whether to feature the playlist
 * @returns {Promise<Playlist>} Updated playlist
 */
export const featurePlaylist = async (playlistId: string, featured: boolean): Promise<Playlist> => {
  try {
    // First check if user is admin
    const adminStatus = await isAdmin();
    if (!adminStatus) {
      throw new Error('Unauthorized: Admin access required');
    }
    
    // Update the playlist's featured status
    const updatedFirestorePlaylist = await playlistsService.update(playlistId, {
      featured,
      updatedAt: new Date().toISOString()
    });
    
    return convertFirestorePlaylistToPlaylist(updatedFirestorePlaylist);
  } catch (error) {
    console.error('Error featuring/unfeaturing playlist as admin:', error);
    throw error;
  }
}; 