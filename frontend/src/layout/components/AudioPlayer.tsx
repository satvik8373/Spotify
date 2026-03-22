import { useRef, useCallback } from 'react';
import AudioPlayerCore from './AudioPlayerCore';

const AudioPlayer = () => {
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleTimeUpdate = useCallback((_time: number, _duration: number) => {
    // AudioPlayerCore is the authoritative player engine.
    // Time is stored in the global player store from core events.
  }, []);

  const handleLoadingChange = useCallback((_loading: boolean) => {
    // Loading state is handled internally by AudioPlayerCore.
  }, []);

  return (
    <AudioPlayerCore
      audioRef={audioRef}
      onTimeUpdate={handleTimeUpdate}
      onLoadingChange={handleLoadingChange}
    />
  );
};

export default AudioPlayer;
