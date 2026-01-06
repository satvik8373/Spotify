import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Music, Check, Loader2, X } from 'lucide-react';
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

  const safeTracks: SpotifyTrack[] = useMemo(() => (Array.isArray(tracks) ? tracks : []), [tracks]);

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
      <DialogContent className="w-[92vw] max-w-md p-0 gap-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/50 rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-[#1DB954] rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
            </div>
            <span className="text-sm font-medium">
              {stage === 'selection' && 'Import Songs'}
              {stage === 'converting' && 'Importing...'}
              {stage === 'complete' && 'Done'}
            </span>
          </div>
          {stage !== 'converting' && (
            <button onClick={onClose} className="p-1 rounded-full hover:bg-muted/50 transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Selection Stage */}
        {stage === 'selection' && (
          <>
            {/* Select All Bar */}
            <div className="flex items-center justify-between px-4 py-2 bg-muted/30">
              <span className="text-xs text-muted-foreground">
                {selectedTracks.size} selected
              </span>
              <button
                onClick={() => handleSelectAll(!selectAll)}
                className="text-xs font-medium text-[#1DB954] hover:underline"
              >
                {selectAll ? 'Deselect all' : 'Select all'}
              </button>
            </div>

            {/* Track List */}
            <div className="max-h-[50vh] overflow-y-auto">
              {safeTracks
                .slice()
                .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
                .map((track) => (
                <div
                  key={track.id}
                  onClick={() => handleTrackToggle(track.id)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors",
                    "hover:bg-muted/30 active:bg-muted/50",
                    selectedTracks.has(track.id) && "bg-[#1DB954]/5"
                  )}
                >
                  {/* Checkbox */}
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0",
                    selectedTracks.has(track.id) 
                      ? "bg-[#1DB954] border-[#1DB954]" 
                      : "border-muted-foreground/30"
                  )}>
                    {selectedTracks.has(track.id) && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                  
                  {/* Album Art */}
                  <div className="w-10 h-10 rounded-md overflow-hidden bg-muted flex-shrink-0">
                    {track.imageUrl ? (
                      <img src={track.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  
                  {/* Track Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{track.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                  </div>
                  
                  {/* Duration */}
                  <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">
                    {formatTime(track.duration)}
                  </span>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-border/50">
              <Button
                onClick={handleStartSync}
                disabled={isLoading || selectedTracks.size === 0}
                className="w-full h-10 bg-[#1DB954] hover:bg-[#1ed760] text-white font-medium rounded-full"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  `Add ${selectedTracks.size} song${selectedTracks.size !== 1 ? 's' : ''}`
                )}
              </Button>
            </div>
          </>
        )}

        {/* Converting Stage */}
        {stage === 'converting' && conversionProgress && (
          <div className="px-6 py-10 flex flex-col items-center">
            {/* Progress Ring */}
            <div className="relative w-20 h-20 mb-4">
              <svg className="w-20 h-20 -rotate-90">
                <circle
                  cx="40" cy="40" r="36"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  className="text-muted/30"
                />
                <circle
                  cx="40" cy="40" r="36"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 36}`}
                  strokeDashoffset={`${2 * Math.PI * 36 * (1 - progressPercent / 100)}`}
                  className="text-[#1DB954] transition-all duration-300"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-semibold">{progressPercent}%</span>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mb-1">
              {conversionProgress.current} of {conversionProgress.total}
            </p>
            
            {conversionProgress.currentSong && (
              <p className="text-xs text-muted-foreground/70 truncate max-w-[200px] text-center">
                {conversionProgress.currentSong}
              </p>
            )}
          </div>
        )}

        {/* Complete Stage */}
        {stage === 'complete' && conversionResult && (
          <div className="px-6 py-8 flex flex-col items-center">
            <div className="w-14 h-14 bg-[#1DB954]/10 rounded-full flex items-center justify-center mb-4">
              <Check className="w-7 h-7 text-[#1DB954]" />
            </div>
            
            <p className="text-base font-medium mb-1">
              {conversionResult.converted + conversionResult.skipped} songs added
            </p>
            
            <p className="text-xs text-muted-foreground mb-6">
              {conversionResult.converted} converted • {conversionResult.skipped} saved • {conversionResult.failed} failed
            </p>
            
            <Button
              onClick={onClose}
              className="h-10 px-8 bg-[#1DB954] hover:bg-[#1ed760] text-white font-medium rounded-full"
            >
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SpotifyConvertSyncModal;
