import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, FileText, X, CheckCircle, AlertCircle, Search, ArrowRight, Check, Music, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useMusicStore } from '@/stores/useMusicStore';
import { Song } from '@/types';
import { addMultipleLikedSongs } from '@/services/likedSongsService';
import { requestManager } from '@/services/requestManager';
import { ContentLoading } from '@/components/ui/loading';
import { cn } from '@/lib/utils';

interface LikedSongsFileUploaderProps {
  onClose: () => void;
}

interface ParsedSong {
  title: string;
  artist: string;
  duration?: string;
  imageUrl?: string;
  audioUrl?: string;
  status: 'ready' | 'added' | 'error' | 'searching';
  message?: string;
}

export function LikedSongsFileUploader({ onClose }: LikedSongsFileUploaderProps) {
  const [parsedSongs, setParsedSongs] = useState<ParsedSong[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [addedSongsCount, setAddedSongsCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { convertIndianSongToAppSong } = useMusicStore();

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Optimized file parsing using Web Worker (if available) or chunked processing
  const parseCSV = async (content: string): Promise<ParsedSong[]> => {
    return new Promise((resolve) => {
      // Use requestIdleCallback for non-blocking parsing
      const parseChunk = (lines: string[], startIndex: number, chunkSize: number = 100): ParsedSong[] => {
        const songs: ParsedSong[] = [];
        const endIndex = Math.min(startIndex + chunkSize, lines.length);
        
        for (let i = startIndex; i < endIndex; i++) {
          const line = lines[i];
          const columns = line.split(',').map(col => col.trim());
          
          // Skip header line if it looks like a header
          if (i === 0 && (columns[0].toLowerCase() === 'title' || columns[0].toLowerCase() === 'song')) {
            continue;
          }
          
          if (columns.length >= 2) {
            songs.push({
              title: columns[0] || 'Unknown Title',
              artist: columns[1] || 'Unknown Artist',
              duration: columns[2] || '0:00',
              imageUrl: columns[3] || '',
              audioUrl: columns[4] || '',
              status: 'ready'
            });
          }
        }
        
        return songs;
      };

      const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
      const allSongs: ParsedSong[] = [];
      let currentIndex = 0;
      
      const processNextChunk = () => {
        if (currentIndex >= lines.length) {
          resolve(allSongs);
          return;
        }
        
        const chunkSongs = parseChunk(lines, currentIndex);
        allSongs.push(...chunkSongs);
        currentIndex += 100;
        
        // Use setTimeout to yield control back to the browser
        setTimeout(processNextChunk, 0);
      };
      
      processNextChunk();
    });
  };

  const parseTXT = async (content: string): Promise<ParsedSong[]> => {
    return new Promise((resolve) => {
      const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
      const songs: ParsedSong[] = [];
      let currentIndex = 0;
      
      const processNextChunk = () => {
        const chunkSize = 100;
        const endIndex = Math.min(currentIndex + chunkSize, lines.length);
        
        for (let i = currentIndex; i < endIndex; i++) {
          const line = lines[i];
          let columns;
          
          if (line.includes(' - ')) {
            // Format: Artist - Title
            columns = line.split(' - ').map(part => part.trim());
            if (columns.length >= 2) {
              songs.push({
                title: columns[1],
                artist: columns[0],
                status: 'ready'
              });
            }
          } else if (line.includes(' by ')) {
            // Format: Title by Artist
            columns = line.split(' by ').map(part => part.trim());
            if (columns.length >= 2) {
              songs.push({
                title: columns[0],
                artist: columns[1],
                status: 'ready'
              });
            }
          } else if (line.includes('\t')) {
            // Tab-separated
            columns = line.split('\t').map(part => part.trim());
            if (columns.length >= 2) {
              songs.push({
                title: columns[0],
                artist: columns[1],
                status: 'ready'
              });
            }
          } else {
            // Just use as title with unknown artist
            songs.push({
              title: line,
              artist: 'Unknown Artist',
              status: 'ready'
            });
          }
        }
        
        currentIndex = endIndex;
        
        if (currentIndex >= lines.length) {
          resolve(songs);
        } else {
          // Use setTimeout to yield control back to the browser
          setTimeout(processNextChunk, 0);
        }
      };
      
      processNextChunk();
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    setFileName(file.name);
    
    try {
      const content = await file.text();
      let songs: ParsedSong[] = [];
      
      if (file.name.toLowerCase().endsWith('.csv')) {
        songs = await parseCSV(content);
      } else if (file.name.toLowerCase().endsWith('.txt')) {
        songs = await parseTXT(content);
      } else {
        toast.error('Unsupported file format. Please upload a CSV or TXT file.');
        setIsUploading(false);
        return;
      }
      
      if (songs.length === 0) {
        toast.error('No valid songs found in the file.');
        setIsUploading(false);
        return;
      }
      
      setParsedSongs(songs);
      toast.success(`Found ${songs.length} songs in the file. Ready to add to liked songs.`);
    } catch (error) {
      console.error('Error reading file:', error);
      toast.error('Failed to read the file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Optimized search for song details using the request manager
  const searchForSongDetails = async (title: string, artist: string): Promise<any> => {
    try {
      const searchQuery = `${title} ${artist}`.trim();
      
      // Use request manager for better caching and deduplication
      const response = await requestManager.request({
        url: '/api/jiosaavn/search/songs',
        method: 'GET',
        params: { query: searchQuery, limit: 1 }
      }, {
        cache: true,
        cacheTTL: 5 * 60 * 1000, // 5 minutes cache
        deduplicate: true,
        priority: 'normal'
      }) as any;
      
      if (response && response.data && response.data.results && response.data.results.length > 0) {
        return response.data.results[0];
      }
      return null;
    } catch (error) {
      console.error('Error searching for song:', error);
      return null;
    }
  };

  // Optimized batch processing of songs
  const addSongsToLikedSongs = async () => {
    if (parsedSongs.length === 0) return;
    
    setIsProcessing(true);
    setProgress(0);
    setAddedSongsCount(0);
    toast.dismiss();
    
    const progressToastId = 'progress-toast';
    toast.loading('Processing songs...', {
      id: progressToastId,
    });
    
    try {
      // Convert parsed songs to app songs with search
      const appSongs: Song[] = [];
      const updatedSongs = [...parsedSongs];
      
      // Process songs in batches for better performance
      const batchSize = 5; // Smaller batches to prevent overwhelming
      for (let i = 0; i < updatedSongs.length; i += batchSize) {
        const batch = updatedSongs.slice(i, i + batchSize);
        
        // Process batch in parallel
        const batchPromises = batch.map(async (song, batchIndex) => {
          const globalIndex = i + batchIndex;
          
          try {
            // Update status to searching
            updatedSongs[globalIndex] = { ...song, status: 'searching', message: 'Searching for song...' };
            setParsedSongs([...updatedSongs]);
            
            // Search for the song to get audio URL and other details
            const searchResult = await searchForSongDetails(song.title, song.artist);
            
            // Create app song with found details or fallback to defaults
            const appSong: Song = convertIndianSongToAppSong({
              id: `liked-${Date.now()}-${globalIndex}`,
              title: song.title,
              artist: song.artist,
              image: searchResult?.image || song.imageUrl || '/placeholder-song.jpg',
              url: searchResult?.url || song.audioUrl || '',
              duration: searchResult?.duration || song.duration || '0'
            });
            
            return { appSong, index: globalIndex, searchResult };
          } catch (error) {
            console.error('Error processing song:', error);
            return { appSong: null, index: globalIndex, error };
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        
        // Add valid songs to the app songs array
        batchResults.forEach(({ appSong, index, searchResult, error }) => {
          if (appSong && !error) {
            appSongs.push(appSong);
            updatedSongs[index] = {
              ...updatedSongs[index],
              status: 'ready',
              message: searchResult?.url ? 'Found with audio' : 'Found (no audio)',
              imageUrl: searchResult?.image || updatedSongs[index].imageUrl,
              audioUrl: searchResult?.url || updatedSongs[index].audioUrl
            };
          } else {
            updatedSongs[index] = {
              ...updatedSongs[index],
              status: 'error',
              message: 'Failed to process'
            };
          }
        });
        
        // Update progress
        const currentProgress = Math.round(((i + batch.length) / updatedSongs.length) * 50); // 50% for processing
        setProgress(currentProgress);
        toast.loading(`Processing ${i + batch.length}/${updatedSongs.length} songs...`, { 
          id: progressToastId 
        });
        
        setParsedSongs([...updatedSongs]);
        
        // Small delay between batches
        if (i + batchSize < updatedSongs.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      // Now batch add all songs to Firebase
      toast.loading('Adding songs to your library...', { id: progressToastId });
      
      const result = await addMultipleLikedSongs(appSongs);
      
      // Update final status
      let processedIndex = 0;
      updatedSongs.forEach((song, index) => {
        if (song.status === 'ready') {
          if (processedIndex < result.added) {
            updatedSongs[index] = { ...song, status: 'added', message: 'Added successfully' };
          } else if (processedIndex < result.added + result.skipped) {
            updatedSongs[index] = { ...song, status: 'error', message: 'Already exists' };
          } else {
            updatedSongs[index] = { ...song, status: 'error', message: 'Failed to add' };
          }
          processedIndex++;
        }
      });
      
      setParsedSongs([...updatedSongs]);
      setProgress(100);
      setAddedSongsCount(result.added);
      
      // Hide the progress toast
      toast.dismiss(progressToastId);
      
      // Show completion status
      if (result.added > 0) {
        if (result.errors > 0 || result.skipped > 0) {
          toast.success(`Added ${result.added} out of ${parsedSongs.length} songs to liked songs`);
        } else {
          toast.success(`Successfully added all ${result.added} songs to liked songs!`);
        }
      } else {
        toast.error(`Failed to add songs. Please try again.`);
      }
      
    } catch (error) {
      console.error('Error in batch processing:', error);
      toast.dismiss(progressToastId);
      toast.error('Failed to process songs. Please try again.');
    } finally {
      setIsProcessing(false);
      setIsComplete(true);
    }
  };

  const resetUpload = () => {
    setParsedSongs([]);
    setFileName(null);
    setProgress(0);
    setAddedSongsCount(0);
    setIsComplete(false);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeSong = (index: number) => {
    const newSongs = [...parsedSongs];
    newSongs.splice(index, 1);
    setParsedSongs(newSongs);
  };

  return (
    <div className="w-full space-y-4">
      {/* File upload area */}
      {!parsedSongs.length && !isUploading && (
        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Import Songs</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md">
              Upload a file containing song titles and artists to add them to your liked songs.
            </p>
            <Button
              onClick={handleUploadClick}
              className="spotify-sync-button"
              size="lg"
            >
              <Upload className="h-4 w-4 mr-2" />
              <span>Select File</span>
            </Button>
            <div className="mt-6 p-4 bg-muted/30 rounded-lg max-w-md">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Supported formats:</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">CSV</Badge>
                  <span>title,artist,duration,imageUrl,audioUrl</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">TXT</Badge>
                  <span>Artist - Title or Title by Artist</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* File upload progress */}
      {isUploading && (
        <div className="border rounded-lg p-8">
          <ContentLoading text={`Reading ${fileName}...`} />
        </div>
      )}

      {/* Parsed songs list */}
      {parsedSongs.length > 0 && !isProcessing && !isComplete && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-muted/30 rounded-lg">
            <div>
              <h3 className="text-lg font-semibold">{parsedSongs.length} Songs Found</h3>
              <p className="text-sm text-muted-foreground">Ready to add to your liked songs</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={resetUpload}
              className="self-start sm:self-center"
            >
              <X className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
          
          {/* Song list - Mobile optimized */}
          <div className="border rounded-lg overflow-hidden">
            <ScrollArea className="h-[50vh] max-h-[400px]">
              <div className="divide-y divide-border">
                {parsedSongs.map((song, index) => (
                  <div key={`${song.title}-${song.artist}-${index}`} className="flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors">
                    {/* Song number */}
                    <div className="w-6 text-xs text-muted-foreground text-center">
                      {index + 1}
                    </div>
                    
                    {/* Placeholder album art */}
                    <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                      <Music className="h-4 w-4 text-muted-foreground" />
                    </div>
                    
                    {/* Song info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-foreground truncate">
                        {song.title}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {song.artist}
                      </div>
                      {song.duration && (
                        <div className="text-xs text-muted-foreground/70 sm:hidden">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {song.duration}
                        </div>
                      )}
                    </div>
                    
                    {/* Duration and remove button */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {song.duration && (
                        <div className="hidden sm:flex items-center text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 mr-1" />
                          {song.duration}
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => removeSong(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          
          {/* Add button */}
          <div className="flex justify-center">
            <Button
              onClick={addSongsToLikedSongs}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-8 py-3 h-12"
              disabled={parsedSongs.length === 0}
              size="lg"
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              <span>Add {parsedSongs.length} Songs</span>
            </Button>
          </div>
        </div>
      )}

      {/* Processing display */}
      {isProcessing && !isComplete && (
        <div className="border rounded-lg p-4 sm:p-6">
          <div className="space-y-4">
            {/* Progress header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <h3 className="text-lg font-semibold">Adding Songs...</h3>
              </div>
              <Badge variant="outline" className="self-start sm:self-center">
                {addedSongsCount}/{parsedSongs.length} added
              </Badge>
            </div>
            
            <Progress value={progress} className="h-2" />
            
            {/* Song processing list */}
            <ScrollArea className="h-[40vh] max-h-[300px] border rounded-lg">
              <div className="divide-y divide-border">
                {parsedSongs.map((song, index) => (
                  <div
                    key={`${song.title}-${song.artist}-${index}`}
                    className="flex items-center gap-3 p-3"
                  >
                    {/* Placeholder album art */}
                    <div className="w-8 h-8 rounded overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                      <Music className="h-3 w-3 text-muted-foreground" />
                    </div>
                    
                    {/* Song info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{song.title}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {song.artist}
                      </div>
                      {song.message && (
                        <div className="text-xs text-muted-foreground/70 truncate">
                          {song.message}
                        </div>
                      )}
                    </div>
                    
                    {/* Status icon */}
                    <div className="flex-shrink-0">
                      {song.status === 'added' && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {song.status === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                      {song.status === 'searching' && <Search className="h-4 w-4 animate-pulse text-blue-500" />}
                      {song.status === 'ready' && <div className="h-4 w-4" />}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}

      {/* Completion summary */}
      {isComplete && (
        <div className="border rounded-lg p-6 text-center">
          <div className="flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
              <Check className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Import Complete!</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Successfully added {addedSongsCount} songs to your liked songs.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
              <Button onClick={onClose} className="flex-1" size="lg">
                <Music className="h-4 w-4 mr-2" />
                View Liked Songs
              </Button>
              <Button variant="outline" onClick={resetUpload} className="flex-1" size="lg">
                <Upload className="h-4 w-4 mr-2" />
                Import More
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}