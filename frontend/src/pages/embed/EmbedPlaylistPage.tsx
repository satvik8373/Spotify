import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import axiosInstance from '@/lib/axios';

interface Song {
  _id: string;
  title: string;
  artist: string;
  duration: number;
  audioUrl: string;
  imageUrl: string;
}

interface Playlist {
  _id: string;
  name: string;
  description: string;
  imageUrl: string;
  songs: Song[];
  user: {
    clerkId: string;
    fullName: string;
  };
}

const EmbedPlaylistPage = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const theme = searchParams.get('theme') || 'green';
  
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const volumeSliderRef = useRef<HTMLDivElement>(null);

  const bgColor = theme === 'dark' ? '#282828' : '#1DB954';

  // Update audio volume when volume state changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    const fetchPlaylist = async () => {
      try {
        const response = await axiosInstance.get(`/playlists/${id}`);
        setPlaylist(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch playlist:', error);
        setLoading(false);
      }
    };

    if (id) {
      fetchPlaylist();
    }
  }, [id]);

  // Handle time updates
  const handleTimeUpdate = () => {
    if (audioRef.current && !isDragging) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  // Handle metadata loaded
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  // Handle song end
  const handleEnded = () => {
    if (playlist && currentSongIndex < playlist.songs.length - 1) {
      setCurrentSongIndex(currentSongIndex + 1);
    } else {
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  // Handle play/pause
  const handlePlayPause = () => {
    if (!audioRef.current) return;

    const currentSong = playlist?.songs[currentSongIndex];
    if (!currentSong?.audioUrl) {
      console.error('Cannot play: No audio URL');
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      // Ensure audio source is set
      if (audioRef.current.src !== currentSong.audioUrl) {
        audioRef.current.src = currentSong.audioUrl;
        audioRef.current.load();
      }
      
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          console.log('Playback started');
        })
        .catch((error) => {
          console.error('Play error:', error);
          setIsPlaying(false);
        });
    }
  };

  // Handle previous
  const handlePrevious = () => {
    if (currentSongIndex > 0) {
      setCurrentSongIndex(currentSongIndex - 1);
      setCurrentTime(0);
      
      // Ensure playback continues
      setTimeout(() => {
        if (audioRef.current && isPlaying) {
          audioRef.current.play().catch((error) => {
            console.error('Play error on previous:', error);
            setIsPlaying(false);
          });
        }
      }, 150);
    }
  };

  // Handle next
  const handleNext = () => {
    if (playlist && currentSongIndex < playlist.songs.length - 1) {
      setCurrentSongIndex(currentSongIndex + 1);
      setCurrentTime(0);
      
      // Ensure playback continues
      setTimeout(() => {
        if (audioRef.current && isPlaying) {
          audioRef.current.play().catch((error) => {
            console.error('Play error on next:', error);
            setIsPlaying(false);
          });
        }
      }, 150);
    }
  };

  // Handle song click
  const handleSongClick = (index: number) => {
    const song = playlist?.songs[index];
    if (!song?.audioUrl) {
      console.error('Cannot play song: No audio URL');
      return;
    }
    
    setCurrentSongIndex(index);
    setCurrentTime(0);
    
    // Ensure audio plays after song change
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch((error) => {
            console.error('Play error on song click:', error);
            setIsPlaying(false);
          });
      }
    }, 150);
  };

  // Handle progress bar click/drag
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressBarRef.current || duration === 0) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(x / rect.width, 1));
    const newTime = percentage * duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handleProgressClick(e);
  };

  const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    handleProgressClick(e);
  };

  const handleProgressMouseUp = () => {
    setIsDragging(false);
  };

  // Handle volume toggle
  const handleVolumeToggle = () => {
    setIsMuted(!isMuted);
  };

  // Handle volume change
  const handleVolumeChange = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!volumeSliderRef.current) return;
    
    const rect = volumeSliderRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const percentage = Math.max(0, Math.min(1 - (y / rect.height), 1));
    const newVolume = Math.round(percentage * 100);
    
    setVolume(newVolume);
    if (newVolume > 0) {
      setIsMuted(false);
    }
  };

  // Global mouse up handler
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mouseup', handleGlobalMouseUp);
      return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }
  }, [isDragging]);

  // Auto-play when song changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !playlist) return;

    const currentSong = playlist.songs[currentSongIndex];
    
    if (!currentSong?.audioUrl) {
      console.error('No audio URL for song:', currentSong?.title);
      setIsPlaying(false);
      return;
    }

    // Debug logging
    console.log('Song changed:', {
      index: currentSongIndex,
      title: currentSong?.title,
      audioUrl: currentSong?.audioUrl,
      isPlaying
    });

    // Reset time when song changes
    setCurrentTime(0);
    setDuration(0);

    // Set the source and load
    audio.src = currentSong.audioUrl;
    audio.load();

    // Play if isPlaying is true
    if (isPlaying) {
      // Small delay to ensure audio is loaded
      const playTimeout = setTimeout(() => {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('Playback started successfully');
            })
            .catch((error) => {
              console.error('Auto-play error:', error);
              setIsPlaying(false);
            });
        }
      }, 100);

      return () => clearTimeout(playTimeout);
    }
  }, [currentSongIndex, playlist]);

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div
        className="w-full h-full flex items-center justify-center"
        style={{ backgroundColor: bgColor }}
      >
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent" />
      </div>
    );
  }

  if (!playlist) {
    return (
      <div
        className="w-full h-full flex items-center justify-center"
        style={{ backgroundColor: bgColor }}
      >
        <p className="text-white text-lg">Playlist not found</p>
      </div>
    );
  }

  const currentSong = playlist.songs[currentSongIndex];
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Debug: Log current song info
  console.log('Current song:', {
    title: currentSong?.title,
    audioUrl: currentSong?.audioUrl,
    hasAudioUrl: !!currentSong?.audioUrl,
    isPlaying,
    duration,
    currentTime
  });

  return (
    <div
      className="w-full h-screen overflow-hidden"
      style={{ backgroundColor: bgColor }}
    >
      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={(e) => {
          const target = e.currentTarget;
          console.error('Audio error:', {
            error: target.error,
            code: target.error?.code,
            message: target.error?.message,
            src: target.src,
            networkState: target.networkState,
            readyState: target.readyState
          });
          setIsPlaying(false);
        }}
        onCanPlay={() => {
          console.log('Audio can play');
        }}
        onLoadStart={() => {
          console.log('Audio load started');
        }}
        onLoadedData={() => {
          console.log('Audio data loaded');
        }}
        preload="auto"
        crossOrigin="anonymous"
        style={{ display: 'none' }}
      />
      
      <div className="h-full flex flex-col">
        {/* Header Section */}
        <div className="p-4 flex items-start gap-4 flex-shrink-0">
          <img
            src={playlist.imageUrl}
            alt={playlist.name}
            className="w-20 h-20 rounded-lg shadow-lg object-cover"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-bold text-lg truncate">{playlist.name}</h3>
                <p className="text-white/70 text-sm truncate">
                  {playlist.description || `Made for ${playlist.user.fullName}`}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <img 
                    src="/mavrixfy.png" 
                    alt="Mavrixfy" 
                    className="w-4 h-4 rounded-sm"
                  />
                  <span className="text-white/70 text-xs">Saved on Mavrixfy</span>
                </div>
              </div>
              <img 
                src="/mavrixfy.png" 
                alt="Mavrixfy Logo" 
                className="w-8 h-8 rounded-lg flex-shrink-0"
              />
            </div>
          </div>
        </div>

        {/* Player Controls */}
        <div className="px-4 pb-3 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrevious}
                disabled={currentSongIndex === 0}
                className="text-white/70 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <SkipBack className="h-5 w-5" fill="currentColor" />
              </button>
              <button
                onClick={handlePlayPause}
                className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5 text-black" fill="currentColor" />
                ) : (
                  <Play className="h-5 w-5 text-black ml-0.5" fill="currentColor" />
                )}
              </button>
              <button
                onClick={handleNext}
                disabled={currentSongIndex === playlist.songs.length - 1}
                className="text-white/70 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <SkipForward className="h-5 w-5" fill="currentColor" />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-white/70 text-xs font-medium">
                {formatTime(currentTime)}
              </span>
              
              {/* Volume Control */}
              <div 
                className="relative"
                onMouseEnter={() => setShowVolumeSlider(true)}
                onMouseLeave={() => setShowVolumeSlider(false)}
              >
                <button 
                  onClick={handleVolumeToggle}
                  className="text-white/70 hover:text-white transition-colors"
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                </button>
                
                {/* Volume Slider */}
                {showVolumeSlider && (
                  <div className="absolute bottom-full right-0 mb-2 p-2 bg-black/90 rounded-lg shadow-lg">
                    <div 
                      ref={volumeSliderRef}
                      className="relative w-8 h-24 bg-white/20 rounded-full cursor-pointer"
                      onClick={handleVolumeChange}
                    >
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-white rounded-full transition-all"
                        style={{ height: `${isMuted ? 0 : volume}%` }}
                      />
                      <div 
                        className="absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-lg"
                        style={{ bottom: `${isMuted ? 0 : volume}%`, marginBottom: '-6px' }}
                      />
                    </div>
                    <div className="text-white text-xs text-center mt-1">
                      {isMuted ? 0 : volume}%
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Progress Bar - Draggable */}
          <div 
            ref={progressBarRef}
            className="relative h-1 bg-white/20 rounded-full overflow-visible cursor-pointer group"
            onClick={handleProgressClick}
            onMouseDown={handleProgressMouseDown}
            onMouseMove={handleProgressMouseMove}
            onMouseUp={handleProgressMouseUp}
            onMouseLeave={handleProgressMouseUp}
          >
            <div
              className="absolute left-0 top-0 h-full bg-white rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
            {/* Draggable handle */}
            <div 
              className={cn(
                "absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg transition-opacity",
                "group-hover:opacity-100",
                isDragging ? "opacity-100 scale-125" : "opacity-0"
              )}
              style={{ left: `${progress}%`, marginLeft: '-6px' }}
            />
          </div>
        </div>

        {/* Song List */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-hide">
          {playlist.songs.map((song, index) => (
            <div
              key={song._id}
              className={cn(
                'flex items-center gap-3 py-2 px-2 rounded hover:bg-white/10 transition-colors cursor-pointer group',
                index === currentSongIndex && isPlaying && 'bg-white/10'
              )}
              onClick={() => handleSongClick(index)}
              title={song.audioUrl ? `Play: ${song.title}` : `No audio available for: ${song.title}`}
            >
              <span className="text-white/50 text-sm w-4 text-right">{index + 1}</span>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm font-medium truncate",
                  song.audioUrl ? "text-white" : "text-white/30"
                )}>
                  {song.title}
                  {!song.audioUrl && <span className="text-red-400 ml-2">(No audio)</span>}
                </p>
                <p className="text-white/60 text-xs truncate">{song.artist}</p>
              </div>
              <span className="text-white/50 text-xs">{formatTime(song.duration)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EmbedPlaylistPage;
