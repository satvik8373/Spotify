/**
 * Mobile Liked Songs Service
 * 
 * This service is designed for the mobile app to read synced liked songs
 * directly from Firestore without needing Spotify authentication.
 * 
 * Features:
 * - Real-time updates via Firestore listeners
 * - No Spotify API calls required
 * - Works with Firebase Authentication only
 * - Optimized for mobile performance
 */

import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  getDocs,
  doc,
  getDoc,
  Unsubscribe 
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export interface SyncedSong {
  id: string;
  trackId: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  spotifyUrl: string;
  duration: number;
  addedAt: string;
  syncedAt: any;
  albumId?: string;
  artistIds?: string[];
  popularity?: number;
  previewUrl?: string;
}

export interface SyncMetadata {
  lastSyncAt: Date | null;
  totalSongs: number;
  syncStatus: 'completed' | 'failed' | 'never' | 'in_progress';
  addedCount?: number;
  updatedCount?: number;
  removedCount?: number;
  error?: string;
}

/**
 * Get all synced liked songs for the current user
 * Returns a promise that resolves once
 */
export const getMobileLikedSongs = async (): Promise<SyncedSong[]> => {
  const userId = auth.currentUser?.uid;
  
  if (!userId) {
    throw new Error('User not authenticated');
  }

  try {
    const likedSongsRef = collection(db, 'users', userId, 'likedSongs');
    const q = query(likedSongsRef, orderBy('addedAt', 'desc'));
    const snapshot = await getDocs(q);
    
    const songs: SyncedSong[] = [];
    snapshot.forEach(doc => {
      songs.push({
        id: doc.id,
        ...doc.data()
      } as SyncedSong);
    });
    
    return songs;
  } catch (error) {
    console.error('Error fetching mobile liked songs:', error);
    throw error;
  }
};

/**
 * Subscribe to real-time updates of liked songs
 * Returns an unsubscribe function
 */
export const subscribeMobileLikedSongs = (
  callback: (songs: SyncedSong[]) => void,
  onError?: (error: Error) => void
): Unsubscribe | null => {
  const userId = auth.currentUser?.uid;
  
  if (!userId) {
    console.error('User not authenticated');
    return null;
  }

  try {
    const likedSongsRef = collection(db, 'users', userId, 'likedSongs');
    const q = query(likedSongsRef, orderBy('addedAt', 'desc'));
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const songs: SyncedSong[] = [];
        snapshot.forEach(doc => {
          songs.push({
            id: doc.id,
            ...doc.data()
          } as SyncedSong);
        });
        
        callback(songs);
      },
      (error) => {
        console.error('Error in liked songs subscription:', error);
        if (onError) {
          onError(error);
        }
      }
    );
    
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up liked songs subscription:', error);
    if (onError) {
      onError(error as Error);
    }
    return null;
  }
};

/**
 * Get sync metadata for the current user
 */
export const getMobileSyncMetadata = async (): Promise<SyncMetadata> => {
  const userId = auth.currentUser?.uid;
  
  if (!userId) {
    throw new Error('User not authenticated');
  }

  try {
    const metadataRef = doc(db, 'users', userId, 'spotifySync', 'metadata');
    const metadataDoc = await getDoc(metadataRef);
    
    if (!metadataDoc.exists()) {
      return {
        lastSyncAt: null,
        totalSongs: 0,
        syncStatus: 'never'
      };
    }
    
    const data = metadataDoc.data();
    return {
      lastSyncAt: data.lastSyncAt?.toDate() || null,
      totalSongs: data.totalSongs || 0,
      syncStatus: data.syncStatus || 'never',
      addedCount: data.addedCount,
      updatedCount: data.updatedCount,
      removedCount: data.removedCount,
      error: data.error
    };
  } catch (error) {
    console.error('Error fetching sync metadata:', error);
    throw error;
  }
};

/**
 * Subscribe to real-time updates of sync metadata
 */
