import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, Music, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useSpotifyToJiosaavnConverter } from '@/hooks/useSpotifyToJiosaavnConverter';
import { cn } from '@/lib/utils';

interface SpotifyToJiosaavnConverterProps {
  className?: string;
}

export default function SpotifyToJiosaavnConverter({ className }: SpotifyToJiosaavnConverterProps) {
  const [showModal, setShowModal] = useState(false);
  const [stats, setStats] = useState<{ spotifyCount: number; totalCount: number } | null>(null);
  const [isCheckingStats, setIsCheckingStats] = useState(false);

  const {
    isConverting,
    progress,
    result,
    error,
    startConversion,
    checkStats,
  } = useSpotifyToJiosaavnConverter();

  // Check stats when component mounts or modal opens
  useEffect(() => {
    if (showModal && !stats && !isCheckingStats) {
      setIsCheckingStats(true);
      checkStats().then(s => {
        setStats(s);
        setIsCheckingStats(false);
      });
    }
  }, [showModal, stats, isCheckingStats, checkStats]);

  const handleStartConversion = async () => {
    await startConversion();
    // Refresh stats after conversion
    const newStats = await checkStats();
    setStats(newStats);
  };

  const handleOpenModal = async () => {
    setShowModal(true);
    setIsCheckingStats(true);
    const s = await checkStats();
    setStats(s);
    setIsCheckingStats(false);
  };

  const progressPercent = progress.total > 0 
    ? Math.round((progress.current / progress.total) * 100) 
    : 0;

  return (
    <>
      {/* Trigger Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpenModal}
        className={cn(
          "h-8 text-xs px-3 rounded-md border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/50",
          className
        )}
      >
        <Music className="w-3.5 h-3.5 mr-1.5" />
        Convert to Playable
      </Button>

      {/* Conversion Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Music className="w-5 h-5 text-amber-500" />
              Convert Spotify Songs
            </DialogTitle>
            <DialogDescription>
              Convert your synced Spotify songs to playable JioSaavn versions with full audio.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Stats Section */}
            {isCheckingStats ? (
              <div className="flex items-center justify-center py-4">
                <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Checking songs...</span>
              </div>
            ) : stats ? (
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Songs to Convert</p>
                    <p className="text-2xl font-bold text-amber-500">{stats.spotifyCount}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">Total Songs</p>
                    <p className="text-2xl font-bold">{stats.totalCount}</p>
                  </div>
                </div>
                {stats.spotifyCount === 0 && (
                  <div className="mt-3 flex items-center gap-2 text-green-500">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">All songs are already playable!</span>
                  </div>
                )}
              </div>
            ) : null}

            {/* Progress Section */}
            {isConverting && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Converting...</span>
                  <span className="font-medium">{progress.current} / {progress.total}</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
                {progress.currentSong && (
                  <p className="text-xs text-muted-foreground truncate">
                    {progress.currentSong}
                  </p>
                )}
              </div>
            )}

            {/* Result Section */}
            {result && !isConverting && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-500">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Conversion Complete!</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-500/10 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-500">{result.converted}</p>
                    <p className="text-xs text-muted-foreground">Converted</p>
                  </div>
                  <div className="bg-red-500/10 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-red-500">{result.failed}</p>
                    <p className="text-xs text-muted-foreground">Failed</p>
                  </div>
                </div>

                {result.failedSongs.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium mb-2 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      Failed Songs
                    </p>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {result.failedSongs.slice(0, 10).map((song, i) => (
                        <div key={i} className="text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1">
                          {song.title} - {song.artist}
                        </div>
                      ))}
                      {result.failedSongs.length > 10 && (
                        <p className="text-xs text-muted-foreground">
                          ...and {result.failedSongs.length - 10} more
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Error Section */}
            {error && (
              <div className="flex items-center gap-2 text-red-500 bg-red-500/10 rounded-lg p-3">
                <XCircle className="w-5 h-5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Info Section */}
            <div className="bg-blue-500/10 rounded-lg p-3 text-xs text-blue-400">
              <p className="font-medium mb-1">How it works:</p>
              <ul className="list-disc list-inside space-y-0.5 text-blue-400/80">
                <li>Searches each Spotify song on JioSaavn</li>
                <li>Replaces with playable JioSaavn version</li>
                <li>Keeps your liked songs list intact</li>
                <li>Songs behave like manually liked songs</li>
              </ul>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowModal(false)}
              disabled={isConverting}
            >
              {result ? 'Close' : 'Cancel'}
            </Button>
            {stats && stats.spotifyCount > 0 && !result && (
              <Button
                onClick={handleStartConversion}
                disabled={isConverting || stats.spotifyCount === 0}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {isConverting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Converting...
                  </>
                ) : (
                  <>
                    <Music className="w-4 h-4 mr-2" />
                    Convert {stats.spotifyCount} Songs
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
