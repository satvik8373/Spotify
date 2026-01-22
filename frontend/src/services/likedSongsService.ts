import { useAuthStore } from "@/stores/useAuthStore";
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, orderBy, serverTimestamp, writeBatch, where, limit } from "firebase/firestore";
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

// Batch operations manager for Firebase
class FirebaseBatchManager {
  private batchOperations: Array<() => Promise<void>> = [];
  private isProcessing = false;
  private batchSize = 10; // Process 10 operations at once
  private processingDelay = 100; // ms between batches

  addOperation(operation: () => Promise<void>) {
    this.batchOperations.push(operation);
    this.processBatch();
  }

  private async processBatch() {
    if (this.isProcessing || this.batchOperations.length === 0) return;
    
    this.isProcessing = true;
    
    try {
      const batch = this.batchOperations.splice(0, this.batchSize);
      await Promise.all(batch.map(op => op().catch(() => {})));
      
      // Continue processing if more operations exist
      if (this.batchOperations.length > 0) {
        setTimeout(() => {
          this.isProcessing = false;
          this.processBatch();
        }, this.processingDelay);
      } else {
        this.isProcessing = false;
      }
    } catch (error) {
      // Batch processing error
      this.isProcessing = false;
    }
  }
}

const firebaseBatchManager = new FirebaseBatchManager();

// Cache for duplicate checks to avoid repeated Firebase queries
const duplicateCheckCache = new Map<string, { result: boolean; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Optimized check if a song already exists in liked songs (by title and artist)
 * Uses Firestore query with caching instead of fetching all documents
 */
export const isSongAlreadyLiked = async (title: string, artist: string): Promise<boolean> => {
  const { isAuthenticated, userId } = useAuthStore.getState();
  
  if (!isAuthenticated || !userId) {
    return false;
  }
  
  // Create cache key
  const cacheKey = `${userId}:${title.toLowerCase().trim()}:${artist.toLowerCase().trim()}`;
  
  // Check cache first
  const cached = duplicateCheckCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }
  
  try {
    const likedSongsRef = collection(db, 'users', userId, 'likedSongs');
    
    // Use Firestore query to check for exact matches (more efficient)
    const normalizedTitle = title.toLowerCase().trim();
    const normalizedArtist = artist.toLowerCase().trim();
    
    // Query for songs with matching title (case-insensitive search would require composite index)
    // For now, we'll do a limited query and filter in memory for better performance
    const recentQuery = query(
      likedSongsRef, 
      orderBy('likedAt', 'desc'),
      limit(100) // Only check recent 100 songs for performance
    );
    
    const snapshot = await getDocs(recentQuery);
    
    // Check if any existing song matches title and artist (case-insensitive)
    const exists = snapshot.docs.some(doc => {
      const data = doc.data();
      const existingTitle = data.title?.toLowerCase().trim();
      const existingArtist = data.artist?.toLowerCase().trim();
      
      return existingTitle === normalizedTitle && existingArtist === normalizedArtist;
    });
    
    // Cache the result
    duplicateCheckCache.set(cacheKey, { result: exists, timestamp: Date.now() });
    
    return exists;
  } catch (error) {
    return false;
  }
};

/**
 * Add a song to liked songs (with duplicate detection)
 */
