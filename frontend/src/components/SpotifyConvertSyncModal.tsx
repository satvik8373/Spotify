import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Music, Check, Loader2, ListPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  convertAndSaveSpotifyTracks, 
  ConversionProgress, 
  ConversionResult 
} from '@/services/spotifyToJiosaavnConverter';

interface SpotifyTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  imageUrl: string;
  duration: number;
  addedAt: string;
}

interface SpotifyConvertSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  tracks: SpotifyTrack[];
  onSyncComplete: (result: ConversionResult) => void;
  isLoading?: boolean;
}

type SyncStage = 'selection' | 'converting' | 'complete';

const SpotifyConvertSyncModal: React.FC<SpotifyConvertSyncModalProps> = ({
  isOpen,
  onClose,
  tracks,
  onSyncComplete,
  isLoading = false
}) => {
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(true);
  const [stage, setStage] = useState<SyncStage>('selection');
  const [conversionProgress, setConversionProgress] = useState<ConversionProgress | null>(null);
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);
  const [filter, setFilter] = useState('');

  const safeTracks: SpotifyTrack[] = useMemo(() => (Array.isArray(tracks) ? tracks : []), [tracks]);

  const filteredTracks = useMemo(() => {
    if (!filter.trim()) return safeTracks;
    const query = filter.toLowerCase();
    return safeTracks.filter(track => 
      track.title.toLowerCase().includes(query) || 
      track.artist.toLowerCase().includes(query)
    );
  }, [safeTracks, filter]);

  useEffect(() => {
    if (safeTracks.length > 0) {
      setSelectedTracks(new Set(safeTracks.map(track => track.id)));
      setSelectAll(true);
    } else {
      setSelectedTracks(new Set());
      setSelectAll(false);
    }
  }, [safeTracks.length]);

  useEffect(() => {
    if (isOpen) {
      setStage('selection');
      setConversionProgress(null);
      setConversionResult(null);
      setFilter('');
    }
  }, [isOpen]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTracks(new Set(safeTracks.map(track => track.id)));
      setSelectAll(true);
    } else {
      setSelectedTracks(new Set());
      setSelectAll(false);
    }
  };

  const handleTrackToggle = (trackId: string) => {
    const newSelected = new Set(selectedTracks);
    if (newSelected.has(trackId)) {
      newSelected.delete(trackId);
    } else {
      newSelected.add(trackId);
    }
    setSelectedTracks(newSelected);
    setSelectAll(newSelected.size === safeTracks.length);
  };

  const handleStartSync = async () => {
    if (selectedTracks.size === 0) return;
    setStage('converting');
    
    const selectedTracksList = safeTracks
      .filter(track => selectedTracks.has(track.id))
      .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());

    try {
      const result = await convertAndSaveSpotifyTracks(
        selectedTracksList,
        (progress) => setConversionProgress(progress)
      );
      setConversionResult(result);
      setStage('complete');
      onSyncComplete(result);
    } catch (error) {
      setConversionResult({
        total: selectedTracksList.length,
        converted: 0,
        failed: selectedTracksList.length,
        skipped: 0,
        errors: [{ song: 'All', error: 'Sync failed' }]
      });
      setStage('complete');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progressPercent = conversionProgress 
    ? Math.round((conversionProgress.current / conversionProgress.total) * 100)
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={stage === 'converting' ? undefined : onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#1DB954] rounded-full flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
            </div>
            {stage === 'selection' && 'Import from Spotify'}
            {stage === 'converting' && 'Importing Songs...'}
            {stage === 'complete' && 'Import Complete'}
          </DialogTitle>
          <DialogDescription>
            {stage === 'selection' && `Select songs to add to your Liked Songs (${safeTracks.length} available)`}
            {stage === 'converting' && 'Converting songs to playable format...'}
            {stage === 'complete' && 'Your songs have been imported successfully'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Selection Stage */}
          {stage === 'selection' && (
            <>
              {safeTracks.length === 0 ? (
                <div className="text-center py-8">
                  <ListPlus className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No new songs to import</p>
                  <Button variant="outline" className="mt-4" onClick={onClose}>
                    Close
                  </Button>
                </div>
              ) : (
                <>
                  {/* Filter Input */}
                  <Input
                    placeholder="Filter songs..."
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    className="mb-3"
                  />

                  {/* Select All Bar */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">
                      {selectedTracks.size} of {safeTracks.length} selected
                    </span>
                    <button
                      onClick={() => handleSelectAll(!selectAll)}
                      className="text-sm font-medium text-[#1DB954] hover:underline"
                    >
                      {selectAll ? 'Deselect all' : 'Select all'}
                    </button>
                  </div>

                  {/* Track List */}
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-1">
                      {filteredTracks
                        .slice()
                        .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
                        .map((track) => (
                        <div
                          key={track.id}
                          onClick={() => handleTrackToggle(track.id)}
                          className={cn(
                            "flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors",
                            "hover:bg-accent",
                            selectedTracks.has(track.id) && "bg-[#1DB954]/10"
                          )}
                        >
                          {/* Album Art */}
                          <div className="h-12 w-12 overflow-hidden rounded-md flex-shrink-0">
                            {track.imageUrl ? (
                              <img 
                                src={track.imageUrl} 
                                alt={track.title} 
                                className="h-full w-full object-cover" 
                                loading="lazy" 
                              />
                            ) : (
                              <div className="h-full w-full bg-muted flex items-center justify-center">
                                <Music className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          
                          {/* Track Info */}
                          <div className="flex-1 min-w-0 flex flex-col">
                            <span className="font-medium truncate">{track.title}</span>
                            <span className="text-xs text-muted-foreground truncate">
                              {track.artist} • {formatTime(track.duration)}
                            </span>
                          </div>

                          {/* Selection Indicator */}
                          {selectedTracks.has(track.id) && (
                            <div className="flex items-center justify-center h-8 w-8 bg-[#1DB954] rounded-full flex-shrink-0">
                              <Check className="h-4 w-4 text-white" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  {/* Action Button */}
                  <Button
                    onClick={handleStartSync}
                    disabled={isLoading || selectedTracks.size === 0}
                    className="w-full mt-4 bg-[#1DB954] hover:bg-[#1ed760] text-white"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    Add {selectedTracks.size} song{selectedTracks.size !== 1 ? 's' : ''} to Liked Songs
                  </Button>
                </>
              )}
            </>
          )}

          {/* Converting Stage */}
          {stage === 'converting' && conversionProgress && (
            <div className="flex flex-col items-center py-6">
              {/* Progress Ring */}
              <div className="relative w-24 h-24 mb-4">
                <svg className="w-24 h-24 -rotate-90">
                  <circle
                    cx="48" cy="48" r="42"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="6"
                    className="text-muted/30"
                  />
                  <circle
                    cx="48" cy="48" r="42"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 42}`}
                    strokeDashoffset={`${2 * Math.PI * 42 * (1 - progressPercent / 100)}`}
                    className="text-[#1DB954] transition-all duration-300"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-semibold">{progressPercent}%</span>
                </div>
              </div>
              
              <p className="text-sm font-medium mb-1">
                {conversionProgress.current} of {conversionProgress.total} songs
              </p>
              
              {conversionProgress.currentSong && (
                <p className="text-xs text-muted-foreground truncate max-w-[250px] text-center">
                  Converting: {conversionProgress.currentSong}
                </p>
              )}
            </div>
          )}

          {/* Complete Stage */}
          {stage === 'complete' && conversionResult && (
            <div className="flex flex-col items-center py-6">
              <div className="w-16 h-16 bg-[#1DB954]/10 rounded-full flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-[#1DB954]" />
              </div>
              
              <p className="text-lg font-medium mb-2">
                {conversionResult.converted + conversionResult.skipped} songs added
              </p>
              
              <div className="text-sm text-muted-foreground mb-6 text-center">
                <p>{conversionResult.converted} converted to playable format</p>
                {conversionResult.skipped > 0 && (
                  <p>{conversionResult.skipped} saved with original data</p>
                )}
                {conversionResult.failed > 0 && (
                  <p className="text-destructive">{conversionResult.failed} failed</p>
                )}
              </div>
              
              <Button
                onClick={onClose}
                className="bg-[#1DB954] hover:bg-[#1ed760] text-white"
              >
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SpotifyConvertSyncModal;
