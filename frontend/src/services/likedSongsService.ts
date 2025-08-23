import { useAuthStore } from "@/stores/useAuthStore";
import axiosInstance from "@/lib/axios";
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where, serverTimestamp, updateDoc, increment, orderBy } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { updateUserStats } from "./userService";
// Removed Spotify imports - Mavrixfy operations should never affect Spotify
// import { isAuthenticated as isSpotifyAuthenticated, saveTrack as spotifySaveTrack, removeTrack as spotifyRemoveTrack } from './spotifyService';

// Keys for storage
const ANONYMOUS_LIKED_SONGS_KEY = "spotify-clone-liked-songs";
const getUserLikedSongsKey = (userId: string) => `spotify-clone-liked-songs-${userId}`;
const LIKED_SONGS_CACHE_EXPIRY = "spotify-clone-liked-songs-expiry";
const LAST_SYNC_TIMESTAMP = "spotify-clone-liked-songs-last-sync";

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
  userId: string;
  title: string;
  artist: string;
  albumName?: string;
  imageUrl: string;
  audioUrl: string;
  duration?: number;
  likedAt: any; // Firebase Timestamp
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
 * Save liked songs to the appropriate storage location based on authentication status
 */
export const saveLikedSongs = (songs: Song[]): void => {
  const { isAuthenticated, userId } = useAuthStore.getState();
  
  // Normalize all songs
  const normalizedSongs = songs.map(normalizeSong);
  const songsJson = JSON.stringify(normalizedSongs);
  
  try {
    if (isAuthenticated && userId) {
      // User is logged in, save to user-specific storage
      localStorage.setItem(getUserLikedSongsKey(userId), songsJson);
      
      // Update cache expiry timestamp (24 hours)
      localStorage.setItem(LIKED_SONGS_CACHE_EXPIRY, (Date.now() + 24 * 60 * 60 * 1000).toString());
      
      // Schedule a sync with server
      queueSyncWithServer();
    } else {
      // Anonymous user
      localStorage.setItem(ANONYMOUS_LIKED_SONGS_KEY, songsJson);
    }
    
    // Notify listeners that liked songs have been updated
    document.dispatchEvent(new Event('likedSongsUpdated'));
  } catch (error) {
    console.error("Error saving liked songs:", error);
    
    // Try with smaller chunks if storage quota exceeded
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      try {
        if (normalizedSongs.length > 50) {
          const reducedSongs = normalizedSongs.slice(0, 50);
          localStorage.setItem(
            isAuthenticated && userId ? getUserLikedSongsKey(userId) : ANONYMOUS_LIKED_SONGS_KEY, 
            JSON.stringify(reducedSongs)
          );
          console.warn("Saved only the most recent 50 liked songs due to storage limitations");
        }
      } catch (fallbackError) {
        console.error("Failed to save even reduced liked songs:", fallbackError);
      }
    }
  }
};

/**
 * Load liked songs from the appropriate storage location
 */
export const loadLikedSongs = (): Song[] => {
  const { isAuthenticated, userId } = useAuthStore.getState();
  
  try {
    let storedSongs;
    
    if (isAuthenticated && userId) {
      // User is logged in, load from user-specific storage
      storedSongs = localStorage.getItem(getUserLikedSongsKey(userId));
      
      // Check if we're missing a recent sync
      const lastSync = localStorage.getItem(LAST_SYNC_TIMESTAMP);
      const now = Date.now();
      
      // Force sync if no recent sync or cache expired
      if (!lastSync || (now - parseInt(lastSync)) > 3600000) { // 1 hour
        console.log("No recent sync or cache expired, forcing sync...");
        // Trigger sync but don't wait
        syncWithServer(parseStoredSongs(storedSongs)).catch(err => 
          console.error("Force sync failed:", err)
        );
      }
    } else {
      // Anonymous user
      storedSongs = localStorage.getItem(ANONYMOUS_LIKED_SONGS_KEY);
    }
    
    return parseStoredSongs(storedSongs);
  } catch (error) {
    console.error("Error loading liked songs:", error);
    // Try to recover from corrupted storage
    try {
      if (isAuthenticated && userId) {
        localStorage.removeItem(getUserLikedSongsKey(userId));
      } else {
        localStorage.removeItem(ANONYMOUS_LIKED_SONGS_KEY);
      }
    } catch (clearError) {
      console.error("Failed to clear corrupted liked songs:", clearError);
    }
    return [];
  }
};

