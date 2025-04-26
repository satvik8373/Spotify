import { useAuthStore } from "@/stores/useAuthStore";
import axiosInstance from "../lib/axios";

// Keys for storage
const ANONYMOUS_LIKED_SONGS_KEY = "spotify-clone-liked-songs";
const getUserLikedSongsKey = (userId: string) => `spotify-clone-liked-songs-${userId}`;
const LIKED_SONGS_CACHE_EXPIRY = "spotify-clone-liked-songs-expiry";
const LIKED_SONGS_SYNC_TIMESTAMP = "spotify-clone-liked-songs-sync";

// Type for song objects
export interface Song {
  id: string;
  songId?: string; // For compatibility with backend
  title: string;
  artist: string;
  imageUrl: string;
  audioUrl: string;
  duration?: number;
  album?: string;
  year?: string;
  addedAt?: string;
}

/**
 * Ensure a URL is properly formatted
 */
const normalizeUrl = (url: string): string => {
  if (!url) return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzU1NSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMzYiIGZpbGw9IiNmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
  
  // Check if it's already a full URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Check if it's a route path
  if (url.startsWith('/')) {
    return url;
  }
  
  // Default to a data URL for placeholder
  return url || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzU1NSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMzYiIGZpbGw9IiNmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
};

/**
 * Normalize a song object to ensure it has the correct format
 */
const normalizeSong = (song: any): Song => {
  return {
    id: song.id || song.songId || song._id || `song-${Date.now()}`,
    title: song.title || 'Unknown Title',
    artist: song.artist || 'Unknown Artist',
    imageUrl: normalizeUrl(song.imageUrl || song.image || ''),
    audioUrl: normalizeUrl(song.audioUrl || song.url || ''),
    duration: typeof song.duration === 'number' ? song.duration : 0,
    album: song.album || 'Unknown Album',
    year: song.year || '',
    addedAt: song.addedAt || new Date().toISOString()
  };
};

/**
 * Sync liked songs with the server
 */
export const syncWithServer = async (songs: Song[]): Promise<Song[]> => {
  const { isAuthenticated, userId } = useAuthStore.getState();
  
  if (!isAuthenticated || !userId) {
    return songs; // Can't sync without authentication
  }
  
  try {
    // Only sync if we haven't synced recently (within the last minute)
    const lastSync = localStorage.getItem(LIKED_SONGS_SYNC_TIMESTAMP);
    const now = Date.now();
    if (lastSync && (now - parseInt(lastSync)) < 60000) {
      return songs; // Skip sync if done recently
    }
    
    // Send local songs to server
    const response = await axiosInstance.post('/api/liked-songs/sync', { songs });
    
    // Update sync timestamp
    localStorage.setItem(LIKED_SONGS_SYNC_TIMESTAMP, now.toString());
    
    if (response.data && response.data.success) {
      return response.data.data;
    }
    
    return songs;
  } catch (error) {
    console.error("Error syncing liked songs with server:", error);
    return songs; // Return original songs on error
  }
};

/**
 * Fetch liked songs from the server
 */
const fetchFromServer = async (): Promise<Song[] | null> => {
  const { isAuthenticated } = useAuthStore.getState();
  
  if (!isAuthenticated) {
    return null; // Can't fetch without authentication
  }
  
  try {
    const response = await axiosInstance.get('/api/liked-songs');
    
    if (response.data && response.data.success) {
      return response.data.data.map(normalizeSong);
    }
    
    return null;
  } catch (error) {
    console.error("Error fetching liked songs from server:", error);
    return null;
  }
};

/**
 * Save liked songs to the appropriate storage location based on authentication status
 */
