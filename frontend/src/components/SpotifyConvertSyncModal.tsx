import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Music, Check, ListPlus, Search, X, CheckCircle2, AlertCircle, Clock, ArrowRight } from 'lucide-react';
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

  // Filter tracks based on search
  const filteredTracks = useMemo(() => {
    if (!filter.trim()) return safeTracks;
    const searchTerm = filter.toLowerCase();
    return safeTracks.filter(track => 
      track.title.toLowerCase().includes(searchTerm) ||
      track.artist.toLowerCase().includes(searchTerm) ||
      track.album.toLowerCase().includes(searchTerm)
    );
  }, [safeTracks, filter]);

  // Initialize with all tracks selected
  useEffect(() => {
    if (safeTracks.length > 0) {
      setSelectedTracks(new Set(safeTracks.map(track => track.id)));
      setSelectAll(true);
    }
  }, [safeTracks]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStage('selection');
      setConversionProgress(null);
      setConversionResult(null);
      setFilter('');
    }
  }, [isOpen]);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedTracks(new Set());
      setSelectAll(false);
    } else {
      setSelectedTracks(new Set(filteredTracks.map(track => track.id)));
      setSelectAll(true);
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
    setSelectAll(newSelected.size === filteredTracks.length);
  };

  const handleStartSync = async () => {
    const tracksToSync = safeTracks.filter(track => selectedTracks.has(track.id));
    if (tracksToSync.length === 0) return;

    setStage('converting');
    
    try {
      const result = await convertAndSaveSpotifyTracks(
        tracksToSync,
        (progress) => setConversionProgress(progress)
      );
      
      setConversionResult(result);
      setStage('complete');
      onSyncComplete(result);
    } catch (error) {
      console.error('Sync failed:', error);
      setStage('selection');
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderSelectionStage = () => (
    <div className="flex flex-col h-full">
      {/* Modern Header */}
      <div className="spotify-hero relative overflow-hidden">
        <div className="spotify-floating-notes">
          <div className="spotify-floating-note" style={{ left: '15%', animationDelay: '0s' }}>🎵</div>
          <div className="spotify-floating-note" style={{ left: '85%', animationDelay: '2s' }}>🎶</div>
        </div>
        
        <div className="relative z-10 flex items-center justify-between p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="spotify-logo-animation bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold">Import from Spotify</h3>
              <p className="text-white/80 text-sm">
                Select songs to add to your Liked Songs ({safeTracks.length} available)
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-10 w-10 rounded-full text-white hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Search and Controls */}
      <div className="spotify-modal-header">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search your music..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="spotify-search-input pl-12"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="spotify-badge success">
                <Music className="h-3 w-3 mr-1" />
                {filteredTracks.length} songs
              </div>
              <div className="spotify-badge">
                <Check className="h-3 w-3 mr-1" />
                {selectedTracks.size} selected
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              className="text-sm font-medium hover:text-green-500"
            >
              {selectAll ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
        </div>
      </div>

      {/* Enhanced Track List */}
      <ScrollArea className="spotify-scroll-area flex-1">
        <div className="space-y-1 p-4">
          {filteredTracks.map((track) => (
            <div
              key={track.id}
              onClick={() => handleTrackToggle(track.id)}
              className={`spotify-track-item spotify-touch-ripple group ${
                selectedTracks.has(track.id) ? 'selected' : ''
              }`}
            >
              {/* Enhanced Checkbox */}
              <div className={`spotify-checkbox ${
                selectedTracks.has(track.id) ? 'checked' : ''
              }`}>
                {selectedTracks.has(track.id) && (
                  <Check className="h-3 w-3 text-white" />
                )}
              </div>

              {/* Enhanced Album Art */}
              <div className="spotify-album-art">
                {track.imageUrl ? (
                  <img 
                    src={track.imageUrl} 
                    alt={track.album}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                    <Music className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Enhanced Track Info */}
              <div className="flex-1 min-w-0">
                <div className="spotify-track-title group-hover:text-green-500 transition-colors">
                  {track.title}
                </div>
                <div className="spotify-track-artist">
                  {track.artist}
                </div>
                <div className="spotify-track-album sm:hidden">
                  {track.album}
                </div>
              </div>

              {/* Duration */}
              <div className="hidden sm:flex items-center text-xs text-muted-foreground font-mono">
                <Clock className="h-3 w-3 mr-1" />
                {formatDuration(track.duration)}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Enhanced Footer */}
      <div className="spotify-modal-footer">
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 sm:flex-none h-12 rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={handleStartSync}
            disabled={selectedTracks.size === 0}
            className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold h-12 rounded-xl spotify-touch-ripple"
          >
            <ListPlus className="h-4 w-4 mr-2" />
            Sync {selectedTracks.size} Songs
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );

  const renderConvertingStage = () => {
    const progressPercent = conversionProgress 
      ? Math.round((conversionProgress.completed / conversionProgress.total) * 100)
      : 0;

    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[500px] relative overflow-hidden">
        <div className="spotify-floating-notes">
          <div className="spotify-floating-note" style={{ left: '10%', animationDelay: '0s' }}>🎵</div>
          <div className="spotify-floating-note" style={{ left: '30%', animationDelay: '1s' }}>🎶</div>
          <div className="spotify-floating-note" style={{ left: '70%', animationDelay: '2s' }}>🎵</div>
          <div className="spotify-floating-note" style={{ left: '90%', animationDelay: '3s' }}>🎶</div>
        </div>
        
        <div className="relative z-10">
          <div className="spotify-progress-ring mb-8">
            <svg className="w-full h-full" viewBox="0 0 80 80">
              <circle
                cx="40" cy="40" r="36"
                className="progress-bg"
                fill="none"
              />
              <circle
                cx="40" cy="40" r="36"
                className="progress-fill"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 36}`}
                strokeDashoffset={`${2 * Math.PI * 36 * (1 - progressPercent / 100)}`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-green-500">{progressPercent}%</span>
              <Music className="h-5 w-5 text-green-500 animate-pulse mt-1" />
            </div>
          </div>
          
          <h3 className="text-2xl font-bold mb-3 spotify-gradient-text">Converting Your Music</h3>
          <p className="text-muted-foreground mb-8 max-w-sm leading-relaxed">
            Finding and converting your Spotify songs to high-quality local versions...
          </p>

          {conversionProgress && (
            <div className="w-full max-w-sm space-y-6">
              <div className="glass-card p-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{conversionProgress.completed} of {conversionProgress.total}</span>
                </div>
                <div className="w-full bg-muted/30 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(conversionProgress.completed / conversionProgress.total) * 100}%` }}
                  />
                </div>
              </div>
              
              {conversionProgress.currentTrack && (
                <div className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">Currently processing</span>
                  </div>
                  <p className="text-sm text-foreground truncate">
                    {conversionProgress.currentTrack}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCompleteStage = () => (
    <div className="flex flex-col items-center justify-center p-8 text-center min-h-[500px] relative overflow-hidden">
      <div className="spotify-floating-notes">
        <div className="spotify-floating-note" style={{ left: '10%', animationDelay: '0s' }}>🎉</div>
        <div className="spotify-floating-note" style={{ left: '30%', animationDelay: '1s' }}>✨</div>
        <div className="spotify-floating-note" style={{ left: '70%', animationDelay: '2s' }}>🎵</div>
        <div className="spotify-floating-note" style={{ left: '90%', animationDelay: '3s' }}>🎶</div>
      </div>
      
      <div className="relative z-10">
        <div className="spotify-completion-icon mb-8">
          <CheckCircle2 className="h-12 w-12 text-green-500" />
        </div>
        
        <h3 className="text-3xl font-bold mb-3 spotify-gradient-text">Import Complete!</h3>
        
        {conversionResult && (
          <div className="space-y-6 max-w-md">
            <p className="text-muted-foreground text-lg leading-relaxed">
              Successfully imported your Spotify songs with high-quality audio
            </p>
            
            <div className="spotify-stats-grid">
              <div className="spotify-stat-card">
                <div className="spotify-stat-number text-green-500">
                  {conversionResult.successful}
                </div>
                <div className="spotify-stat-label">Successfully Added</div>
              </div>
              <div className="spotify-stat-card">
                <div className="spotify-stat-number text-yellow-500">
                  {conversionResult.failed}
                </div>
                <div className="spotify-stat-label">Skipped</div>
              </div>
            </div>
            
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-green-500">Import Complete</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Your songs are now available in high quality across all devices
              </p>
            </div>
            
            <Button 
              onClick={onClose} 
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold h-12 rounded-xl spotify-touch-ripple"
            >
              <Check className="h-5 w-5 mr-2" />
              Done
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="spotify-sync-modal p-0 flex flex-col overflow-hidden">
        {stage === 'selection' && renderSelectionStage()}
        {stage === 'converting' && renderConvertingStage()}
        {stage === 'complete' && renderCompleteStage()}
      </DialogContent>
    </Dialog>
  );
};

export default SpotifyConvertSyncModal;
