import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { useMusicStore } from '../../stores/useMusicStore';
import { useLikedSongsStore } from '../../stores/useLikedSongsStore';
import { Button } from '../../components/ui/button';
import { Play, Heart, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { resolveArtist } from '../../lib/resolveArtist';
import { PageLoading } from '../../components/ui/loading';

const SongPage = () => {
  const { songId } = useParams<{ songId: string }>();
  const navigate = useNavigate();
  const [song, setSong] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  
  const { setCurrentSong, setIsPlaying, playAlbum } = usePlayerStore();
  const { searchIndianSongs } = useMusicStore();
  const { likedSongIds, toggleLikeSong } = useLikedSongsStore();

  // Update like status when song or likedSongIds changes
  useEffect(() => {
    if (!song) return;
    const songIdToCheck = song._id || (song as any).id;
    const liked = songIdToCheck ? likedSongIds?.has(songIdToCheck) : false;
    setIsLiked(!!liked);
  }, [song, likedSongIds]);

  // Listen for like updates from other components
  useEffect(() => {
    const handleLikeUpdate = (e: Event) => {
      if (!song) return;

      const songIdToCheck = song._id || (song as any).id;

      // Check if this event includes details about which song was updated
      if (e instanceof CustomEvent && e.detail) {
        // If we have details and it's not for our current song, ignore
        if (e.detail.songId && e.detail.songId !== songIdToCheck) {
          return;
        }

        // If we have explicit like state in the event, use it
        if (typeof e.detail.isLiked === 'boolean') {
          setIsLiked(e.detail.isLiked);
          return;
        }
      }

      // Otherwise do a fresh check from the store
      const freshCheck = songIdToCheck ? likedSongIds?.has(songIdToCheck) : false;
      setIsLiked(freshCheck);
    };

    document.addEventListener('likedSongsUpdated', handleLikeUpdate);
    document.addEventListener('songLikeStateChanged', handleLikeUpdate);

    return () => {
      document.removeEventListener('likedSongsUpdated', handleLikeUpdate);
      document.removeEventListener('songLikeStateChanged', handleLikeUpdate);
    };
  }, [song, likedSongIds]);

  useEffect(() => {
    const loadSong = async () => {
      if (!songId) {
        setError('No song ID provided');
        setLoading(false);
        return;
      }

      try {
        // Show content immediately, load data in background
        setLoading(false);
        
        // First, try to find the song in liked songs
        const likedSongs = await import('../../services/likedSongsService').then(m => m.loadLikedSongs());
        const likedSong = likedSongs.find((s: any) => s._id === songId || (s as any).id === songId);
        
        if (likedSong) {
          setSong(likedSong);
          // Set the song but DON'T auto-play - let user decide
          setCurrentSong(likedSong as any);
          // setIsPlaying(true); // Removed unwanted autoplay
          return;
        }

        // If not found in liked songs, try to search for it
        // We'll need to search by a generic term and then find the specific song
        await searchIndianSongs('popular songs');
        const searchResults = useMusicStore.getState().indianSearchResults;
        const foundSong = searchResults.find((s: any) => 
          s._id === songId || (s as any).id === songId
        );

        if (foundSong) {
          setSong(foundSong);
          // Set the song but DON'T auto-play - let user decide
          setCurrentSong(foundSong as any);
          // setIsPlaying(true); // Removed unwanted autoplay
        } else {
          // Song not found
          setError('Song not found');
          toast.error('Song not found. It may have been removed or is not available.');
        }
      } catch (err) {
        setError('Failed to load song');
        toast.error('Failed to load song. Please try again.');
        setLoading(false);
      }
    };

    loadSong();
  }, [songId, setCurrentSong, setIsPlaying, searchIndianSongs]);

  const handlePlay = () => {
    if (song) {
      setCurrentSong(song);
      setIsPlaying(true);
      toast.success(`Now playing: ${song.title}`);
    }
  };

  const handleLike = () => {
    if (song) {
      // Optimistically update UI
      setIsLiked(!isLiked);
      
      toggleLikeSong(song);
      toast.success(isLiked ? 'Removed from liked songs' : 'Added to liked songs');
    }
  };



  if (loading) {
    return <div className="min-h-screen bg-[#121212]"></div>;
  }

  if (error || !song) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <h1 className="text-2xl font-bold mb-4 text-foreground">Song Not Found</h1>
          <p className="text-muted-foreground mb-6">
            {error || 'The song you\'re looking for doesn\'t exist or is no longer available.'}
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigate('/home')} variant="outline">
              Go Home
            </Button>
            <Button onClick={() => navigate('/search')}>
              Search Songs
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center gap-4 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold truncate">Song</h1>
            <p className="text-sm text-muted-foreground truncate">{song.title}</p>
          </div>
        </div>
      </div>

      {/* Song Content */}
      <div className="p-6">
        <div className="max-w-md mx-auto">
          {/* Album Art */}
          <div className="mb-6">
            <img
              src={song.imageUrl}
              alt={song.title}
              className="w-full aspect-square rounded-lg object-cover shadow-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 
                  'https://placehold.co/400x400/1f1f1f/959595?text=No+Image';
              }}
            />
          </div>

          {/* Song Info */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2 text-foreground">{song.title}</h2>
            <p className="text-lg text-muted-foreground mb-4">
              {resolveArtist(song)}
            </p>
            {song.album && (
              <p className="text-sm text-muted-foreground">
                Album: {song.album}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center">
            <Button
              onClick={handlePlay}
              className="flex items-center gap-2 px-8"
              size="lg"
            >
              <Play className="h-5 w-5" />
              Play
            </Button>
            
            <Button
              onClick={handleLike}
              variant="outline"
              size="icon"
              className="h-12 w-12"
            >
              <Heart 
                className="h-6 w-6" 
                fill={isLiked ? 'currentColor' : 'none'}
                color={isLiked ? '#ef4444' : 'currentColor'}
              />
            </Button>
          </div>

          {/* Additional Info */}
          {song.duration && (
            <div className="mt-8 text-center">
              <p className="text-sm text-muted-foreground">
                Duration: {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SongPage;
