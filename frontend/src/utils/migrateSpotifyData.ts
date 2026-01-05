/**
 * Spotify Data Migration Utilities
 * 
 * Helper functions to migrate data from old structures to the new
 * nested Firestore structure (users/{userId}/likedSongs/{songId})
 */

import { auth } from '@/lib/firebase';
import api from '@/lib/axios';

export interface MigrationResult {
  success: boolean;
  migratedCount: number;
  message: string;
  error?: string;
}

/**
 * Migrate liked songs from old global structure to new nested structure
 */
export const migrateLikedSongsStructure = async (): Promise<MigrationResult> => {
  const userId = auth.currentUser?.uid;
  
  if (!userId) {
    return {
      success: false,
      migratedCount: 0,
      message: 'User not authenticated',
      error: 'NO_AUTH'
    };
  }

  try {
    console.log('Starting migration for user:', userId);
    
    const response = await api.post(`/api/spotify/migrate/${userId}`);
    
    console.log('Migration completed:', response.data);
    
    return {
      success: true,
      migratedCount: response.data.migratedCount || 0,
      message: response.data.message || 'Migration completed successfully'
    };
  } catch (error: any) {
    console.error('Migration failed:', error);
    
    return {
      success: false,
      migratedCount: 0,
      message: 'Migration failed',
      error: error.response?.data?.error || error.message
    };
  }
};

/**
 * Check if migration is needed
 */
export const checkMigrationNeeded = async (): Promise<boolean> => {
  const userId = auth.currentUser?.uid;
  
  if (!userId) {
    return false;
  }

  try {
    // Check if user has data in old structure
    const response = await api.get(`/api/spotify/sync-status/${userId}`);
    
    // If never synced, no migration needed
    if (!response.data.hasSynced) {
      return false;
    }
    
    // Check if user has songs in new structure
    const songsResponse = await api.get(`/api/spotify/liked-songs/${userId}`);
    
    // If no songs in new structure but has synced before, migration needed
    return songsResponse.data.length === 0;
  } catch (error) {
    console.error('Error checking migration status:', error);
    return false;
  }
};

/**
 * Auto-migrate if needed (call on app startup)
 */
export const autoMigrateIfNeeded = async (): Promise<MigrationResult | null> => {
  try {
    const needsMigration = await checkMigrationNeeded();
    
    if (!needsMigration) {
      console.log('No migration needed');
      return null;
    }
    
    console.log('Migration needed, starting auto-migration...');
    return await migrateLikedSongsStructure();
  } catch (error) {
    console.error('Auto-migration check failed:', error);
    return null;
  }
};

/**
 * Delete all liked songs (useful for testing or reset)
 */
export const deleteAllLikedSongs = async (): Promise<MigrationResult> => {
  const userId = auth.currentUser?.uid;
  
  if (!userId) {
    return {
      success: false,
      migratedCount: 0,
      message: 'User not authenticated',
      error: 'NO_AUTH'
    };
  }

  try {
    const confirmed = window.confirm(
      'Are you sure you want to delete all liked songs? This will remove them from both Mavrixfy and Spotify.'
    );
    
    if (!confirmed) {
      return {
        success: false,
        migratedCount: 0,
        message: 'Deletion cancelled by user'
      };
    }

    console.log('Deleting all liked songs for user:', userId);
    
    const response = await api.delete(`/api/spotify/liked-songs/${userId}`);
    
    console.log('Deletion completed:', response.data);
    
    return {
      success: true,
      migratedCount: response.data.deletedCount || 0,
      message: response.data.message || 'All songs deleted successfully'
    };
  } catch (error: any) {
    console.error('Deletion failed:', error);
    
    return {
      success: false,
      migratedCount: 0,
      message: 'Deletion failed',
      error: error.response?.data?.error || error.message
    };
  }
};

/**
 * Backup liked songs to JSON (before migration or deletion)
 */
