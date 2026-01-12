import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Music, Clock, CheckCircle, AlertCircle, Loader2, Zap, Settings } from 'lucide-react';
import { spotifyAutoSyncService, AutoSyncStatus } from '@/services/spotifyAutoSyncService';
import { isAuthenticated as isSpotifyAuthenticated } from '@/services/spotifyService';
import { toast } from 'sonner';
import { Spinner, InlineLoading } from '@/components/ui/loading';

interface SpotifyAutoSyncProps {
  className?: string;
}

export function SpotifyAutoSync({ className }: SpotifyAutoSyncProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState(30);
  const [status, setStatus] = useState<AutoSyncStatus | null>(null);
  const [timeUntilNext, setTimeUntilNext] = useState<number | null>(null);
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);

  useEffect(() => {
    // Check initial state
    setIsEnabled(spotifyAutoSyncService.isEnabled());
    setIntervalMinutes(spotifyAutoSyncService.getConfig().intervalMinutes);
    setIsSpotifyConnected(isSpotifyAuthenticated());

    // Add status listener
    const handleStatusUpdate = (newStatus: AutoSyncStatus) => {
      setStatus(newStatus);
      
      // Show toast notifications for important events
      if (newStatus.type === 'completed' && newStatus.message.includes('Added')) {
        toast.success(newStatus.message, {
          duration: 4000,
        });
      } else if (newStatus.type === 'error') {
        toast.error(newStatus.message);
      }
    };

    spotifyAutoSyncService.addListener(handleStatusUpdate);

    // Update time until next sync every minute
    const timeInterval = setInterval(() => {
      const timeLeft = spotifyAutoSyncService.getTimeUntilNextSync();
      setTimeUntilNext(timeLeft);
    }, 60000);

    // Check Spotify auth changes
    const handleAuthChange = () => {
      setIsSpotifyConnected(isSpotifyAuthenticated());
      if (!isSpotifyAuthenticated()) {
        setIsEnabled(false);
      }
    };

    window.addEventListener('spotify_auth_changed', handleAuthChange);

    return () => {
      spotifyAutoSyncService.removeListener(handleStatusUpdate);
      clearInterval(timeInterval);
      window.removeEventListener('spotify_auth_changed', handleAuthChange);
    };
  }, []);

  const handleToggleAutoSync = (enabled: boolean) => {
    if (enabled) {
      const success = spotifyAutoSyncService.startAutoSync(intervalMinutes);
      setIsEnabled(success);
      if (success) {
        toast.success(`Auto-sync enabled (every ${intervalMinutes} minutes)`, {
          icon: '⚡',
        });
      }
    } else {
      spotifyAutoSyncService.stopAutoSync();
      setIsEnabled(false);
      setStatus(null);
      toast.info('Auto-sync disabled');
    }
  };

  const handleIntervalChange = (newInterval: string) => {
    const minutes = parseInt(newInterval);
    setIntervalMinutes(minutes);
    
    // If auto-sync is enabled, restart with new interval
    if (isEnabled) {
      spotifyAutoSyncService.stopAutoSync();
      const success = spotifyAutoSyncService.startAutoSync(minutes);
      setIsEnabled(success);
    }
  };

  const handleManualSync = async () => {
    const success = await spotifyAutoSyncService.triggerManualSync();
    if (!success) {
      toast.error('Sync already in progress');
    }
  };

  const formatTimeUntilNext = (ms: number | null) => {
    if (!ms) return null;
    
    const minutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const getStatusIcon = () => {
    if (!status) return <Settings className="h-4 w-4" />;
    
    switch (status.type) {
      case 'syncing':
        return <Spinner size="xs" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'started':
        return <Zap className="h-4 w-4 text-blue-500" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  const getStatusColor = () => {
    if (!status) return 'secondary';
    
    switch (status.type) {
      case 'syncing':
        return 'default';
      case 'completed':
        return 'secondary';
      case 'error':
        return 'destructive';
      case 'started':
        return 'default';
      default:
        return 'secondary';
    }
  };

  if (!isSpotifyConnected) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Auto-Sync
          </CardTitle>
          <CardDescription>
            Automatically sync new Spotify liked songs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <Music className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Connect to Spotify to enable auto-sync
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5" />
          Auto-Sync
          {isEnabled && (
            <Badge variant="secondary" className="ml-auto">
              <Zap className="h-3 w-3 mr-1" />
              Active
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Automatically sync new Spotify liked songs to your library
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-sm font-medium">Enable Auto-Sync</div>
            <div className="text-xs text-muted-foreground">
              Automatically check for new liked songs
            </div>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={handleToggleAutoSync}
          />
        </div>

        {/* Interval Selection */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Check Interval</div>
          <select
            value={intervalMinutes.toString()}
            onChange={(e) => handleIntervalChange(e.target.value)}
            disabled={!isSpotifyConnected}
            className="w-full px-3 py-2 text-sm border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="15">Every 15 minutes</option>
            <option value="30">Every 30 minutes</option>
            <option value="60">Every hour</option>
            <option value="120">Every 2 hours</option>
            <option value="360">Every 6 hours</option>
            <option value="720">Every 12 hours</option>
            <option value="1440">Daily</option>
          </select>
        </div>

        {/* Status Display */}
        {status && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Status</div>
            <Badge variant={getStatusColor()} className="w-full justify-start">
              {getStatusIcon()}
              <span className="ml-2">{status.message}</span>
            </Badge>
          </div>
        )}

        {/* Time Until Next Sync */}
        {isEnabled && timeUntilNext !== null && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Next Check</div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                {timeUntilNext > 0 
                  ? `In ${formatTimeUntilNext(timeUntilNext)}`
                  : 'Soon'
                }
              </span>
            </div>
          </div>
        )}

        {/* Manual Sync Button */}
        <div className="pt-2">
          <Button
            onClick={handleManualSync}
            variant="outline"
            size="sm"
            className="w-full"
            disabled={!isSpotifyConnected || status?.type === 'syncing'}
          >
            {status?.type === 'syncing' ? (
              <InlineLoading text="Syncing..." />
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Sync Now
              </>
            )}
          </Button>
        </div>

        {/* Info */}
        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <p className="mb-1">
            <strong>How it works:</strong>
          </p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Checks for songs liked on Spotify in the last 7 days</li>
            <li>Automatically searches for high-quality audio versions</li>
            <li>Adds new songs to your Mavrixfy liked songs</li>
            <li>Skips songs already in your library</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}