/**
 * Parse stored songs from localStorage
 */
const parseStoredSongs = (storedSongs: string | null): Song[] => {
  if (!storedSongs) return [];
  
  try {
    // Parse and normalize each song
    const parsedSongs = JSON.parse(storedSongs);
    return Array.isArray(parsedSongs) ? parsedSongs.map(normalizeSong) : [];
  } catch (error) {
    console.error("Error parsing stored songs:", error);
    return [];
  }
};

/**
 * Add a song to liked songs (local storage version)
 */
export const addLikedSongLocal = (song: any): void => {
  try {
    const likedSongs = loadLikedSongs();
    const normalizedSong = normalizeSong(song);
    
    // Check if song already exists
    if (!likedSongs.some(s => s.id === normalizedSong.id)) {
      // Add to the beginning of the array to show newest liked songs first
      likedSongs.unshift(normalizedSong);
      saveLikedSongs(likedSongs);
      
      // Update cache expiry (24 hours)
      localStorage.setItem(LIKED_SONGS_CACHE_EXPIRY, (Date.now() + 24 * 60 * 60 * 1000).toString());
      
      // If user is authenticated, also add to server
      const { isAuthenticated } = useAuthStore.getState();
      if (isAuthenticated) {
        addSongToServer(normalizedSong).catch(err => 
          console.error("Failed to add song to server:", err)
        );
      }
    }
  } catch (error) {
    console.error("Error adding liked song:", error);
  }
};

/**
 * Remove a song from liked songs (local storage version)
 */
export const removeLikedSongLocal = (songId: string): void => {
  try {
    const likedSongs = loadLikedSongs();
    const updatedSongs = likedSongs.filter(song => song.id !== songId);
    saveLikedSongs(updatedSongs);
    
    // If user is authenticated, also remove from server
    const { isAuthenticated } = useAuthStore.getState();
    if (isAuthenticated) {
      removeSongFromServer(songId).catch(err => 
        console.error("Failed to remove song from server:", err)
      );
    }
  } catch (error) {
    console.error("Error removing liked song:", error);
  }
};

/**
 * Check if a song is liked (local storage version)
 */
export const isSongLikedLocal = (songId: string): boolean => {
  try {
    const likedSongs = loadLikedSongs();
    return likedSongs.some(song => song.id === songId);
  } catch (error) {
    console.error("Error checking if song is liked:", error);
    return false;
  }
};

/**
 * Move anonymous liked songs to user account after login (local storage version)
 */
export const migrateAnonymousLikedSongsLocal = (userId: string) => {
  try {
    // Get anonymous songs
    const anonymousSongs = localStorage.getItem(ANONYMOUS_LIKED_SONGS_KEY);
    if (!anonymousSongs) return;
    
    // Get current user songs
    const userSongsKey = getUserLikedSongsKey(userId);
    const userSongs = localStorage.getItem(userSongsKey);
    const parsedAnonymousSongs = JSON.parse(anonymousSongs);
    
    // If there are no anonymous songs, nothing to do
    if (!Array.isArray(parsedAnonymousSongs) || parsedAnonymousSongs.length === 0) return;
    
    if (userSongs) {
      // Merge songs, avoiding duplicates
      const parsedUserSongs = JSON.parse(userSongs);
      const mergedSongs = [...parsedUserSongs];
      
      parsedAnonymousSongs.forEach((anonSong: any) => {
        const normalizedSong = normalizeSong(anonSong);
        if (!mergedSongs.some(uSong => uSong.id === normalizedSong.id)) {
          mergedSongs.push(normalizedSong);
        }
      });
      
      // Save merged songs to user storage
      localStorage.setItem(userSongsKey, JSON.stringify(mergedSongs));
    } else {
      // No existing user songs, just copy anonymous songs
      const normalizedSongs = parsedAnonymousSongs.map(normalizeSong);
      localStorage.setItem(userSongsKey, JSON.stringify(normalizedSongs));
    }
    
    // Set cache expiry (24 hours)
    localStorage.setItem(LIKED_SONGS_CACHE_EXPIRY, (Date.now() + 24 * 60 * 60 * 1000).toString());
    
    // Clear anonymous songs
    localStorage.removeItem(ANONYMOUS_LIKED_SONGS_KEY);
    
    // Sync with server
    const mergedSongs = loadLikedSongs();
    syncWithServer(mergedSongs).catch(err => 
      console.error("Failed to sync migrated songs with server:", err)
    );
    
    // Notify that liked songs have been updated
    document.dispatchEvent(new Event('likedSongsUpdated'));
    console.log("Successfully migrated anonymous liked songs to user account");
  } catch (error) {
    console.error("Error migrating liked songs:", error);
  }
};

