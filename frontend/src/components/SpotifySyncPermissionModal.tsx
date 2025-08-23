import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Music, Clock, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpotifyTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  imageUrl: string;
  duration: number;
  addedAt: string;
}

interface SpotifySyncPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  tracks: SpotifyTrack[];
  onSync: (selectedTrackIds: string[]) => void;
  isLoading?: boolean;
}

const SpotifySyncPermissionModal: React.FC<SpotifySyncPermissionModalProps> = ({
  isOpen,
  onClose,
  tracks,
  onSync,
  isLoading = false
}) => {
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(true);

  // Initialize with all tracks selected by default
  useEffect(() => {
    if (tracks.length > 0) {
      setSelectedTracks(new Set(tracks.map(track => track.id)));
      setSelectAll(true);
    }
  }, [tracks]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTracks(new Set(tracks.map(track => track.id)));
      setSelectAll(true);
    } else {
      setSelectedTracks(new Set());
      setSelectAll(false);
    }
  };

  const handleTrackToggle = (trackId: string, checked: boolean) => {
    const newSelected = new Set(selectedTracks);
    if (checked) {
      newSelected.add(trackId);
    } else {
      newSelected.delete(trackId);
    }
    setSelectedTracks(newSelected);
    setSelectAll(newSelected.size === tracks.length);
  };

  const handleSync = () => {
    onSync(Array.from(selectedTracks));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-[600px] md:max-w-[800px] lg:max-w-[900px] h-[90vh] max-h-[90vh] p-0 flex flex-col overflow-hidden bg-background border">
        {/* Header - Fixed */}
        <DialogHeader className="px-4 pt-4 pb-2 flex-shrink-0 bg-background border-b">
          <DialogTitle className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2">
              <Music className="h-5 w-5 text-green-500" />
              <span className="text-base sm:text-lg font-semibold text-foreground">Sync New Spotify Songs</span>
            </span>
            <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 bg-muted border">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                {tracks.length} new
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">{selectedTracks.size} selected</span>
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Content - Scrollable */}
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Summary Section - Compact */}
          <div className="px-4 pt-2 pb-2 flex-shrink-0">
            <div className="flex items-center justify-between gap-2 p-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground">Found {tracks.length} new songs from Spotify</p>
                <p className="text-xs text-muted-foreground mt-0.5">Select which new songs to add to Mavrixfy</p>
              </div>
              <div className="flex items-center space-x-2 flex-shrink-0">
                <Checkbox
                  id="select-all"
                  checked={selectAll}
                  onCheckedChange={handleSelectAll}
                  className="h-4 w-4 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                />
                <label htmlFor="select-all" className="text-xs font-medium text-foreground">
                  Select All
                </label>
              </div>
            </div>
          </div>

          {/* Tracks List - Scrollable */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4">
            <div className="space-y-0.5 py-1">
              {tracks
                .sort((a, b) => {
                  const dateA = new Date(a.addedAt).getTime();
                  const dateB = new Date(b.addedAt).getTime();
                  return dateB - dateA; // Most recent first
                })
                .map((track) => (
                <div
                  key={track.id}
                  className={cn(
                    "group flex items-center gap-2 p-2 rounded-md transition-all duration-200",
                    selectedTracks.has(track.id)
                      ? "bg-green-50/30 border-l-2 border-l-green-500"
                      : "border-l-2 border-l-transparent hover:bg-muted/20"
                  )}
                >
                  {/* Checkbox - Smaller and better positioned */}
                  <div className="flex-shrink-0 flex items-center justify-center">
                    <Checkbox
                      checked={selectedTracks.has(track.id)}
                      onCheckedChange={(checked) => handleTrackToggle(track.id, checked as boolean)}
                      className="h-3.5 w-3.5 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                    />
                  </div>
                  
                  {/* Album Cover with better loading and fallback */}
                  <div className="flex-shrink-0 relative">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-md bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 overflow-hidden">
                      <img
                        src={track.imageUrl}
                        alt={`${track.album} cover`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.currentTarget as HTMLImageElement;
                          target.style.display = 'none';
                          // Show fallback icon
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = `
                              <div class="w-full h-full flex items-center justify-center">
                                <svg class="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                </svg>
                              </div>
                            `;
                          }
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* Track Info - Better typography and spacing */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate leading-tight">{track.title}</p>
                    <p className="text-xs text-muted-foreground truncate leading-tight mt-0.5">{track.artist}</p>
                    <p className="text-[10px] text-muted-foreground/80 truncate leading-tight mt-0.5">{track.album}</p>
                  </div>
                  
                  {/* Duration and Added Date - Better styling */}
                  <div className="flex-shrink-0 flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] font-medium text-muted-foreground">{formatTime(track.duration)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] font-medium text-muted-foreground">{formatDate(track.addedAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer - Fixed */}
          <div className="px-4 pt-2 pb-4 flex-shrink-0 bg-background border-t">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="text-xs sm:text-sm text-muted-foreground">
                {selectedTracks.size} of {tracks.length} new songs selected
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={onClose}
                  className="text-xs sm:text-sm px-3 py-1 sm:px-4 sm:py-2"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSync}
                  disabled={isLoading || selectedTracks.size === 0}
                  className="bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm px-3 py-1 sm:px-4 sm:py-2"
                >
                  {isLoading ? 'Syncing...' : `Add ${selectedTracks.size} New Songs`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SpotifySyncPermissionModal;
