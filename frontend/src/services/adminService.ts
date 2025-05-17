import { auth, db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { Playlist } from '@/types';
import { convertFirestorePlaylistToPlaylist } from './playlistService';
import { playlistsService } from './firestore';
import axios from 'axios';

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
 * Upload a playlist image to Cloudinary
 * @param {File} imageFile - The image file to upload
 * @returns {Promise<{imageUrl: string}>} The URL of the uploaded image
 */
export const uploadPlaylistImage = async (imageFile: File): Promise<{imageUrl: string}> => {
  try {
    // First check if user is admin
    const adminStatus = await isAdmin();
    if (!adminStatus) {
      throw new Error('Unauthorized: Admin access required');
    }
    
    // Create form data for upload
    const formData = new FormData();
    formData.append('file', imageFile);
    
    // Get the current user's ID token for authentication
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) {
      throw new Error('Authentication required');
    }
    
    // Upload to backend endpoint
    const response = await axios.post('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${idToken}`
      }
    });
    
    if (!response.data.success || !response.data.url) {
      throw new Error('Failed to upload image');
    }
    
    return { imageUrl: response.data.url };
  } catch (error) {
    console.error('Error uploading playlist image:', error);
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