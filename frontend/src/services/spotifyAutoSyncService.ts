import { useMusicStore } from '@/stores/useMusicStore';
import { Song } from '@/types';
import { addLikedSong, isSongAlreadyLiked } from '@/services/likedSongsService';
import { isAuthenticated as isSpotifyAuthenticated, getSavedTracks } from '@/services/spotifyService';
import { useAuthStore } from '@/stores/useAuthStore';

interface SpotifyAutoSyncConfig {
  enabled: boolean;
  intervalMinutes: number;
  lastSyncTimestamp: number;
  maxSongsPerSync: number;
  retryCount: number;
  maxRetries: number;
}

class SpotifyAutoSyncService {
  private config: SpotifyAutoSyncConfig = {
    enabled: false,
    intervalMinutes: 0.17, // 10 seconds (0.17 minutes) by default for ultra-fast mode
    lastSyncTimestamp: 0,
    maxSongsPerSync: 20, // Limit to prevent overwhelming
    retryCount: 0,
    maxRetries: 3
  };
  
  private syncInterval: NodeJS.Timeout | null = null;
  private isCurrentlySyncing = false;
  private listeners: Array<(status: AutoSyncStatus) => void> = [];

  constructor() {
    this.loadConfig();
    
    // Listen for auth changes
    window.addEventListener('spotify_auth_changed', () => {
      if (!isSpotifyAuthenticated()) {
        this.stopAutoSync();
      }
    });
  }

