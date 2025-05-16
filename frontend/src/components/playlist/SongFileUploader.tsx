import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileText, X, CheckCircle, AlertCircle, Search, ArrowRight, Check, ChevronDown, ChevronRight, ExternalLink, Copy, HelpCircle, ChevronLeft, ArrowLeftRight } from 'lucide-react';
import { toast } from 'sonner';
import { usePlaylistStore } from '@/stores/usePlaylistStore';
import { useMusicStore } from '@/stores/useMusicStore';
import { Song } from '@/types';
import { Progress } from '../../components/ui/progress';
import { Badge } from '../../components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from '@/lib/utils';

interface SongFileUploaderProps {
  playlistId: string;
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

export function SongFileUploader({ playlistId, onClose }: SongFileUploaderProps) {
  const [parsedSongs, setParsedSongs] = useState<ParsedSong[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [addedSongsCount, setAddedSongsCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [showGuide, setShowGuide] = useState(() => {
    // Check if this is the first time using the importer
    const hasUsedImporter = localStorage.getItem('has_used_importer');
    return !hasUsedImporter;
  });
  const [currentPage, setCurrentPage] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  
  const { addSongToPlaylist, currentPlaylist } = usePlaylistStore();
  const { convertIndianSongToAppSong, searchIndianSongs } = useMusicStore();

  // Mark that the user has used the importer when they complete an import
  useEffect(() => {
    if (isComplete) {
      localStorage.setItem('has_used_importer', 'true');
    }
  }, [isComplete]);

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
    
    // Set that the user has seen the guide
    setShowGuide(false);
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
      
      // Single notification for successful upload
      toast.success(`Found ${songs.length} songs in the file. Ready to add to playlist.`);
    } catch (error) {
      console.error('Error reading file:', error);
      toast.error('Failed to read the file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // New function to search for song details using the music API
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

  const addSongsToPlaylist = async () => {
    if (parsedSongs.length === 0) return;
    
    setIsProcessing(true);
    setProgress(0);
    setAddedSongsCount(0);
    // Clear any existing toast notifications
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
          id: `imported-${Date.now()}-${i}`,
          title: song.title,
          artist: song.artist,
          image: searchResult?.image || song.imageUrl || '/placeholder-song.jpg',
          url: searchResult?.url || song.audioUrl || '',
          duration: searchResult?.duration || song.duration || '0'
        });
        
        // Add to playlist
        await addSongToPlaylist(playlistId, appSong);
        
        // Update status
        updatedSongs[i] = {
          ...song,
          status: 'added',
          message: searchResult?.url ? 'Added with audio' : 'Added (no audio found)',
          imageUrl: searchResult?.image || song.imageUrl,
          audioUrl: searchResult?.url || song.audioUrl
        };
        
        addedCount++;
        setAddedSongsCount(addedCount);
      } catch (error) {
        console.error('Error adding song to playlist:', error);
        
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
        toast.success(`Added ${addedCount} out of ${parsedSongs.length} songs to the playlist`);
      } else {
        toast.success(`Successfully added all ${addedCount} songs to the playlist!`);
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

  const finishAndViewPlaylist = () => {
    onClose();
    // Navigate to the playlist page
    navigate(`/playlist/${playlistId}`);
  };

  const removeSong = (index: number) => {
    const newSongs = [...parsedSongs];
    newSongs.splice(index, 1);
    setParsedSongs(newSongs);
  };

  // Function to copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Copied to clipboard!');
    });
  };

