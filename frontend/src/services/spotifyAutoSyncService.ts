import { useMusicStore } from '@/stores/useMusicStore';
import { Song } from '@/types';
import { addMultipleLikedSongs, isSongAlreadyLiked } from '@/services/likedSongsService';
import { isAuthenticated as isSpotifyAuthenticated, getSavedTracks } from '@/services/spotifyService';
import { useAuthStore } from '@/stores/useAuthStore';
import { requestManager } from '@/services/requestManager';

interface SpotifyAutoSyncConfig {
  enabled: boolean;
  intervalMinutes: number;
  lastSyncTimestamp: number;
  maxSongsPerSync: number;
  retryCount: number;
  maxRetries: number;
}

// Background task manager for Spotify sync
class BackgroundTaskManager {
  private tasks: Array<() => Promise<void>> = [];
  private isProcessing = false;
  private processingDelay = 1000; // 1 second between tasks

  addTask(task: () => Promise<void>) {
    this.tasks.push(task);
    this.processTasks();
  }

  private async processTasks() {
    if (this.isProcessing || this.tasks.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.tasks.length > 0) {
      const task = this.tasks.shift();
      if (task) {
        try {
          await task();
        } catch (error) {
          // Background task error - silently continue
        }
        
        // Delay between tasks to prevent overwhelming the system
        if (this.tasks.length > 0) {
          await new Promise(resolve => setTimeout(resolve, this.processingDelay));
        }
      }
    }
    
    this.isProcessing = false;
  }

  isActive(): boolean {
    return this.isProcessing || this.tasks.length > 0;
  }
}

