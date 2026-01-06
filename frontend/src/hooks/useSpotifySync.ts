import { useState, useEffect, useCallback, useRef } from 'react';
import { spotifySyncManager, isAuthenticated, getAllSavedTracks } from '@/services/spotifyService';
import api from '@/lib/axios';

export type SyncStatus = 'idle' | 'syncing' | 'completed' | 'error';

interface SyncState {
  status: SyncStatus;
  message: string;
  progress: { loaded: number; total: number | null } | null;
  lastSyncTime: number | null;
  error: string | null;
}

interface UseSpotifySyncOptions {
  /** Enable automatic sync when app regains focus */
  syncOnFocus?: boolean;
  /** Minimum interval between syncs in milliseconds */
  minSyncInterval?: number;
  /** User ID for backend sync */
  userId?: string;
  /** Use backend sync instead of frontend-only */
  useBackendSync?: boolean;
  /** Callback when sync completes */
  onSyncComplete?: (tracks: any[]) => void;
}

/**
 * Hook for managing Spotify library sync with automatic re-sync on:
 * - App regaining focus (visibility change)
 * - Token refresh
 * - Manual trigger
 * 
 * Handles Spotify's server-side caching by adding delays after OAuth.
 */
export function useSpotifySync(options: UseSpotifySyncOptions = {}) {
  const {
    syncOnFocus = true,
    minSyncInterval = 30000,
    userId,
    useBackendSync = true,
    onSyncComplete,
  } = options;

  const [state, setState] = useState<SyncState>({
    status: 'idle',
    message: '',
    progress: null,
    lastSyncTime: null,
    error: null,
  });

  const [tracks, setTracks] = useState<any[]>([]);
  const isMounted = useRef(true);

  // Sync function that fetches all liked songs
  const performSync = useCallback(async () => {
    if (!isAuthenticated()) {
      console.log('Not authenticated, skipping sync');
      return;
    }

    setState(prev => ({
      ...prev,
      status: 'syncing',
      message: 'Syncing your Spotify library...',
      error: null,
    }));

    try {
      let fetchedTracks: any[] = [];

      if (useBackendSync && userId) {
        // Use backend sync (stores in Firestore)
        console.log('🔄 Using backend sync...');
        await api.post('/api/spotify/sync', { userId });
        
        // Fetch synced tracks from backend
        const response = await api.get(`/api/spotify/liked-songs/${userId}`);
        fetchedTracks = response.data || [];
      } else {
        // Use frontend-only sync (direct Spotify API)
        console.log('🔄 Using frontend sync...');
        fetchedTracks = await getAllSavedTracks((loaded, total) => {
          if (isMounted.current) {
            setState(prev => ({
              ...prev,
              progress: { loaded, total },
              message: `Loading tracks... ${loaded}${total ? `/${total}` : ''}`,
            }));
          }
        });
      }

      if (isMounted.current) {
        setTracks(fetchedTracks);
        setState(prev => ({
          ...prev,
          status: 'completed',
          message: `Synced ${fetchedTracks.length} tracks`,
          progress: null,
          lastSyncTime: Date.now(),
        }));
        
        onSyncComplete?.(fetchedTracks);
      }
    } catch (error: any) {
      console.error('Sync failed:', error);
      if (isMounted.current) {
        setState(prev => ({
          ...prev,
          status: 'error',
          message: 'Sync failed',
          error: error.message || 'Unknown error',
          progress: null,
        }));
      }
    }
  }, [userId, useBackendSync, onSyncComplete]);

  // Initialize sync manager
  useEffect(() => {
    isMounted.current = true;

    spotifySyncManager.initialize(
      performSync,
      (status, message) => {
        if (isMounted.current) {
          setState(prev => ({
            ...prev,
            status: status as SyncStatus,
            message: message || '',
          }));
        }
      }
    );

    spotifySyncManager.setSyncOnFocus(syncOnFocus);
    spotifySyncManager.setMinSyncInterval(minSyncInterval);

    // Initial sync if authenticated
    if (isAuthenticated()) {
      performSync();
    }

    return () => {
      isMounted.current = false;
      spotifySyncManager.destroy();
    };
  }, [performSync, syncOnFocus, minSyncInterval]);

  // Manual sync trigger
  const triggerSync = useCallback((force = false) => {
    spotifySyncManager.triggerSync(force);
  }, []);

  return {
    ...state,
    tracks,
    triggerSync,
    isLoading: state.status === 'syncing',
  };
}

export default useSpotifySync;