/**
 * Queue a sync with server (rate limited)
 */
const queueSyncWithServer = () => {
  const { isAuthenticated } = useAuthStore.getState();
  if (!isAuthenticated) return;
  
  // Get last sync timestamp
  const lastSync = localStorage.getItem(LAST_SYNC_TIMESTAMP);
  const now = Date.now();
  
  // Only sync if last sync was more than 1 minute ago
  if (!lastSync || (now - parseInt(lastSync)) > 60000) {
    localStorage.setItem(LAST_SYNC_TIMESTAMP, now.toString());
    const songs = loadLikedSongs();
    syncWithServer(songs).catch(err => 
      console.error("Failed to sync with server:", err)
    );
  }
};

/**
 * Sync local liked songs with the server
 * @param songs The songs to sync
 * @returns A promise that resolves to the synced songs
 */
export const syncWithServer = async (songs: Song[]): Promise<Song[]> => {
  if (!auth.currentUser) {
    // Not logged in, skip server sync silently
    return songs;
  }
  
  const userId = auth.currentUser.uid;
  // console.debug("Syncing liked songs with Firestore...");

  try {
    // Get songs from Firestore
    const likedSongsRef = collection(db, "likedSongs");
    const q = query(likedSongsRef, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    
    // Map of server song IDs for quick lookup
    const serverSongMap = new Map();
    // Array of songs from the server that we'll merge with local songs
    const serverSongs: Song[] = [];
    
    // Process songs from server
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const serverSong = {
        id: data.songId,  // Use the actual song ID, not the compound doc ID
        title: data.title,
        artist: data.artist,
        imageUrl: data.imageUrl || '',
        audioUrl: data.audioUrl || '',
        duration: data.duration || 0,
        album: data.albumName || ''
      };
      
      serverSongMap.set(data.songId, serverSong);
      serverSongs.push(serverSong);
    });
    
    // Normalize songs for comparison
    const normalizedLocalSongs = songs.map(song => {
      // Ensure all songs have an id property for consistent comparison
      if (!song.id && (song as any)._id) {
        return {
          ...song,
          id: (song as any)._id
        };
      }
      return song;
    });
    
    // Map of local song IDs for quick lookup
    const localSongMap = new Map();
    normalizedLocalSongs.forEach(song => {
      // Ensure we're using a consistent ID property
      const songId = song.id;
      if (songId) {
        localSongMap.set(songId, song);
      }
    });
    
    // Songs to add to Firestore (exist locally but not on server)
    const songsToAdd = normalizedLocalSongs.filter(song => {
      const songId = song.id;
      return songId && !serverSongMap.has(songId);
    });
    
    // Songs to add locally (exist on server but not locally)
    const songsToAddLocally = serverSongs.filter(song => {
      return !localSongMap.has(song.id);
    });
    
    // Add songs to Firestore in batch
    for (const song of songsToAdd) {
      try {
        const songId = song.id;
        if (!songId) continue;
        
        const likedSongId = generateLikedSongId(userId, songId);
        const likedSongRef = doc(db, "likedSongs", likedSongId);
        
        await setDoc(likedSongRef, {
          songId: songId,
          userId: userId,
          title: song.title || 'Unknown Title',
          artist: song.artist || 'Unknown Artist',
          albumName: song.album || '',
          imageUrl: song.imageUrl || '',
          audioUrl: song.audioUrl || '',
          duration: song.duration || 0,
          likedAt: serverTimestamp()
        });
      } catch (error) {
        console.error("Error adding song to Firestore:", error);
      }
    }
    
    // Merge local and server songs (prefer local versions if song exists in both)
    let mergedSongs = [...normalizedLocalSongs];
    
    // Add songs from server that don't exist locally
    songsToAddLocally.forEach(serverSong => {
      if (!localSongMap.has(serverSong.id)) {
        mergedSongs.push(serverSong);
      }
    });
    
    // Update local storage with merged songs
    if (mergedSongs.length !== normalizedLocalSongs.length) {
      saveLikedSongs(mergedSongs);
    }
    
    // Update last sync timestamp
    localStorage.setItem(LAST_SYNC_TIMESTAMP, Date.now().toString());
    
    // console.debug(`Synced ${songsToAdd.length} songs to Firestore, ${songsToAddLocally.length} songs from Firestore`);
    
    // Return the merged songs
    return mergedSongs;
  } catch (error) {
    console.error("Error syncing with server:", error);
    // Return original songs on error
    return songs;
  }
};

