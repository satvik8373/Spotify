import { usePlayerStore } from '@/stores/usePlayerStore';
import { shallow } from 'zustand/shallow';

/**
 * Thin selector wrapper for player state used across UI surfaces.
 * Keeps a single source of truth in the store and avoids local mirror state.
 */
export const usePlayerSync = () =>
  usePlayerStore(
    (state) => ({
      isPlaying: state.isPlaying,
      currentSong: state.currentSong,
    }),
    shallow
  );

