import { auth, db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { Playlist } from '@/types';
import { convertFirestorePlaylistToPlaylist } from './playlistService';
import { playlistsService } from './firestore';
import axios from 'axios';

// Admin email that has special privileges
const ADMIN_EMAIL = 'satvikpatel8373@gmail.com';

// API base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://spotify-backend-tau.vercel.app/api';

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

/**
 * Update a public playlist with image upload as admin
 * @param {string} playlistId - ID of the playlist to update
 * @param {FormData} formData - Form data containing image and playlist details
 * @returns {Promise<Playlist>} Updated playlist
 */
export const updatePublicPlaylistWithImage = async (
  playlistId: string,
  formData: FormData
): Promise<Playlist> => {
  try {
    // First check if user is admin
    const adminStatus = await isAdmin();
    if (!adminStatus) {
      throw new Error('Unauthorized: Admin access required');
    }
    
    // Get the current user's ID token for authentication
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) {
      throw new Error('Authentication required');
    }
    
    // Make the API request to update playlist with image
    const response = await axios.put(
      `${API_BASE_URL}/admin/playlists/${playlistId}/with-image`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to update playlist');
    }
    
    // Convert the response data to Playlist type
    return convertFirestorePlaylistToPlaylist(response.data.data);
  } catch (error) {
    console.error('Error updating public playlist with image as admin:', error);
    throw error;
  }
}; 