/**
 * Add a song to the server
 */
const addSongToServer = async (song: Song): Promise<void> => {
  const { isAuthenticated, userId } = useAuthStore.getState();
  
  if (!isAuthenticated || !userId) {
    return; // Can't add without authentication
  }
  
  try {
    // First check if the endpoint exists by making a HEAD request
    try {
      await axiosInstance.head('/api/liked-songs');
    } catch (headError) {
      if ((headError as any)?.response?.status === 404) {
        console.warn("Liked songs API endpoint not available. Changes saved locally only.");
        localStorage.setItem(LAST_SYNC_TIMESTAMP, Date.now().toString());
        return;
      }
    }
    
    // Proceed with the request if endpoint exists
    await axiosInstance.post('/api/liked-songs', {
      songId: song.id,
      title: song.title,
      artist: song.artist,
      imageUrl: song.imageUrl,
      audioUrl: song.audioUrl,
      duration: song.duration || 0,
      albumId: null // No album ID in this context
    });
    
    // Update last sync timestamp
    localStorage.setItem(LAST_SYNC_TIMESTAMP, Date.now().toString());
  } catch (error) {
    console.error("Error adding song to server:", error);
    // We don't throw here since the local operation already succeeded
    
    // If endpoint not found, handle gracefully
    if ((error as any)?.response?.status === 404) {
      console.warn("Liked songs API endpoint not available. Changes saved locally only.");
    }
  }
};

/**
 * Remove a song from the server
 */
const removeSongFromServer = async (songId: string): Promise<void> => {
  const { isAuthenticated, userId } = useAuthStore.getState();
  
  if (!isAuthenticated || !userId) {
    return; // Can't remove without authentication
  }
  
  try {
    // First check if endpoint exists
    try {
      await axiosInstance.head('/api/liked-songs/check');
    } catch (headError) {
      if ((headError as any)?.response?.status === 404) {
        console.warn("Liked songs API endpoint not available. Changes saved locally only.");
        localStorage.setItem(LAST_SYNC_TIMESTAMP, Date.now().toString());
        return;
      }
    }
    
    await axiosInstance.delete(`/api/liked-songs/${songId}`);
    
    // Update last sync timestamp
    localStorage.setItem(LAST_SYNC_TIMESTAMP, Date.now().toString());
  } catch (error) {
    console.error("Error removing song from server:", error);
    // We don't throw here since the local operation already succeeded
    
    // If endpoint not found, handle gracefully
    if ((error as any)?.response?.status === 404) {
      console.warn("Liked songs API endpoint not available. Changes saved locally only.");
    }
  }
};

// Add a function to force sync on login
export const syncLikedSongsOnLogin = async (): Promise<void> => {
  const { isAuthenticated, userId } = useAuthStore.getState();
  
  if (!isAuthenticated || !userId) {
    return; // Can't sync without authentication
  }

  try {
    // First check if we have any local songs for this user
    const userSongsKey = getUserLikedSongsKey(userId);
    const localSongs = localStorage.getItem(userSongsKey);
    const parsedLocalSongs = localSongs ? parseStoredSongs(localSongs) : [];
    
    // Sync with server regardless of local state
    console.log("Performing initial sync after login...");
    await syncWithServer(parsedLocalSongs);
    
    // Mark as synced
    localStorage.setItem(LAST_SYNC_TIMESTAMP, Date.now().toString());
  } catch (error) {
    console.error("Error performing initial sync after login:", error);
  }
};

