import { useEffect, useState, useRef, useCallback } from 'react';
import { Heart, Music, Music2, Play, Pause, Clock, MoreHorizontal, ArrowDownUp, Calendar, Shuffle, Search, RefreshCw, LogOut } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { loadLikedSongs, syncWithServer, removeLikedSong } from '@/services/likedSongsService';
import SpotifyLogin from '@/components/SpotifyLogin';
import { isAuthenticated as isSpotifyAuthenticated } from '@/services/spotifyService';
import { fetchAllSpotifySavedTracks, syncSpotifyLikedSongsToMavrixfy, backgroundAutoSyncOnce, countNewSpotifyTracks, filterOnlyNewSpotifyTracks } from '@/services/spotifySync';
import { logout as spotifyLogout, debugTokenState } from '@/services/spotifyService';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useLikedSongsStore } from '@/stores/useLikedSongsStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { Song } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getSyncStatus, formatSyncStatus, triggerManualSync } from '@/services/syncedLikedSongsService';
import SpotifySyncPermissionModal from '@/components/SpotifySyncPermissionModal';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { TouchRipple } from '@/components/ui/touch-ripple';

// Add CSS for desktop view
import './liked-songs.css';

// Convert liked song format to player song format
const adaptToPlayerSong = (likedSong: any): Song => {
  return {
    _id: likedSong.id,
    title: likedSong.title,
    artist: likedSong.artist,
    audioUrl: likedSong.audioUrl,
    imageUrl: likedSong.imageUrl,
    duration: likedSong.duration || 0,
    albumId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
};

// Format time
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const LikedSongsPage = () => {
  const [likedSongs, setLikedSongs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [syncedWithServer, setSyncedWithServer] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  // Removed fixed header; opacity state no longer needed
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sortMethod, setSortMethod] = useState<'recent' | 'title' | 'artist'>('recent');
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [spotifyTracks, setSpotifyTracks] = useState<any[]>([]);
  const [syncingSpotify, setSyncingSpotify] = useState(false);

  const [upToDate, setUpToDate] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [syncedSongs, setSyncedSongs] = useState<any[]>([]);
  const [spotifyAccountName, setSpotifyAccountName] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { currentSong, isPlaying, togglePlay } = usePlayerStore();
  const { removeLikedSong: removeFromStore } = useLikedSongsStore();
  const { isAuthenticated, user } = useAuthStore();

  // Load liked songs on mount
  useEffect(() => {
    loadAndSetLikedSongs();

    // Subscribe to liked songs updates
    const handleLikedSongsUpdated = () => {
      loadAndSetLikedSongs();
    };

    document.addEventListener('likedSongsUpdated', handleLikedSongsUpdated);
    
    return () => {
      document.removeEventListener('likedSongsUpdated', handleLikedSongsUpdated);
    };
  }, [isAuthenticated]);

  // Load sync status for authenticated users
  useEffect(() => {
    if (isAuthenticated && user?.id && isSpotifyAuthenticated()) {
      loadSyncStatus();
    }
  }, [isAuthenticated, user?.id]);

  // Load Spotify account name on mount
  useEffect(() => {
    const accountName = localStorage.getItem('spotify_account_name');
    if (accountName) {
      setSpotifyAccountName(accountName);
    }
  }, []);

  // Check if a song was synced from Spotify
  const isSongFromSpotify = async (songId: string): Promise<boolean> => {
    if (!auth.currentUser) return false;
    
    try {
      const spotifySongRef = doc(db, "users", auth.currentUser.uid, "spotifyLikedSongs", songId);
      const spotifySongDoc = await getDoc(spotifySongRef);
      return spotifySongDoc.exists();
    } catch {
      return false;
    }
  };

  // Handle disconnect with confirmation
  const handleDisconnect = () => {
    setShowDisconnectModal(true);
  };

  // Confirm disconnect and optionally delete synced songs
  const confirmDisconnect = async (deleteSyncedSongs: boolean) => {
    try {
      console.log('Starting disconnect process, deleteSyncedSongs:', deleteSyncedSongs);
      
      if (deleteSyncedSongs) {
        // Delete synced Spotify songs from Mavrixfy library
        const syncedSongIds = new Set<string>();
        
        // Get all synced song IDs
        if (auth.currentUser) {
          console.log('Current user:', auth.currentUser.uid);
          const spotifySongsRef = collection(db, "users", auth.currentUser.uid, "spotifyLikedSongs");
          const spotifySongsSnapshot = await getDocs(spotifySongsRef);
          
          console.log('Found synced songs:', spotifySongsSnapshot.size);
          
          spotifySongsSnapshot.forEach((doc: any) => {
            syncedSongIds.add(doc.id);
            console.log('Synced song ID:', doc.id);
          });
          
          // Remove synced songs from liked songs
          for (const songId of syncedSongIds) {
            try {
              await removeLikedSong(songId);
              console.log(`Successfully removed synced song: ${songId}`);
            } catch (error) {
              console.warn(`Failed to remove synced song ${songId}:`, error);
            }
          }
          
          // Clear the spotifyLikedSongs collection
          const batch = writeBatch(db);
          spotifySongsSnapshot.forEach((doc: any) => {
            batch.delete(doc.ref);
          });
          await batch.commit();
          
          console.log('Cleared spotifyLikedSongs collection');
          toast.success(`Removed ${syncedSongIds.size} synced Spotify songs from your library`);
        } else {
          console.log('No current user found');
        }
      }
      
      // Disconnect from Spotify
      spotifyLogout();
      setUpToDate(false);
      setShowDisconnectModal(false);
      toast.success('Disconnected from Spotify');
      
      // Reload liked songs to reflect changes
      await loadAndSetLikedSongs();
      
    } catch (error) {
      console.error('Error during disconnect:', error);
      toast.error('Failed to disconnect properly');
    }
  };

  // Load sync status from backend
  const loadSyncStatus = async () => {
    if (!user?.id) return;
    
    try {
      const status = await getSyncStatus(user.id);
      setSyncStatus(status);
      
      // Format status for display
      const formattedStatus = formatSyncStatus(status);
      setUpToDate(formattedStatus.status === 'synced');
    } catch (error) {
      console.error('Error loading sync status:', error);
    }
  };

  // Handle selected songs from permission modal
  const handleSelectedSongsSync = async (selectedTrackIds: string[]) => {
    if (selectedTrackIds.length === 0) return;
    
    setSyncingSpotify(true);
    try {
      // Filter tracks to only include selected ones
      const selectedTracks = spotifyTracks.filter(track => selectedTrackIds.includes(track.id));
      
      // Sort tracks by addedAt date (most recent first) to match Spotify app order
      const sortedTracks = selectedTracks.sort((a, b) => {
        const dateA = new Date(a.addedAt).getTime();
        const dateB = new Date(b.addedAt).getTime();
        return dateB - dateA; // Most recent first
      });
      
      // Sync only the selected tracks in correct date order
      const result = await syncSpotifyLikedSongsToMavrixfy(sortedTracks);
      
      if (result.syncedCount > 0) {
        toast.success(`Successfully added ${result.syncedCount} songs to your library`);
        

        await loadAndSetLikedSongs();
        setUpToDate(true);
      } else {
        toast.info('No new songs were added');
      }
    } catch (error) {
      console.error('Error syncing selected songs:', error);
      toast.error('Failed to sync selected songs');
    } finally {
      setSyncingSpotify(false);
      setShowPermissionModal(false);
    }
  };



  // After Spotify auth callback, show sync prompt
  useEffect(() => {
    try {
      const shouldPrompt = sessionStorage.getItem('spotify_sync_prompt') === '1';
      if (shouldPrompt) {
        sessionStorage.removeItem('spotify_sync_prompt');
        
        // Auto-detect Spotify account and show user info
        autoDetectSpotifyAccount();
        
        // Kick off prefetch to know how many tracks
        setSyncingSpotify(true);
        fetchAllSpotifySavedTracks()
          .then((tracks) => {
            // Sort tracks by addedAt date (most recent first) to match Spotify app order
            const sortedTracks = tracks.sort((a: any, b: any) => {
              const dateA = new Date(a.addedAt).getTime();
              const dateB = new Date(b.addedAt).getTime();
              return dateB - dateA; // Most recent first
            });
            
            // Filter to only show new/unscanned tracks
            const newTracks = filterOnlyNewSpotifyTracks(sortedTracks);
            
            setSpotifyTracks(newTracks);
            const newCount = newTracks.length;
            if (newCount > 0) {
              setShowPermissionModal(true);
            } else {
              setUpToDate(true);
            }
          })
          .catch((error) => {
            console.error('Failed to fetch Spotify tracks:', error);
            // Handle authentication failure gracefully
            if (error.response?.status === 401 || error.response?.status === 403) {
              toast.error('Spotify authentication failed. Please reconnect.');
              // Clear invalid tokens
              spotifyLogout();
            } else {
              setShowPermissionModal(true);
            }
          })
          .finally(() => setSyncingSpotify(false));
      }
    } catch {}
  }, []);

  // Auto-detect Spotify account information
  const autoDetectSpotifyAccount = async () => {
    try {
      // Get user profile from Spotify
      const response = await fetch('https://api.spotify.com/v1/me', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('spotify_access_token')}`,
        },
      });
      
      if (response.ok) {
        const userProfile = await response.json();
        console.log('Connected to Spotify account:', userProfile.display_name || userProfile.id);
        
        // Store account info for display
        const accountName = userProfile.display_name || userProfile.id;
        localStorage.setItem('spotify_account_name', accountName);
        localStorage.setItem('spotify_account_id', userProfile.id);
        setSpotifyAccountName(accountName);
        
        toast.success(`Connected to Spotify: ${accountName}`);
      } else {
        console.warn('Failed to get Spotify profile:', response.status);
      }
    } catch (error) {
      console.error('Error detecting Spotify account:', error);
    }
  };

  // Lightweight background auto-sync
  useEffect(() => {
    // Debug token state on mount
    debugTokenState();
    backgroundAutoSyncOnce().catch(() => {});
  }, []);

  // Intentionally avoid setting up or changing the player queue on mount/focus to prevent auto-play
  
  // Load and set liked songs
  const loadAndSetLikedSongs = async () => {
    setIsLoading(true);
    setSyncError(null);
    
    try {
      // First load from local storage
      const localSongs = loadLikedSongs();
      const sortedSongs = sortSongs(localSongs, sortMethod);
      setLikedSongs(sortedSongs);
      
      // Then sync with server if authenticated
      if (isAuthenticated) {
        try {
          const serverSongs = await syncWithServer(localSongs);
          const sortedServerSongs = sortSongs(serverSongs, sortMethod);
          setLikedSongs(sortedServerSongs);
          setSyncedWithServer(true);
        } catch (syncErr) {
          console.error('Error syncing with server:', syncErr);
          setSyncError('Using local data - server sync unavailable');
          // Still mark as synced to prevent continuous retries
          setSyncedWithServer(true);
          
          // Show informational toast instead of error
          toast.info('Using locally stored liked songs', {
            description: 'Server synchronization is currently unavailable.'
          });
        }
      }
    } catch (error) {
      console.error('Error loading liked songs:', error);
      setSyncError('Failed to load liked songs');
      toast.error('Failed to load liked songs', {
        description: 'Please try again later.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Sort songs based on selected method
  const sortSongs = (songs: any[], method: 'recent' | 'title' | 'artist') => {
    if (!songs || songs.length === 0) return [];
    
    const sortedSongs = [...songs];
    
    switch (method) {
      case 'recent':
        // In Firebase, newer songs are already at the beginning of array by default
        return sortedSongs;
      case 'title':
        return sortedSongs.sort((a, b) => a.title.localeCompare(b.title));
      case 'artist':
        return sortedSongs.sort((a, b) => a.artist.localeCompare(b.artist));
      default:
        return sortedSongs;
    }
  };

  // Update sort method and re-sort songs
  const handleSortChange = (method: 'recent' | 'title' | 'artist') => {
    setSortMethod(method);
    setLikedSongs(prev => sortSongs([...prev], method));
  };

  // Filtered view for display
  const visibleSongs = filterQuery.trim()
    ? likedSongs.filter((s) =>
        `${s.title} ${s.artist}`.toLowerCase().includes(filterQuery.toLowerCase())
      )
    : likedSongs;

  // Manual sync function for retry button
  const handleManualSync = async () => {
    if (!user?.id) return;
    
    setSyncingSpotify(true);
    try {
      const result = await triggerManualSync(user.id);
      toast.success(`Sync completed! ${result.added} new songs, ${result.updated} updated, ${result.removed} removed`);
      loadSyncStatus(); // Refresh status
    } catch (error) {
      toast.error('Sync failed. Please try again.');
      console.error('Manual sync error:', error);
    } finally {
      setSyncingSpotify(false);
    }
  };

  // Get formatted sync status text
  const getSyncStatusText = () => {
    if (!syncStatus) return 'Not connected';
    
    const formatted = formatSyncStatus(syncStatus);
    return formatted.text;
  };

  // Debug function to log player state
  // Removed unused debugPlayerState to reduce noise

  // Play all liked songs function - remove debugPlayerState() call  
  const playAllSongs = () => {
    if (likedSongs.length > 0) {
      const playerSongs = likedSongs.map(adaptToPlayerSong);
      
      // Use playAlbum directly with an index of 0
      usePlayerStore.getState().playAlbum(playerSongs, 0);
      
      // Force play state immediately to true regardless of autoplay setting
      setTimeout(() => {
        const store = usePlayerStore.getState();
        store.setIsPlaying(true);
        store.setUserInteracted(); // Ensure user is marked as interacted
      }, 100);
    }
  };
  
  // Smart shuffle function - remove debugPlayerState() call
  const smartShuffle = () => {
    if (likedSongs.length > 0) {
      // Create a copy of the songs array to shuffle
      const songsToShuffle = [...likedSongs];
      
      // Fisher-Yates shuffle algorithm
      for (let i = songsToShuffle.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [songsToShuffle[i], songsToShuffle[j]] = [songsToShuffle[j], songsToShuffle[i]];
      }
      
      const shuffledPlayerSongs = songsToShuffle.map(adaptToPlayerSong);
      
      // Play the shuffled songs
      usePlayerStore.getState().playAlbum(shuffledPlayerSongs, 0);
      
      // Force play state
      setTimeout(() => {
        const store = usePlayerStore.getState();
        store.setIsPlaying(true);
        store.setUserInteracted();
        toast.success("Shuffling your liked songs");
      }, 100);
    }
  };

  // Handle playing a specific song from current view (respects filtering)
  const playSong = (song: any, _index: number) => {
    // Build the source list based on current filter state so queue matches the visible list
    const sourceSongs = (filterQuery && filterQuery.trim()) ? visibleSongs : likedSongs;
    // Find accurate index by id to avoid mismatch when filtering/sorting
    const targetIndex = Math.max(0, sourceSongs.findIndex((s: any) => ((s as any).id || (s as any)._id) === song.id));
    const playerSongs = sourceSongs.map(adaptToPlayerSong);

    if (currentSong && currentSong._id === song.id) {
      togglePlay();
      return;
    }

    usePlayerStore.getState().playAlbum(playerSongs, targetIndex >= 0 ? targetIndex : 0);

    // Force play state immediately to true regardless of autoplay setting
    setTimeout(() => {
      const store = usePlayerStore.getState();
      store.setIsPlaying(true);
      store.setUserInteracted();
    }, 100);
  };

  // Check if a song is currently playing
  const isSongPlaying = (song: any) => {
    return isPlaying && currentSong && currentSong._id === song.id;
  };

  // Unlike a song
  const unlikeSong = async (id: string) => {
    try {
      await removeFromStore(id);
      setLikedSongs(prev => prev.filter(song => song.id !== id));
      toast.success('Removed from Liked Songs');
    } catch {}
  };

  // Removed header opacity tracking
  const handleScroll = useCallback(() => {
    // no-op
  }, []);

  // Add touch handlers for pull-to-refresh
  const handleTouchStart = (e: React.TouchEvent) => {
    if (scrollRef.current?.scrollTop === 0) {
      setTouchStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY !== null && scrollRef.current?.scrollTop === 0) {
      const touchDiff = e.touches[0].clientY - touchStartY;
      if (touchDiff > 70 && !refreshing) {
        setRefreshing(true);
        loadAndSetLikedSongs().then(() => {
          setTimeout(() => setRefreshing(false), 1000);
        });
      }
    }
  };

  const handleTouchEnd = () => {
    setTouchStartY(null);
  };

  // Check for mobile viewport
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Empty state component when no liked songs
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center h-[50vh]">
      <div className="w-24 h-24 bg-gradient-to-br from-indigo-600 to-blue-400 rounded-full flex items-center justify-center mb-6">
        <Heart className="w-12 h-12 text-white" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Songs you like will appear here</h2>
      <p className="text-zinc-400 max-w-md mb-6">Save songs by tapping the heart icon.</p>
      {!isSpotifyAuthenticated() && (
        <div className="mb-4">
          <SpotifyLogin variant="default" />
        </div>
      )}
      <Button 
        variant="outline" 
        className="bg-white/10 text-white hover:bg-white/20 border-0"
        onClick={() => window.location.href = '/search'}
      >
        Find songs
      </Button>
    </div>
  );

  // Skeleton loader for songs
  const SkeletonLoader = () => (
    <div className="space-y-2 animate-pulse pb-8">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="grid grid-cols-[16px_1fr_auto] md:grid-cols-[16px_4fr_2fr_1fr_auto] gap-4 p-2 hover:bg-white/5 group relative">
          <div className="w-4 h-4 bg-zinc-800 rounded-sm mx-auto self-center"></div>
          <div className="flex items-center min-w-0">
            <div className="w-10 h-10 bg-zinc-800 rounded mr-3"></div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="h-4 bg-zinc-800 rounded w-36"></div>
              <div className="h-3 bg-zinc-800/70 rounded w-24"></div>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="h-4 bg-zinc-800 rounded w-24"></div>
          </div>
          <div className="hidden md:flex justify-end">
            <div className="h-4 bg-zinc-800 rounded w-10"></div>
          </div>
          <div className="flex justify-end gap-2">
            <div className="h-8 w-8 rounded-full bg-zinc-800/40"></div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <main className="h-full bg-gradient-to-b from-background to-background/95 dark:from-[#191414] dark:to-[#191414]">
      {/* Removed fixed header bar to avoid overlap with top mobile nav; back button added inline above */}

      {/* Pull to refresh indicator */}
      {refreshing && (
        <div className="absolute top-0 left-0 right-0 z-20 flex justify-center items-center py-2 bg-indigo-900/80 text-white text-sm">
          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
          Refreshing...
        </div>
      )}

      {/* Scrollable content */}
      <ScrollArea 
        className="h-full no-scrollbar" 
        ref={scrollRef}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className={cn("pt-0 pb-20", isMobile ? "px-0" : "px-4 sm:px-6")}>
          {/* Header with gradient background */}
          <div className={cn(
            "relative z-0 py-4 mb-3 spotify-mobile-liked-header",
            isMobile ? "px-4 pt-0" : "rounded-t-lg px-4 sm:px-6"
          )}>
            <div className={cn(
              "flex flex-col mb-6 gap-3",
              isMobile ? "items-start" : "sm:flex-row sm:items-end"
            )}>
              {isMobile ? (
                <>
                  {/* Search and Sort row */}
                  <div className="w-full mb-3 flex items-center gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        value={filterQuery}
                        onChange={(e) => setFilterQuery(e.target.value)}
                        placeholder="Find in Liked Songs"
                        className="w-full h-10 rounded-lg pl-10 pr-3 text-[15px] bg-card text-foreground placeholder:text-muted-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-10 px-4 rounded-lg bg-card text-foreground hover:bg-accent border border-border"
                        >
                          Sort
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 bg-popover text-popover-foreground border border-border">
                        <DropdownMenuItem onClick={() => handleSortChange('recent')}>Recent</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSortChange('title')}>Title</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSortChange('artist')}>Artist</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="w-full mb-1">
                    <h1 className="text-3xl font-bold mb-1 text-foreground">Liked Songs</h1>
                    <p className="text-sm text-muted-foreground">{likedSongs.length} songs</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex-shrink-0 bg-gradient-to-br from-indigo-600 to-blue-400 rounded-lg shadow-xl flex items-center justify-center w-48 h-48">
                    <Heart className="text-white w-24 h-24" />
                  </div>
                  <div className="flex-1 min-w-0 text-center sm:text-left">
                    <p className="text-xs uppercase font-medium mb-2 text-muted-foreground">Playlist</p>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 text-foreground">Liked Songs</h1>
                    <div className="flex-col sm:flex-row sm:items-center">
                      <p className="text-muted-foreground">
                        {isLoading 
                          ? 'Loading songs...' 
                          : `${likedSongs.length} songs${isAuthenticated && isSpotifyAuthenticated() ? ` · ${getSyncStatusText()}` : ''}`
                        }
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Spotify sync buttons - moved to top with professional design */}
            {(isSpotifyAuthenticated()) && (
              <div className={cn("mb-6", isMobile ? "px-0" : "px-0")}> 
                <div className="bg-gradient-to-r from-green-900/20 to-blue-900/20 backdrop-blur-sm rounded-xl border border-green-500/30 p-6 shadow-lg">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                          <Music2 className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg text-foreground">Spotify Integration</h3>
                          <p className="text-sm text-muted-foreground">
                            {upToDate ? '✅ Library is up to date' : '🔄 New songs available to sync'}
                          </p>
                        </div>
                      </div>
                      {/* Show connected account info */}
                      {spotifyAccountName && (
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-green-500 font-medium">Connected to: {spotifyAccountName}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        disabled={syncingSpotify}
                        onClick={async () => {
                          setSyncingSpotify(true);
                          try {
                            const tracks = await fetchAllSpotifySavedTracks();
                            
                            // Sort tracks by addedAt date (most recent first) to match Spotify app order
                            const sortedTracks = tracks.sort((a: any, b: any) => {
                              const dateA = new Date(a.addedAt).getTime();
                              const dateB = new Date(b.addedAt).getTime();
                              return dateB - dateA; // Most recent first
                            });
                            
                            // Filter to only show new/unscanned tracks
                            const newTracks = filterOnlyNewSpotifyTracks(sortedTracks);
                            
                            setSpotifyTracks(newTracks);
                            const newCount = newTracks.length;
                            if (newCount === 0) {
                              setUpToDate(true);
                              toast.success('Already up to date');
                            } else {
                              setShowPermissionModal(true);
                            }
                          } catch {
                            toast.error('Sync failed');
                          } finally {
                            setSyncingSpotify(false);
                          }
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-2 rounded-lg shadow-md transition-all duration-200 hover:shadow-lg"
                      >
                        {syncingSpotify ? (
                          <>
                            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                            Syncing...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Sync Spotify
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="default"
                        onClick={handleDisconnect}
                        className="border-red-500/50 text-red-500 hover:bg-red-500/10 hover:border-red-500 font-medium px-6 py-2 rounded-lg transition-all duration-200"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Disconnect
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Connect Spotify button - moved to top with professional design */}
            {(!isSpotifyAuthenticated()) && (
              <div className={cn("mb-6", isMobile ? "px-0" : "px-0")}> 
                <div className="bg-gradient-to-r from-green-900/20 to-blue-900/20 backdrop-blur-sm rounded-xl border border-green-500/30 p-6 shadow-lg">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                          <Music2 className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg text-foreground">Connect Spotify</h3>
                          <p className="text-sm text-muted-foreground">
                            🎵 Sync your Spotify liked songs with Mavrixfy
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Import your favorite tracks and keep them synced
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <SpotifyLogin 
                        variant="default" 
                        className="bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-2 rounded-lg shadow-md transition-all duration-200 hover:shadow-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {likedSongs.length > 0 && isMobile && (
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full text-sm px-6 py-2 h-10 border border-border text-foreground hover:bg-accent hover:border-primary transition-all duration-200 font-medium"
                  onClick={smartShuffle}
                >
                  <Shuffle className="h-4 w-4 mr-2" />
                  <span className="font-medium">Shuffle</span>
                </Button>
                <div className="relative">
                  <Button 
                    onClick={playAllSongs}
                    className="bg-green-500 hover:bg-green-400 text-black rounded-full h-14 w-14 flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                  >
                    <Play className="h-7 w-7 ml-0.5" />
                  </Button>
                </div>
              </div>
            )}

            {likedSongs.length > 0 && !isMobile && (
              <div className="flex items-center gap-3 mt-2 w-full justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full text-sm px-6 py-2 h-10 border border-border text-foreground hover:bg-accent hover:border-primary transition-all duration-200 font-medium"
                  onClick={smartShuffle}
                >
                  <Shuffle className="h-4 w-4 mr-2" />
                  <span className="font-medium">Shuffle</span>
                </Button>
                <div className="relative">
                  <Button 
                    onClick={playAllSongs}
                    className="bg-green-500 hover:bg-green-400 text-black rounded-full h-12 w-12 flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                  >
                    {isPlaying ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5 ml-0.5" />
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          {/* Table Header - show only on desktop */}
          {likedSongs.length > 0 && !isLoading && !isMobile && (
            <div className="grid grid-cols-[16px_1fr_auto] md:grid-cols-[16px_4fr_2fr_1fr_auto] gap-4 py-2 px-4 text-sm font-medium text-zinc-400 border-b border-zinc-800">
              <div className="text-center">#</div>
              <div className="flex items-center gap-2">
                TITLE
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={`h-6 w-6 ${sortMethod === 'title' ? 'text-green-500' : 'text-zinc-400'}`}
                  onClick={() => handleSortChange('title')}
                >
                  <ArrowDownUp className="h-3 w-3" />
                </Button>
              </div>
              <div className="hidden md:flex items-center gap-2">
                DATE ADDED
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={`h-6 w-6 ${sortMethod === 'recent' ? 'text-green-500' : 'text-zinc-400'}`}
                  onClick={() => handleSortChange('recent')}
                >
                  <ArrowDownUp className="h-3 w-3" />
                </Button>
              </div>
              <div className="hidden md:flex justify-end items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={`h-6 w-6 ${sortMethod === 'recent' ? 'text-green-500' : 'text-zinc-400'}`}
                  onClick={() => handleSortChange('recent')}
                  title="Sort by recently liked"
                >
                  <Calendar className="h-3 w-3" />
                </Button>
                <Clock className="h-4 w-4 inline" />
              </div>
              <div></div>
            </div>
          )}
          
          {/* Song list or empty state */}
          {isLoading ? (
            <SkeletonLoader />
          ) : likedSongs.length > 0 ? (
            <div className={cn("pb-8", isMobile ? "pt-3 px-3" : "")}>
              {visibleSongs.map((song, index) => (
                <div 
                  key={song.id}
                  onClick={() => playSong(song, index)}
                  className="cursor-pointer"
                >
                  <TouchRipple 
                    color="rgba(255, 255, 255, 0.05)"
                    className="rounded-md"
                  >
                    <div className={cn(
                      "group relative hover:bg-white/5 rounded-md",
                      isMobile 
                        ? "grid grid-cols-[1fr_auto] gap-3 p-2 spotify-liked-song-row" 
                        : "grid grid-cols-[16px_4fr_2fr_1fr_auto] gap-4 p-2 px-4 spotify-desktop-song-row"
                    )}>
                      {/* Index number - desktop only */}
                      {!isMobile && (
                        <div className="flex items-center justify-center text-sm text-zinc-400 group-hover:text-white">
                          {isSongPlaying(song) ? (
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          ) : (
                            index + 1
                          )}
                        </div>
                      )}
                      
                      {/* Title and artist column */}
                      <div className="flex items-center min-w-0">
                        <div className={cn(
                          "flex-shrink-0 overflow-hidden mr-3 rounded-md shadow",
                          isMobile ? "w-12 h-12" : "w-10 h-10"
                        )}>
                          {song.imageUrl ? (
                            <img 
                              src={song.imageUrl} 
                              alt={song.title} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = '';
                                e.currentTarget.style.background = 'linear-gradient(135deg, #8a2387, #e94057, #f27121)';
                                e.currentTarget.parentElement!.innerHTML = `<div class="w-full h-full flex items-center justify-center">
                                  <Music class="h-5 w-5 text-zinc-400" />
                                </div>`;
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center">
                              <Music className="h-5 w-5 text-zinc-100" />
                            </div>
                          )}
                        </div>
                        
                        <div className="min-w-0 pr-2">
                          <p className={`font-medium truncate ${isSongPlaying(song) ? 'text-green-500' : 'text-foreground'}`}>
                            {song.title}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                        </div>
                      </div>
                      
                      {/* Date added column - desktop only */}
                      {!isMobile && (
                        <div className="hidden md:flex items-center text-zinc-400 text-sm desktop-date-column">
                          <span className="truncate">
                            {song.dateAdded 
                              ? new Date(song.dateAdded).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                              : new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                            }
                          </span>
                        </div>
                      )}
                      
                      {/* Duration column - desktop only */}
                      {!isMobile && (
                        <div className="hidden md:flex items-center justify-end text-zinc-400 text-sm desktop-duration-column">
                          {song.duration ? formatTime(song.duration) : "--:--"}
                        </div>
                      )}
                      
                      {/* Actions column */}
                      <div className="flex items-center justify-end">
                        {!isMobile && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600 dark:hover:text-red-400"
                            onClick={(e) => {
                              e.stopPropagation();
                              unlikeSong(song.id);
                            }}
                            aria-label="Unlike song"
                          >
                            <Heart className="fill-current h-4 w-4" />
                          </Button>
                        )}
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "text-muted-foreground hover:text-foreground",
                                isMobile ? "h-8 w-8" : "h-8 w-8"
                              )}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className={isMobile ? "h-5 w-5" : "h-4 w-4"} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              unlikeSong(song.id);
                            }}>
                              Remove from Liked Songs
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              if (navigator.clipboard) {
                                navigator.clipboard.writeText(`${song.title} by ${song.artist}`);
                                toast.success('Copied to clipboard');
                              }
                            }}>
                              Copy song info
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              playSong(song, index);
                            }}>
                              {isSongPlaying(song) ? 'Pause' : 'Play'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {isMobile && isSongPlaying(song) && (
                        <div className="absolute right-12 flex items-center">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        </div>
                      )}
                    </div>
                  </TouchRipple>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState />
          )}

        </div>
      </ScrollArea>

      {/* Spotify Sync Permission Modal */}
      <SpotifySyncPermissionModal
        isOpen={showPermissionModal}
        onClose={() => setShowPermissionModal(false)}
        tracks={spotifyTracks}
        onSync={handleSelectedSongsSync}
        isLoading={syncingSpotify}
      />

      {/* Disconnect Confirmation Modal */}
      <Dialog open={showDisconnectModal} onOpenChange={setShowDisconnectModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Music className="h-5 w-5 text-red-500" />
              Disconnect from Spotify
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You're about to disconnect from Spotify. Would you like to also remove all synced Spotify songs from your Mavrixfy library?
            </p>
            
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowDisconnectModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={() => confirmDisconnect(false)}
                className="text-orange-600 hover:text-orange-700"
              >
                Disconnect Only
              </Button>
              <Button
                onClick={() => confirmDisconnect(true)}
                className="bg-red-600 hover:bg-red-700"
              >
                Disconnect & Delete Songs
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


    </main>
  );
};

export default LikedSongsPage; 