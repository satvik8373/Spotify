import React from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { usePlayerSync } from '@/hooks/usePlayerSync';

/**
 * Debug component to verify player state synchronization
 * This component shows both the store state and the synced state
 * to help debug any synchronization issues
 */
export const PlayerStateDebug = () => {
  const storeState = usePlayerStore();
  const syncedState = usePlayerSync();

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs font-mono z-50 max-w-xs">
      <div className="mb-2 font-bold">Player State Debug</div>
      
      <div className="mb-2">
        <div className="text-green-400">Store State:</div>
        <div>Playing: {storeState.isPlaying ? '▶️' : '⏸️'}</div>
        <div>Song: {storeState.currentSong?.title || 'None'}</div>
      </div>
      
      <div className="mb-2">
        <div className="text-blue-400">Synced State:</div>
        <div>Playing: {syncedState.isPlaying ? '▶️' : '⏸️'}</div>
        <div>Song: {syncedState.currentSong?.title || 'None'}</div>
      </div>
      
      <div>
        <div className="text-yellow-400">Audio Element:</div>
        <div>
          {(() => {
            const audio = document.querySelector('audio');
            if (!audio) return 'No audio element';
            return `${audio.paused ? '⏸️' : '▶️'} ${audio.ended ? '(ended)' : ''}`;
          })()}
        </div>
      </div>
      
      <div className="mt-2 text-xs text-gray-400">
        Sync: {storeState.isPlaying === syncedState.isPlaying ? '✅' : '❌'}
      </div>
    </div>
  );
};