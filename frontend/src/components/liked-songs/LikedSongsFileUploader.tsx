import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileText, X, CheckCircle, AlertCircle, Search, ArrowRight, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useMusicStore } from '@/stores/useMusicStore';
import { Song } from '@/types';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { addLikedSong } from '@/services/likedSongsService';

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
  
  const { convertIndianSongToAppSong, searchIndianSongs } = useMusicStore();

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const parseCSV = (content: string): ParsedSong[] => {
    const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
    const songs: ParsedSong[] = [];

    for (let i = 0; i < lines.length; i++) {
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

  const parseTXT = (content: string): ParsedSong[] => {
    const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
    const songs: ParsedSong[] = [];

    for (const line of lines) {
      // Try to split by common separators
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
    
    return songs;
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
        songs = parseCSV(content);
      } else if (file.name.toLowerCase().endsWith('.txt')) {
        songs = parseTXT(content);
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

  // Search for song details using the music API
  const searchForSongDetails = async (title: string, artist: string): Promise<any> => {
    try {
      const searchQuery = `${title} ${artist}`.trim();
      await searchIndianSongs(searchQuery);
      
      // Get search results from store
      const results = useMusicStore.getState().indianSearchResults;
      
      if (results && results.length > 0) {
        return results[0]; // Return the first result
      }
      return null;
    } catch (error) {
      console.error('Error searching for song:', error);
      return null;
    }
  };

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
    
    const updatedSongs = [...parsedSongs];
    let addedCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < updatedSongs.length; i++) {
      const song = updatedSongs[i];
      
      // Skip already processed songs
      if (song.status === 'added') {
        addedCount++;
        continue;
      }
      
      if (song.status === 'error') {
        errorCount++;
        continue;
      }
      
      try {
        // Update status to searching
        updatedSongs[i] = { ...song, status: 'searching', message: 'Searching for song...' };
        setParsedSongs([...updatedSongs]);
        
        // Calculate and update progress
        const currentProgress = Math.round(((i + 1) / updatedSongs.length) * 100);
        setProgress(currentProgress);
        toast.loading(`Processing ${i + 1}/${updatedSongs.length}: ${song.title}`, { 
          id: progressToastId 
        });
        
        // Search for the song to get audio URL and other details
        const searchResult = await searchForSongDetails(song.title, song.artist);
        
        // Create app song with found details or fallback to defaults
        const appSong: Song = convertIndianSongToAppSong({
          id: `liked-${Date.now()}-${i}`,
          title: song.title,
          artist: song.artist,
          image: searchResult?.image || song.imageUrl || '/placeholder-song.jpg',
          url: searchResult?.url || song.audioUrl || '',
          duration: searchResult?.duration || song.duration || '0'
        });
        
        // Add to liked songs with duplicate detection
        const result = await addLikedSong(appSong);
        
        // Update status based on result
        if (result.added) {
          updatedSongs[i] = {
            ...song,
            status: 'added',
            message: searchResult?.url ? 'Added with audio' : 'Added (no audio found)',
            imageUrl: searchResult?.image || song.imageUrl,
            audioUrl: searchResult?.url || song.audioUrl
          };
          addedCount++;
        } else {
          updatedSongs[i] = {
            ...song,
            status: 'error',
            message: result.reason === 'Already exists' ? 'Already in liked songs' : 'Failed to add'
          };
          if (result.reason === 'Already exists') {
            // Count as skipped, not error
            addedCount++; // Don't increment error count for duplicates
          } else {
            errorCount++;
          }
        }
        
        setAddedSongsCount(addedCount);
      } catch (error) {
        console.error('Error adding song to liked songs:', error);
        
        // Update status to error
        updatedSongs[i] = {
          ...song,
          status: 'error',
          message: 'Failed to add'
        };
        
        errorCount++;
      }
      
      // Update the UI
      setParsedSongs([...updatedSongs]);
      
      // Add a small delay between requests to avoid rate limiting
      if (i < updatedSongs.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    // Hide the progress toast
    toast.dismiss(progressToastId);
    
    // All songs processed, show completion status
    setIsProcessing(false);
    setIsComplete(true);
    
    if (addedCount > 0) {
      if (errorCount > 0) {
        toast.success(`Added ${addedCount} out of ${parsedSongs.length} songs to liked songs`);
      } else {
        toast.success(`Successfully added all ${addedCount} songs to liked songs!`);
      }
    } else if (errorCount > 0) {
      toast.error(`Failed to add ${errorCount} songs. Please try again.`);
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
        <div className="border rounded-lg p-6">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary mb-4"></div>
            <h3 className="text-lg font-medium mb-2">Reading file...</h3>
            <p className="text-sm text-muted-foreground">{fileName}</p>
          </div>
        </div>
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
                    <tr key={index} className="border-t border-gray-200 dark:border-gray-800">
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
                  key={index}
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