import { useRef, useState, useCallback } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import AudioPlayerCore from './AudioPlayerCore';
import AudioPlayerUI from './AudioPlayerUI';
import AudioPlayerMediaSession from './AudioPlayerMediaSession';

const AudioPlayer = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const { currentSong, isPlaying } = usePlayerStore();

  // Optimized time update handler
  const handleTimeUpdate = useCallback((time: number, dur: number) => {
    setCurrentTime(time);
    setDuration(dur);
  }, []);

  // Optimized loading state handler
  const handleLoadingChange = useCallback((_loading: boolean) => {
    // Loading state is handled internally by AudioPlayerCore
    // This callback is kept for future extensibility
  }, []);

  return (
    <>
      <AudioPlayerCore
        onTimeUpdate={handleTimeUpdate}
        onLoadingChange={handleLoadingChange}
      />
      
      <AudioPlayerMediaSession
        currentSong={currentSong}
        isPlaying={isPlaying}
        audioRef={audioRef}
      />
      
      <AudioPlayerUI
        currentTime={currentTime}
        duration={duration}
        audioRef={audioRef}
      />
    </>
  );
};

export default AudioPlayer;