import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileText, X, CheckCircle, AlertCircle, Search, ArrowRight, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useMusicStore } from '@/stores/useMusicStore';
import { Song } from '@/types';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { addMultipleLikedSongs } from '@/services/likedSongsService';
import { requestManager } from '@/services/requestManager';
import { ContentLoading } from '@/components/ui/loading';

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
    <div className="w-full">
      {/* File upload area */}
      {!parsedSongs.length && !isUploading && (
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center">
            <FileText className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">Import Songs to Liked Songs</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Upload a TXT or CSV file containing song titles and artists to add them to your liked songs.
            </p>
            <Button
              onClick={handleUploadClick}
              className="flex items-center gap-2"
              size="sm"
            >
              <Upload className="h-4 w-4" />
              <span>Select File</span>
            </Button>
            <div className="mt-4 text-xs text-muted-foreground">
              <p className="mb-1">Supported formats:</p>
              <ul className="list-disc list-inside">
                <li>CSV: title,artist,duration,imageUrl,audioUrl</li>
                <li>TXT: Artist - Title</li>
                <li>TXT: Title by Artist</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* File upload progress */}
      {isUploading && (
        <ContentLoading text={`Reading file... ${fileName}`} height="border rounded-lg p-6" />
      )}

      {/* Parsed songs list */}
      {parsedSongs.length > 0 && !isProcessing && !isComplete && (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-medium">{parsedSongs.length} Songs Found</h3>
            <Button
              size="sm"
              variant="ghost"
              onClick={resetUpload}
              className="h-8 px-2 text-xs sm:text-sm"
            >
              <X className="h-3 w-3 mr-1 sm:h-4 sm:w-4" />
              <span>Reset</span>
            </Button>
          </div>
          
          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-[40vh] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-secondary sticky top-0">
                  <tr>
                    <th className="text-left p-2 text-xs sm:text-sm font-medium">#</th>
                    <th className="text-left p-2 text-xs sm:text-sm font-medium">Title</th>
                    <th className="text-left p-2 text-xs sm:text-sm font-medium hidden sm:table-cell">Artist</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {parsedSongs.map((song, index) => (
                    <tr key={`${song.title}-${song.artist}-${index}`} className="border-t border-gray-200 dark:border-gray-800">
                      <td className="p-2 text-xs sm:text-sm">{index + 1}</td>
                      <td className="p-2 text-xs sm:text-sm">
                        <div className="truncate max-w-[150px] sm:max-w-[200px]">{song.title}</div>
                      </td>
                      <td className="p-2 text-xs sm:text-sm hidden sm:table-cell">
                        <div className="truncate max-w-[100px] sm:max-w-[150px]">{song.artist}</div>
                      </td>
                      <td className="p-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => removeSong(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="flex justify-between gap-3 mt-4">
            <Button
              onClick={addSongsToLikedSongs}
              className="flex items-center gap-2"
              disabled={parsedSongs.length === 0}
            >
              <ArrowRight className="h-4 w-4" />
              <span>Add {parsedSongs.length} Songs</span>
            </Button>
          </div>
        </div>
      )}

      {/* Processing display */}
      {isProcessing && !isComplete && (
        <div className="border rounded-lg p-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Adding Songs...</h3>
              <Badge variant="outline">
                {addedSongsCount}/{parsedSongs.length}
              </Badge>
            </div>
            
            <Progress value={progress} className="h-2" />
            
            <div className="max-h-[30vh] overflow-y-auto border rounded-lg p-2">
              {parsedSongs.map((song, index) => (
                <div
                  key={`${song.title}-${song.artist}-${index}`}
                  className="flex items-center justify-between py-2 px-2 border-b last:border-0 text-xs sm:text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <div className="font-medium truncate max-w-[200px]">{song.title}</div>
                      <div className="text-muted-foreground truncate max-w-[150px] hidden sm:block">
                        {song.artist}
                      </div>
                    </div>
                  </div>
                  <div className="ml-2 flex-shrink-0">
                    {song.status === 'added' && <CheckCircle className="h-4 w-4 text-green-500" />}
                    {song.status === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                    {song.status === 'searching' && <Search className="h-4 w-4 animate-pulse" />}
                    {song.status === 'ready' && <div className="h-4 w-4" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Completion summary */}
      {isComplete && (
        <div className="border rounded-lg p-6 text-center">
          <div className="flex flex-col items-center justify-center">
            <div className="h-12 w-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <Check className="h-6 w-6 text-green-600 dark:text-green-300" />
            </div>
            <h3 className="text-lg font-medium mb-2">Import Complete</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Successfully added {addedSongsCount} songs to your liked songs.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={onClose}>
                View Liked Songs
              </Button>
              <Button variant="outline" onClick={resetUpload}>
                Import More Songs
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}