// Firebase implementations

// Get all liked songs for current user
export const getLikedSongs = async (): Promise<LikedSong[]> => {
  if (!auth.currentUser) {
    return [];
  }

  const userId = auth.currentUser.uid;
  const likedSongsRef = collection(db, "likedSongs");

  // Try ordered query first; if index missing, fall back to unordered
  try {
    const orderedQ = query(likedSongsRef, where("userId", "==", userId), orderBy("likedAt", "desc"));
    const snapshot = await getDocs(orderedQ);
    const likedSongs: LikedSong[] = [];
    snapshot.forEach((d) => {
      likedSongs.push({ id: d.id, ...d.data() } as LikedSong);
    });
    return likedSongs;
  } catch (orderedErr) {
    try {
      // Fallback without orderBy
      const unorderedQ = query(likedSongsRef, where("userId", "==", userId));
      const snapshot = await getDocs(unorderedQ);
      const likedSongs: LikedSong[] = [];
      snapshot.forEach((d) => {
        likedSongs.push({ id: d.id, ...d.data() } as LikedSong);
      });
      // Sort client-side by likedAt
      return likedSongs.sort((a, b) => {
        const dateA = (a.likedAt?.toDate ? a.likedAt.toDate() : new Date(a.likedAt || 0)) as Date;
        const dateB = (b.likedAt?.toDate ? b.likedAt.toDate() : new Date(b.likedAt || 0)) as Date;
        return dateB.getTime() - dateA.getTime();
      });
    } catch (fallbackErr) {
      console.error("Error getting liked songs:", fallbackErr);
      return [];
    }
  }
};

// Generate a unique ID for a liked song
const generateLikedSongId = (userId: string, songId: string): string => {
  return `${userId}_${songId}`;
};

// Add a song to liked songs
export const addLikedSong = async (song: { 
  id: string;
  title: string;
  artist: string;
  albumName?: string;
  imageUrl: string;
  audioUrl: string;
  duration?: number;
}): Promise<boolean> => {
  try {
    if (!auth.currentUser) {
      // If not logged in, use local storage version
      addLikedSongLocal(song);
      return true;
    }
    
    const userId = auth.currentUser.uid;
    const likedSongId = generateLikedSongId(userId, song.id);
    const likedSongRef = doc(db, "likedSongs", likedSongId);
    
    // Check if already liked
    const likedSongDoc = await getDoc(likedSongRef);
    if (likedSongDoc.exists()) {
      return true; // Already liked
    }
    
    // Add to liked songs
    await setDoc(likedSongRef, {
      songId: song.id,
      userId: userId,
      title: song.title,
      artist: song.artist,
      albumName: song.albumName || '',
      imageUrl: song.imageUrl,
      audioUrl: song.audioUrl,
      duration: song.duration || 0,
      likedAt: serverTimestamp()
    });
    
    // Update user stats - increment accepts FieldValue
    await updateUserStats({ likedSongsCount: increment(1) });
    
    // Also update local storage
    addLikedSongLocal(song);
    // Removed Spotify integration - Mavrixfy operations should never affect Spotify
    
    return true;
  } catch (error) {
    console.error("Error adding song to liked songs:", error);
    
    // Fall back to local storage if Firebase fails
    addLikedSongLocal(song);
    // Removed Spotify integration - Mavrixfy operations should never affect Spotify
    
    return true; // Return true anyway since we saved to local storage
  }
};