export const addLikedSong = async (
  song: Song, 
  source: 'mavrixfy' | 'spotify' = 'mavrixfy', 
  spotifyId?: string,
  customLikedAt?: string | Date
): Promise<{ added: boolean; reason?: string }> => {
  const { isAuthenticated, userId } = useAuthStore.getState();
  
  if (!isAuthenticated || !userId) {
    return { added: false, reason: 'Not authenticated' };
  }

  try {
    // Check for duplicates first with caching
    const alreadyExists = await isSongAlreadyLiked(song.title, song.artist);
    if (alreadyExists) {
      return { added: false, reason: 'Already exists' };
    }

    // Use batch manager for better performance
    return new Promise((resolve) => {
      firebaseBatchManager.addOperation(async () => {
        try {
          const likedSongRef = doc(db, 'users', userId, 'likedSongs', song._id);
          
          // Determine the likedAt timestamp
          let likedAtTimestamp;
          if (customLikedAt) {
            // Use custom date (for Spotify imports)
            likedAtTimestamp = customLikedAt instanceof Date ? customLikedAt : new Date(customLikedAt);
          } else {
            // Use server timestamp for current time
            likedAtTimestamp = serverTimestamp();
          }

          const likedSongData: LikedSong = {
            id: song._id,
            title: song.title,
            artist: song.artist,
            albumName: song.albumId || '',
            imageUrl: song.imageUrl,
            audioUrl: song.audioUrl,
            duration: song.duration,
            year: '',
            likedAt: likedAtTimestamp,
            source: source,
            ...(spotifyId && { spotifyId })
          };
          
          await setDoc(likedSongRef, likedSongData);
          
          // Update cache
          const cacheKey = `${userId}:${song.title.toLowerCase().trim()}:${song.artist.toLowerCase().trim()}`;
          duplicateCheckCache.set(cacheKey, { result: true, timestamp: Date.now() });
          
          // Dispatch event to notify other components
          document.dispatchEvent(new CustomEvent('likedSongsUpdated'));
          
          resolve({ added: true });
        } catch (error) {
          resolve({ added: false, reason: 'Database error' });
        }
      });
    });
    
  } catch (error) {
    throw error;
  }
};

/**
 * Optimized batch add multiple songs to liked songs
 */
export const addMultipleLikedSongs = async (songs: Song[], source: 'mavrixfy' | 'spotify' = 'mavrixfy'): Promise<{ added: number; skipped: number; errors: number }> => {
  const { isAuthenticated, userId } = useAuthStore.getState();
  
  if (!isAuthenticated || !userId) {
    return { added: 0, skipped: 0, errors: 0 };
  }

  let added = 0;
  let skipped = 0;
  let errors = 0;

  try {
    // Process songs in batches of 10 for better performance
    const batchSize = 10;
    for (let i = 0; i < songs.length; i += batchSize) {
      const batch = writeBatch(db);
      const songBatch = songs.slice(i, i + batchSize);
      
      for (const song of songBatch) {
        try {
          // Quick duplicate check using cache
          const alreadyExists = await isSongAlreadyLiked(song.title, song.artist);
          if (alreadyExists) {
            skipped++;
            continue;
          }

          const likedSongRef = doc(db, 'users', userId, 'likedSongs', song._id);
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
            source: source
          };
          
          batch.set(likedSongRef, likedSongData);
          added++;
        } catch (error) {
          errors++;
        }
      }
      
      // Commit the batch
      if (added > 0) {
        await batch.commit();
      }
      
      // Small delay between batches to avoid overwhelming Firestore
      if (i + batchSize < songs.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Dispatch event to notify other components
    document.dispatchEvent(new CustomEvent('likedSongsUpdated'));
    
    return { added, skipped, errors };
    
  } catch (error) {
    return { added, skipped, errors: errors + 1 };
  }
};

/**
 * Remove a song from liked songs
 */
export const removeLikedSong = async (songId: string): Promise<void> => {
  const { isAuthenticated, userId } = useAuthStore.getState();
  
  if (!isAuthenticated || !userId) {
    return;
  }
  
  try {
    const likedSongRef = doc(db, 'users', userId, 'likedSongs', songId);
    await deleteDoc(likedSongRef);
    
    // Dispatch event to notify other components
    document.dispatchEvent(new CustomEvent('likedSongsUpdated'));
    
  } catch (error) {
    throw error;
  }
};

/**
 * Load liked songs from Firestore
 */
export const loadLikedSongs = async (): Promise<Song[]> => {
  const { isAuthenticated, userId } = useAuthStore.getState();
  
  if (!isAuthenticated || !userId) {
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
        albumId: data.albumName || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Preserve source information for UI indicators
        source: data.source,
        spotifyId: data.spotifyId,
        likedAt: data.likedAt // Keep the liked timestamp
      } as Song & { source?: string; spotifyId?: string; likedAt?: any });
    });
    
    return songs;
    
  } catch (error) {
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
    return 0;
  }
};