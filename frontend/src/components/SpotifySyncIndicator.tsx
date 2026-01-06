/**
 * Spotify Sync Status Indicator Component
 * Shows a temporary UI message during sync operations
 */

import React from 'react';
import { Loader2, CheckCircle, AlertCircle, Music2 } from 'lucide-react';
import { useSpotifySyncStatus } from '@/hooks/useSpotifySyncStatus';
import { cn } from '@/lib/utils';

interface SpotifySyncIndicatorProps {
  className?: string;
  showWhenIdle?: boolean;
  compact?: boolean;
}

export const SpotifySyncIndicator: React.FC<SpotifySyncIndicatorProps> = ({
  className,
  showWhenIdle = false,
  compact = false,
}) => {
  const {
    status,
    message,
    progress,
    totalTracks,
    syncedTracks,
    error,
  } = useSpotifySyncStatus();

  // Don't show anything if idle and showWhenIdle is false
  if (status === 'idle' && !showWhenIdle) {
    return null;
  }

  // Compact version for inline display
  if (compact) {
    if (status === 'idle') return null;

    return (
      <div className={cn('flex items-center gap-2 text-sm', className)}>
        {(status === 'waiting' || status === 'syncing') && (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-[#1DB954]" />
            <span className="text-gray-400">
              {status === 'waiting' ? 'Preparing...' : `Syncing ${progress}%`}
            </span>
          </>
        )}
        {status === 'completed' && (
          <>
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-green-500">Synced</span>
          </>
        )}
        {status === 'error' && (
          <>
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-red-500">Sync failed</span>
          </>
        )}
      </div>
    );
  }

  // Full version with progress bar
  return (
    <div
      className={cn(
        'fixed top-4 left-1/2 -translate-x-1/2 z-50',
        'bg-zinc-900/95 backdrop-blur-sm border border-zinc-700 rounded-lg shadow-xl',
        'px-4 py-3 min-w-[300px] max-w-[400px]',
        'transition-all duration-300 ease-in-out',
        status === 'idle' && !showWhenIdle && 'opacity-0 pointer-events-none -translate-y-4',
        (status !== 'idle' || showWhenIdle) && 'opacity-100 translate-y-0',
        className
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {status === 'waiting' && (
            <div className="relative">
              <Music2 className="h-5 w-5 text-[#1DB954]" />
              <div className="absolute -top-1 -right-1 h-2 w-2 bg-[#1DB954] rounded-full animate-pulse" />
            </div>
          )}
          {status === 'syncing' && (
            <Loader2 className="h-5 w-5 animate-spin text-[#1DB954]" />
          )}
          {status === 'completed' && (
            <CheckCircle className="h-5 w-5 text-green-500" />
          )}
          {status === 'error' && (
            <AlertCircle className="h-5 w-5 text-red-500" />
          )}
          {status === 'idle' && (
            <Music2 className="h-5 w-5 text-gray-500" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {status === 'waiting' && 'Syncing your Spotify library…'}
            {status === 'syncing' && 'Syncing your Spotify library…'}
            {status === 'completed' && 'Sync complete!'}
            {status === 'error' && 'Sync failed'}
            {status === 'idle' && 'Ready to sync'}
          </p>
          
          <p className="text-xs text-gray-400 mt-0.5 truncate">
            {message || (status === 'idle' ? 'Your library is up to date' : '')}
          </p>

          {/* Progress bar for syncing state */}
          {status === 'syncing' && (
            <div className="mt-2">
              <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1DB954] rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {totalTracks > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {syncedTracks} / {totalTracks} songs
                </p>
              )}
            </div>
          )}

          {/* Error message */}
          {status === 'error' && error && (
            <p className="text-xs text-red-400 mt-1">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpotifySyncIndicator;