  // Book pages content
  const guidePages = [
    // Cover page
    {
      title: "How to Import Your Playlists",
      content: (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="mb-8 p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full">
            <ArrowLeftRight className="h-12 w-12 text-white" />
          </div>
          <h2 className="text-xl md:text-2xl font-bold mb-4 text-center">Mavrixfy</h2>
          <p className="text-lg text-center mb-8">Import Guide</p>
          <p className="text-sm text-zinc-300 text-center max-w-xs">
            Follow this step-by-step guide to import your playlists from other music platforms
          </p>
        </div>
      )
    },
    // Page 1
    {
      title: "Step 1: Get your playlist link",
      content: (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">1</div>
            <h3 className="text-lg font-medium">Get your playlist from the original platform</h3>
          </div>

          <ol className="list-decimal ml-6 space-y-4 text-sm">
            <li className="pb-2 border-b border-zinc-700">
              <p className="mb-2">Open Spotify, Apple Music, or another music platform</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                <div className="bg-zinc-800 p-2 rounded flex items-center justify-center">
                  <img src="/spotify.png" alt="Spotify" className="h-8 w-8 object-contain" onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzFFRDc2MCI+PHBhdGggZD0iTTEyIDJDNi40NzcgMiAyIDYuNDc3IDIgMTJzNC40NzcgMTAgMTAgMTAgMTAtNC40NzcgMTAtMTBTMTcuNTIzIDIgMTIgMnptNC41ODYgMTQuNDI0YTAuNjIyIDAuNjIyIDAgMDEtLjg1Ny4yMDdjLTIuMzQ4LTEuNDM4LTUuMzA0LTEuNzYzLTguNzg1LTAuOTY3YTAuNjIyIDAuNjIyIDAgMDEtLjI1LTEuMjE4YzMuODA5LTAuODcxIDcuMDc3LTAuNDk2IDkuNjg2IDEuMTIxYTAuNjIyIDAuNjIyIDAgMDEwLjIwNiAwLjg1N3ptMS4yMjQtMi43MjdjLTAuMDc5IDAuMTMtMC4xOTEgMC4yMjctMC4zMjUgMC4yODRhMC43NzcgMC43NzcgMCAwMS0wLjc1My0wLjA1N2MtMi44NTQtMS43NTQtNy4yMDEtMi4yNjMtMTAuNTctMS4yMzlhMC43NzggMC43NzggMCAwMS0wLjQyOS0xLjQ5N2MzLjg1NS0xLjEwNyA4LjY1OC0wLjUxNyAxMS45NDMgMS41NDNhMC43NzcgMC43NzcgMCAwMS0wLjA1NSAxLjA3OGwwLjE4OS0wLjExMnptMC4xMDUtMi44MzVhMC45MzQgMC45MzQgMCAwMS0xLjI5MiAwLjI2N2MtMy4yNzQtMi4wMTQtOC42NTktMi4yLTExLjgwOC0xLjIxM2EwLjkzNyAwLjkzNyAwIDAxLTAuNTE1LTEuODA0YzMuNjA3LTEuMDc2IDkuNjA4LTAuODU5IDEzLjM1IDEuNDU3YTAuOTM0IDAuOTM0IDAgMDEwLjI2NSAxLjI5M3oiLz48L3N2Zz4=';
                  }} />
                </div>
                <div className="bg-zinc-800 p-2 rounded flex items-center justify-center">
                  <img src="/google.png" alt="Apple Music" className="h-8 w-8 object-contain" onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI0ZBMjQzQyI+PHBhdGggZD0iTTEwLjc4IDQuMDY3QTIuMzY3IDIuMzY3IDAgMCAwIDEwLjI3OCAyQzguOTQyIDIuMDEgOC41NzcgMi44IDguNTc3IDIuOHMtLjYzMyAxLjUzMy0uMTMzIDMuMDY3Yy41NyAxLjczMyAxLjg2NyAyLjQ2NyAxLjg2NyAyLjQ2N3MuNjI3LTEuNDc3LS4wMS0zQzEwIDQuODY3IDEwLjc4IDQuMDY3IDEwLjc4IDQuMDY3TTEyLjYzIDE5LjY2N0M4LjYwMyAxOS4zMzMgMi40MzcgMjIgMi4zNyAyMmMtLjQuMjMzLjE5NyAxLjQgMS4zNjQgMS40IDAgMCAyLjMzMyAwIDQuNjY2LTIuMzMzIDEuMTU3LTEuMTU3IDIuNi0xLjgyNyAzLjcxNy0yLjA1IDEuMi0uMjQgMy4wNS0uNTE3IDUuMDE2LjIzM2wuNy4zNjdjLjY2Ny4zNjcgMS4zMzQuNDMzIDEuODM0LjA2NyAxLjI2My0uOTMzIDIuODMzLTguOTY3IDIuODMzLTguOTY3cy0uNjMzLTEuNTMzLTIuODMzLTEuNWMtMS40MzMgMC0xLjggMS4xMzMtMS44IDEuMTMzcy0uMzY3IDEuMS0uMzY3IDIuMTY3Yy0uMDMzIDEuNTMzLjQzNCA0LjkzMy0uNjY2IDcuMTMzczIuMzk2LS4zIDIuMzk2LS4zaC4wMzRjLTEuOC0uNzMzLTMtMi43NjctMy0yLjc2Ny0uMjY3IDEuNCAxIDEuOTY3IDEgMS45NjcgMCAwLTMuMzMzLTEuMzMzLTMuNjY3IDBaIi8+PC9zdmc+';
                  }} />
                </div>
                <div className="bg-zinc-800 p-2 rounded flex items-center justify-center">
                  <img src="/icons/youtube.svg" alt="YouTube Music" className="h-8 w-8 object-contain" onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI0ZGMDAwMCI+PHBhdGggZD0iTTEyIDE4LjI2Yy0zLjc2OS4wMDItNy4wNjQtLjA5My03LjgxNS0uMjU0LTEuMTEyLS4yNC0xLjk3Mi0xLjA0MS0yLjE4My0yLjA0MS0uNDIyLTIuMDA5LS40MTctNC40MTEgMC02LjM4OS4yMTEtMS0uMDU0LTEuODQ1IDEuMDU4LTIuMDg1Ljc1MS0uMTYyIDMuNjgtLjI1NyA4Ljk0MS0uMjU1IDUuMjYtLjAwMiA4LjE5LjA5MyA4Ljk0MS4yNTVjMS4xMTIuMjQgMS44NjcuNzg1IDIuMDc4IDEuNzg1LjI0LjkzLjI0IDEuOTMzLjI0IDMuMTc1IDAgMS4yNDIgMCAyLjI0NC0uMjQgMy4xNzMtLjIxMSAxLS45NjYgMS41NDUtMi4wNzggMS43ODUtLjc1MS4xNjItNC41NDUuMjU3LTguOTQxLjI1NXptLTEuOTk5LTguMTI1djMuNzMzbDMuNDc4LTEuODY3LTMuNDc4LTEuODY2eiIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIiBzdHJva2U9IiNGRjAwMDAiIHN0cm9rZS13aWR0aD0iMS41IiBmaWxsPSJub25lIi8+PC9zdmc+';
                  }} />
                </div>
              </div>
            </li>
            <li className="pb-2 border-b border-zinc-700">
              <p className="mb-2">Find the playlist you want to import</p>
              <div className="bg-zinc-800 rounded-md p-2 text-xs">
                <div className="bg-zinc-700 h-3 w-2/3 rounded mb-2"></div>
                <div className="flex gap-2 items-center">
                  <div className="bg-green-900 h-10 w-10 rounded"></div>
                  <div>
                    <div className="bg-zinc-600 h-2 w-28 rounded mb-1"></div>
                    <div className="bg-zinc-600 h-2 w-20 rounded"></div>
                  </div>
                </div>
              </div>
            </li>
            <li>
              <p className="mb-2">Copy the playlist URL by using the share option</p>
              <div className="bg-zinc-800 rounded-md p-3 text-xs flex items-center gap-2 overflow-hidden">
                <code className="text-xs whitespace-nowrap overflow-hidden text-ellipsis">https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M</code>
                <button 
                  onClick={() => copyToClipboard('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M')}
                  className="bg-zinc-700 hover:bg-zinc-600 p-1 rounded"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            </li>
          </ol>
        </div>
      )
    },
    // Page 2
    {
      title: "Step 2: Convert to TXT/CSV file",
      content: (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">2</div>
            <h3 className="text-lg font-medium">Convert the playlist to a file</h3>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-md p-3 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <ExternalLink className="h-4 w-4 text-blue-400" />
              <a 
                href="https://www.tunemymusic.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-400 font-medium hover:underline text-sm"
              >
                Visit TuneMyMusic.com
              </a>
            </div>
            <p className="text-xs text-zinc-300">This free service helps convert playlists between different platforms</p>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex gap-2">
              <div className="h-5 w-5 rounded-full bg-zinc-700 flex items-center justify-center text-xs">1</div>
              <p>Click on "Let's Start" and select your source platform</p>
            </div>
            <div className="flex gap-2">
              <div className="h-5 w-5 rounded-full bg-zinc-700 flex items-center justify-center text-xs">2</div>
              <p>Paste the playlist URL you copied</p>
            </div>
            <div className="flex gap-2">
              <div className="h-5 w-5 rounded-full bg-zinc-700 flex items-center justify-center text-xs">3</div>
              <p>After the songs load, click "Next"</p>
            </div>
            <div className="flex gap-2">
              <div className="h-5 w-5 rounded-full bg-zinc-700 flex items-center justify-center text-xs">4</div>
              <p>For the destination, choose "CSV File" or "Text File"</p>
            </div>
            <div className="flex gap-2">
              <div className="h-5 w-5 rounded-full bg-zinc-700 flex items-center justify-center text-xs">5</div>
              <p>Click "Start Moving My Music" and download the file</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-zinc-700 flex justify-center">
            <div className="relative bg-zinc-800 rounded-md p-2 w-4/5 h-20 flex items-center justify-center">
              <div className="absolute top-2 right-2 h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
              <div className="text-center">
                <div className="h-2 w-20 bg-zinc-600 rounded mb-2 mx-auto"></div>
                <div className="h-8 w-32 bg-blue-600 rounded mx-auto flex items-center justify-center text-xs text-white font-medium">
                  Download
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    // Page 3
    {
      title: "Step 3: Import to Mavrixfy",
      content: (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">3</div>
            <h3 className="text-lg font-medium">Import your file to Mavrixfy</h3>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex gap-2 items-start">
              <div className="h-5 w-5 rounded-full bg-zinc-700 flex-shrink-0 flex items-center justify-center text-xs">1</div>
              <div>
                <p className="mb-1">Click the "Select File" button below to upload your TXT or CSV file</p>
                <div className="bg-zinc-800 rounded-md p-2 flex items-center justify-center">
                  <Button 
                    size="sm" 
                    className="h-8 bg-zinc-700 hover:bg-zinc-600 flex items-center gap-1"
                    onClick={handleUploadClick}
                  >
                    <Upload className="h-3 w-3" />
                    <span className="text-xs">Select File</span>
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex gap-2 items-start">
              <div className="h-5 w-5 rounded-full bg-zinc-700 flex-shrink-0 flex items-center justify-center text-xs">2</div>
              <div>
                <p className="mb-1">Review the songs found in your file</p>
                <div className="bg-zinc-800 rounded-md p-2">
                  <div className="h-2 w-full bg-zinc-700 rounded mb-1"></div>
                  <div className="h-2 w-full bg-zinc-700 rounded mb-1"></div>
                  <div className="h-2 w-3/4 bg-zinc-700 rounded"></div>
                </div>
              </div>
            </div>
            <div className="flex gap-2 items-start">
              <div className="h-5 w-5 rounded-full bg-zinc-700 flex-shrink-0 flex items-center justify-center text-xs">3</div>
              <div>
                <p className="mb-1">Click "Add Songs" to import them to your playlist</p>
                <div className="bg-zinc-800 rounded-md p-2 flex items-center justify-center">
                  <Button 
                    size="sm" 
                    className="h-8 bg-green-600 hover:bg-green-700 flex items-center gap-1"
                  >
                    <ArrowRight className="h-3 w-3" />
                    <span className="text-xs">Add Songs</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-zinc-700">
            <div className="bg-green-500/20 p-3 rounded-md border border-green-500/30 text-center">
              <p className="text-green-400 font-medium text-sm flex items-center justify-center gap-2">
                <Check className="h-4 w-4" />
                Ready to import your favorite playlists!
              </p>
            </div>
          </div>
        </div>
      )
    }
  ];

  // Paper book component
  const ImportGuideBook = () => {
    const totalPages = guidePages.length;
    
    const nextPage = () => {
      if (currentPage < totalPages - 1) {
        setCurrentPage(currentPage + 1);
      }
    };
    
    const prevPage = () => {
      if (currentPage > 0) {
        setCurrentPage(currentPage - 1);
      }
    };
    
    return (
      <div className="border rounded-lg overflow-hidden mb-6 bg-zinc-900/80">
        {/* Book pages */}
        <div className="min-h-[400px] md:min-h-[450px] relative">
          {/* Page content */}
          <div className="p-6 h-full">
            {guidePages[currentPage].content}
          </div>
          
          {/* Book binding effect */}
          <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-4 bg-gradient-to-r from-zinc-800/50 to-zinc-800/10 pointer-events-none"></div>
          
          {/* Page corner fold effect */}
          <div className="absolute bottom-0 right-0 w-10 h-10 bg-zinc-800 rounded-tl-lg shadow-inner pointer-events-none"></div>
        </div>
        
        {/* Navigation controls */}
        <div className="bg-zinc-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={prevPage}
              disabled={currentPage === 0}
              className="h-8 w-8 p-0 rounded-full"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="text-sm text-zinc-300">
              Page {currentPage + 1} of {totalPages}
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={nextPage}
              disabled={currentPage === totalPages - 1}
              className="h-8 w-8 p-0 rounded-full"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGuide(false)}
              className="h-8 text-xs"
            >
              Close Guide
            </Button>
            
            {currentPage === totalPages - 1 && (
              <Button
                size="sm"
                onClick={handleUploadClick}
                className="h-8 text-xs bg-green-600 hover:bg-green-700"
              >
                Start Importing
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Show the guide if this is the first time */}
      {showGuide && <ImportGuideBook />}

      {/* File upload area */}
      {!parsedSongs.length && !isUploading && !showGuide && (
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
            <h3 className="text-lg font-medium mb-2">Import Songs from a File</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Upload a TXT or CSV file containing song titles and artists to add them to your playlist.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleUploadClick}
                className="flex items-center gap-2"
                size="sm"
              >
                <Upload className="h-4 w-4" />
                <span>Select File</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGuide(true)}
                className="flex items-center gap-2"
              >
                <HelpCircle className="h-4 w-4" />
                <span>Show Import Guide</span>
              </Button>
            </div>
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
          
          <div className="flex flex-col sm:flex-row justify-between gap-3 mt-4">
            <div className="flex sm:flex-row flex-col gap-2">
              <Button
                onClick={addSongsToPlaylist}
                className="flex items-center gap-2"
                disabled={parsedSongs.length === 0}
              >
                <ArrowRight className="h-4 w-4" />
                <span>Add {parsedSongs.length} Songs</span>
              </Button>
            </div>
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
              Successfully added {addedSongsCount} songs to your playlist.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={finishAndViewPlaylist}>
                View Playlist
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