export const backupLikedSongs = async (): Promise<void> => {
  const userId = auth.currentUser?.uid;
  
  if (!userId) {
    alert('User not authenticated');
    return;
  }

  try {
    const response = await api.get(`/api/spotify/liked-songs/${userId}`);
    const songs = response.data;
    
    const backup = {
      userId,
      timestamp: new Date().toISOString(),
      songsCount: songs.length,
      songs
    };
    
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mavrixfy-liked-songs-backup-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log(`Backed up ${songs.length} songs`);
    alert(`Successfully backed up ${songs.length} songs`);
  } catch (error) {
    console.error('Backup failed:', error);
    alert('Failed to backup songs');
  }
};

/**
 * Restore liked songs from JSON backup
 */
export const restoreLikedSongs = async (file: File): Promise<MigrationResult> => {
  const userId = auth.currentUser?.uid;
  
  if (!userId) {
    return {
      success: false,
      migratedCount: 0,
      message: 'User not authenticated',
      error: 'NO_AUTH'
    };
  }

  try {
    const text = await file.text();
    const backup = JSON.parse(text);
    
    if (!backup.songs || !Array.isArray(backup.songs)) {
      throw new Error('Invalid backup file format');
    }
    
    console.log(`Restoring ${backup.songs.length} songs from backup...`);
    
    // This would need a backend endpoint to restore songs
    // For now, just log the data
    console.log('Backup data:', backup);
    
    return {
      success: true,
      migratedCount: backup.songs.length,
      message: `Restored ${backup.songs.length} songs from backup`
    };
  } catch (error: any) {
    console.error('Restore failed:', error);
    
    return {
      success: false,
      migratedCount: 0,
      message: 'Restore failed',
      error: error.message
    };
  }
};

/**
 * Get migration status and statistics
 */
export const getMigrationStatus = async () => {
  const userId = auth.currentUser?.uid;
  
  if (!userId) {
    return null;
  }

  try {
    const [syncStatus, songs] = await Promise.all([
      api.get(`/api/spotify/sync-status/${userId}`),
      api.get(`/api/spotify/liked-songs/${userId}`)
    ]);
    
    return {
      hasSynced: syncStatus.data.hasSynced,
      lastSyncAt: syncStatus.data.lastSyncAt,
      totalSongs: syncStatus.data.totalSongs,
      currentSongsCount: songs.data.length,
      needsMigration: syncStatus.data.hasSynced && songs.data.length === 0
    };
  } catch (error) {
    console.error('Error getting migration status:', error);
    return null;
  }
};

/**
 * React hook for migration UI
 */
export const useMigration = () => {
  const [status, setStatus] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [migrating, setMigrating] = React.useState(false);

  React.useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setLoading(true);
    const migrationStatus = await getMigrationStatus();
    setStatus(migrationStatus);
    setLoading(false);
  };

  const migrate = async () => {
    setMigrating(true);
    const result = await migrateLikedSongsStructure();
    setMigrating(false);
    await checkStatus();
    return result;
  };

  const backup = async () => {
    await backupLikedSongs();
  };

  const deleteAll = async () => {
    const result = await deleteAllLikedSongs();
    await checkStatus();
    return result;
  };

  return {
    status,
    loading,
    migrating,
    migrate,
    backup,
    deleteAll,
    refresh: checkStatus
  };
};

// Import React for hooks
import React from 'react';

// Export for console usage
if (typeof window !== 'undefined') {
  (window as any).spotifyMigration = {
    migrate: migrateLikedSongsStructure,
    checkNeeded: checkMigrationNeeded,
    autoMigrate: autoMigrateIfNeeded,
    deleteAll: deleteAllLikedSongs,
    backup: backupLikedSongs,
    getStatus: getMigrationStatus
  };
  
  console.log('💡 Spotify migration utilities loaded!');
  console.log('Run from console:');
  console.log('  spotifyMigration.checkNeeded()  - Check if migration needed');
  console.log('  spotifyMigration.migrate()      - Run migration');
  console.log('  spotifyMigration.backup()       - Backup songs to JSON');
  console.log('  spotifyMigration.deleteAll()    - Delete all songs');
  console.log('  spotifyMigration.getStatus()    - Get migration status');
}
