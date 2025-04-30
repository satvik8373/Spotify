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
import { FirestorePlaylist, FirestoreSong, firestoreToSong } from '@/types/firebase';

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

// Convert Firestore document to Playlist format
export const convertFirestorePlaylistToPlaylist = (data: FirestorePlaylist): Playlist => {
  return {
    _id: data.id,
    name: data.name,
    description: data.description || '',
    isPublic: data.isPublic,
    imageUrl: data.imageUrl || generatePlaceholderImage(data.name),
    songs: data.songs ? data.songs.map(song => firestoreToSong(song)) : [],
    featured: data.featured || false,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    createdBy: {
      _id: data.createdBy.id,
      clerkId: data.createdBy.clerkId,
      fullName: data.createdBy.fullName,
      imageUrl: data.createdBy.imageUrl
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
  imageFile?: File
): Promise<Playlist> => {
  try {
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      throw new Error('Not authenticated');
    }
    
    let imageUrl = '';
    
    // Upload image if provided
    if (imageFile) {
      const storageRef = ref(storage, `playlists/${Date.now()}_${imageFile.name}`);
      await uploadBytes(storageRef, imageFile);
      imageUrl = await getDownloadURL(storageRef);
    } else {
      imageUrl = generatePlaceholderImage(name);
    }
    
    // Create a new playlist in Firestore
    const firestorePlaylist = await playlistsService.createPlaylist({
      name,
      description,
      isPublic,
      songs: [],
      featured: false,
      createdBy: {
        id: currentUser.uid,
        clerkId: currentUser.uid,
        fullName: currentUser.displayName || 'User',
        imageUrl: currentUser.photoURL || ''
      }
    }, imageFile);
    
    return convertFirestorePlaylistToPlaylist(firestorePlaylist);
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
    const firestorePlaylist = await playlistsService.update(playlistId, data);
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