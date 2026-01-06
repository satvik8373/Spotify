/**
 * React hook for Spotify sync status
 * Provides real-time sync status updates for UI components
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  subscribeSyncStatus, 
  SyncProgress, 
  performQuickSync,
  performForceSync,
  getSyncInfo,
  setupAutoSyncTriggers,
} from '@/services/robustSpotifySync';
import { isAuthenticated as isSpotifyAuthenticated } from '@/services/spotifyService';

export interface UseSpotifySyncStatusReturn {
  // Current sync status
  status: SyncProgress['status'];
  message: string;
  progress: number;
  totalTracks: number;
  syncedTracks: number;
  error: string | null;
  
  // Sync info
  lastSync: Date | null;
  canSync: boolean;
  isInProgress: boolean;
  isSpotifyConnected: boolean;
  
  // Actions
  triggerSync: () => Promise<void>;
  triggerForceSync: () => Promise<void>;
}

const initialProgress: SyncProgress = {
  status: 'idle',
  message: '',
  progress: 0,
  totalTracks: 0,
  syncedTracks: 0,
};

export const useSpotifySyncStatus = (): UseSpotifySyncStatusReturn => {
  const [syncProgress, setSyncProgress] = useState<SyncProgress>(initialProgress);
  const [syncInfo, setSyncInfo] = useState(getSyncInfo());
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(isSpotifyAuthenticated());

  // Subscribe to sync status updates
  useEffect(() => {
    const unsubscribe = subscribeSyncStatus((progress) => {
      setSyncProgress(progress);
      // Update sync info when status changes
      if (progress.status === 'completed' || progress.status === 'error') {
        setSyncInfo(getSyncInfo());
      }
    });

    // Setup auto-sync triggers
    const cleanupAutoSync = setupAutoSyncTriggers();

    // Listen for auth changes
    const handleAuthChange = () => {
      setIsSpotifyConnected(isSpotifyAuthenticated());
      setSyncInfo(getSyncInfo());
    };

    window.addEventListener('spotify_auth_changed', handleAuthChange);

    // Initial check
    handleAuthChange();

    return () => {
      unsubscribe();
      cleanupAutoSync();
      window.removeEventListener('spotify_auth_changed', handleAuthChange);
    };
  }, []);

  // Trigger a normal sync
  const triggerSync = useCallback(async () => {
    if (!isSpotifyAuthenticated()) {
      console.log('Cannot sync: Spotify not connected');
      return;
    }
    await performQuickSync();
    setSyncInfo(getSyncInfo());
  }, []);

  // Trigger a force sync (bypasses cooldown)
  const triggerForceSync = useCallback(async () => {
    if (!isSpotifyAuthenticated()) {
      console.log('Cannot sync: Spotify not connected');
      return;
    }
    await performForceSync();
    setSyncInfo(getSyncInfo());
  }, []);

  return {
    status: syncProgress.status,
    message: syncProgress.message,
    progress: syncProgress.progress || 0,
    totalTracks: syncProgress.totalTracks || 0,
    syncedTracks: syncProgress.syncedTracks || 0,
    error: syncProgress.error || null,
    lastSync: syncInfo.lastSync,
    canSync: syncInfo.canSync,
    isInProgress: syncInfo.inProgress || syncProgress.status === 'syncing' || syncProgress.status === 'waiting',
    isSpotifyConnected,
    triggerSync,
    triggerForceSync,
  };
};

export default useSpotifySyncStatus;
