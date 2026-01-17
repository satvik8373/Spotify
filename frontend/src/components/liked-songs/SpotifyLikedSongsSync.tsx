import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Music, CheckCircle, AlertCircle, Search, Heart, Clock, X, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useMusicStore } from '@/stores/useMusicStore';
import { Song } from '@/types';
import { addLikedSong, isSongAlreadyLiked } from '@/services/likedSongsService';
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
  added_at: string;
  status: 'ready' | 'added' | 'error' | 'searching' | 'skipped';
  message?: string;
}

export function SpotifyLikedSongsSync({ onClose }: SpotifyLikedSongsSyncProps) {
  const [spotifyTracks, setSpotifyTracks] = useState<SpotifyTrack[]>([]);
  const [newTracksOnly, setNewTracksOnly] = useState<SpotifyTrack[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [addedSongsCount, setAddedSongsCount] = useState(0);
  const [skippedSongsCount, setSkippedSongsCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);
  const [syncMode, setSyncMode] = useState<'new' | 'all'>('new');
  
  const { convertIndianSongToAppSong, searchIndianSongs } = useMusicStore();

  // Check Spotify connection status
  useEffect(() => {
    const checkSpotifyAuth = () => {
      setIsSpotifyConnected(isSpotifyAuthenticated());
    };

    checkSpotifyAuth();
    window.addEventListener('spotify_auth_changed', checkSpotifyAuth);
    
    return () => {
      window.removeEventListener('spotify_auth_changed', checkSpotifyAuth);
    };
  }, []);

  // Load Spotify tracks
  const loadSpotifyTracks = async (mode: 'new' | 'all' = 'new') => {
    if (!isSpotifyAuthenticated()) {
      toast.error('Please connect to Spotify first');
      return;
    }

    setIsLoadingTracks(true);
    try {
      const tracks: SpotifyTrack[] = [];
      let offset = 0;
      const limit = 50;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);

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
          added_at: item.added_at,
          status: 'ready' as const
        }));

        if (mode === 'new') {
          const recentTracks = formattedTracks.filter((track: SpotifyTrack) => 
            new Date(track.added_at) > cutoffDate
          );
          tracks.push(...recentTracks);
          
          if (recentTracks.length < formattedTracks.length) {
            break;
          }
        } else {
          tracks.push(...formattedTracks);
        }

        offset += batch.length;
        if (batch.length < limit) break;
        if (mode === 'new' && tracks.length >= 200) break;
      }

      setSpotifyTracks(tracks);
      
      // Filter out existing songs
      const newTracks = [];
      for (const track of tracks) {
        const title = track.name;
        const artist = track.artists.map(a => a.name).join(', ');
        const alreadyExists = await isSongAlreadyLiked(title, artist);
        
        if (!alreadyExists) {
          newTracks.push(track);
        }
      }
      
      setNewTracksOnly(newTracks);
      
      const modeText = mode === 'new' ? 'recent' : 'total';
      toast.success(`Found ${tracks.length} ${modeText} Spotify songs, ${newTracks.length} are new`);
    } catch (error) {
      console.error('Error loading Spotify tracks:', error);
      toast.error('Failed to load Spotify liked songs');
    } finally {
      setIsLoadingTracks(false);
    }
  };

  // Search for song details
  const searchForSongDetails = async (title: string, artist: string): Promise<any> => {
    try {
      const searchQuery = `${title} ${artist}`.trim();
      await searchIndianSongs(searchQuery);
      
      const results = useMusicStore.getState().indianSearchResults;
      
      if (results && results.length > 0) {
        return results[0];
      }
      return null;
    } catch (error) {
      console.error('Error searching for song:', error);
      return null;
    }
  };

  // Sync tracks
  const syncSpotifyToLikedSongs = async () => {
    const tracksToSync = syncMode === 'new' ? newTracksOnly : spotifyTracks;
    if (tracksToSync.length === 0) return;
    
    setIsProcessing(true);
    setProgress(0);
    setAddedSongsCount(0);
    setSkippedSongsCount(0);
    toast.dismiss();
    
    const progressToastId = 'spotify-sync-progress';
    toast.loading('Syncing Spotify songs...', { id: progressToastId });
    
    const updatedTracks = [...tracksToSync];
    let addedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < updatedTracks.length; i++) {
      const track = updatedTracks[i];
      
      if (track.status === 'added') {
        addedCount++;
        continue;
      }
      
      if (track.status === 'error' || track.status === 'skipped') {
        if (track.status === 'skipped') skippedCount++;
        else errorCount++;
        continue;
      }
      
      try {
        updatedTracks[i] = { ...track, status: 'searching', message: 'Searching for song...' };
        if (syncMode === 'new') {
          setNewTracksOnly([...updatedTracks]);
        } else {
          setSpotifyTracks([...updatedTracks]);
        }
        
        const currentProgress = Math.round(((i + 1) / updatedTracks.length) * 100);
        setProgress(currentProgress);
        toast.loading(`Processing ${i + 1}/${updatedTracks.length}: ${track.name}`, { 
          id: progressToastId 
        });
        
        const title = track.name;
        const artist = track.artists.map(a => a.name).join(', ');
        
        const searchResult = await searchForSongDetails(title, artist);
        
        const appSong: Song = convertIndianSongToAppSong({
          id: `spotify-${track.id}`,
          title: title,
          artist: artist,
          image: searchResult?.image || track.album.images[0]?.url || '/placeholder-song.jpg',
          url: searchResult?.url || track.preview_url || '',
          duration: searchResult?.duration || Math.floor(track.duration_ms / 1000).toString(),
          likedAt: track.added_at
        });
        
        const result = await addLikedSong(appSong, 'spotify', track.id, track.added_at);
        
        if (result.added) {
          updatedTracks[i] = {
            ...track,
            status: 'added',
            message: searchResult?.url ? 'Added with full audio' : 'Added (preview only)',
          };
          addedCount++;
        } else {
          updatedTracks[i] = {
            ...track,
            status: 'skipped',
            message: result.reason === 'Already exists' ? 'Already in library' : 'Skipped'
          };
          skippedCount++;
        }
        
        setAddedSongsCount(addedCount);
        setSkippedSongsCount(skippedCount);
      } catch (error) {
        console.error('Error syncing Spotify track:', error);
        
        updatedTracks[i] = {
          ...track,
          status: 'error',
          message: 'Failed to add'
        };
        
        errorCount++;
      }
      
      if (syncMode === 'new') {
        setNewTracksOnly([...updatedTracks]);
      } else {
        setSpotifyTracks([...updatedTracks]);
      }
      
      if (i < updatedTracks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 400));
      }
    }
    
    toast.dismiss(progressToastId);
    
    setIsProcessing(false);
    setIsComplete(true);
    
    if (addedCount > 0) {
      if (skippedCount > 0) {
        toast.success(`Added ${addedCount} new songs, ${skippedCount} were already in your library`);
      } else {
        toast.success(`Successfully synced ${addedCount} songs from Spotify!`);
      }
    } else if (skippedCount > 0) {
      toast.info(`All ${skippedCount} songs were already in your library`);
    } else if (errorCount > 0) {
      toast.error(`Failed to sync ${errorCount} songs. Please try again.`);
    }
  };

  const resetSync = () => {
    setSpotifyTracks([]);
    setNewTracksOnly([]);
    setProgress(0);
    setAddedSongsCount(0);
    setSkippedSongsCount(0);
    setIsComplete(false);
  };

  const removeTrack = (index: number) => {
    const currentTracks = syncMode === 'new' ? newTracksOnly : spotifyTracks;
    const newTracks = [...currentTracks];
    newTracks.splice(index, 1);
    
    if (syncMode === 'new') {
      setNewTracksOnly(newTracks);
    } else {
      setSpotifyTracks(newTracks);
    }
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Not connected state
  if (!isSpotifyConnected) {
    return (
      <div className="min-h-[600px] bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 w-72 h-72 bg-green-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
          <div className="absolute top-40 right-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-40 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center min-h-[600px] p-8 text-center">
          {/* Spotify Logo with Glow */}
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-green-500 rounded-full blur-2xl opacity-30 animate-pulse"></div>
            <div className="relative w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-2xl">
              <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
            </div>
          </div>
          
          <h1 className="text-4xl font-bold text-white mb-4 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
            Connect to Spotify
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl leading-relaxed">
            Sync your Spotify liked songs with <span className="text-green-400 font-semibold">high-quality audio</span> from Mavrixfy's premium sources
          </p>
          
          <div className="mb-8">
            <SpotifyLogin size="lg" />
          </div>
          
          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <Music className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Smart Audio Matching</h3>
              <p className="text-gray-300 text-sm">
                AI-powered matching finds the highest quality versions of your songs
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <Heart className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Instant Sync</h3>
              <p className="text-gray-300 text-sm">
                Seamlessly import your entire music library in seconds
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Premium Quality</h3>
              <p className="text-gray-300 text-sm">
                Experience your music in lossless, studio-quality audio
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[600px] bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-72 h-72 bg-green-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-40 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 p-6 space-y-8">
        {/* Initial state - choose sync mode */}
        {!spotifyTracks.length && !isLoadingTracks && (
          <div className="max-w-2xl mx-auto">
            {/* Modern Header */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">
                Add Songs to Liked Songs
              </h2>
              <p className="text-gray-400">
                Upload a file or sync from Spotify to add songs to your liked songs
              </p>
            </div>
            
            {/* Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {/* Upload File Card */}
              <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300 cursor-pointer group">
                <div className="text-center">
                  <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-gray-700 transition-colors">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Upload File</h3>
                  <p className="text-gray-400 text-sm">Import from local files</p>
                </div>
              </div>
              
              {/* Spotify Sync Card - Active */}
              <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-sm rounded-2xl p-6 border border-green-500/30 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent"></div>
                <div className="relative text-center">
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Spotify Sync</h3>
                  <p className="text-green-300 text-sm font-medium">Connected & Ready</p>
                </div>
              </div>
            </div>
            
            {/* Sync Options */}
            <div className="space-y-4">
              <button
                onClick={() => loadSpotifyTracks('new')}
                className="w-full bg-gray-900/50 backdrop-blur-sm rounded-2xl p-4 border border-gray-700/50 hover:border-green-500/50 hover:bg-green-500/5 transition-all duration-300 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                      <Heart className="h-5 w-5 text-green-400" />
                    </div>
                    <div className="text-left">
                      <h4 className="text-white font-medium">Recent Songs</h4>
                      <p className="text-gray-400 text-sm">Last 30 days • Fast sync</p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-green-400 group-hover:translate-x-1 transition-all" />
                </div>
              </button>
              
              <button
                onClick={() => loadSpotifyTracks('all')}
                className="w-full bg-gray-900/50 backdrop-blur-sm rounded-2xl p-4 border border-gray-700/50 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all duration-300 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                      <Music className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="text-left">
                      <h4 className="text-white font-medium">Full Library</h4>
                      <p className="text-gray-400 text-sm">Complete sync • All songs</p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoadingTracks && (
          <div className="max-w-md mx-auto text-center">
            {/* Compact Loading Animation */}
            <div className="relative mb-6">
              <div className="w-16 h-16 mx-auto relative">
                <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                  <circle
                    cx="32" cy="32" r="28"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="4"
                  />
                  <circle
                    cx="32" cy="32" r="28"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 28}`}
                    strokeDashoffset={`${2 * Math.PI * 28 * 0.25}`}
                    className="animate-spin"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Music className="h-6 w-6 text-green-400 animate-pulse" />
                </div>
              </div>
            </div>
            
            <h3 className="text-xl font-semibold text-white mb-2">Loading Your Music</h3>
            <p className="text-gray-400 mb-6">
              Analyzing your Spotify library...
            </p>
            
            <div className="flex items-center justify-center gap-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        )}

        {/* Track list */}
        {spotifyTracks.length > 0 && !isProcessing && !isComplete && (
          <div className="max-w-2xl mx-auto">
            {/* Modern Header with Song Count */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">
                {spotifyTracks.length} Songs Found
              </h2>
              <p className="text-gray-400">Ready to add to your liked songs</p>
              
              {/* Reset Button */}
              <button
                onClick={resetSync}
                className="mt-3 flex items-center gap-2 mx-auto text-gray-400 hover:text-white transition-colors text-sm"
              >
                <X className="h-4 w-4" />
                Reset
              </button>
            </div>
            
            {/* Compact Track List Container */}
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 overflow-hidden">
              {/* Track List */}
              <ScrollArea className="max-h-80">
                <div className="p-4 space-y-2">
                  {(syncMode === 'new' ? newTracksOnly : spotifyTracks).slice(0, 5).map((track, index) => (
                    <div key={track.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-800/50 transition-colors">
                      <div className="text-gray-500 text-sm w-6">
                        {String(index + 1).padStart(2, '0')}
                      </div>
                      
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
                        {track.album.images[0] ? (
                          <img
                            src={track.album.images[0].url}
                            alt={track.album.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Music className="h-4 w-4 text-gray-400" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium truncate text-sm">
                          {track.name}
                        </div>
                        <div className="text-gray-400 text-xs truncate">
                          {track.artists.map(a => a.name).join(', ')}
                        </div>
                      </div>
                      
                      <div className="text-gray-500 text-xs">
                        {formatDuration(track.duration_ms)}
                      </div>
                    </div>
                  ))}
                  
                  {(syncMode === 'new' ? newTracksOnly : spotifyTracks).length > 5 && (
                    <div className="text-center py-4 text-gray-400 text-sm">
                      +{(syncMode === 'new' ? newTracksOnly : spotifyTracks).length - 5} more songs
                    </div>
                  )}
                </div>
              </ScrollArea>
              
              {/* Next Button - Inside Container - More Prominent */}
              <div className="p-4 border-t border-gray-700/50 bg-gray-800/50">
                <button
                  onClick={syncSpotifyToLikedSongs}
                  disabled={(syncMode === 'new' ? newTracksOnly : spotifyTracks).length === 0}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-green-500/25 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-lg">Next</span>
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Processing state */}
        {isProcessing && !isComplete && (
          <div className="max-w-2xl mx-auto text-center">
            {/* Compact Progress Ring */}
            <div className="relative mb-6">
              <div className="w-20 h-20 mx-auto relative">
                <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
                  <circle
                    cx="40" cy="40" r="36"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="4"
                  />
                  <circle
                    cx="40" cy="40" r="36"
                    fill="none"
                    stroke="url(#progressGradient)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 36}`}
                    strokeDashoffset={`${2 * Math.PI * 36 * (1 - progress / 100)}`}
                    className="transition-all duration-500"
                  />
                  <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-white">{progress}%</span>
                </div>
              </div>
            </div>
            
            <h3 className="text-xl font-semibold text-white mb-2">
              Processing Songs ✨
            </h3>
            <p className="text-gray-400 mb-6">
              Finding high-quality audio for your music...
            </p>
            
            {/* Compact Stats */}
            <div className="flex justify-center gap-6 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{addedSongsCount}</div>
                <div className="text-green-300 text-xs uppercase tracking-wide">Added</div>
              </div>
              {skippedSongsCount > 0 && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">{skippedSongsCount}</div>
                  <div className="text-yellow-300 text-xs uppercase tracking-wide">Skipped</div>
                </div>
              )}
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {(syncMode === 'new' ? newTracksOnly : spotifyTracks).length}
                </div>
                <div className="text-blue-300 text-xs uppercase tracking-wide">Total</div>
              </div>
            </div>
            
            {/* Current Processing - Compact */}
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-4 border border-gray-700/50">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-400 text-sm font-medium">Processing...</span>
              </div>
              
              {/* Show only currently processing track */}
              {(() => {
                const currentTrack = (syncMode === 'new' ? newTracksOnly : spotifyTracks).find(track => track.status === 'searching');
                if (!currentTrack) return null;
                
                return (
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-blue-500/10 border border-blue-400/20">
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
                      {currentTrack.album.images[0] ? (
                        <img
                          src={currentTrack.album.images[0].url}
                          alt={currentTrack.album.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music className="h-3 w-3 text-gray-400" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium truncate text-sm">{currentTrack.name}</div>
                      <div className="text-gray-400 text-xs truncate">
                        {currentTrack.artists.map(a => a.name).join(', ')}
                      </div>
                    </div>
                    
                    <Search className="h-4 w-4 text-blue-400 animate-pulse flex-shrink-0" />
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Success state */}
        {isComplete && (
          <div className="max-w-md mx-auto text-center">
            {/* Success Animation */}
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-green-500 rounded-full blur-xl opacity-30 animate-pulse"></div>
              <div className="relative w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle className="h-8 w-8 text-white animate-bounce" />
              </div>
            </div>
            
            <h3 className="text-2xl font-bold text-white mb-2">
              Sync Complete! 🎉
            </h3>
            <p className="text-gray-400 mb-6">
              Successfully synced your Spotify songs to Mavrixfy
            </p>
            
            {/* Compact Stats */}
            <div className="flex justify-center gap-6 mb-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400">{addedSongsCount}</div>
                <div className="text-green-300 text-sm">Songs Added</div>
              </div>
              {skippedSongsCount > 0 && (
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-400">{skippedSongsCount}</div>
                  <div className="text-yellow-300 text-sm">Already Existed</div>
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="space-y-3">
              <button 
                onClick={onClose}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-6 rounded-2xl shadow-lg hover:shadow-green-500/25 transition-all duration-300 hover:scale-105"
              >
                <div className="flex items-center justify-center gap-2">
                  <Heart className="h-5 w-5" />
                  <span>View Liked Songs</span>
                </div>
              </button>
              <button 
                onClick={resetSync}
                className="w-full bg-gray-900/50 backdrop-blur-sm hover:bg-gray-800/50 text-white font-medium py-3 px-6 rounded-2xl border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300"
              >
                <div className="flex items-center justify-center gap-2">
                  <Music className="h-4 w-4" />
                  <span>Sync More</span>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}