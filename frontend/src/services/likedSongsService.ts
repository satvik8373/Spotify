import { useAuthStore } from "@/stores/useAuthStore";
import { resolveArtist } from "@/lib/resolveArtist";
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, serverTimestamp, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { updateUserStats } from "./userService";
import { songsService } from "./firestore";

// Use the same Song interface as playlists
export interface Song {
  _id: string;
  title: string;
  artist: string;
  albumId: string | null;
  imageUrl: string;
  audioUrl: string;
  duration: number;
  createdAt: string;
  updatedAt: string;
}

// FirestoreSong interface (same as playlist songs)
interface FirestoreSong {
  id: string;
  title: string;
  artist: string;
  albumId: string | null;
  imageUrl: string;
  audioUrl: string;
  duration: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Convert Song to FirestoreSong (same as playlist logic)
 */
const songToFirestore = (song: Song): FirestoreSong => {
  const { _id, ...rest } = song;
  return {
    id: _id,
    ...rest
  };
};

/**
 * Convert FirestoreSong to Song (same as playlist logic)
 */
const firestoreToSong = (fsong: FirestoreSong): Song => {
  const { id, ...rest } = fsong;
  return {
    _id: id,
    ...rest
  };
};

/**
 * Normalize a song object to ensure it has the correct format (same as playlist logic)
 */
const normalizeSong = (song: any): Song => {
  return {
    _id: song.id || song._id || song.songId || `song-${Date.now()}`,
    title: song.title || 'Unknown Title',
    artist: resolveArtist(song),
    albumId: song.albumId || null,
    imageUrl: song.imageUrl || song.image || '',
    audioUrl: song.audioUrl || song.url || '',
    duration: typeof song.duration === 'number' ? song.duration : 0,
    createdAt: song.createdAt || new Date().toISOString(),
    updatedAt: song.updatedAt || new Date().toISOString()
  };
};

/**
 * Load liked songs from Firestore (using users/{userId}/likedSongs subcollection)
 */
export const loadLikedSongs = async (): Promise<Song[]> => {
  const { isAuthenticated, userId } = useAuthStore.getState();
  
  if (!isAuthenticated || !userId) {
    console.warn('User not authenticated, cannot load from Firestore');
    return [];
  }

  try {
    const likedSongsRef = collection(db, 'users', userId, 'likedSongs');
    
    let snapshot;
    try {
      // Try to order by createdAt (same as playlist songs)
      const q = query(likedSongsRef, orderBy('createdAt', 'desc'));
      snapshot = await getDocs(q);
    } catch (orderError) {
      // If ordering fails, get all docs without ordering
      console.log('Ordering by createdAt failed, fetching without order:', orderError);
      snapshot = await getDocs(likedSongsRef);
    }
    
    const songs: Song[] = [];
    
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      
      // Convert to Song format (same as playlist logic)
      const firestoreSong: FirestoreSong = {
        id: docSnap.id,
        title: data.title || 'Unknown Title',
        artist: data.artist || 'Unknown Artist',
        albumId: data.albumId || null,
        imageUrl: data.imageUrl || '',
        audioUrl: data.audioUrl || '',
        duration: data.duration || 0,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString()
      };
      
      songs.push(firestoreToSong(firestoreSong));
    });
    
    console.log(`📥 Loaded ${songs.length} liked songs from Firestore`);
    return songs;
    
  } catch (error) {
    console.error('Error loading liked songs from Firestore:', error);
    return [];
  }
};

/**
 * Add a single song to liked songs (same structure as playlist songs)
 */
export const addLikedSong = async (song: Song): Promise<void> => {
  const { isAuthenticated, userId } = useAuthStore.getState();
  
  if (!isAuthenticated || !userId) {
    console.warn('User not authenticated, cannot add to Firestore');
    return;
  }

  try {
    const normalizedSong = normalizeSong(song);
    
    // First, add to main songs collection (same as playlist songs)
    const firestoreSong = songToFirestore(normalizedSong);
    
    try {
      // Try to add to main songs collection (same as playlist logic)
      await songsService.createWithId(firestoreSong.id, firestoreSong);
      console.log('✅ Added song to main songs collection:', firestoreSong.title);
    } catch (error) {
      // Song might already exist in main collection, that's okay
      console.log('Song already exists in main collection or error:', error);
    }
    
    // Then add to user's liked songs subcollection
    const likedSongRef = doc(db, 'users', userId, 'likedSongs', normalizedSong._id);
    
    await setDoc(likedSongRef, {
      ...firestoreSong,
      likedAt: serverTimestamp(), // Additional field for liked songs
      source: 'spotify' // Track source
    });
    
    console.log('✅ Added song to liked songs:', normalizedSong.title);
    
    // Update user stats
    await updateUserStats({ likedSongsCount: 1 });
    
    // Dispatch event to notify other components
    document.dispatchEvent(new CustomEvent('likedSongsUpdated'));
    
  } catch (error) {
    console.error('Error adding liked song to Firestore:', error);
    throw error;
  }
};

/**
 * Remove a song from liked songs
 */
export const removeLikedSong = async (songId: string): Promise<void> => {
  const { isAuthenticated, userId } = useAuthStore.getState();
  
  if (!isAuthenticated || !userId) {
    console.warn('User not authenticated, cannot remove from Firestore');
    return;
  }
  
  try {
    const likedSongRef = doc(db, 'users', userId, 'likedSongs', songId);
    
    // Verify the song exists before deleting
    const songDoc = await getDoc(likedSongRef);
    if (songDoc.exists()) {
      await deleteDoc(likedSongRef);
      console.log('✅ Removed song from liked songs:', songId);
      
      // Update user stats
      await updateUserStats({ likedSongsCount: -1 });
      
      // Dispatch event to notify other components
      document.dispatchEvent(new CustomEvent('likedSongsUpdated'));
    } else {
      console.warn('Song not found:', songId);
    }
    
  } catch (error) {
    console.error('Error removing liked song from Firestore:', error);
    throw error;
  }
};

/**
 * Check if a song is liked
 */
export const isSongLiked = async (songId: string): Promise<boolean> => {
  const { isAuthenticated, userId } = useAuthStore.getState();
  
  if (!isAuthenticated || !userId) {
    return false;
  }
  
  try {
    const likedSongRef = doc(db, 'users', userId, 'likedSongs', songId);
    const songDoc = await getDoc(likedSongRef);
    
    return songDoc.exists();
    
  } catch (error) {
    console.error('Error checking if song is liked:', error);
    return false;
  }
};

/**
 * Get all liked songs count
 */
export const getLikedSongsCount = async (): Promise<number> => {
  const { isAuthenticated, userId } = useAuthStore.getState();
  
  if (!isAuthenticated || !userId) {
    return 0;
  }

  try {
    const likedSongsRef = collection(db, 'users', userId, 'likedSongs');
    const snapshot = await getDocs(likedSongsRef);
    
    return snapshot.size;
    
  } catch (error) {
    console.error('Error getting liked songs count:', error);
    return 0;
  }
};

/**
 * Toggle liked state of a song
 */
export const toggleLikedSong = async (song: Song): Promise<boolean> => {
  try {
    const isLiked = await isSongLiked(song._id);
    
    if (isLiked) {
      await removeLikedSong(song._id);
      return false;
    } else {
      await addLikedSong(song);
      return true;
    }
  } catch (error) {
    console.error('Error toggling liked song:', error);
    return false;
  }
};