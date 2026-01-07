import { useAuthStore } from "@/stores/useAuthStore";
import { resolveArtist } from "@/lib/resolveArtist";
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, serverTimestamp, orderBy, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { updateUserStats } from "./userService";

// Type for song objects
export interface Song {
  id: string;
  title: string;
  artist: string;
  imageUrl: string;
  audioUrl: string;
  duration?: number;
  album?: string;
  year?: string;
}

export interface LikedSong {
  id: string;
  songId: string;
  title: string;
  artist: string;
  albumName?: string;
  imageUrl: string;
  audioUrl: string;
  duration?: number;
  likedAt: any; // Firebase Timestamp
  source: 'mavrixfy' | 'spotify'; // Track the source of the liked song
  year?: string;
}

/**
 * Ensure a URL is properly formatted
 */
const normalizeUrl = (url: string): string => {
  if (!url) return '';
  
  // Skip placeholder URLs that might cause errors
  if (url.includes('via.placeholder.com') || url.includes('placeholder.com')) {
    return '';
  }
  
  // Handle relative URLs
  if (url.startsWith('/')) {
    return `${window.location.origin}${url}`;
  }
  
  // Make sure URL has http/https protocol
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  
  return url;
};

/**
 * Normalize a song object to ensure it has the correct format
 */
const normalizeSong = (song: any): Song => {
  const normalizedSong = {
    id: song.id || song._id || song.songId || `song-${Date.now()}`,
    title: song.title || 'Unknown Title',
    artist: resolveArtist(song),
    imageUrl: normalizeUrl(song.imageUrl || song.image || ''),
    audioUrl: normalizeUrl(song.audioUrl || song.url || ''),
    duration: typeof song.duration === 'number' ? song.duration : 0,
    album: song.album || song.albumName || 'Unknown Album',
    year: song.year || ''
  };
  
  return normalizedSong;
};

/**
 * Load liked songs from Firestore
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
      // Try to order by likedAt first
      const q = query(likedSongsRef, orderBy('likedAt', 'desc'));
      snapshot = await getDocs(q);
    } catch (orderError) {
      // If ordering fails, get all docs without ordering
      console.log('Ordering by likedAt failed, fetching without order:', orderError);
      snapshot = await getDocs(likedSongsRef);
    }
    
    const songs: Song[] = [];
    
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      
      // Handle both old and new data formats
      const songId = data.id || data.songId || docSnap.id;
      const audioUrl = data.audioUrl || data.url || '';
      const imageUrl = data.imageUrl || data.image || '';
      
      songs.push({
        id: songId,
        title: data.title || 'Unknown Title',
        artist: data.artist || 'Unknown Artist',
        imageUrl: imageUrl,
        audioUrl: audioUrl,
        duration: data.duration || 0,
        album: data.albumName || data.album || '',
        year: data.year || ''
      });
    });
    
    console.log(`📥 Loaded ${songs.length} liked songs from Firestore`);
    return songs;
    
  } catch (error) {
    console.error('Error loading liked songs from Firestore:', error);
    return [];
  }
};

/**
 * Add a single song to liked songs in Firestore
 */
export const addLikedSong = async (song: Song): Promise<void> => {
  const { isAuthenticated, userId } = useAuthStore.getState();
  
  if (!isAuthenticated || !userId) {
    console.warn('User not authenticated, cannot add to Firestore');
    return;
  }

  try {
    const normalizedSong = normalizeSong(song);
    const likedSongRef = doc(collection(db, 'users', userId, 'likedSongs'), normalizedSong.id);
    
    const likedSongData: LikedSong = {
      id: normalizedSong.id,
      songId: normalizedSong.id,
      title: normalizedSong.title,
      artist: normalizedSong.artist,
      albumName: normalizedSong.album,
      imageUrl: normalizedSong.imageUrl,
      audioUrl: normalizedSong.audioUrl,
      duration: normalizedSong.duration,
      year: normalizedSong.year,
      likedAt: serverTimestamp(),
      source: 'mavrixfy'
    };
    
    await setDoc(likedSongRef, likedSongData);
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
 * Remove a song from liked songs in Firestore
 */
export const removeLikedSong = async (songId: string): Promise<void> => {
  const { isAuthenticated, userId } = useAuthStore.getState();
  
  if (!isAuthenticated || !userId) {
    console.warn('User not authenticated, cannot remove from Firestore');
    return;
  }
  
  try {
    const likedSongRef = doc(collection(db, 'users', userId, 'likedSongs'), songId);
    
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
 * Check if a song is liked by querying Firestore
 */
export const isSongLiked = async (songId: string): Promise<boolean> => {
  const { isAuthenticated, userId } = useAuthStore.getState();
  
  if (!isAuthenticated || !userId) {
    return false;
  }
  
  try {
    const likedSongRef = doc(collection(db, 'users', userId, 'likedSongs'), songId);
    const songDoc = await getDoc(likedSongRef);
    
    return songDoc.exists();
    
  } catch (error) {
    console.error('Error checking if song is liked:', error);
    return false;
  }
};

/**
 * Get all liked songs count from Firestore
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
    const isLiked = await isSongLiked(song.id);
    
    if (isLiked) {
      await removeLikedSong(song.id);
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

/**
 * Save multiple liked songs to Firestore (batch operation)
 */
export const saveLikedSongs = async (songs: Song[]): Promise<void> => {
  const { isAuthenticated, userId } = useAuthStore.getState();
  
  if (!isAuthenticated || !userId) {
    console.warn('User not authenticated, cannot save to Firestore');
    return;
  }

  try {
    const batch = writeBatch(db);
    
    for (const song of songs) {
      const normalizedSong = normalizeSong(song);
      const likedSongRef = doc(collection(db, 'users', userId, 'likedSongs'), normalizedSong.id);
      
      const likedSongData: LikedSong = {
        id: normalizedSong.id,
        songId: normalizedSong.id,
        title: normalizedSong.title,
        artist: normalizedSong.artist,
        albumName: normalizedSong.album,
        imageUrl: normalizedSong.imageUrl,
        audioUrl: normalizedSong.audioUrl,
        duration: normalizedSong.duration,
        year: normalizedSong.year,
        likedAt: serverTimestamp(),
        source: 'mavrixfy'
      };
      
      batch.set(likedSongRef, likedSongData);
    }
    
    await batch.commit();
    console.log(`✅ Saved ${songs.length} liked songs to Firestore`);
    
    // Dispatch event to notify other components
    document.dispatchEvent(new CustomEvent('likedSongsUpdated'));
    
  } catch (error) {
    console.error('Error saving liked songs to Firestore:', error);
    throw error;
  }
};