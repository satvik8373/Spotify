import React from 'react';
import { Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface SpotifySyncStatusProps {
  status: 'idle' | 'syncing' | 'completed' | 'error';
  message?: string;
  progress?: { loaded: number; total: number | null } | null;
  onRetry?: () => void;
  className?: string;
  showWhenIdle?: boolean;
}

/**
 * Component to display Spotify sync status with progress indicator.
 * Shows a temporary message during sync operations.
 */
export function SpotifySyncStatus({
  status,
  message,
  progress,
  onRetry,
  className = '',
  showWhenIdle = false,
}: SpotifySyncStatusProps) {
  // Don't show anything when idle unless explicitly requested
  if (status === 'idle' && !showWhenIdle) {
    return null;
  }

  // Auto-hide completed status after 3 seconds
  const [visible, setVisible] = React.useState(true);
  
  React.useEffect(() => {
    if (status === 'completed') {
      const timer = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(timer);
    }
    setVisible(true);
  }, [status]);

  if (!visible && status === 'completed') {
    return null;
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'syncing':
        return <Loader2 className="w-4 h-4 animate-spin text-green-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'syncing':
        return 'bg-green-500/10 border-green-500/20 text-green-400';
      case 'completed':
        return 'bg-green-500/10 border-green-500/20 text-green-400';
      case 'error':
        return 'bg-red-500/10 border-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/10 border-gray-500/20 text-gray-400';
    }
  };

  return (
    <div
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg border text-sm
        transition-all duration-300 ease-in-out
        ${getStatusColor()}
        ${className}
      `}
    >
      {getStatusIcon()}
      
      <span className="flex-1">
        {message || (status === 'syncing' ? 'Syncing your Spotify library...' : '')}
        {progress && status === 'syncing' && (
          <span className="ml-1 text-xs opacity-70">
            ({progress.loaded}{progress.total ? `/${progress.total}` : ''})
          </span>
        )}
      </span>

      {status === 'error' && onRetry && (
        <button
          onClick={onRetry}
          className="p-1 hover:bg-white/10 rounded transition-colors"
          title="Retry sync"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default SpotifySyncStatus;
