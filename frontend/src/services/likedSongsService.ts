import { useAuthStore } from "@/stores/useAuthStore";
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Song } from "@/types";

// IMPORTANT: This service ONLY works with user-specific liked songs
// Path: users/{userId}/likedSongs/{songId}
// NEVER save to the main 'songs' collection - that's for other app features

export interface LikedSong {
  id: string;
  title: string;
  artist: string;
  albumName?: string;
  imageUrl: string;
  audioUrl: string;
  duration?: number;
  likedAt: any; // Firebase Timestamp
  source: 'mavrixfy' | 'spotify';
  year?: string;
  spotifyId?: string; // Original Spotify track ID if synced from Spotify
}

/**
 * Add a song to liked songs
 */
export const addLikedSong = async (song: Song, source: 'mavrixfy' | 'spotify' = 'mavrixfy', spotifyId?: string): Promise<void> => {
  const { isAuthenticated, userId } = useAuthStore.getState();
  
  if (!isAuthenticated || !userId) {
    console.warn('User not authenticated, cannot add to liked songs');
    return;
  }

  try {
    // IMPORTANT: Always save to user's subcollection, never to main songs collection
    const likedSongRef = doc(db, 'users', userId, 'likedSongs', song._id);
    
    console.log(`🔒 Saving liked song to user subcollection: users/${userId}/likedSongs/${song._id}`);
    
    const likedSongData: LikedSong = {
      id: song._id,
      title: song.title,
      artist: song.artist,
      albumName: song.albumId || '',
      imageUrl: song.imageUrl,
      audioUrl: song.audioUrl,
      duration: song.duration,
      year: '',
      likedAt: serverTimestamp(),
      source: source,
      ...(spotifyId && { spotifyId })
    };
    
    await setDoc(likedSongRef, likedSongData);
    console.log(`✅ Successfully saved liked song to user subcollection (source: ${source})`);
    console.log(`📍 Firestore path: users/${userId}/likedSongs/${song._id}`);
    
    // Dispatch event to notify other components
    document.dispatchEvent(new CustomEvent('likedSongsUpdated'));
    
  } catch (error) {
    console.error('Error adding liked song:', error);
    throw error;
  }
};

/**
 * Remove a song from liked songs
 */
export const removeLikedSong = async (songId: string): Promise<void> => {
  const { isAuthenticated, userId } = useAuthStore.getState();
  
  if (!isAuthenticated || !userId) {
    console.warn('User not authenticated, cannot remove from liked songs');
    return;
  }
  
  try {
    const likedSongRef = doc(db, 'users', userId, 'likedSongs', songId);
    await deleteDoc(likedSongRef);
    console.log('Removed song from liked songs');
    
    // Dispatch event to notify other components
    document.dispatchEvent(new CustomEvent('likedSongsUpdated'));
    
  } catch (error) {
    console.error('Error removing liked song:', error);
    throw error;
  }
};

/**
 * Load liked songs from Firestore
 */
export const loadLikedSongs = async (): Promise<Song[]> => {
  const { isAuthenticated, userId } = useAuthStore.getState();
  
  if (!isAuthenticated || !userId) {
    console.warn('User not authenticated, cannot load liked songs');
    return [];
  }

  try {
    console.log(`🔍 Loading liked songs from user subcollection: users/${userId}/likedSongs`);
    
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
      const data = docSnap.data() as LikedSong;
      
      songs.push({
        _id: data.id,
        title: data.title,
        artist: data.artist,
        imageUrl: data.imageUrl,
        audioUrl: data.audioUrl,
        duration: data.duration || 0,
        albumId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Preserve source information for UI indicators
        source: data.source,
        spotifyId: data.spotifyId
      } as Song & { source?: string; spotifyId?: string });
    });
    
    console.log(`📥 Loaded ${songs.length} liked songs from user subcollection: users/${userId}/likedSongs`);
    return songs;
    
  } catch (error) {
    console.error('Error loading liked songs from Firestore:', error);
    return [];
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

/**
 * Get liked songs count
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