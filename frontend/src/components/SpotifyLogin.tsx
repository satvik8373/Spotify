import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Music2, AlertCircle, CheckCircle2, Loader2, Heart } from 'lucide-react';
import { getLoginUrl, isAuthenticated as isSpotifyAuthenticated, logout as spotifyLogout } from '@/services/spotifyService';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SpotifyLoginProps {
  className?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showDisconnect?: boolean;
  compact?: boolean;
}

interface SpotifyLoginProps {
  className?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showDisconnect?: boolean;
  compact?: boolean;
}

const SpotifyLogin: React.FC<SpotifyLoginProps> = ({ 
  className, 
  variant = 'default',
  size = 'default',
  showDisconnect = true,
  compact = false
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [isAuth, setIsAuth] = useState<boolean>(false);

  // Sync auth state with storage and global events
  useEffect(() => {
    const updateAuth = () => setIsAuth(isSpotifyAuthenticated());

    updateAuth();
    const onAuthChanged = () => updateAuth();
    const onStorage = () => updateAuth();
    const onVisibility = () => { if (!document.hidden) updateAuth(); };

    window.addEventListener('spotify_auth_changed', onAuthChanged);
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisibility);

    const interval = setInterval(updateAuth, 60000);

    return () => {
      window.removeEventListener('spotify_auth_changed', onAuthChanged);
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(interval);
    };
  }, []);

  // Check configuration on mount
  useEffect(() => {
    const checkConfig = () => {
      const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
      const redirectUri = import.meta.env.VITE_REDIRECT_URI;
      
      if (!clientId) {
        setConfigError('Spotify CLIENT_ID is not configured');
      } else if (window.location.hostname === 'mavrixfy.site' && !redirectUri) {
        setConfigError('Production redirect URI not configured');
      } else {
        setConfigError(null);
      }
    };
    
    checkConfig();
  }, []);

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      
      const loginUrl = await getLoginUrl();
      
      if (!loginUrl || loginUrl === 'undefined' || loginUrl.includes('undefined')) {
        throw new Error('Invalid login URL generated');
      }
      
      // Redirect to Spotify
      window.location.href = loginUrl;
      
    } catch (error) {
      toast.error('Failed to connect with Spotify. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    try {
      spotifyLogout();
      toast.success('Disconnected from Spotify');
    } catch (error) {
      toast.error('Failed to disconnect from Spotify');
    }
  };

  const handleSync = () => {
    try {
      sessionStorage.setItem('spotify_sync_prompt', '1');
      window.location.href = '/liked-songs';
    } catch (error) {
      // Error navigating to sync
    }
  };

  // Show error state if configuration is missing
  if (configError) {
    return (
      <Button 
        disabled
        className={cn(
          "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20",
          compact && "h-8 px-3 text-xs",
          className
        )}
        variant="outline"
        size={size}
        title={configError}
      >
        <AlertCircle className={cn("h-4 w-4", compact && "h-3 w-3")} />
        {size !== 'icon' && !compact && <span className="ml-2">Config Error</span>}
      </Button>
    );
  }

  // Connected state with actions
  if (isAuth) {
    if (compact) {
      return (
        <div className={cn("flex items-center gap-2", className)}>
          <Button 
            onClick={handleSync}
            className={cn(
              "bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20",
              "h-8 px-3 text-xs font-medium"
            )}
            variant="outline"
            size="sm"
            title="Sync your Spotify liked songs"
          >
            <Heart className="h-3 w-3 mr-1.5" />
            Sync
          </Button>
          {showDisconnect && (
            <Button 
              onClick={handleDisconnect}
              className="h-8 px-2 text-xs"
              variant="ghost"
              size="sm"
              title="Disconnect from Spotify"
            >
              <CheckCircle2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className={cn("flex items-center gap-2 flex-wrap", className)}>
        <Button 
          onClick={handleSync}
          className={cn(
            "bg-green-500 hover:bg-green-600 text-white font-medium",
            "flex items-center gap-2 min-h-[44px]", // Touch-friendly height
            size === 'sm' && "h-9 px-3 text-sm",
            size === 'lg' && "h-12 px-6 text-base"
          )}
          variant={variant}
          size={size}
          title="Sync your Spotify liked songs"
        >
          <Heart className={cn("h-4 w-4", size === 'sm' && "h-3 w-3", size === 'lg' && "h-5 w-5")} />
          {size !== 'icon' && <span>Sync Spotify</span>}
        </Button>
        
        {showDisconnect && (
          <Button 
            onClick={handleDisconnect}
            className={cn(
              "border-red-500/30 text-red-500 hover:bg-red-500/10 hover:border-red-500/50",
              "min-h-[44px]", // Touch-friendly height
              size === 'sm' && "h-9 px-3 text-sm",
              size === 'lg' && "h-12 px-6 text-base"
            )}
            variant="outline"
            size={size}
            title="Disconnect from Spotify"
          >
            <CheckCircle2 className={cn("h-4 w-4", size === 'sm' && "h-3 w-3", size === 'lg' && "h-5 w-5")} />
            {size !== 'icon' && <span className="ml-2">Disconnect</span>}
          </Button>
        )}
      </div>
    );
  }

  // Default login button
  return (
    <Button 
      onClick={handleLogin} 
      disabled={isLoading}
      className={cn(
        "bg-[#1DB954] hover:bg-[#1ed760] text-white font-medium",
        "flex items-center gap-2 min-h-[44px]", // Touch-friendly height
        compact && "h-8 px-3 text-xs",
        size === 'sm' && !compact && "h-9 px-3 text-sm",
        size === 'lg' && "h-12 px-6 text-base",
        className
      )}
      variant={variant}
      size={size}
    >
      {isLoading ? (
        <>
          <Loader2 className={cn("h-4 w-4 animate-spin", compact && "h-3 w-3")} />
          {size !== 'icon' && !compact && <span>Connecting...</span>}
          {compact && <span>...</span>}
        </>
      ) : (
        <>
          <Music2 className={cn("h-4 w-4", compact && "h-3 w-3", size === 'lg' && "h-5 w-5")} />
          {size !== 'icon' && (
            <span>{compact ? 'Connect' : 'Connect Spotify'}</span>
          )}
        </>
      )}
    </Button>
  );
};

export default SpotifyLogin;