// Remove a song from liked songs
export const removeLikedSong = async (songId: string): Promise<boolean> => {
  try {
    if (!auth.currentUser) {
      // If not logged in, use local storage version
      removeLikedSongLocal(songId);
      return true;
    }
    
    const userId = auth.currentUser.uid;
    const likedSongId = generateLikedSongId(userId, songId);
    const likedSongRef = doc(db, "likedSongs", likedSongId);
    
    // Check if exists
    const likedSongDoc = await getDoc(likedSongRef);
    if (!likedSongDoc.exists()) {
      // Update local storage just in case
      removeLikedSongLocal(songId);
      return true; // Already not liked
    }
    
    // Remove from liked songs
    await deleteDoc(likedSongRef);
    
    // Update user stats - increment accepts FieldValue
    await updateUserStats({ likedSongsCount: increment(-1) });
    
    // Also update local storage
    removeLikedSongLocal(songId);
    
    // Removed all Spotify integration - Mavrixfy operations should never affect Spotify
    console.log(`Song ${songId} removed from Mavrixfy library only - Spotify not affected`);
    
    return true;
  } catch (error) {
    console.error("Error removing song from liked songs:", error);
    
    // Fall back to local storage if Firebase fails
    removeLikedSongLocal(songId);
    
    // Removed all Spotify integration - Mavrixfy operations should never affect Spotify
    console.log(`Song ${songId} removed from Mavrixfy local storage only - Spotify not affected`);
    
    return true; // Return true anyway since we removed from local storage
  }
};

// Check if song is liked by current user
export const isSongLiked = async (songId: string): Promise<boolean> => {
  try {
    if (!auth.currentUser) {
      // If not logged in, use local storage version
      return isSongLikedLocal(songId);
    }
    
    const userId = auth.currentUser.uid;
    const likedSongId = generateLikedSongId(userId, songId);
    const likedSongRef = doc(db, "likedSongs", likedSongId);
    const likedSongDoc = await getDoc(likedSongRef);
    
    return likedSongDoc.exists();
  } catch (error) {
    console.error("Error checking if song is liked:", error);
    
    // Fall back to local storage if Firebase fails
    return isSongLikedLocal(songId);
  }
};

// Toggle liked state of a song
export const toggleLikedSong = async (song: { 
  id: string;
  title: string;
  artist: string;
  albumName?: string;
  imageUrl: string;
  audioUrl: string;
  duration?: number;
}): Promise<boolean> => {
  try {
    const isLiked = await isSongLiked(song.id);
    
    if (isLiked) {
      return await removeLikedSong(song.id);
    } else {
      return await addLikedSong(song);
    }
  } catch (error) {
    console.error("Error toggling liked song:", error);
    return false;
  }
};

// Migration function to move liked songs from anonymous user to authenticated user
export const migrateAnonymousLikedSongs = async (userId: string): Promise<boolean> => {
  try {
    // Check if there are any anonymous liked songs to migrate
    const anonymousSongs = localStorage.getItem(ANONYMOUS_LIKED_SONGS_KEY);
    if (!anonymousSongs) {
      return true; // Nothing to migrate
    }
    
    // Parse anonymous songs
    const parsedAnonymousSongs = JSON.parse(anonymousSongs);
    if (!Array.isArray(parsedAnonymousSongs) || parsedAnonymousSongs.length === 0) {
      return true; // Nothing to migrate
    }
    
    // Run the local storage migration first
    migrateAnonymousLikedSongsLocal(userId);
    
    // Now migrate to Firebase if we have a Firebase user
    const firebaseUser = auth.currentUser;
    if (firebaseUser) {
      // Add each song to Firestore
      for (const song of parsedAnonymousSongs) {
        const normalizedSong = normalizeSong(song);
        
        const likedSongId = generateLikedSongId(firebaseUser.uid, normalizedSong.id);
        const likedSongRef = doc(db, "likedSongs", likedSongId);
        
        // Check if already in Firestore
        const likedSongDoc = await getDoc(likedSongRef);
        if (!likedSongDoc.exists()) {
          // Add to Firestore
          await setDoc(likedSongRef, {
            songId: normalizedSong.id,
            userId: firebaseUser.uid,
            title: normalizedSong.title,
            artist: normalizedSong.artist,
            albumName: normalizedSong.album || '',
            imageUrl: normalizedSong.imageUrl,
            audioUrl: normalizedSong.audioUrl,
            duration: normalizedSong.duration || 0,
            likedAt: serverTimestamp()
          });
        }
      }
      
      // Update user stats
      const userRef = doc(db, "users", firebaseUser.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        await updateDoc(userRef, {
          likedSongsCount: parsedAnonymousSongs.length,
          updatedAt: serverTimestamp()
        });
      }
    }
    
    console.log(`Successfully migrated ${parsedAnonymousSongs.length} anonymous liked songs to user account`);
    return true;
  } catch (error) {
    console.error("Error migrating anonymous liked songs:", error);
    return false;
  }
}; 