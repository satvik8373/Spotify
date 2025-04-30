import { auth, db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  orderBy, 
  serverTimestamp, 
  Timestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { playlistsService } from './firestore';
import { Playlist, Song } from '@/types';
import { FirestorePlaylist, FirestoreSong, firestoreToSong, FirestoreUser } from '@/types/firebase';

// Generate a random placeholder image for playlists without images
const generatePlaceholderImage = (name: string): string => {
  const colors = [
    '#1DB954', '#1ED760', '#2D46B9', '#9B59B6',
    '#3498DB', '#1ABC9C', '#F1C40F', '#E74C3C'
  ];
  const color = colors[Math.floor(Math.random() * colors.length)];
  
  // Generate a data URL with the first letter
  const letter = name.charAt(0).toUpperCase();
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">
      <rect width="100%" height="100%" fill="${color}" />
      <text x="50%" y="50%" font-family="Arial" font-size="120" fill="white" text-anchor="middle" dominant-baseline="middle">${letter}</text>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

// Helper to safely cast FirestorePlaylist to the expected type
const castFirestorePlaylist = (playlist: any): FirestorePlaylist => {
  return playlist as FirestorePlaylist;
};

// Convert Firestore document to Playlist format
export const convertFirestorePlaylistToPlaylist = (data: any): Playlist => {
  // Type cast to handle the incompatible types
  const firestorePlaylist = castFirestorePlaylist(data);
  
  return {
    _id: firestorePlaylist.id,
    name: firestorePlaylist.name,
    description: firestorePlaylist.description || '',
    isPublic: firestorePlaylist.isPublic,
    imageUrl: firestorePlaylist.imageUrl || generatePlaceholderImage(firestorePlaylist.name),
    songs: firestorePlaylist.songs ? firestorePlaylist.songs.map(song => firestoreToSong(song)) : [],
    featured: firestorePlaylist.featured || false,
    createdAt: firestorePlaylist.createdAt,
    updatedAt: firestorePlaylist.updatedAt,
    createdBy: {
      _id: firestorePlaylist.createdBy.id || 'unknown',
      clerkId: firestorePlaylist.createdBy.clerkId,
      fullName: firestorePlaylist.createdBy.fullName,
      imageUrl: firestorePlaylist.createdBy.imageUrl || ''
    }
  };
};

// Get all user playlists
export const getUserPlaylists = async (): Promise<Playlist[]> => {
  try {
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      throw new Error('Not authenticated');
    }
    
    const userId = currentUser.uid;
    const firestorePlaylists = await playlistsService.getUserPlaylists(userId);
    
    return firestorePlaylists.map(playlist => convertFirestorePlaylistToPlaylist(playlist));
  } catch (error) {
    console.error('Error getting user playlists:', error);
    throw error;
  }
};

// Get featured playlists
export const getFeaturedPlaylists = async (): Promise<Playlist[]> => {
  try {
    const firestorePlaylists = await playlistsService.getFeaturedPlaylists();
    return firestorePlaylists.map(playlist => convertFirestorePlaylistToPlaylist(playlist));
  } catch (error) {
    console.error('Error getting featured playlists:', error);
    throw error;
  }
};

// Get playlist by ID
export const getPlaylistById = async (playlistId: string): Promise<Playlist> => {
  try {
    const firestorePlaylist = await playlistsService.getById(playlistId);
    
    if (!firestorePlaylist) {
      throw new Error('Playlist not found');
    }
    
    return convertFirestorePlaylistToPlaylist(firestorePlaylist);
  } catch (error) {
    console.error('Error getting playlist:', error);
    throw error;
  }
};

// Create a new playlist
export const createPlaylist = async (
  name: string,
  description: string = '',
  isPublic: boolean = true,
  imageUrl: string | null = null
): Promise<Playlist> => {
  try {
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      throw new Error('Not authenticated');
    }
    
    // Use provided imageUrl or generate a placeholder
    let playlistImageUrl = imageUrl;
    if (!playlistImageUrl) {
      playlistImageUrl = generatePlaceholderImage(name);
    }
    
    // Create a user object that matches both Firebase and our application structure
    const userForFirestore = {
      id: currentUser.uid,
      _id: currentUser.uid, // Add _id to match User interface
      clerkId: currentUser.uid,
      fullName: currentUser.displayName || 'User',
      imageUrl: currentUser.photoURL || ''
    };
    
    const playlistData = {
      name,
      description,
      imageUrl: playlistImageUrl, // Using the provided or generated image URL
      isPublic,
      songs: [],
      featured: false,
      createdBy: userForFirestore,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    try {
      const firestorePlaylist = await playlistsService.create(playlistData);
      return convertFirestorePlaylistToPlaylist(firestorePlaylist);
    } catch (firestoreError) {
      console.error('Firestore playlist creation error:', firestoreError);
      
      // Create a local playlist object as fallback
      const fallbackPlaylist = {
        id: `local-playlist-${Date.now()}`,
        ...playlistData
      };
      
      return convertFirestorePlaylistToPlaylist(fallbackPlaylist);
    }
  } catch (error) {
    console.error('Error creating playlist:', error);
    throw error;
  }
};

// Update an existing playlist
export const updatePlaylist = async (
  playlistId: string, 
  data: { 
    name?: string; 
    description?: string; 
    isPublic?: boolean; 
    imageUrl?: string;
  }
): Promise<Playlist> => {
  try {
    // Ensure imageUrl is not undefined if provided
    const updateData = { ...data };
    if (updateData.hasOwnProperty('imageUrl') && !updateData.imageUrl) {
      // Generate a placeholder image if needed
      if (updateData.name) {
        updateData.imageUrl = generatePlaceholderImage(updateData.name);
      } else {
        // Remove the imageUrl field if we can't generate a meaningful placeholder
        delete updateData.imageUrl;
      }
    }
    
    const firestorePlaylist = await playlistsService.update(playlistId, updateData);
    return convertFirestorePlaylistToPlaylist(firestorePlaylist);
  } catch (error) {
    console.error('Error updating playlist:', error);
    throw error;
  }
};

// Delete a playlist
export const deletePlaylist = async (playlistId: string): Promise<void> => {
  try {
    await playlistsService.delete(playlistId);
  } catch (error) {
    console.error('Error deleting playlist:', error);
    throw error;
  }
};

// Add a song to a playlist
export const addSongToPlaylist = async (playlistId: string, song: Song): Promise<Playlist> => {
  try {
    // Convert song to Firestore format
    const firestoreSong: FirestoreSong = {
      id: song._id,
      title: song.title,
      artist: song.artist,
      imageUrl: song.imageUrl,
      audioUrl: song.audioUrl,
      duration: song.duration,
      albumId: song.albumId,
      createdAt: song.createdAt,
      updatedAt: song.updatedAt
    };
    
    const updatedPlaylist = await playlistsService.addSongToPlaylist(playlistId, firestoreSong);
    return convertFirestorePlaylistToPlaylist(updatedPlaylist);
  } catch (error) {
    console.error('Error adding song to playlist:', error);
    throw error;
  }
};

// Remove a song from a playlist
export const removeSongFromPlaylist = async (playlistId: string, songId: string): Promise<Playlist> => {
  try {
    const updatedPlaylist = await playlistsService.removeSongFromPlaylist(playlistId, songId);
    return convertFirestorePlaylistToPlaylist(updatedPlaylist);
  } catch (error) {
    console.error('Error removing song from playlist:', error);
    throw error;
  }
}; 