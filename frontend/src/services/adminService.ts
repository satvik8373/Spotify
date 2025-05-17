import { auth, db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { Playlist } from '@/types';
import { convertFirestorePlaylistToPlaylist } from './playlistService';
import { playlistsService } from './firestore';
import { getIdToken } from 'firebase/auth';

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
 * Verify admin authentication with the backend
 * @returns {Promise<boolean>} True if authentication is valid
 */
export const verifyAdminAuth = async (): Promise<boolean> => {
  try {
    // Get the current user
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error('No user logged in');
      return false;
    }
    
    // Force refresh the user to ensure we have the latest data
    await currentUser.reload();
    
    // Get a fresh token
    const idToken = await getIdToken(currentUser, true);
    
    // Get the API base URL
    const apiBaseUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:5000'
      : '';
    
    // Call the auth check endpoint
    console.log('Verifying admin authentication...');
    const response = await fetch(`${apiBaseUrl}/api/auth/check`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${idToken}`
      }
    });
    
    if (!response.ok) {
      console.error('Auth check failed:', response.status);
      return false;
    }
    
    const result = await response.json();
    console.log('Auth check result:', result);
    
    return result.isAdmin === true;
  } catch (error) {
    console.error('Error verifying admin auth:', error);
    return false;
  }
};

/**
 * Upload an image for admin use
 * @param {File} imageFile - The image file to upload
 * @returns {Promise<string>} The URL of the uploaded image
 */
export const uploadImage = async (imageFile: File): Promise<string> => {
  try {
    // First verify admin authentication with the backend
    const adminAuthValid = await verifyAdminAuth();
    if (!adminAuthValid) {
      throw new Error('Admin authentication failed or expired. Please refresh the page and try again.');
    }
    
    // Get the current user's ID token for authentication
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    // Get a fresh token
    let idToken;
    try {
      // Force token refresh to ensure we have the latest token
      await auth.currentUser?.reload();
      idToken = await getIdToken(currentUser, true);
      console.log('Got fresh auth token for upload');
    } catch (tokenError) {
      console.error('Failed to get auth token:', tokenError);
      throw new Error('Authentication failed: Could not get valid token');
    }
    
    // Create form data
    const formData = new FormData();
    formData.append('image', imageFile);
    
    // Get the API base URL - for local development, we need to use the full URL
    const apiBaseUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:5000'
      : '';
    
    // Upload the image
    console.log('Uploading image to server...');
    const response = await fetch(`${apiBaseUrl}/api/upload/image`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${idToken}`
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Upload failed:', response.status, errorText);
      throw new Error(`Image upload failed: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('Upload successful:', result);
    
    if (!result.imageUrl && !result.secure_url) {
      throw new Error('No image URL returned from server');
    }
    
    return result.imageUrl || result.secure_url;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
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