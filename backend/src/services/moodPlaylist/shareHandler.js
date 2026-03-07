import admin from '../../config/firebase.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Share Playlist Handler for AI Mood Playlist Generator
 * 
 * Handles creating shareable links for mood playlists.
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 14.5
 */

const db = admin.firestore();
const PLAYLISTS_COLLECTION = 'playlists';
const PLAYLIST_SHARES_COLLECTION = 'playlist_shares';

/**
 * Create a shareable link for a playlist
 * 
 * @param {string} playlistId - Playlist ID to share
 * @param {string} userId - User ID creating the share
 * @param {string} [frontendUrl] - Frontend URL for generating share link
 * @returns {Promise<Object>} Share result with shareable link
 * 
 * Requirements: 10.1, 10.2, 10.3
 */
export const createShareLink = async (playlistId, userId, frontendUrl = process.env.FRONTEND_URL || 'https://mavrixfy.site') => {
  try {
    // Validate inputs
    if (!playlistId) {
      throw new Error('Playlist ID is required');
    }
    
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    // Check if playlist exists
    const playlistDoc = await db.collection(PLAYLISTS_COLLECTION).doc(playlistId).get();
    
    if (!playlistDoc.exists) {
      return {
        success: false,
        error: 'Playlist not found',
        message: 'Something went wrong. Please try again.',
      };
    }
    
    const playlist = playlistDoc.data();
    
    // Verify ownership
    if (playlist.createdBy.uid !== userId) {
      return {
        success: false,
        error: 'Permission denied',
        message: 'Something went wrong. Please try again.',
      };
    }
    
    // Generate unique share ID (Requirement 10.1)
    const shareId = uuidv4();
    
    // Update playlist to be public (Requirement 10.2)
    await db.collection(PLAYLISTS_COLLECTION).doc(playlistId).update({
      isPublic: true,
      sharedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    // Create share mapping (Requirement 10.3)
    await db.collection(PLAYLIST_SHARES_COLLECTION).doc(shareId).set({
      shareId,
      playlistId,
      createdBy: userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      accessCount: 0,
      lastAccessedAt: null,
    });
    
    // Generate shareable URL
    const shareUrl = `${frontendUrl}/playlist/share/${shareId}`;
    
    return {
      success: true,
      shareId,
      shareUrl,
      message: 'Shareable link created successfully',
    };
  } catch (error) {
    console.error('[ShareHandler] Error creating share link:', {
      error: error.message,
      stack: error.stack,
      playlistId,
      userId,
      timestamp: new Date().toISOString()
    });
    
    return {
      success: false,
      error: 'Failed to create share link',
      message: getErrorMessage(error),
    };
  }
};

/**
 * Access a shared playlist via share ID
 * No authentication required (Requirement 10.5)
 * 
 * @param {string} shareId - Share ID from the shareable link
 * @returns {Promise<Object>} Playlist data or error
 * 
 * Requirements: 10.4, 10.5
 */
export const getSharedPlaylist = async (shareId) => {
  try {
    // Validate share ID
    if (!shareId) {
      throw new Error('Share ID is required');
    }
    
    // Get share mapping
    const shareDoc = await db.collection(PLAYLIST_SHARES_COLLECTION).doc(shareId).get();
    
    if (!shareDoc.exists) {
      return {
        success: false,
        error: 'Share not found',
        message: 'This shareable link is invalid or has expired.',
      };
    }
    
    const shareData = shareDoc.data();
    const playlistId = shareData.playlistId;
    
    // Get playlist data (Requirement 10.4)
    const playlistDoc = await db.collection(PLAYLISTS_COLLECTION).doc(playlistId).get();
    
    if (!playlistDoc.exists) {
      return {
        success: false,
        error: 'Playlist not found',
        message: 'The shared playlist no longer exists.',
      };
    }
    
    const playlist = playlistDoc.data();
    
    // Verify playlist is public
    if (!playlist.isPublic) {
      return {
        success: false,
        error: 'Playlist not public',
        message: 'This playlist is no longer shared publicly.',
      };
    }
    
    // Update access count and last accessed time
    await db.collection(PLAYLIST_SHARES_COLLECTION).doc(shareId).update({
      accessCount: admin.firestore.FieldValue.increment(1),
      lastAccessedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    // Return playlist data (Requirement 10.4)
    return {
      success: true,
      playlist: {
        _id: playlistId,
        ...playlist,
      },
      shareInfo: {
        shareId,
        createdBy: shareData.createdBy,
        createdAt: shareData.createdAt,
        accessCount: shareData.accessCount + 1,
      },
    };
  } catch (error) {
    console.error('Error accessing shared playlist:', error);
    
    return {
      success: false,
      error: 'Failed to access shared playlist',
      message: 'Unable to load the shared playlist. Please try again.',
    };
  }
};

/**
 * Revoke a share link (make playlist private again)
 * 
 * @param {string} shareId - Share ID to revoke
 * @param {string} userId - User ID requesting revocation
 * @returns {Promise<Object>} Revocation result
 */
export const revokeShareLink = async (shareId, userId) => {
  try {
    // Validate inputs
    if (!shareId || !userId) {
      throw new Error('Share ID and User ID are required');
    }
    
    // Get share mapping
    const shareDoc = await db.collection(PLAYLIST_SHARES_COLLECTION).doc(shareId).get();
    
    if (!shareDoc.exists) {
      return {
        success: false,
        error: 'Share not found',
        message: 'This share link does not exist.',
      };
    }
    
    const shareData = shareDoc.data();
    
    // Verify ownership
    if (shareData.createdBy !== userId) {
      return {
        success: false,
        error: 'Permission denied',
        message: 'You do not have permission to revoke this share link.',
      };
    }
    
    // Update playlist to be private
    await db.collection(PLAYLISTS_COLLECTION).doc(shareData.playlistId).update({
      isPublic: false,
    });
    
    // Delete share mapping
    await db.collection(PLAYLIST_SHARES_COLLECTION).doc(shareId).delete();
    
    return {
      success: true,
      message: 'Share link revoked successfully',
    };
  } catch (error) {
    console.error('Error revoking share link:', error);
    
    return {
      success: false,
      error: 'Failed to revoke share link',
      message: 'Unable to revoke share link. Please try again.',
    };
  }
};

/**
 * Get all share links for a user's playlists
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Object[]>} Array of share links
 */
export const getUserShareLinks = async (userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    const snapshot = await db.collection(PLAYLIST_SHARES_COLLECTION)
      .where('createdBy', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const shares = [];
    snapshot.forEach((doc) => {
      shares.push({
        shareId: doc.id,
        ...doc.data(),
      });
    });
    
    return shares;
  } catch (error) {
    console.error('Error fetching user share links:', error);
    throw new Error('Failed to fetch share links');
  }
};

/**
 * Get user-friendly error message
 * 
 * @param {Error} error - Error object
 * @returns {string} User-friendly error message
 */
const getErrorMessage = (error) => {
  if (error.message.includes('required')) {
    return 'Missing required information. Please try again.';
  }
  
  if (error.code === 'permission-denied') {
    return 'You do not have permission to perform this action.';
  }
  
  if (error.code === 'unavailable') {
    return 'Service temporarily unavailable. Please try again later.';
  }
  
  // Generic error message
  return 'Something went wrong. Please try again.';
};
