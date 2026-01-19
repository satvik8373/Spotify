import React, { useEffect, useState } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { usePlayerSync } from '@/hooks/usePlayerSync';

/**
 * Debug component to verify player state synchronization
 * This component shows both the store state and the synced state
 * to help debug any synchronization issues, especially flickering after lock screen
 */
export const PlayerStateDebug = () => {
  const storeState = usePlayerStore();
  const syncedState = usePlayerSync();
  const [flickerCount, setFlickerCount] = useState(0);
  const [lastStateChange, setLastStateChange] = useState<string>('');

  // Track state changes to detect flickering
  useEffect(() => {
    const now = new Date().toLocaleTimeString();
    if (storeState.isPlaying !== syncedState.isPlaying) {
      setFlickerCount(prev => prev + 1);
      setLastStateChange(`Mismatch at ${now}`);
    } else {
      setLastStateChange(`Synced at ${now}`);
    }
  }, [storeState.isPlaying, syncedState.isPlaying]);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/90 text-white p-3 rounded-lg text-xs font-mono z-50 max-w-xs border border-gray-600">
      <div className="mb-2 font-bold text-green-400">Player State Debug</div>
      
      <div className="mb-2">
        <div className="text-blue-400">Store:</div>
        <div>Playing: {storeState.isPlaying ? '▶️' : '⏸️'}</div>
        <div className="truncate">Song: {storeState.currentSong?.title || 'None'}</div>
      </div>
      
      <div className="mb-2">
        <div className="text-purple-400">Synced:</div>
        <div>Playing: {syncedState.isPlaying ? '▶️' : '⏸️'}</div>
        <div className="truncate">Song: {syncedState.currentSong?.title || 'None'}</div>
      </div>
      
      <div className="mb-2">
        <div className="text-yellow-400">Audio:</div>
        <div>
          {(() => {
            const audio = document.querySelector('audio');
            if (!audio) return 'No audio element';
            return `${audio.paused ? '⏸️' : '▶️'} ${audio.ended ? '(ended)' : ''}`;
          })()}
        </div>
      </div>
      
      <div className="text-xs">
        <div className={`${storeState.isPlaying === syncedState.isPlaying ? 'text-green-400' : 'text-red-400'}`}>
          Sync: {storeState.isPlaying === syncedState.isPlaying ? '✅' : '❌'}
        </div>
        <div className="text-orange-400">
          Flickers: {flickerCount}
        </div>
        <div className="text-gray-400 text-[10px] mt-1">
          {lastStateChange}
        </div>
      </div>
    </div>
  );
};