  // Load config from localStorage
  private loadConfig() {
    try {
      const saved = localStorage.getItem('spotify-auto-sync-config');
      if (saved) {
        this.config = { ...this.config, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('Error loading auto-sync config:', error);
    }
  }

  // Save config to localStorage
  private saveConfig() {
    try {
      localStorage.setItem('spotify-auto-sync-config', JSON.stringify(this.config));
    } catch (error) {
      console.error('Error saving auto-sync config:', error);
    }
  }

  // Start auto-sync
  startAutoSync(intervalMinutes: number = 0.17) {
    if (!isSpotifyAuthenticated()) {
      console.warn('Cannot start auto-sync: Spotify not authenticated');
      this.notifyListeners({ type: 'error', message: 'Spotify not connected' });
      return false;
    }

    if (!useAuthStore.getState().isAuthenticated) {
      console.warn('Cannot start auto-sync: User not authenticated');
      this.notifyListeners({ type: 'error', message: 'User not authenticated' });
      return false;
    }

    this.config.enabled = true;
    this.config.intervalMinutes = intervalMinutes;
    this.saveConfig();

    // Clear existing interval
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Set up new interval
    this.syncInterval = setInterval(() => {
      this.performAutoSync();
    }, intervalMinutes * 60 * 1000);

    // Perform initial sync immediately for ultra-fast mode
    if (intervalMinutes <= 1) {
      // For ultra-fast/instant modes, sync immediately
      setTimeout(() => {
        this.performAutoSync();
      }, 500); // 0.5 second delay to avoid overwhelming
    } else {
      // For longer intervals, check if it's been a while
      const timeSinceLastSync = Date.now() - this.config.lastSyncTimestamp;
      const shouldSyncNow = timeSinceLastSync > (intervalMinutes * 60 * 1000);
      
      if (shouldSyncNow) {
        setTimeout(() => {
          this.performAutoSync();
        }, 5000);
      }
    }

    let intervalText;
    if (intervalMinutes < 1) {
      const seconds = Math.round(intervalMinutes * 60);
      intervalText = `ultra-fast (${seconds} seconds)`;
    } else if (intervalMinutes === 1) {
      intervalText = 'instant sync';
    } else {
      intervalText = `every ${intervalMinutes} minutes`;
    }

    this.notifyListeners({ 
      type: 'started', 
      message: `Auto-sync enabled (${intervalText})` 
    });

    console.log(`✅ Spotify auto-sync started (${intervalText})`);
    return true;
  }

  // Stop auto-sync
  stopAutoSync() {
    this.config.enabled = false;
    this.saveConfig();

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    this.notifyListeners({ type: 'stopped', message: 'Auto-sync disabled' });
    console.log('🛑 Spotify auto-sync stopped');
  }

  // Perform the actual sync
  private async performAutoSync() {
    if (this.isCurrentlySyncing) {
      console.log('⏳ Auto-sync already in progress, skipping...');
      return;
    }

    if (!isSpotifyAuthenticated() || !useAuthStore.getState().isAuthenticated) {
      console.warn('⚠️ Auto-sync skipped: Authentication required');
      this.stopAutoSync();
      return;
    }

    this.isCurrentlySyncing = true;
    this.notifyListeners({ type: 'syncing', message: 'Checking for new songs...' });

    try {
      console.log('🔄 Starting auto-sync check...');
      
      // Get recent Spotify liked songs (last 1 hour for ultra-fast, 24 hours for instant, 7 days for others)
      const cutoffDate = new Date();
      if (this.config.intervalMinutes < 1) {
        // For ultra-fast modes (seconds), check last 1 hour
        cutoffDate.setHours(cutoffDate.getHours() - 1);
      } else if (this.config.intervalMinutes <= 5) {
        // For instant/frequent modes, check last 24 hours
        cutoffDate.setHours(cutoffDate.getHours() - 24);
      } else {
        // For longer intervals, check last 7 days
        cutoffDate.setDate(cutoffDate.getDate() - 7);
      }
      
      const recentTracks = await this.getRecentSpotifyTracks(cutoffDate);
      
      if (recentTracks.length === 0) {
        console.log('✅ No new songs found in auto-sync');
        this.config.lastSyncTimestamp = Date.now();
        this.saveConfig();
        this.notifyListeners({ type: 'completed', message: 'No new songs found' });
        return;
      }

      // Filter out songs that already exist
      const newSongs = [];
      for (const track of recentTracks) {
        const title = track.name;
        const artist = track.artists.map((a: any) => a.name).join(', ');
        const alreadyExists = await isSongAlreadyLiked(title, artist);
        
        if (!alreadyExists) {
          newSongs.push(track);
        }
      }

      if (newSongs.length === 0) {
        console.log('✅ All recent songs already in library');
        this.config.lastSyncTimestamp = Date.now();
        this.saveConfig();
        this.notifyListeners({ type: 'completed', message: 'All songs already in library' });
        return;
      }

      // Limit the number of songs to sync at once
      const songsToSync = newSongs.slice(0, this.config.maxSongsPerSync);
      
      console.log(`🎵 Found ${songsToSync.length} new songs to auto-sync`);
      this.notifyListeners({ 
        type: 'syncing', 
        message: `Adding ${songsToSync.length} new songs...` 
      });

      // Add songs to liked songs
      let addedCount = 0;
      const { convertIndianSongToAppSong } = useMusicStore.getState();

      for (const track of songsToSync) {
        try {
          const title = track.name;
          const artist = track.artists.map((a: any) => a.name).join(', ');
          
          // Search for high-quality audio
          const searchResult = await this.searchForSongDetails(title, artist);
          
          // Create app song
          const appSong: Song = convertIndianSongToAppSong({
            id: `spotify-auto-${track.id}`,
            title: title,
            artist: artist,
            image: searchResult?.image || track.album.images[0]?.url || '/placeholder-song.jpg',
            url: searchResult?.url || track.preview_url || '',
            duration: searchResult?.duration || Math.floor(track.duration_ms / 1000).toString()
          });
          
          // Add to liked songs
          const result = await addLikedSong(appSong, 'spotify', track.id);
          
          if (result.added) {
            addedCount++;
          }
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (error) {
          console.error('Error auto-syncing track:', track.name, error);
        }
      }

      // Update last sync timestamp and reset retry count on success
      this.config.lastSyncTimestamp = Date.now();
      this.config.retryCount = 0; // Reset retry count on successful sync
      this.saveConfig();

      if (addedCount > 0) {
        console.log(`✅ Auto-sync completed: Added ${addedCount} new songs`);
        this.notifyListeners({ 
          type: 'completed', 
          message: `Added ${addedCount} new songs automatically` 
        });
        
        // Dispatch event to update UI
        document.dispatchEvent(new CustomEvent('likedSongsUpdated'));
      } else {
        console.log('✅ Auto-sync completed: No songs were added');
        this.notifyListeners({ type: 'completed', message: 'No new songs were added' });
      }

    } catch (error) {
      console.error('❌ Auto-sync error:', error);
      
      // Increment retry count
      this.config.retryCount++;
      this.saveConfig();
      
      // If we've exceeded max retries, disable auto-sync
      if (this.config.retryCount >= this.config.maxRetries) {
        console.error(`❌ Auto-sync failed ${this.config.maxRetries} times, disabling...`);
        this.stopAutoSync();
        this.notifyListeners({ 
          type: 'error', 
          message: `Auto-sync disabled after ${this.config.maxRetries} failures` 
        });
      } else {
        this.notifyListeners({ 
          type: 'error', 
          message: `Auto-sync failed (${this.config.retryCount}/${this.config.maxRetries}). Will retry later.` 
        });
      }
    } finally {
      this.isCurrentlySyncing = false;
    }
  }

  // Get recent Spotify tracks
  private async getRecentSpotifyTracks(cutoffDate: Date) {
    const tracks = [];
    let offset = 0;
    const limit = 50;

    try {
      while (true) {
        const batch = await getSavedTracks(limit, offset);
        if (!batch || batch.length === 0) break;

        const recentTracks = batch.filter((item: any) => 
          new Date(item.added_at) > cutoffDate
        );

        tracks.push(...recentTracks.map((item: any) => ({
          id: item.track.id,
          name: item.track.name,
          artists: item.track.artists,
          album: item.track.album,
          duration_ms: item.track.duration_ms,
          preview_url: item.track.preview_url,
          added_at: item.added_at
        })));

        // If we got fewer recent tracks than the batch size, we've reached older songs
        if (recentTracks.length < batch.length) {
          break;
        }

        offset += batch.length;
        if (batch.length < limit) break;

        // Limit total tracks to prevent excessive API calls
        if (tracks.length >= 100) break;
      }
    } catch (error) {
      console.error('Error fetching recent Spotify tracks:', error);
    }

    return tracks;
  }

  // Search for song details
  private async searchForSongDetails(title: string, artist: string): Promise<any> {
    try {
      const searchQuery = `${title} ${artist}`.trim();
      await useMusicStore.getState().searchIndianSongs(searchQuery);
      
      const results = useMusicStore.getState().indianSearchResults;
      return results && results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error('Error searching for song:', error);
      return null;
    }
  }

  // Add listener for status updates
  addListener(callback: (status: AutoSyncStatus) => void) {
    this.listeners.push(callback);
  }

  // Remove listener
  removeListener(callback: (status: AutoSyncStatus) => void) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  // Notify all listeners
  private notifyListeners(status: AutoSyncStatus) {
    this.listeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('Error in auto-sync listener:', error);
      }
    });
  }

  // Get current config
  getConfig() {
    return { ...this.config };
  }

  // Check if auto-sync is enabled
  isEnabled() {
    return this.config.enabled && this.syncInterval !== null;
  }

  // Get time until next sync
  getTimeUntilNextSync() {
    if (!this.isEnabled()) return null;
    
    const timeSinceLastSync = Date.now() - this.config.lastSyncTimestamp;
    const intervalMs = this.config.intervalMinutes * 60 * 1000;
    const timeUntilNext = intervalMs - timeSinceLastSync;
    
    return Math.max(0, timeUntilNext);
  }

  // Manual sync trigger
  async triggerManualSync() {
    if (this.isCurrentlySyncing) {
      console.log('Sync already in progress');
      return false;
    }
    
    await this.performAutoSync();
    return true;
  }
}

export interface AutoSyncStatus {
  type: 'started' | 'stopped' | 'syncing' | 'completed' | 'error';
  message: string;
}

// Create singleton instance
export const spotifyAutoSyncService = new SpotifyAutoSyncService();