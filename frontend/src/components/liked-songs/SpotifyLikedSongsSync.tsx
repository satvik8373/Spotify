import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Music, CheckCircle, AlertCircle, Search, ArrowRight, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useMusicStore } from '@/stores/useMusicStore';
import { Song } from '@/types';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { addLikedSong } from '@/services/likedSongsService';
import { isAuthenticated as isSpotifyAuthenticated, getSavedTracks } from '@/services/spotifyService';
import SpotifyLogin from '@/components/SpotifyLogin';

interface SpotifyLikedSongsSyncProps {
  onClose: () => void;
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string }>;
  };
  duration_ms: number;
  preview_url?: string;
  status: 'ready' | 'added' | 'error' | 'searching';
  message?: string;
}

export function SpotifyLikedSongsSync({ onClose }: SpotifyLikedSongsSyncProps) {
  const [spotifyTracks, setSpotifyTracks] = useState<SpotifyTrack[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [addedSongsCount, setAddedSongsCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);
  
  const { convertIndianSongToAppSong, searchIndianSongs } = useMusicStore();

  // Check Spotify connection status
  useEffect(() => {
    const checkSpotifyAuth = () => {
      setIsSpotifyConnected(isSpotifyAuthenticated());
    };

    checkSpotifyAuth();
    
    // Listen for auth changes
    window.addEventListener('spotify_auth_changed', checkSpotifyAuth);
    
    return () => {
      window.removeEventListener('spotify_auth_changed', checkSpotifyAuth);
    };
  }, []);

  // Load Spotify liked songs
  const loadSpotifyTracks = async () => {
    if (!isSpotifyAuthenticated()) {
      toast.error('Please connect to Spotify first');
      return;
    }

    setIsLoadingTracks(true);
    try {
      const tracks: SpotifyTrack[] = [];
      let offset = 0;
      const limit = 50;

      // Fetch all liked songs from Spotify
      while (true) {
        const batch = await getSavedTracks(limit, offset);
        if (!batch || batch.length === 0) break;

        const formattedTracks = batch.map((item: any) => ({
          id: item.track.id,
          name: item.track.name,
          artists: item.track.artists,
          album: item.track.album,
          duration_ms: item.track.duration_ms,
          preview_url: item.track.preview_url,
          status: 'ready' as const
        }));

        tracks.push(...formattedTracks);
        offset += batch.length;

        if (batch.length < limit) break;
      }

      setSpotifyTracks(tracks);
      toast.success(`Found ${tracks.length} liked songs on Spotify`);
    } catch (error) {
      console.error('Error loading Spotify tracks:', error);
      toast.error('Failed to load Spotify liked songs');
    } finally {
      setIsLoadingTracks(false);
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

  const syncSpotifyToLikedSongs = async () => {
    if (spotifyTracks.length === 0) return;
    
    setIsProcessing(true);
    setProgress(0);
    setAddedSongsCount(0);
    toast.dismiss();
    
    const progressToastId = 'spotify-sync-progress';
    toast.loading('Syncing Spotify songs...', {
      id: progressToastId,
    });
    
    const updatedTracks = [...spotifyTracks];
    let addedCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < updatedTracks.length; i++) {
      const track = updatedTracks[i];
      
      // Skip already processed tracks
      if (track.status === 'added') {
        addedCount++;
        continue;
      }
      
      if (track.status === 'error') {
        errorCount++;
        continue;
      }
      
      try {
        // Update status to searching
        updatedTracks[i] = { ...track, status: 'searching', message: 'Searching for song...' };
        setSpotifyTracks([...updatedTracks]);
        
        // Calculate and update progress
        const currentProgress = Math.round(((i + 1) / updatedTracks.length) * 100);
        setProgress(currentProgress);
        toast.loading(`Processing ${i + 1}/${updatedTracks.length}: ${track.name}`, { 
          id: progressToastId 
        });
        
        const title = track.name;
        const artist = track.artists.map(a => a.name).join(', ');
        
        // Search for the song to get audio URL and other details
        const searchResult = await searchForSongDetails(title, artist);
        
        // Create app song with found details or fallback to Spotify data
        const appSong: Song = convertIndianSongToAppSong({
          id: `spotify-${track.id}`,
          title: title,
          artist: artist,
          image: searchResult?.image || track.album.images[0]?.url || '/placeholder-song.jpg',
          url: searchResult?.url || track.preview_url || '',
          duration: searchResult?.duration || Math.floor(track.duration_ms / 1000).toString()
        });
        
        // Add to liked songs with Spotify source
        await addLikedSong(appSong, 'spotify', track.id);
        
        // Update status
        updatedTracks[i] = {
          ...track,
          status: 'added',
          message: searchResult?.url ? 'Added with full audio' : 'Added (preview only)',
        };
        
        addedCount++;
        setAddedSongsCount(addedCount);
      } catch (error) {
        console.error('Error syncing Spotify track:', error);
        
        // Update status to error
        updatedTracks[i] = {
          ...track,
          status: 'error',
          message: 'Failed to add'
        };
        
        errorCount++;
      }
      
      // Update the UI
      setSpotifyTracks([...updatedTracks]);
      
      // Add a small delay between requests to avoid rate limiting
      if (i < updatedTracks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 400));
      }
    }
    
    // Hide the progress toast
    toast.dismiss(progressToastId);
    
    // All tracks processed, show completion status
    setIsProcessing(false);
    setIsComplete(true);
    
    if (addedCount > 0) {
      if (errorCount > 0) {
        toast.success(`Synced ${addedCount} out of ${spotifyTracks.length} songs from Spotify`);
      } else {
        toast.success(`Successfully synced all ${addedCount} songs from Spotify!`);
      }
    } else if (errorCount > 0) {
      toast.error(`Failed to sync ${errorCount} songs. Please try again.`);
    }
  };

  const resetSync = () => {
    setSpotifyTracks([]);
    setProgress(0);
    setAddedSongsCount(0);
    setIsComplete(false);
  };

  const removeTrack = (index: number) => {
    const newTracks = [...spotifyTracks];
    newTracks.splice(index, 1);
    setSpotifyTracks(newTracks);
  };

  if (!isSpotifyConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Music className="h-16 w-16 text-green-500 mb-4" />
        <h3 className="text-xl font-semibold mb-2">Connect to Spotify</h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          Connect your Spotify account to sync your liked songs to Mavrixfy
        </p>
        <SpotifyLogin />
        <div className="mt-4 text-xs text-muted-foreground">
          <p>We'll search for high-quality audio versions of your Spotify songs</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Load Spotify tracks */}
      {!spotifyTracks.length && !isLoadingTracks && (
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center">
          <div className="flex flex-col items-center justify-center">
            <Music className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">Sync Spotify Liked Songs</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Import your liked songs from Spotify. We'll search for high-quality audio versions.
            </p>
            <Button
              onClick={loadSpotifyTracks}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              size="sm"
            >
              <Music className="h-4 w-4" />
              <span>Load Spotify Liked Songs</span>
            </Button>
            <div className="mt-4 text-xs text-muted-foreground">
              <p>This may take a moment for large libraries</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading Spotify tracks */}
      {isLoadingTracks && (
        <div className="border rounded-lg p-6">
          <div className="flex flex-col items-center justify-center text-center">
            <Loader2 className="h-12 w-12 animate-spin text-green-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">Loading Spotify songs...</h3>
            <p className="text-sm text-muted-foreground">Fetching your liked songs from Spotify</p>
          </div>
        </div>
      )}

      {/* Spotify tracks list */}
      {spotifyTracks.length > 0 && !isProcessing && !isComplete && (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-medium">{spotifyTracks.length} Spotify Songs Found</h3>
            <Button
              size="sm"
              variant="ghost"
              onClick={resetSync}
              className="h-8 px-2 text-xs sm:text-sm"
            >
              <ArrowRight className="h-3 w-3 mr-1 sm:h-4 sm:w-4 rotate-180" />
              <span>Back</span>
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
                    <th className="text-left p-2 text-xs sm:text-sm font-medium hidden md:table-cell">Album</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {spotifyTracks.map((track, index) => (
                    <tr key={track.id} className="border-t border-gray-200 dark:border-gray-800">
                      <td className="p-2 text-xs sm:text-sm">{index + 1}</td>
                      <td className="p-2 text-xs sm:text-sm">
                        <div className="flex items-center gap-2">
                          {track.album.images[0] && (
                            <img
                              src={track.album.images[0].url}
                              alt={track.album.name}
                              className="w-8 h-8 rounded object-cover"
                            />
                          )}
                          <div className="truncate max-w-[150px] sm:max-w-[200px]">{track.name}</div>
                        </div>
                      </td>
                      <td className="p-2 text-xs sm:text-sm hidden sm:table-cell">
                        <div className="truncate max-w-[100px] sm:max-w-[150px]">
                          {track.artists.map(a => a.name).join(', ')}
                        </div>
                      </td>
                      <td className="p-2 text-xs sm:text-sm hidden md:table-cell">
                        <div className="truncate max-w-[100px] sm:max-w-[120px]">{track.album.name}</div>
                      </td>
                      <td className="p-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => removeTrack(index)}
                        >
                          ×
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
              onClick={syncSpotifyToLikedSongs}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              disabled={spotifyTracks.length === 0}
            >
              <ArrowRight className="h-4 w-4" />
              <span>Sync {spotifyTracks.length} Songs</span>
            </Button>
          </div>
        </div>
      )}

      {/* Processing display */}
      {isProcessing && !isComplete && (
        <div className="border rounded-lg p-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Syncing from Spotify...</h3>
              <Badge variant="outline" className="bg-green-600/10 text-green-400 border-green-600/20">
                {addedSongsCount}/{spotifyTracks.length}
              </Badge>
            </div>
            
            <Progress value={progress} className="h-2" />
            
            <div className="max-h-[30vh] overflow-y-auto border rounded-lg p-2">
              {spotifyTracks.map((track) => (
                <div
                  key={track.id}
                  className="flex items-center justify-between py-2 px-2 border-b last:border-0 text-xs sm:text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {track.album.images[0] && (
                        <img
                          src={track.album.images[0].url}
                          alt={track.album.name}
                          className="w-6 h-6 rounded object-cover"
                        />
                      )}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
                        <div className="font-medium truncate max-w-[200px]">{track.name}</div>
                        <div className="text-muted-foreground truncate max-w-[150px] hidden sm:block">
                          {track.artists.map(a => a.name).join(', ')}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="ml-2 flex-shrink-0">
                    {track.status === 'added' && <CheckCircle className="h-4 w-4 text-green-500" />}
                    {track.status === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                    {track.status === 'searching' && <Search className="h-4 w-4 animate-pulse text-blue-500" />}
                    {track.status === 'ready' && <div className="h-4 w-4" />}
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
            <h3 className="text-lg font-medium mb-2">Spotify Sync Complete</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Successfully synced {addedSongsCount} songs from Spotify to your liked songs.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={onClose} className="bg-green-600 hover:bg-green-700">
                View Liked Songs
              </Button>
              <Button variant="outline" onClick={resetSync}>
                Sync More Songs
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}