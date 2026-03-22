import { useRef, useState, useCallback } from 'react';
import AudioPlayerCore from './AudioPlayerCore';
import AudioPlayerUI from './AudioPlayerUI';

const AudioPlayer = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

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
        audioRef={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadingChange={handleLoadingChange}
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
