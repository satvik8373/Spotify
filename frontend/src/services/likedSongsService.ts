import { useAuthStore } from "@/stores/useAuthStore";

// Keys for storage
const ANONYMOUS_LIKED_SONGS_KEY = "spotify-clone-liked-songs";
const getUserLikedSongsKey = (userId: string) => `spotify-clone-liked-songs-${userId}`;

// Type for song objects
export interface Song {
  id: string;
  title: string;
  artist: string;
  imageUrl: string;
  audioUrl: string;
  duration?: number;
}

/**
 * Ensure a URL is properly formatted
 */
const normalizeUrl = (url: string): string => {
  // Check if the URL is already valid
  if (!url) return '';
  
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
  return {
    id: song.id || song._id || `song-${Date.now()}`,
    title: song.title || 'Unknown Title',
    artist: song.artist || 'Unknown Artist',
    imageUrl: normalizeUrl(song.imageUrl || ''),
    audioUrl: normalizeUrl(song.audioUrl || ''),
    duration: typeof song.duration === 'number' ? song.duration : 0
  };
};

/**
 * Save liked songs to the appropriate storage location based on authentication status
 */
export const saveLikedSongs = (songs: Song[]): void => {
  const { isAuthenticated, userId } = useAuthStore.getState();
  
  // Normalize all songs
  const normalizedSongs = songs.map(normalizeSong);
  const songsJson = JSON.stringify(normalizedSongs);
  
  if (isAuthenticated && userId) {
    // User is logged in, save to user-specific storage
    localStorage.setItem(getUserLikedSongsKey(userId), songsJson);
  } else {
    // Anonymous user
    localStorage.setItem(ANONYMOUS_LIKED_SONGS_KEY, songsJson);
  }
  
  // Notify listeners that liked songs have been updated
  document.dispatchEvent(new Event('likedSongsUpdated'));
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
    } else {
      // Anonymous user
      storedSongs = localStorage.getItem(ANONYMOUS_LIKED_SONGS_KEY);
    }
    
    if (!storedSongs) return [];
    
    // Parse and normalize each song
    const parsedSongs = JSON.parse(storedSongs);
    return parsedSongs.map(normalizeSong);
  } catch (error) {
    console.error("Error loading liked songs:", error);
    return [];
  }
};

/**
 * Add a song to liked songs
 */
export const addLikedSong = (song: any): void => {
  const likedSongs = loadLikedSongs();
  const normalizedSong = normalizeSong(song);
  
  // Check if song already exists
  if (!likedSongs.some(s => s.id === normalizedSong.id)) {
    // Add to the beginning of the array to show newest liked songs first
    likedSongs.unshift(normalizedSong);
    saveLikedSongs(likedSongs);
  }
};

/**
 * Remove a song from liked songs
 */
export const removeLikedSong = (songId: string): void => {
  const likedSongs = loadLikedSongs();
  const updatedSongs = likedSongs.filter(song => song.id !== songId);
  saveLikedSongs(updatedSongs);
};

/**
 * Check if a song is liked
 */
export const isSongLiked = (songId: string): boolean => {
  const likedSongs = loadLikedSongs();
  return likedSongs.some(song => song.id === songId);
};

/**
 * Move anonymous liked songs to user account after login
 */
export const migrateAnonymousLikedSongs = (userId: string) => {
  try {
    // Get anonymous songs
    const anonymousSongs = localStorage.getItem(ANONYMOUS_LIKED_SONGS_KEY);
    if (!anonymousSongs) return;
    
    // Get current user songs
    const userSongsKey = getUserLikedSongsKey(userId);
    const userSongs = localStorage.getItem(userSongsKey);
    const parsedAnonymousSongs = JSON.parse(anonymousSongs);
    
    // If there are no anonymous songs, nothing to do
    if (parsedAnonymousSongs.length === 0) return;
    
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
    
    // Clear anonymous songs
    localStorage.removeItem(ANONYMOUS_LIKED_SONGS_KEY);
    
    // Notify that liked songs have been updated
    document.dispatchEvent(new Event('likedSongsUpdated'));
  } catch (error) {
    console.error("Error migrating liked songs:", error);
  }
}; 