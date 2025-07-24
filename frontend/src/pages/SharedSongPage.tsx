import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Song } from '../types';
import { Button } from '../components/ui/button';
import { Play, Heart, Download, ArrowLeft } from 'lucide-react';
import { usePlayerStore } from '../stores/usePlayerStore';
import { useLikedSongsStore } from '../stores/useLikedSongsStore';
import { useMusicStore } from '../stores/useMusicStore';
import { formatTime } from '../lib/utils';
import { toast } from 'sonner';

export default function SharedSongPage() {
  const { songId } = useParams<{ songId: string }>();
  const navigate = useNavigate();
  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { playSong, currentSong, isPlaying } = usePlayerStore();
  const { likedSongIds, toggleLikeSong } = useLikedSongsStore();
  const { fetchSongById } = useMusicStore();
  
  const isCurrentSong = currentSong && (currentSong as any)._id === songId;
  const isLiked = song && likedSongIds.has(song._id);

  useEffect(() => {
    if (!songId) {
      setError('No song ID provided');
      setLoading(false);
      return;
    }

    fetchSong(songId);
  }, [songId]);

  const fetchSong = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const songData = await fetchSongById(id);
      if (songData) {
        setSong(songData);
      } else {
        setError('Song not found or unavailable');
      }
    } catch (error) {
      console.error('Error fetching song:', error);
      setError('Song not found or unavailable');
    } finally {
      setLoading(false);
    }
  };

  const handlePlaySong = () => {
    if (song) {
      playSong(song);
      toast.success(`Now playing: ${song.title}`);
    }
  };

  const handleLikeSong = () => {
    if (song) {
      toggleLikeSong(song);
      toast.success(isLiked ? 'Removed from liked songs' : 'Added to liked songs');
    }
  };

  const handleGoToApp = () => {
    navigate('/home');
  };

  // Update document title and meta tags for better sharing
  useEffect(() => {
    if (song) {
      document.title = `${song.title} by ${song.artist} - Mavrixfy`;
      
      // Update meta tags for social sharing
      updateMetaTags(song);
    }
    
    return () => {
      document.title = 'Mavrixfy - Music Streaming';
    };
  }, [song]);

  const updateMetaTags = (song: Song) => {
    // Update or create meta tags for better social media sharing
    const updateMetaTag = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    const updateNameMetaTag = (name: string, content: string) => {
      let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', name);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    // Open Graph tags
    updateMetaTag('og:title', `${song.title} by ${song.artist}`);
    updateMetaTag('og:description', `Listen to ${song.title} by ${song.artist} on Mavrixfy`);
    updateMetaTag('og:image', song.imageUrl);
    updateMetaTag('og:url', window.location.href);
    updateMetaTag('og:type', 'music.song');
    
    // Twitter Card tags
    updateNameMetaTag('twitter:card', 'summary_large_image');
    updateNameMetaTag('twitter:title', `${song.title} by ${song.artist}`);
    updateNameMetaTag('twitter:description', `Listen to ${song.title} by ${song.artist} on Mavrixfy`);
    updateNameMetaTag('twitter:image', song.imageUrl);
    
    // Music specific meta tags
    updateMetaTag('music:musician', song.artist);
    updateMetaTag('music:duration', song.duration.toString());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading song...</p>
        </div>
      </div>
    );
  }

  if (error || !song) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-6xl font-bold text-green-500 mb-4">🎵</h1>
          <h2 className="text-2xl font-semibold mb-4">Song Not Found</h2>
          <p className="text-zinc-400 mb-8">
            {error || 'The song you\'re looking for doesn\'t exist or has been removed.'}
          </p>
          <Button onClick={handleGoToApp} className="bg-green-500 hover:bg-green-600">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go to Mavrixfy
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <Button
          variant="ghost"
          onClick={handleGoToApp}
          className="text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Mavrixfy
        </Button>
      </div>

      {/* Song Details */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
          {/* Album Art */}
          <div className="flex-shrink-0">
            <div className="w-64 h-64 md:w-80 md:h-80 rounded-lg overflow-hidden shadow-2xl">
              <img
                src={song.imageUrl}
                alt={song.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 
                    'https://placehold.co/400x400/1f1f1f/959595?text=No+Image';
                }}
              />
            </div>
          </div>

          {/* Song Info */}
          <div className="flex-1 text-center md:text-left">
            <p className="text-sm text-zinc-400 mb-2">SONG</p>
            <h1 className="text-4xl md:text-6xl font-bold mb-4">{song.title}</h1>
            <p className="text-xl md:text-2xl text-zinc-300 mb-2">{song.artist}</p>
            <p className="text-zinc-400 mb-8">{formatTime(song.duration)}</p>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
              <Button
                onClick={handlePlaySong}
                size="lg"
                className="bg-green-500 hover:bg-green-600 text-white px-8"
              >
                <Play className="h-5 w-5 mr-2" />
                {isCurrentSong && isPlaying ? 'Playing' : 'Play'}
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={handleLikeSong}
                className={isLiked ? 'text-green-500 border-green-500' : ''}
              >
                <Heart className={`h-5 w-5 mr-2 ${isLiked ? 'fill-current' : ''}`} />
                {isLiked ? 'Liked' : 'Like'}
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = song.audioUrl;
                  link.download = `${song.title} - ${song.artist}.mp3`;
                  link.click();
                }}
              >
                <Download className="h-5 w-5 mr-2" />
                Download
              </Button>
            </div>

            {/* App Promotion */}
            <div className="mt-12 p-6 bg-zinc-800/50 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Discover More Music</h3>
              <p className="text-zinc-400 mb-4">
                Explore millions of songs, create playlists, and enjoy unlimited music streaming on Mavrixfy.
              </p>
              <Button onClick={handleGoToApp} className="bg-green-500 hover:bg-green-600">
                Open Mavrixfy App
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}