const backgroundTaskManager = new BackgroundTaskManager();

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
    intervalMinutes: 30, // Check every 30 minutes
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
      // Error loading auto-sync config - use defaults
    }
  }

  // Save config to localStorage
  private saveConfig() {
    try {
      localStorage.setItem('spotify-auto-sync-config', JSON.stringify(this.config));
    } catch (error) {
      // Error saving auto-sync config - continue without saving
    }
  }

  // Start auto-sync
  startAutoSync(intervalMinutes: number = 30) {
    if (!isSpotifyAuthenticated()) {
      this.notifyListeners({ type: 'error', message: 'Spotify not connected' });
      return false;
    }

    if (!useAuthStore.getState().isAuthenticated) {
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

    // Perform initial sync if it's been a while
    const timeSinceLastSync = Date.now() - this.config.lastSyncTimestamp;
    const shouldSyncNow = timeSinceLastSync > (intervalMinutes * 60 * 1000);
    
    if (shouldSyncNow) {
      // Delay initial sync by 5 seconds to avoid overwhelming on startup
      setTimeout(() => {
        this.performAutoSync();
      }, 5000);
    }

    this.notifyListeners({ 
      type: 'started', 
      message: `Auto-sync enabled (every ${intervalMinutes} minutes)` 
    });

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
  }

  // Perform the actual sync with optimized batching
  private async performAutoSync() {
    if (this.isCurrentlySyncing) {
      return;
    }

    if (!isSpotifyAuthenticated() || !useAuthStore.getState().isAuthenticated) {
      this.stopAutoSync();
      return;
    }

    // Use background task manager to prevent blocking
    backgroundTaskManager.addTask(async () => {
      this.isCurrentlySyncing = true;
      this.notifyListeners({ type: 'syncing', message: 'Checking for new songs...' });

      try {
        // Get recent Spotify liked songs (last 7 days to be safe)
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 7);
        
        const recentTracks = await this.getRecentSpotifyTracks(cutoffDate);
        
        if (recentTracks.length === 0) {
          this.config.lastSyncTimestamp = Date.now();
          this.saveConfig();
          this.notifyListeners({ type: 'completed', message: 'No new songs found' });
          return;
        }

        // Batch check for existing songs to reduce Firebase calls
        const newSongs = await this.filterNewSongs(recentTracks);

        if (newSongs.length === 0) {
          this.config.lastSyncTimestamp = Date.now();
          this.saveConfig();
          this.notifyListeners({ type: 'completed', message: 'All songs already in library' });
          return;
        }

        // Limit the number of songs to sync at once
        const songsToSync = newSongs.slice(0, this.config.maxSongsPerSync);
        
        this.notifyListeners({ 
          type: 'syncing', 
          message: `Adding ${songsToSync.length} new songs...` 
        });

        // Convert to app songs and batch add
        const appSongs = await this.convertTracksToAppSongs(songsToSync);
        const result = await addMultipleLikedSongs(appSongs, 'spotify');

        // Update last sync timestamp and reset retry count on success
        this.config.lastSyncTimestamp = Date.now();
        this.config.retryCount = 0;
        this.saveConfig();

        if (result.added > 0) {
          this.notifyListeners({ 
            type: 'completed', 
            message: `Added ${result.added} new songs automatically` 
          });
          
          // Dispatch event to update UI
          document.dispatchEvent(new CustomEvent('likedSongsUpdated'));
        } else {
          this.notifyListeners({ type: 'completed', message: 'No new songs were added' });
        }

      } catch (error) {
        // Increment retry count
        this.config.retryCount++;
        this.saveConfig();
        
        // If we've exceeded max retries, disable auto-sync
        if (this.config.retryCount >= this.config.maxRetries) {
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
    });
  }

  // Optimized batch filtering of new songs
  private async filterNewSongs(tracks: any[]): Promise<any[]> {
    const newSongs: any[] = [];
    
    // Process in batches to avoid overwhelming Firebase
    const batchSize = 10;
    for (let i = 0; i < tracks.length; i += batchSize) {
      const batch = tracks.slice(i, i + batchSize);
      
      // Check each song in the batch
      const batchPromises = batch.map(async (track) => {
        const title = track.name;
        const artist = track.artists.map((a: any) => a.name).join(', ');
        const alreadyExists = await isSongAlreadyLiked(title, artist);
        
        return { track, alreadyExists };
      });
      
      const batchResults = await Promise.all(batchPromises);
      
      // Add new songs to the result
      batchResults.forEach(({ track, alreadyExists }) => {
        if (!alreadyExists) {
          newSongs.push(track);
        }
      });
      
      // Small delay between batches
      if (i + batchSize < tracks.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return newSongs;
  }

  // Convert Spotify tracks to app songs with optimized search
  private async convertTracksToAppSongs(tracks: any[]): Promise<Song[]> {
    const { convertIndianSongToAppSong } = useMusicStore.getState();
    const appSongs: Song[] = [];
    
    for (const track of tracks) {
      try {
        const title = track.name;
        const artist = track.artists.map((a: any) => a.name).join(', ');
        
        // Search for high-quality audio with caching
        const searchResult = await this.searchForSongDetails(title, artist);
        
        // Create app song
        const appSong: Song = convertIndianSongToAppSong({
          id: `spotify-auto-${track.id}`,
          title: title,
          artist: artist,
          image: searchResult?.image || track.album.images[0]?.url || '/placeholder-song.jpg',
          url: searchResult?.url || track.preview_url || '',
          duration: searchResult?.duration || Math.floor(track.duration_ms / 1000).toString(),
          likedAt: track.added_at // Use original Spotify liked date
        });
        
        appSongs.push(appSong);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        // Error converting track - skip this track
      }
    }
    
    return appSongs;
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
      // Error fetching recent Spotify tracks
    }

    return tracks;
  }

  // Search for song details with caching
  private async searchForSongDetails(title: string, artist: string): Promise<any> {
    try {
      const searchQuery = `${title} ${artist}`.trim();
      
      // Use request manager for caching and deduplication
      const response = await requestManager.request({
        url: '/api/jiosaavn/search/songs',
        method: 'GET',
        params: { query: searchQuery, limit: 1 }
      }, {
        cache: true,
        cacheTTL: 10 * 60 * 1000, // 10 minutes cache for search results
        deduplicate: true,
        priority: 'low' // Lower priority for background sync
      }) as any;
      
      if (response && response.data && response.data.results && response.data.results.length > 0) {
        return response.data.results[0];
      }
      return null;
    } catch (error) {
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
        // Error in auto-sync listener
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