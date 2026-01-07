import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Progress } from './ui/progress';
import { fetchSpotifyLikedSongs, importSpotifySongsToLiked, ImportProgress, ImportResult } from '@/services/spotifyImportService';
import { isAuthenticated as isSpotifyAuthenticated } from '@/services/spotifyService';
import { Check, Music, Search, Download, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SpotifyImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SpotifyImportDialog({ isOpen, onClose }: SpotifyImportDialogProps) {
  const [spotifyTracks, setSpotifyTracks] = useState<any[]>([]);
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [filter, setFilter] = useState('');
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // Load Spotify tracks when dialog opens
  useEffect(() => {
    if (isOpen && isSpotifyAuthenticated()) {
      loadSpotifyTracks();
    }
  }, [isOpen]);

  const loadSpotifyTracks = async () => {
    setIsLoading(true);
    try {
      const tracks = await fetchSpotifyLikedSongs();
      setSpotifyTracks(tracks);
      console.log(`📥 Loaded ${tracks.length} Spotify liked songs`);
    } catch (error) {
      console.error('Error loading Spotify tracks:', error);
      toast.error('Failed to load Spotify liked songs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedTracks.size === filteredTracks.length) {
      setSelectedTracks(new Set());
    } else {
      setSelectedTracks(new Set(filteredTracks.map(track => track.id)));
    }
  };

  const handleTrackSelect = (trackId: string) => {
    const newSelected = new Set(selectedTracks);
    if (newSelected.has(trackId)) {
      newSelected.delete(trackId);
    } else {
      newSelected.add(trackId);
    }
    setSelectedTracks(newSelected);
  };

  const handleImport = async () => {
    if (selectedTracks.size === 0) {
      toast.error('Please select at least one song to import');
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const tracksToImport = spotifyTracks.filter(track => selectedTracks.has(track.id));
      
      const result = await importSpotifySongsToLiked(tracksToImport, (progress) => {
        setImportProgress(progress);
      });

      setImportResult(result);
      
      if (result.imported > 0) {
        toast.success(`Successfully imported ${result.imported} songs to your liked songs!`);
      }
      
      if (result.failed > 0) {
        toast.error(`${result.failed} songs failed to import`);
      }

    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import songs');
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  };

  const filteredTracks = spotifyTracks.filter(track =>
    `${track.title} ${track.artist}`.toLowerCase().includes(filter.toLowerCase())
  );

  if (!isSpotifyAuthenticated()) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Import from Spotify</DialogTitle>
            <DialogDescription>
              Please connect your Spotify account first to import your liked songs.
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-8">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Spotify not connected</p>
            <Button variant="outline" className="mt-4" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Import from Spotify</DialogTitle>
          <DialogDescription>
            Select songs from your Spotify liked songs to import to Mavrixfy
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-8">
            <Music className="mx-auto h-12 w-12 text-muted-foreground mb-2 animate-pulse" />
            <p className="text-muted-foreground">Loading your Spotify liked songs...</p>
          </div>
        ) : isImporting ? (
          <div className="py-6">
            <div className="text-center mb-4">
              <Download className="mx-auto h-12 w-12 text-primary mb-2" />
              <p className="font-medium">Importing Songs</p>
              <p className="text-sm text-muted-foreground">
                {importProgress?.message || 'Processing...'}
              </p>
            </div>
            
            {importProgress && (
              <div className="space-y-2">
                <Progress 
                  value={(importProgress.current / importProgress.total) * 100} 
                  className="w-full"
                />
                <p className="text-xs text-center text-muted-foreground">
                  {importProgress.current} of {importProgress.total} songs
                </p>
              </div>
            )}
          </div>
        ) : importResult ? (
          <div className="py-6">
            <div className="text-center mb-4">
              <Check className="mx-auto h-12 w-12 text-green-500 mb-2" />
              <p className="font-medium">Import Complete!</p>
              <p className="text-sm text-muted-foreground">
                {importResult.imported} songs imported, {importResult.failed} failed
              </p>
            </div>
            
            <div className="flex justify-center">
              <Button onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {selectedTracks.size === filteredTracks.length ? 'Deselect All' : 'Select All'}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {selectedTracks.size} of {filteredTracks.length} selected
                </span>
              </div>
              
              <Button
                onClick={handleImport}
                disabled={selectedTracks.size === 0}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Import Selected
              </Button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter songs..."
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="pl-10 mb-4"
              />
            </div>

            {spotifyTracks.length === 0 ? (
              <div className="text-center py-8">
                <Music className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No liked songs found on Spotify</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {filteredTracks.map(track => (
                    <div
                      key={track.id}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors cursor-pointer",
                        selectedTracks.has(track.id) && "bg-accent"
                      )}
                      onClick={() => handleTrackSelect(track.id)}
                    >
                      <div className="flex items-center justify-center h-8 w-8">
                        {selectedTracks.has(track.id) ? (
                          <div className="h-5 w-5 bg-primary rounded-sm flex items-center justify-center">
                            <Check className="h-3 w-3 text-primary-foreground" />
                          </div>
                        ) : (
                          <div className="h-5 w-5 border-2 border-muted-foreground rounded-sm" />
                        )}
                      </div>
                      
                      <div className="h-12 w-12 overflow-hidden rounded-md flex-shrink-0">
                        <img
                          src={track.imageUrl || '/placeholder-album.png'}
                          alt={track.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{track.title}</p>
                        <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}