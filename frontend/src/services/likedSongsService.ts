import { useAuthStore } from "@/stores/useAuthStore";
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where, serverTimestamp, orderBy, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { updateUserStats } from "./userService";

// Cache for liked songs to reduce Firestore reads
const likedSongsCache = new Map<string, { songs: any[], timestamp: number, userId: string }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Check if cache is valid
const isCacheValid = (userId: string): boolean => {
  const cached = likedSongsCache.get(userId);
  if (!cached) return false;
  
  const now = Date.now();
  const isExpired = now - cached.timestamp > CACHE_DURATION;
  const isSameUser = cached.userId === userId;
  
  return !isExpired && isSameUser;
};

// Get cached liked songs
const getCachedLikedSongs = (userId: string): any[] | null => {
  if (!isCacheValid(userId)) {
    likedSongsCache.delete(userId);
    return null;
  }
  
  return likedSongsCache.get(userId)?.songs || null;
};

// Set cached liked songs
const setCachedLikedSongs = (userId: string, songs: any[]): void => {
  likedSongsCache.set(userId, {
    songs,
    timestamp: Date.now(),
    userId
  });
};

// Clear cache for a user
const clearCache = (userId: string): void => {
  likedSongsCache.delete(userId);
};

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
  year?: string; // Add year property
}

/**
 * Ensure a URL is properly formatted
 */
const normalizeUrl = (url: string): string => {
  // Check if the URL is already valid
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
  // Basic song information
  const normalizedSong = {
    id: song.id || song._id || song.songId || `song-${Date.now()}`,
    title: song.title || 'Unknown Title',
    artist: song.artist || 'Unknown Artist',
    imageUrl: normalizeUrl(song.imageUrl || song.image || ''),
    audioUrl: normalizeUrl(song.audioUrl || song.url || ''),
    duration: typeof song.duration === 'number' ? song.duration : 0,
    album: song.album || 'Unknown Album',
    year: song.year || ''
  };
  
  // Provide a valid internal image URL if external one is missing
  if (!normalizedSong.imageUrl) {
    // Fallback to a gradient style with no external dependency
    normalizedSong.imageUrl = '';
  }
  
  return normalizedSong;
};

/**
 * Save liked songs to Firestore
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
    console.log(`Saved ${songs.length} liked songs to Firestore`);
    
    // Dispatch event to notify other components
    document.dispatchEvent(new CustomEvent('likedSongsUpdated'));
    
  } catch (error) {
    console.error('Error saving liked songs to Firestore:', error);
    throw error;
  }
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
    // Check cache first to reduce Firestore reads
    const cachedSongs = getCachedLikedSongs(userId);
    if (cachedSongs) {
      console.log(`Using cached liked songs for user: ${userId}`);
      return cachedSongs;
    }

    console.log(`Loading liked songs from Firestore for user: ${userId}`);
    const likedSongsRef = collection(db, 'users', userId, 'likedSongs');
    const q = query(
      likedSongsRef, 
      orderBy('likedAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const songs: Song[] = [];
    
    snapshot.forEach(doc => {
      const data = doc.data() as LikedSong;
      songs.push({
        id: data.id,
        title: data.title,
        artist: data.artist,
        imageUrl: data.imageUrl,
        audioUrl: data.audioUrl,
        duration: data.duration,
        album: data.albumName,
        year: data.year || ''
      });
    });
    
    // Cache the results to reduce future Firestore reads
    setCachedLikedSongs(userId, songs);
    console.log(`Loaded ${songs.length} liked songs from Firestore and cached`);
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
    console.log('Added song to liked songs in Firestore');
    
    // Clear cache since data has changed
    clearCache(userId);
    
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
      console.log('Removed song from liked songs in Firestore');
      
      // Clear cache since data has changed
      clearCache(userId);
      
      // Update user stats
      await updateUserStats({ likedSongsCount: -1 });
      
      // Dispatch event to notify other components
      document.dispatchEvent(new CustomEvent('likedSongsUpdated'));
    } else {
      console.warn('Song not found');
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
 * Sync with server - now just returns Firestore data since it's already synced
 */
export const syncWithServer = async (localSongs: Song[]): Promise<Song[]> => {
  // Since we're now using Firestore, just return the current data
  // This maintains compatibility with existing code
  return await loadLikedSongs();
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

// Legacy function names for backward compatibility
export const addLikedSongLocal = addLikedSong;
export const removeLikedSongLocal = removeLikedSong;
export const isSongLikedLocal = isSongLiked; 