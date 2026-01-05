import React, { useState, useEffect } from 'react';
import { Music, RefreshCw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { getLoginUrl, isAuthenticated, logout } from '@/services/spotifyService';
import { 
  fetchAllSpotifySavedTracks, 
  syncSpotifyLikedSongsToMavrixfy,
  getSyncStatus,
  backgroundAutoSyncOnce 
} from '@/services/spotifySync';
import { auth } from '@/lib/firebase';
import { toast } from 'sonner';

interface SyncStatus {
  hasSynced: boolean;
  lastSyncAt: Date | null;
  syncStatus: string;
  totalSongs: number;
  error?: string;
}

export const SpotifySyncManager: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkConnectionStatus();
    
    // Listen for auth changes
    const handleAuthChange = () => {
      checkConnectionStatus();
    };
    
    window.addEventListener('spotify_auth_changed', handleAuthChange);
    return () => window.removeEventListener('spotify_auth_changed', handleAuthChange);
  }, []);

  const checkConnectionStatus = async () => {
    setLoading(true);
    try {
      const connected = isAuthenticated();
      setIsConnected(connected);
      
      if (connected && auth.currentUser) {
        // Fetch sync status from backend
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/spotify/sync-status/${auth.currentUser.uid}`
        );
        
        if (response.ok) {
          const status = await response.json();
          setSyncStatus(status);
        }
      }
    } catch (error) {
      console.error('Error checking connection status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    try {
      const loginUrl = getLoginUrl();
      window.location.href = loginUrl;
    } catch (error: any) {
      toast.error(error.message || 'Failed to connect to Spotify');
    }
  };

  const handleDisconnect = () => {
    logout();
    setIsConnected(false);
    setSyncStatus(null);
    toast.success('Disconnected from Spotify');
  };

  const handleSync = async () => {
    if (!auth.currentUser) {
      toast.error('Please log in to sync');
      return;
    }

    setIsSyncing(true);
    try {
      toast.loading('Fetching your liked songs from Spotify...');
      
      const tracks = await fetchAllSpotifySavedTracks();
      
      if (tracks.length === 0) {
        toast.dismiss();
        toast.info('No liked songs found on Spotify');
        setIsSyncing(false);
        return;
      }

      toast.dismiss();
      toast.loading(`Syncing ${tracks.length} songs to Mavrixfy...`);
      
      const result = await syncSpotifyLikedSongsToMavrixfy(tracks);
      
      toast.dismiss();
      
      if (result.syncedCount > 0) {
        toast.success(`Successfully synced ${result.syncedCount} new songs!`);
      } else {
        toast.info('All songs are already synced');
      }
      
      // Refresh sync status
      await checkConnectionStatus();
    } catch (error: any) {
      console.error('Sync error:', error);
      toast.dismiss();
      toast.error(error.message || 'Failed to sync songs');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleBackgroundSync = async () => {
    try {
      const result = await backgroundAutoSyncOnce();
      if (result) {
        if (result.syncedCount > 0) {
          toast.success(`Auto-synced ${result.syncedCount} new songs`);
        }
        await checkConnectionStatus();
      }
    } catch (error) {
      console.error('Background sync error:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="w-6 h-6 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
            <Music className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Spotify Integration</h3>
            <p className="text-sm text-zinc-400">
              {isConnected ? 'Connected' : 'Not connected'}
            </p>
          </div>
        </div>
        
        {isConnected && (
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
        )}
      </div>

      {syncStatus && isConnected && (
        <div className="bg-zinc-800 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Total Songs</span>
            <span className="text-white font-medium">{syncStatus.totalSongs}</span>
          </div>
          
          {syncStatus.lastSyncAt && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">Last Synced</span>
              <span className="text-white font-medium">
                {new Date(syncStatus.lastSyncAt).toLocaleString()}
              </span>
            </div>
          )}
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Status</span>
            <span className={`font-medium ${
              syncStatus.syncStatus === 'completed' ? 'text-green-500' :
              syncStatus.syncStatus === 'failed' ? 'text-red-500' :
              'text-yellow-500'
            }`}>
              {syncStatus.syncStatus}
            </span>
          </div>
          
          {syncStatus.error && (
            <div className="flex items-start gap-2 text-sm text-red-400 mt-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{syncStatus.error}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3">
        {!isConnected ? (
          <button
            onClick={handleConnect}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Music className="w-5 h-5" />
            Connect Spotify
          </button>
        ) : (
          <>
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  Sync Now
                </>
              )}
            </button>
            
            <button
              onClick={handleDisconnect}
              className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
            >
              Disconnect
            </button>
          </>
        )}
      </div>

      <div className="text-xs text-zinc-500 space-y-1">
        <p>• Connect your Spotify account to sync your liked songs</p>
        <p>• Songs are synced to your Mavrixfy library automatically</p>
        <p>• Access your music across all devices</p>
      </div>
    </div>
  );
};
