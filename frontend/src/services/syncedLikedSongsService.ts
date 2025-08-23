import axios from '../lib/axios';

// Get synced liked songs from backend
export const getSyncedLikedSongs = async (userId: string) => {
  try {
    const response = await axios.get(`/api/spotify/liked-songs/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching synced liked songs:', error);
    throw error;
  }
};

// Get sync status
export const getSyncStatus = async (userId: string) => {
  try {
    const response = await axios.get(`/api/spotify/sync-status/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching sync status:', error);
    throw error;
  }
};

// Manual sync trigger
export const triggerManualSync = async (userId: string) => {
  try {
    const response = await axios.post('/api/spotify/sync', { userId });
    return response.data;
  } catch (error) {
    console.error('Error triggering manual sync:', error);
    throw error;
  }
};

// Merge synced songs with local liked songs
export const mergeSyncedSongs = async (userId: string) => {
  try {
    const syncedSongs = await getSyncedLikedSongs(userId);
    const syncStatus = await getSyncStatus(userId);
    
    return {
      songs: syncedSongs,
      status: syncStatus
    };
  } catch (error) {
    console.error('Error merging synced songs:', error);
    throw error;
  }
};

// Format sync status for display
export const formatSyncStatus = (status: any) => {
  if (!status.hasSynced) {
    return {
      text: 'Not synced',
      status: 'never',
      lastSync: null
    };
  }
  
  if (status.syncStatus === 'failed') {
    return {
      text: 'Sync failed',
      status: 'error',
      lastSync: status.lastSyncAt,
      error: status.error
    };
  }
  
  if (status.syncStatus === 'completed') {
    const lastSync = status.lastSyncAt ? new Date(status.lastSyncAt) : null;
    const now = new Date();
    const diffHours = lastSync ? Math.floor((now.getTime() - lastSync.getTime()) / (1000 * 60 * 60)) : 0;
    
    let text = 'Up to date';
    if (diffHours > 0) {
      text = `Synced ${diffHours}h ago`;
    }
    
    return {
      text,
      status: 'synced',
      lastSync,
      totalSongs: status.totalSongs
    };
  }
  
  return {
    text: 'Unknown status',
    status: 'unknown',
    lastSync: status.lastSyncAt
  };
};