export const subscribeMobileSyncMetadata = (
  callback: (metadata: SyncMetadata) => void,
  onError?: (error: Error) => void
): Unsubscribe | null => {
  const userId = auth.currentUser?.uid;
  
  if (!userId) {
    console.error('User not authenticated');
    return null;
  }

  try {
    const metadataRef = doc(db, 'users', userId, 'spotifySync', 'metadata');
    
    const unsubscribe = onSnapshot(
      metadataRef,
      (doc) => {
        if (!doc.exists()) {
          callback({
            lastSyncAt: null,
            totalSongs: 0,
            syncStatus: 'never'
          });
          return;
        }
        
        const data = doc.data();
        callback({
          lastSyncAt: data.lastSyncAt?.toDate() || null,
          totalSongs: data.totalSongs || 0,
          syncStatus: data.syncStatus || 'never',
          addedCount: data.addedCount,
          updatedCount: data.updatedCount,
          removedCount: data.removedCount,
          error: data.error
        });
      },
      (error) => {
        console.error('Error in sync metadata subscription:', error);
        if (onError) {
          onError(error);
        }
      }
    );
    
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up sync metadata subscription:', error);
    if (onError) {
      onError(error as Error);
    }
    return null;
  }
};

/**
 * Check if user has Spotify connected
 */
export const hasMobileSpotifyConnected = async (): Promise<boolean> => {
  const userId = auth.currentUser?.uid;
  
  if (!userId) {
    return false;
  }

  try {
    const tokenRef = doc(db, 'users', userId, 'spotifyTokens', 'current');
    const tokenDoc = await getDoc(tokenRef);
    
    return tokenDoc.exists();
  } catch (error) {
    console.error('Error checking Spotify connection:', error);
    return false;
  }
};

/**
 * Format sync status for display
 */
export const formatMobileSyncStatus = (metadata: SyncMetadata): string => {
  if (metadata.syncStatus === 'never') {
    return 'Not synced yet';
  }
  
  if (metadata.syncStatus === 'failed') {
    return 'Sync failed';
  }
  
  if (metadata.syncStatus === 'in_progress') {
    return 'Syncing...';
  }
  
  if (metadata.lastSyncAt) {
    const now = new Date();
    const diffMs = now.getTime() - metadata.lastSyncAt.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }
  }
  
  return 'Unknown';
};

/**
 * Get a single song by ID
 */
export const getMobileSongById = async (songId: string): Promise<SyncedSong | null> => {
  const userId = auth.currentUser?.uid;
  
  if (!userId) {
    throw new Error('User not authenticated');
  }

  try {
    const songRef = doc(db, 'users', userId, 'likedSongs', songId);
    const songDoc = await getDoc(songRef);
    
    if (!songDoc.exists()) {
      return null;
    }
    
    return {
      id: songDoc.id,
      ...songDoc.data()
    } as SyncedSong;
  } catch (error) {
    console.error('Error fetching song by ID:', error);
    throw error;
  }
};

/**
 * Search synced songs locally
 */
export const searchMobileLikedSongs = async (searchTerm: string): Promise<SyncedSong[]> => {
  const songs = await getMobileLikedSongs();
  
  if (!searchTerm.trim()) {
    return songs;
  }
  
  const term = searchTerm.toLowerCase();
  
  return songs.filter(song => 
    song.title.toLowerCase().includes(term) ||
    song.artist.toLowerCase().includes(term) ||
    song.album.toLowerCase().includes(term)
  );
};

/**
 * Get songs count
 */
export const getMobileLikedSongsCount = async (): Promise<number> => {
  const userId = auth.currentUser?.uid;
  
  if (!userId) {
    return 0;
  }

  try {
    const likedSongsRef = collection(db, 'users', userId, 'likedSongs');
    const snapshot = await getDocs(likedSongsRef);
    return snapshot.size;
  } catch (error) {
    console.error('Error getting songs count:', error);
    return 0;
  }
};

/**
 * Hook for React components
 */
export const useMobileLikedSongs = () => {
  const [songs, setSongs] = React.useState<SyncedSong[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const unsubscribe = subscribeMobileLikedSongs(
      (updatedSongs) => {
        setSongs(updatedSongs);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return { songs, loading, error };
};

/**
 * Hook for sync metadata
 */
export const useMobileSyncMetadata = () => {
  const [metadata, setMetadata] = React.useState<SyncMetadata>({
    lastSyncAt: null,
    totalSongs: 0,
    syncStatus: 'never'
  });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const unsubscribe = subscribeMobileSyncMetadata(
      (updatedMetadata) => {
        setMetadata(updatedMetadata);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return { metadata, loading, error };
};

// Import React for hooks
import React from 'react';
