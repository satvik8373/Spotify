import React from 'react';
import { useAudioBridge } from '@/hooks/useAudioBridge';

/**
 * AudioPlayerMediaSession - Now delegates to useAudioBridge
 *
 * The bridge handles:
 * - MediaSession action handlers (play, pause, next, prev, seek)
 * - AudioContext connection for Bluetooth stability
 * - Position state updates for lock screen progress
 * - Metadata updates for CarPlay/lock screen display
 */

interface AudioPlayerMediaSessionProps {
  currentSong: any;
  isPlaying: boolean;
  audioRef: React.RefObject<HTMLAudioElement>;
}

const AudioPlayerMediaSession: React.FC<AudioPlayerMediaSessionProps> = ({
  audioRef
}) => {
  // All MediaSession logic is now handled by useAudioBridge
  // This includes handler registration, metadata updates, position state, etc.
  useAudioBridge(audioRef);

  return null; // This component doesn't render anything
};

export default AudioPlayerMediaSession;
