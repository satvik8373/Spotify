import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useLikedSongsStore } from '@/stores/useLikedSongsStore';
import { Heart, SkipBack, SkipForward, Play, Pause, Bluetooth, Speaker, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { ShuffleButton } from '@/components/ShuffleButton';
import SongDetailsView from '@/components/SongDetailsView';
import { useAlbumColors } from '@/hooks/useAlbumColors';
import OptimizedImage from '@/components/OptimizedImage';
import { resolveArtist } from '@/lib/resolveArtist';
import { toast } from 'react-hot-toast';

// Format time helper function
const formatTime = (seconds: number) => {
  if (isNaN(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

// Memoized MarqueeText component
const MarqueeText = React.memo(({ text, className }: { text: string, className?: string }) => {
  const [needsScroll, setNeedsScroll] = useState(false);
  const [startAnimation, setStartAnimation] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkIfScrollNeeded = () => {
      if (containerRef.current && textRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const textWidth = textRef.current.scrollWidth;
        const needsScrolling = textWidth > containerWidth;
        setNeedsScroll(needsScrolling);

        if (needsScrolling) {
          setStartAnimation(false);
          // Use requestIdleCallback instead of setTimeout to avoid performance violations
          const idleCallback = (window as any).requestIdleCallback ?
            (window as any).requestIdleCallback(() => setStartAnimation(true), { timeout: 3000 }) :
            setTimeout(() => setStartAnimation(true), 3000);

          return () => {
            if ((window as any).requestIdleCallback && typeof idleCallback === 'number') {
              (window as any).cancelIdleCallback(idleCallback);
            } else {
              clearTimeout(idleCallback as number);
            }
          };
        } else {
          setStartAnimation(false);
        }
      }
    };

    checkIfScrollNeeded();
    const resizeObserver = new ResizeObserver(checkIfScrollNeeded);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [text]);

  if (!needsScroll) {
    return (
      <div ref={containerRef} className="overflow-hidden w-full">
        <div ref={textRef} className={`truncate ${className}`}>
          {text}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="overflow-hidden w-full relative">
      <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-black/50 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-black/70 to-transparent z-10 pointer-events-none" />
      <div
        ref={textRef}
        className={className}
        style={{
          display: 'inline-block',
          whiteSpace: 'nowrap',
          paddingRight: '50px',
          animation: startAnimation ? 'marqueeScroll 12s ease-in-out infinite' : 'none',
        }}
      >
        {text}
      </div>
    </div>
  );
});

interface AudioPlayerUIProps {
  currentTime: number;
  duration: number;
  audioRef: React.RefObject<HTMLAudioElement>;
}

const AudioPlayerUI: React.FC<AudioPlayerUIProps> = ({
  currentTime,
  duration,
  audioRef
}) => {
  const [isFullscreenMobile, setIsFullscreenMobile] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showSongDetails, setShowSongDetails] = useState(false);
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDevice, setCurrentDevice] = useState<string>('');
  const deviceSelectorRef = useRef<HTMLDivElement>(null);

  const {
    currentSong,
    isPlaying,
    playNext,
    setCurrentTime,
    togglePlay
  } = usePlayerStore();

  const { likedSongIds, toggleLikeSong } = useLikedSongsStore();
  const albumColors = useAlbumColors(currentSong?.imageUrl);

  const playerStore = usePlayerStore();
  const playPrevious = playerStore.playPrevious;

  // Update like status when song or liked songs change
  useEffect(() => {
    if (!currentSong) return;
    const songId = (currentSong as any).id || currentSong._id;
    const liked = songId ? likedSongIds?.has(songId) : false;
    setIsLiked(liked);
  }, [currentSong, likedSongIds]);

  // Listen for like updates from other components
  useEffect(() => {
    const handleLikeUpdate = (e: Event) => {
      if (!currentSong) return;
      const songId = (currentSong as any).id || currentSong._id;

      if (e instanceof CustomEvent && e.detail) {
        if (e.detail.songId && e.detail.songId !== songId) {
          return;
        }
        if (typeof e.detail.isLiked === 'boolean') {
          setIsLiked(e.detail.isLiked);
          return;
        }
      }

      const freshCheck = songId ? likedSongIds?.has(songId) : false;
      setIsLiked(freshCheck);
    };

    document.addEventListener('likedSongsUpdated', handleLikeUpdate);
    document.addEventListener('songLikeStateChanged', handleLikeUpdate);

    return () => {
      document.removeEventListener('likedSongsUpdated', handleLikeUpdate);
      document.removeEventListener('songLikeStateChanged', handleLikeUpdate);
    };
  }, [currentSong, likedSongIds]);

  // Keyboard controls for mobile player
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFullscreenMobile) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        playPrevious?.();
      } else if (e.code === 'ArrowRight') {
        playNext();
      } else if (e.code === 'Escape') {
        setIsFullscreenMobile(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreenMobile, playNext, playPrevious, togglePlay]);

  // Device selector handlers
  const handleDeviceSelection = useCallback(async (deviceId: string) => {
    try {
      if (!audioRef.current) return;

      const wasPlaying = !audioRef.current.paused;
      const currentTime = audioRef.current.currentTime;

      if (wasPlaying) {
        audioRef.current.pause();
      }

      if ('setSinkId' in HTMLMediaElement.prototype) {
        await (audioRef.current as any).setSinkId(deviceId);
        setCurrentDevice(deviceId);

        document.dispatchEvent(new CustomEvent('audioDeviceChanged', {
          detail: { deviceId }
        }));

        if (wasPlaying) {
          audioRef.current.currentTime = currentTime;
          audioRef.current.play().catch(() => { });
        }

        toast.success('Connected to audio device');
      } else {
        toast.error('Your browser does not support audio output device selection');
      }

      setShowDeviceSelector(false);
    } catch (error) {
      toast.error('Failed to connect to device');
    }
  }, [audioRef]);

  const fetchAvailableDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        toast.error('Media devices not supported by your browser');
        return;
      }

      await navigator.mediaDevices.getUserMedia({ audio: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioOutputDevices = devices.filter(device =>
        device.kind === 'audiooutput' && device.deviceId !== 'default'
      );

      if (audioOutputDevices.length === 0) {
        toast('No external audio devices found');
      }

      setAvailableDevices(audioOutputDevices);

      if (audioRef.current && 'sinkId' in audioRef.current) {
        setCurrentDevice((audioRef.current as any).sinkId);
      }
    } catch (error) {
      toast.error('Could not access audio devices');
    }
  }, [audioRef]);

  const toggleDeviceSelector = useCallback(() => {
    if (!showDeviceSelector) {
      fetchAvailableDevices();
    }
    setShowDeviceSelector(prev => !prev);
  }, [showDeviceSelector, fetchAvailableDevices]);

  // Close device selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (deviceSelectorRef.current && !deviceSelectorRef.current.contains(e.target as Node)) {
        setShowDeviceSelector(false);
      }
    };

    if (showDeviceSelector) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDeviceSelector]);

  // Listen for device changes
  useEffect(() => {
    const handleDeviceChange = () => {
      if (showDeviceSelector) {
        fetchAvailableDevices();
      }
    };

    navigator.mediaDevices?.addEventListener('devicechange', handleDeviceChange);

    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [showDeviceSelector, fetchAvailableDevices]);

  // Event handlers
  const handleSeek = useCallback((value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      if (setCurrentTime) {
        setCurrentTime(value[0]);
      }

      try {
        const playerState = {
          currentSong: currentSong,
          currentTime: value[0],
          timestamp: new Date().toISOString()
        };
        localStorage.setItem('player_state', JSON.stringify(playerState));
      } catch (error) {
        // Silent error handling
      }
    }
  }, [audioRef, setCurrentTime, currentSong]);

  const handleLikeToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();

    if (!currentSong) return;

    const songId = (currentSong as any).id || currentSong._id;
    setIsLiked(!isLiked);
    toggleLikeSong(currentSong);

    document.dispatchEvent(new CustomEvent('songLikeStateChanged', {
      detail: {
        songId,
        song: currentSong,
        isLiked: !isLiked,
        timestamp: Date.now(),
        source: 'AudioPlayer'
      }
    }));
  }, [currentSong, isLiked, toggleLikeSong]);

  const handlePlayPause = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    togglePlay();
  }, [togglePlay]);

  const handlePrevious = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    playPrevious?.();
  }, [playPrevious]);

  const handleNext = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    playNext();
  }, [playNext]);

  if (!currentSong) {
    return null;
  }

  return (
    <>
      <SongDetailsView
        isOpen={showSongDetails}
        onClose={() => setShowSongDetails(false)}
      />

      {/* Device selector dropdown */}
      {showDeviceSelector && (
        <div
          ref={deviceSelectorRef}
          className="fixed bottom-16 right-4 sm:bottom-16 sm:right-4 z-50 bg-zinc-900 rounded-md shadow-lg border border-zinc-800 w-72 overflow-hidden"
        >
          <div className="flex items-center justify-between p-3 border-b border-zinc-800">
            <h3 className="text-sm font-medium">Connect to a device</h3>
            <button
              onClick={() => setShowDeviceSelector(false)}
              className="text-zinc-400 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {availableDevices.length === 0 ? (
              <div className="p-4 text-sm text-zinc-400 text-center">
                No devices found. Make sure your Bluetooth is on.
              </div>
            ) : (
              <ul className="py-1">
                <li
                  className={`px-4 py-2 flex items-center hover:bg-zinc-800 cursor-pointer ${currentDevice === '' ? 'bg-zinc-800/50 text-green-500' : 'text-white'}`}
                  onClick={() => handleDeviceSelection('')}
                >
                  <Speaker size={16} className="mr-2" />
                  <span className="text-sm">This device</span>
                  {currentDevice === '' && (
                    <span className="ml-auto text-xs text-green-500">Connected</span>
                  )}
                </li>

                {availableDevices.map((device) => (
                  <li
                    key={device.deviceId}
                    className={`px-4 py-2 flex items-center hover:bg-zinc-800 cursor-pointer ${currentDevice === device.deviceId ? 'bg-zinc-800/50 text-green-500' : 'text-white'}`}
                    onClick={() => handleDeviceSelection(device.deviceId)}
                  >
                    <Bluetooth size={16} className="mr-2" />
                    <span className="text-sm truncate max-w-[180px]">
                      {device.label || `Device (${device.deviceId.slice(0, 8)}...)`}
                    </span>
                    {currentDevice === device.deviceId && (
                      <span className="ml-auto text-xs text-green-500">Connected</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-zinc-800 p-3">
            <button
              onClick={fetchAvailableDevices}
              className="w-full bg-green-600 hover:bg-green-700 text-white text-xs font-medium py-1.5 px-3 rounded-full"
            >
              Refresh Devices
            </button>
          </div>
        </div>
      )}

      {/* Desktop mini player */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-gradient-to-b from-zinc-900/80 to-black border-t border-zinc-800/50 h-16 z-40 hidden transition-all duration-300"
        onClick={(e) => {
          e.preventDefault();
          setShowSongDetails(true);
        }}
      >
        <div className="relative h-full flex items-center justify-between px-4">
          <div className="flex items-center gap-3 flex-1 min-w-0 max-w-[45%]">
            {currentSong && (
              <>
                <div className="h-10 w-10 flex-shrink-0 rounded overflow-hidden cursor-pointer">
                  <img
                    src={currentSong.imageUrl}
                    alt={currentSong.title}
                    className="h-full w-full object-cover bg-zinc-800"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://cdn.iconscout.com/icon/free/png-256/free-music-1779799-1513951.png';
                    }}
                  />
                </div>

                <div className="truncate min-w-0 flex-1">
                  <MarqueeText
                    text={currentSong.title || "Unknown Title"}
                    className="text-sm font-medium text-white"
                  />
                  <MarqueeText
                    text={resolveArtist(currentSong)}
                    className="text-xs text-zinc-300"
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 text-white p-0"
              onClick={handlePrevious}
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            <Button
              size="icon"
              className="h-10 w-10 rounded-full bg-white text-black flex items-center justify-center p-0"
              onClick={handlePlayPause}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4 translate-x-0.5" />
              )}
            </Button>

            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 text-white p-0"
              onClick={handleNext}
            >
              <SkipForward className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'text-white hover:bg-white/10 h-9 w-9',
                isLiked && 'text-green-500'
              )}
              onClick={handleLikeToggle}
            >
              <Heart
                className="h-4 w-4"
                fill={isLiked ? 'currentColor' : 'none'}
              />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'text-white hover:bg-white/10 h-9 w-9 ml-1',
                showDeviceSelector && 'text-green-500 bg-white/10'
              )}
              onClick={(e) => {
                e.stopPropagation();
                toggleDeviceSelector();
              }}
            >
              <Bluetooth className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
          <div
            className="h-full bg-green-500"
            style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
          />
        </div>
      </div>

      {/* Fullscreen mobile player */}
      {isFullscreenMobile && currentSong && (
        <div
          className="fixed inset-0 z-50 bg-black flex flex-col"
          style={{
            background: albumColors.isLight
              ? `linear-gradient(to bottom, ${albumColors.secondary.replace('rgb', 'rgba').replace(')', ', 0.95)')}, ${albumColors.primary.replace('rgb', 'rgba').replace(')', ', 0.85)')})`
              : `linear-gradient(to bottom, ${albumColors.primary.replace('rgb', 'rgba').replace(')', ', 0.95)')}, ${albumColors.secondary.replace('rgb', 'rgba').replace(')', ', 0.85)')})`
          }}
        >
          <div className="flex justify-between items-center p-4">
            <button
              onClick={() => setIsFullscreenMobile(false)}
              className="text-white p-2"
            >
              <X className="h-6 w-6" />
            </button>
            <div className="text-white text-sm">Now Playing</div>
            <div className="w-10"></div>
          </div>

          <div className="flex-1 flex items-center justify-center p-6">
            <div
              className="w-full max-w-xs aspect-square rounded-md overflow-hidden shadow-2xl"
              style={{ boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)" }}
            >
              <OptimizedImage
                src={currentSong.imageUrl}
                alt={currentSong.title}
                className="w-full h-full object-cover"
                width={300}
                height={300}
                quality={85}
                priority={true}
                fallbackSrc="https://cdn.iconscout.com/icon/free/png-256/free-music-1779799-1513951.png"
              />
            </div>
          </div>

          <div className="px-6 pt-4">
            <h2
              className={cn(
                "text-xl font-bold truncate mb-1 audio-title-high-contrast",
                albumColors.isLight ? "audio-title-light" : "audio-title-dark"
              )}
            >
              {currentSong.title}
            </h2>
            <p
              className={cn(
                "text-sm truncate mb-6 audio-title-high-contrast",
                albumColors.isLight ? "audio-title-light" : "audio-title-dark"
              )}
            >
              {currentSong.artist}
            </p>
          </div>

          <div className="px-6 mb-2">
            <div className="flex items-center gap-2">
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={1}
                className="cursor-pointer"
                onValueChange={handleSeek}
              />
            </div>
            <div className="flex justify-between mt-1 mb-6">
              <span
                className={cn(
                  "text-xs",
                  albumColors.isLight ? "text-black/70" : "text-white/70"
                )}
              >
                {formatTime(currentTime)}
              </span>
              <span
                className={cn(
                  "text-xs",
                  albumColors.isLight ? "text-black/70" : "text-white/70"
                )}
              >
                {formatTime(duration)}
              </span>
            </div>
          </div>

          <div className="px-6 pb-12">
            <div className="flex items-center justify-between mb-8">
              <ShuffleButton
                size="md"
                accentColor={albumColors.accent}
                className="h-10 w-10"
              />

              <Button
                size="icon"
                variant="ghost"
                className={cn(
                  "h-10 w-10",
                  albumColors.isLight ? "text-black" : "text-white"
                )}
                onClick={handlePrevious}
              >
                <SkipBack className="h-6 w-6" />
              </Button>

              <Button
                size="icon"
                className={cn(
                  "h-14 w-14 rounded-full flex items-center justify-center",
                  albumColors.isLight ? "bg-black text-white" : "bg-white text-black"
                )}
                onClick={handlePlayPause}
              >
                {isPlaying ? (
                  <Pause className="h-7 w-7" />
                ) : (
                  <Play className="h-7 w-7 ml-1" />
                )}
              </Button>

              <Button
                size="icon"
                variant="ghost"
                className={cn(
                  "h-10 w-10",
                  albumColors.isLight ? "text-black" : "text-white"
                )}
                onClick={handleNext}
              >
                <SkipForward className="h-6 w-6" />
              </Button>

              <Button
                size="icon"
                variant="ghost"
                className={cn(
                  "h-10 w-10",
                  isLiked ? "text-green-500" : albumColors.isLight ? "text-black/70" : "text-white/70"
                )}
                onClick={handleLikeToggle}
              >
                <Heart className="h-5 w-5" fill={isLiked ? "currentColor" : "none"} />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AudioPlayerUI;