export const saveLikedSongs = async (songs: Song[]): Promise<void> => {
  const { isAuthenticated, userId } = useAuthStore.getState();
  
  // Normalize all songs
  const normalizedSongs = songs.map(normalizeSong);
  const songsJson = JSON.stringify(normalizedSongs);
  
  try {
    if (isAuthenticated && userId) {
      // User is logged in, save to user-specific storage
      localStorage.setItem(getUserLikedSongsKey(userId), songsJson);
      
      // Sync with server
      await syncWithServer(normalizedSongs);
      
      // Update cache expiry timestamp (24 hours)
      localStorage.setItem(LIKED_SONGS_CACHE_EXPIRY, (Date.now() + 24 * 60 * 60 * 1000).toString());
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
export const loadLikedSongs = async (): Promise<Song[]> => {
  const { isAuthenticated, userId } = useAuthStore.getState();
  
  try {
    let storedSongs;
    
    if (isAuthenticated && userId) {
      // First try to get from server
      const serverSongs = await fetchFromServer();
      
      if (serverSongs) {
        // Got songs from server, update local cache
        const songsJson = JSON.stringify(serverSongs);
        localStorage.setItem(getUserLikedSongsKey(userId), songsJson);
        localStorage.setItem(LIKED_SONGS_CACHE_EXPIRY, (Date.now() + 24 * 60 * 60 * 1000).toString());
        return serverSongs;
      }
      
      // If server fetch fails, try local cache
      storedSongs = localStorage.getItem(getUserLikedSongsKey(userId));
  
      const expiryTimestamp = localStorage.getItem(LIKED_SONGS_CACHE_EXPIRY);
      if (expiryTimestamp && parseInt(expiryTimestamp) < Date.now()) {
        console.log("Liked songs cache expired, will refresh on next operation");
        
        // Try to sync with server to refresh data
        const localSongs = storedSongs ? JSON.parse(storedSongs) : [];
        const syncedSongs = await syncWithServer(localSongs.map(normalizeSong));
        if (syncedSongs && syncedSongs.length > 0) {
          return syncedSongs;
        }
      }
    } else {
      // Anonymous user
      storedSongs = localStorage.getItem(ANONYMOUS_LIKED_SONGS_KEY);
    }
    
    if (!storedSongs) return [];
    
    // Parse and normalize each song
    const parsedSongs = JSON.parse(storedSongs);
    return Array.isArray(parsedSongs) ? parsedSongs.map(normalizeSong) : [];
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
 * Add a song to liked songs
 */
export const addLikedSong = async (song: any): Promise<void> => {
  try {
    const normalizedSong = normalizeSong(song);
    const { isAuthenticated } = useAuthStore.getState();
    
    // If authenticated, also add to server
    if (isAuthenticated) {
      try {
        await axiosInstance.post('/api/liked-songs', {
          songId: normalizedSong.id,
          title: normalizedSong.title,
          artist: normalizedSong.artist,
          imageUrl: normalizedSong.imageUrl,
          audioUrl: normalizedSong.audioUrl,
          duration: normalizedSong.duration || 0,
          albumId: song.albumId || null
        });
      } catch (error) {
        console.error("Error adding liked song to server:", error);
      }
    }
    
    // Also store locally
    const likedSongs = await loadLikedSongs();
    
    // Check if song already exists
    if (!likedSongs.some(s => s.id === normalizedSong.id)) {
      // Add to the beginning of the array to show newest liked songs first
      likedSongs.unshift(normalizedSong);
      await saveLikedSongs(likedSongs);
      
      // Update cache expiry (24 hours)
      localStorage.setItem(LIKED_SONGS_CACHE_EXPIRY, (Date.now() + 24 * 60 * 60 * 1000).toString());
    }
  } catch (error) {
    console.error("Error adding liked song:", error);
  }
};

/**
 * Remove a song from liked songs
 */
export const removeLikedSong = async (songId: string): Promise<void> => {
  try {
    const { isAuthenticated } = useAuthStore.getState();
    
    // If authenticated, also remove from server
    if (isAuthenticated) {
      try {
        await axiosInstance.delete(`/api/liked-songs/${songId}`);
      } catch (error) {
        console.error("Error removing liked song from server:", error);
      }
    }
    
    // Also remove locally
    const likedSongs = await loadLikedSongs();
    const updatedSongs = likedSongs.filter(song => song.id !== songId);
    await saveLikedSongs(updatedSongs);
  } catch (error) {
    console.error("Error removing liked song:", error);
  }
};

/**
 * Check if a song is liked
 */
export const isSongLiked = async (songId: string): Promise<boolean> => {
  try {
    const { isAuthenticated } = useAuthStore.getState();
    
    // If authenticated, check server first
    if (isAuthenticated) {
      try {
        const response = await axiosInstance.get(`/api/liked-songs/check/${songId}`);
        if (response.data && response.data.success) {
          return response.data.isLiked;
        }
      } catch (error) {
        console.error("Error checking if song is liked on server:", error);
      }
    }
    
    // Check local storage as fallback
    const likedSongs = await loadLikedSongs();
    return likedSongs.some(song => song.id === songId);
  } catch (error) {
    console.error("Error checking if song is liked:", error);
    return false;
  }
};

/**
 * Move anonymous liked songs to user account after login
 */
export const migrateAnonymousLikedSongs = async (userId: string): Promise<void> => {
  try {
    // Get anonymous songs
    const anonymousSongs = localStorage.getItem(ANONYMOUS_LIKED_SONGS_KEY);
    if (!anonymousSongs) return;
    
    // Parse anonymous songs
    const parsedAnonymousSongs = JSON.parse(anonymousSongs);
    
    // If there are no anonymous songs, nothing to do
    if (!Array.isArray(parsedAnonymousSongs) || parsedAnonymousSongs.length === 0) return;
    
    // Get current user songs
    const userSongsKey = getUserLikedSongsKey(userId);
    const userSongs = localStorage.getItem(userSongsKey);
    
    let mergedSongs: Song[] = [];
    
    if (userSongs) {
      // Merge songs, avoiding duplicates
      const parsedUserSongs = JSON.parse(userSongs);
      mergedSongs = [...parsedUserSongs];
      
      parsedAnonymousSongs.forEach((anonSong: any) => {
        const normalizedSong = normalizeSong(anonSong);
        if (!mergedSongs.some(uSong => uSong.id === normalizedSong.id)) {
          mergedSongs.push(normalizedSong);
        }
      });
    } else {
      // No existing user songs, just copy anonymous songs
      mergedSongs = parsedAnonymousSongs.map(normalizeSong);
    }
    
    // Save to local storage
    localStorage.setItem(userSongsKey, JSON.stringify(mergedSongs));
    
    // Set cache expiry (24 hours)
    localStorage.setItem(LIKED_SONGS_CACHE_EXPIRY, (Date.now() + 24 * 60 * 60 * 1000).toString());
    
    // Clear anonymous songs
    localStorage.removeItem(ANONYMOUS_LIKED_SONGS_KEY);
    
    // Sync with server
    await syncWithServer(mergedSongs);
    
    // Notify that liked songs have been updated
    document.dispatchEvent(new Event('likedSongsUpdated'));
    console.log("Successfully migrated anonymous liked songs to user account");
  } catch (error) {
    console.error("Error migrating liked songs:", error);
  }
}; 