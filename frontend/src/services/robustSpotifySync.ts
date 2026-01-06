/**
 * Robust Spotify Sync Service
 * 
 * Handles Spotify's server-side caching behavior by:
 * 1. Adding a delay after OAuth before fetching liked songs
 * 2. Implementing proper pagination with cache-busting
 * 3. Re-syncing on app focus, visibility change, and token refresh
 * 4. Providing sync status UI feedback
 */

import axios from 'axios';
import { auth, db } from '@/lib/firebase';
import { collection, doc, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';
import { resolveArtist } from '@/lib/resolveArtist';

// Constants
const SPOTIFY_API_URL = 'https://api.spotify.com/v1';
const SYNC_DELAY_MS = 4000; // 4 second delay after OAuth
const PAGE_SIZE = 50;
const SYNC_COOLDOWN_MS = 30000; // 30 seconds between syncs
const LAST_SYNC_KEY = 'spotify_robust_sync_timestamp';
const SYNC_IN_PROGRESS_KEY = 'spotify_sync_in_progress';

// Sync status types
export type SyncStatus = 'idle' | 'waiting' | 'syncing' | 'completed' | 'error';

export interface SyncProgress {
  status: SyncStatus;
  message: string;
  progress?: number;
  totalTracks?: number;
  syncedTracks?: number;
  error?: string;
}

// Event emitter for sync status updates
type SyncListener = (progress: SyncProgress) => void;
const syncListeners: Set<SyncListener> = new Set();

export const subscribeSyncStatus = (listener: SyncListener): (() => void) => {
  syncListeners.add(listener);
  return () => syncListeners.delete(listener);
};

const emitSyncStatus = (progress: SyncProgress) => {
  syncListeners.forEach(listener => listener(progress));
  // Also dispatch a custom event for components that prefer event-based updates
  window.dispatchEvent(new CustomEvent('spotify_sync_status', { detail: progress }));
};

/**
 * Get access token from localStorage
 */
const getAccessToken = (): string | null => {
  return localStorage.getItem('spotify_access_token');
};

/**
 * Check if token is valid (not expired)
 */
const isTokenValid = (): boolean => {
  const token = getAccessToken();
  const expiry = localStorage.getItem('spotify_token_expiry');
  
  if (!token || !expiry) return false;
  return Date.now() < parseInt(expiry, 10);
};

/**
 * Create axios instance with cache-busting headers
 */
const createSpotifyClient = () => {
  const token = getAccessToken();
  if (!token) throw new Error('No access token available');

  return axios.create({
    baseURL: SPOTIFY_API_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      // Cache-busting headers
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
};


/**
 * Fetch ALL liked songs from Spotify with proper pagination
 * Uses cache-busting to ensure fresh data
 */
export const fetchAllLikedSongsWithPagination = async (
  onProgress?: (fetched: number, total?: number) => void
): Promise<SpotifyTrack[]> => {
  if (!isTokenValid()) {
    throw new Error('Invalid or expired Spotify token');
  }

  const client = createSpotifyClient();
  const allTracks: SpotifyTrack[] = [];
  let offset = 0;
  let total: number | null = null;

  console.log('🔄 Starting paginated fetch of Spotify liked songs...');

  while (true) {
    try {
      // Add timestamp to bust any caching
      const timestamp = Date.now();
      const response = await client.get('/me/tracks', {
        params: {
          limit: PAGE_SIZE,
          offset,
          _t: timestamp, // Cache buster
        },
      });

      const { items, total: totalCount, next } = response.data;
      
      if (total === null) {
        total = totalCount;
        console.log(`📊 Total liked songs in Spotify: ${total}`);
      }

      if (!items || items.length === 0) {
        console.log('✅ No more items to fetch');
        break;
      }

      // Transform and add tracks
      for (const item of items) {
        const track = transformSpotifyTrack(item);
        if (track) {
          allTracks.push(track);
        }
      }

      console.log(`📥 Fetched ${allTracks.length}/${total} tracks`);
      onProgress?.(allTracks.length, total ?? undefined);

      // Check if we've reached the end
      if (!next || items.length < PAGE_SIZE) {
        console.log('✅ Reached end of pagination');
        break;
      }

      offset += items.length;

      // Small delay between requests to be nice to Spotify's API
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error: any) {
      console.error('❌ Error fetching page:', error.response?.status, error.message);
      
      // If we get a 429 (rate limit), wait and retry
      if (error.response?.status === 429) {
        const retryAfter = parseInt(error.response.headers['retry-after'] || '5', 10);
        console.log(`⏳ Rate limited, waiting ${retryAfter} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      
      throw error;
    }
  }

  console.log(`✅ Fetched total of ${allTracks.length} liked songs`);
  return allTracks;
};

export interface SpotifyTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  imageUrl: string;
  audioUrl: string;
  duration: number;
  addedAt: string;
  spotifyUrl: string;
  popularity?: number;
  previewUrl?: string;
}

/**
 * Transform Spotify API response to our track format
 */
const transformSpotifyTrack = (item: any): SpotifyTrack | null => {
  try {
    const track = item.track;
    if (!track || !track.id) return null;

    return {
      id: track.id,
      title: track.name || 'Unknown Title',
      artist: resolveArtist(track),
      album: track.album?.name || '',
      imageUrl: track.album?.images?.[1]?.url || track.album?.images?.[0]?.url || '',
      audioUrl: track.preview_url || '',
      duration: track.duration_ms ? Math.floor(track.duration_ms / 1000) : 0,
      addedAt: item.added_at || new Date().toISOString(),
      spotifyUrl: track.external_urls?.spotify || '',
      popularity: track.popularity,
      previewUrl: track.preview_url,
    };
  } catch (error) {
    console.warn('Failed to transform track:', error);
    return null;
  }
};


/**
 * Save tracks to Firestore
 */
const saveTracksToFirestore = async (
  tracks: SpotifyTrack[],
  onProgress?: (saved: number, total: number) => void
): Promise<{ added: number; updated: number }> => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const likedSongsRef = collection(db, 'users', user.uid, 'likedSongs');
  
  // Get existing song IDs
  const existingSnapshot = await getDocs(likedSongsRef);
  const existingIds = new Set<string>();
  existingSnapshot.forEach(doc => existingIds.add(doc.id));

  let added = 0;
  let updated = 0;

  // Process in batches of 500 (Firestore limit)
  const BATCH_SIZE = 500;
  for (let i = 0; i < tracks.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const batchTracks = tracks.slice(i, i + BATCH_SIZE);

    for (const track of batchTracks) {
      const trackRef = doc(likedSongsRef, track.id);
      const trackData = {
        songId: track.id,
        title: track.title,
        artist: track.artist,
        album: track.album,
        imageUrl: track.imageUrl,
        audioUrl: track.audioUrl,
        duration: track.duration,
        addedAt: track.addedAt,
        spotifyUrl: track.spotifyUrl,
        syncedAt: serverTimestamp(),
        source: 'spotify',
      };

      if (existingIds.has(track.id)) {
        batch.update(trackRef, trackData);
        updated++;
      } else {
        batch.set(trackRef, trackData);
        added++;
      }
    }

    await batch.commit();
    onProgress?.(Math.min(i + BATCH_SIZE, tracks.length), tracks.length);
  }

  return { added, updated };
};

/**
 * Check if sync is allowed (cooldown period)
 */
const canSync = (): boolean => {
  const lastSync = localStorage.getItem(LAST_SYNC_KEY);
  if (!lastSync) return true;
  
  const elapsed = Date.now() - parseInt(lastSync, 10);
  return elapsed > SYNC_COOLDOWN_MS;
};

/**
 * Check if sync is currently in progress
 */
const isSyncInProgress = (): boolean => {
  return localStorage.getItem(SYNC_IN_PROGRESS_KEY) === 'true';
};

/**
 * Set sync in progress flag
 */
const setSyncInProgress = (inProgress: boolean) => {
  if (inProgress) {
    localStorage.setItem(SYNC_IN_PROGRESS_KEY, 'true');
  } else {
    localStorage.removeItem(SYNC_IN_PROGRESS_KEY);
  }
};

/**
 * Main sync function with delay for post-OAuth
 * This is the primary function to call after OAuth success
 */
export const performDelayedSync = async (
  delayMs: number = SYNC_DELAY_MS
): Promise<{ success: boolean; tracksCount: number; error?: string }> => {
  // Check if sync is already in progress
  if (isSyncInProgress()) {
    console.log('⏳ Sync already in progress, skipping...');
    return { success: false, tracksCount: 0, error: 'Sync already in progress' };
  }

  try {
    setSyncInProgress(true);

    // Emit waiting status
    emitSyncStatus({
      status: 'waiting',
      message: 'Preparing to sync your Spotify library...',
    });

    console.log(`⏳ Waiting ${delayMs}ms before fetching liked songs...`);
    await new Promise(resolve => setTimeout(resolve, delayMs));

    // Emit syncing status
    emitSyncStatus({
      status: 'syncing',
      message: 'Syncing your Spotify library...',
      progress: 0,
    });

    // Fetch all tracks with progress updates
    const tracks = await fetchAllLikedSongsWithPagination((fetched, total) => {
      emitSyncStatus({
        status: 'syncing',
        message: `Fetching songs from Spotify...`,
        progress: total ? Math.round((fetched / total) * 50) : 0,
        totalTracks: total,
        syncedTracks: fetched,
      });
    });

    if (tracks.length === 0) {
      emitSyncStatus({
        status: 'completed',
        message: 'No liked songs found in your Spotify library',
        totalTracks: 0,
      });
      return { success: true, tracksCount: 0 };
    }

    // Save to Firestore with progress updates
    emitSyncStatus({
      status: 'syncing',
      message: 'Saving songs to your library...',
      progress: 50,
      totalTracks: tracks.length,
    });

    const { added, updated } = await saveTracksToFirestore(tracks, (saved, total) => {
      emitSyncStatus({
        status: 'syncing',
        message: 'Saving songs to your library...',
        progress: 50 + Math.round((saved / total) * 50),
        totalTracks: total,
        syncedTracks: saved,
      });
    });

    // Update last sync timestamp
    localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());

    // Emit completed status
    emitSyncStatus({
      status: 'completed',
      message: `Synced ${tracks.length} songs (${added} new, ${updated} updated)`,
      totalTracks: tracks.length,
      syncedTracks: tracks.length,
    });

    console.log(`✅ Sync completed: ${tracks.length} tracks (${added} new, ${updated} updated)`);

    // Dispatch event to notify other components
    window.dispatchEvent(new Event('spotify_sync_completed'));
    document.dispatchEvent(new Event('likedSongsUpdated'));

    return { success: true, tracksCount: tracks.length };
  } catch (error: any) {
    console.error('❌ Sync failed:', error);
    
    emitSyncStatus({
      status: 'error',
      message: 'Failed to sync your Spotify library',
      error: error.message,
    });

    return { success: false, tracksCount: 0, error: error.message };
  } finally {
    setSyncInProgress(false);
  }
};


/**
 * Quick sync without delay - for manual refresh or focus events
 */
export const performQuickSync = async (): Promise<{ success: boolean; tracksCount: number; error?: string }> => {
  // Check cooldown
  if (!canSync()) {
    console.log('⏳ Sync cooldown active, skipping...');
    return { success: false, tracksCount: 0, error: 'Sync cooldown active' };
  }

  // Check if sync is already in progress
  if (isSyncInProgress()) {
    console.log('⏳ Sync already in progress, skipping...');
    return { success: false, tracksCount: 0, error: 'Sync already in progress' };
  }

  return performDelayedSync(0); // No delay for quick sync
};

/**
 * Force sync - bypasses cooldown (use sparingly)
 */
export const performForceSync = async (): Promise<{ success: boolean; tracksCount: number; error?: string }> => {
  // Clear cooldown
  localStorage.removeItem(LAST_SYNC_KEY);
  
  // Check if sync is already in progress
  if (isSyncInProgress()) {
    // Force clear the in-progress flag if it's been stuck for more than 5 minutes
    const syncStartTime = localStorage.getItem('spotify_sync_start_time');
    if (syncStartTime) {
      const elapsed = Date.now() - parseInt(syncStartTime, 10);
      if (elapsed > 5 * 60 * 1000) {
        console.log('⚠️ Clearing stuck sync flag');
        setSyncInProgress(false);
      } else {
        return { success: false, tracksCount: 0, error: 'Sync already in progress' };
      }
    }
  }

  localStorage.setItem('spotify_sync_start_time', Date.now().toString());
  return performDelayedSync(0);
};

/**
 * Setup automatic re-sync triggers
 * Call this once when the app initializes
 */
export const setupAutoSyncTriggers = () => {
  // Re-sync when app regains focus
  const handleVisibilityChange = () => {
    if (!document.hidden && isTokenValid()) {
      console.log('👁️ App became visible, checking if sync needed...');
      performQuickSync().catch(console.error);
    }
  };

  // Re-sync when window regains focus
  const handleFocus = () => {
    if (isTokenValid()) {
      console.log('🎯 Window focused, checking if sync needed...');
      performQuickSync().catch(console.error);
    }
  };

  // Re-sync when token is refreshed
  const handleTokenRefresh = () => {
    console.log('🔄 Token refreshed, triggering sync...');
    performQuickSync().catch(console.error);
  };

  // Re-sync when auth state changes
  const handleAuthChange = () => {
    if (isTokenValid()) {
      console.log('🔐 Auth changed, triggering sync...');
      // Use delayed sync for new auth
      performDelayedSync().catch(console.error);
    }
  };

  // Add event listeners
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('focus', handleFocus);
  window.addEventListener('spotify_token_refreshed', handleTokenRefresh);
  window.addEventListener('spotify_auth_changed', handleAuthChange);

  // Return cleanup function
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('focus', handleFocus);
    window.removeEventListener('spotify_token_refreshed', handleTokenRefresh);
    window.removeEventListener('spotify_auth_changed', handleAuthChange);
  };
};

/**
 * Get current sync status
 */
export const getSyncInfo = (): { lastSync: Date | null; canSync: boolean; inProgress: boolean } => {
  const lastSyncStr = localStorage.getItem(LAST_SYNC_KEY);
  const lastSync = lastSyncStr ? new Date(parseInt(lastSyncStr, 10)) : null;
  
  return {
    lastSync,
    canSync: canSync(),
    inProgress: isSyncInProgress(),
  };
};

/**
 * Clear sync data (for logout/disconnect)
 */
export const clearSyncData = () => {
  localStorage.removeItem(LAST_SYNC_KEY);
  localStorage.removeItem(SYNC_IN_PROGRESS_KEY);
  localStorage.removeItem('spotify_sync_start_time');
};

export default {
  performDelayedSync,
  performQuickSync,
  performForceSync,
  setupAutoSyncTriggers,
  fetchAllLikedSongsWithPagination,
  subscribeSyncStatus,
  getSyncInfo,
  clearSyncData,
};
