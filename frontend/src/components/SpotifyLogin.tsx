import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Music2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getLoginUrl, isAuthenticated as isSpotifyAuthenticated, logout as spotifyLogout } from '@/services/spotifyService';
import { toast } from 'sonner';

interface SpotifyLoginProps {
  className?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const SpotifyLogin: React.FC<SpotifyLoginProps> = ({ 
  className, 
  variant = 'default',
  size = 'default'
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
      
      console.log('🔧 Spotify configuration check:');
      console.log('🔑 VITE_SPOTIFY_CLIENT_ID:', clientId ? 'Present' : 'Missing');
      console.log('🔗 VITE_REDIRECT_URI:', redirectUri || 'Not set (using fallback)');
      console.log('🌍 Current hostname:', window.location.hostname);
      
      if (!clientId) {
        setConfigError('Spotify CLIENT_ID is not configured');
        console.error('❌ Spotify CLIENT_ID is missing in environment variables');
      } else if (window.location.hostname === 'mavrixfy.site' && !redirectUri) {
        setConfigError('Production redirect URI not configured');
        console.error('❌ Production redirect URI not set for mavrixfy.site');
      } else {
        setConfigError(null);
        console.log('✅ Spotify configuration looks good');
      }
    };
    
    checkConfig();
  }, []);

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Spotify login button clicked');
      
      // Check environment
      const isProduction = window.location.hostname === 'mavrixfy.site' || 
                          window.location.hostname === 'www.mavrixfy.site';
      console.log('🌍 Environment:', isProduction ? 'Production' : 'Development');
      console.log('📍 Current URL:', window.location.href);
      
      const loginUrl = await getLoginUrl();
      console.log('🔗 Generated login URL:', loginUrl);
      
      if (!loginUrl || loginUrl === 'undefined' || loginUrl.includes('undefined')) {
        throw new Error('Invalid login URL generated');
      }
      
      // Redirect to Spotify
      window.location.href = loginUrl;
      
    } catch (error) {
      console.error('❌ Error getting Spotify login URL:', error);
      toast.error('Failed to connect with Spotify. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Show error state if configuration is missing
  if (configError) {
    return (
      <Button 
        disabled
        className={`bg-red-500 text-white font-bold flex items-center gap-2 ${className}`}
        variant={variant}
        size={size}
        title={configError}
      >
        <AlertCircle className="h-4 w-4" />
        {size !== 'icon' && <span>Configuration Error</span>}
      </Button>
    );
  }

  // Connected state with actions
  if (isAuth) {
    return (
      <div className={`flex items-center gap-2 ${className || ''}`}>
        <Button 
          onClick={() => {
            try { sessionStorage.setItem('spotify_sync_prompt', '1'); } catch {}
            try { window.location.href = '/liked-songs'; } catch {}
          }}
          className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg"
          variant={variant}
          size={size}
          title="Sync your Spotify liked songs"
        >
          <Music2 className="h-4 w-4" />
          {size !== 'icon' && <span>Sync Spotify</span>}
        </Button>
        <Button 
          onClick={() => {
            try { spotifyLogout(); } catch {}
          }}
          className="border-red-500/50 text-red-500 hover:bg-red-500/10 hover:border-red-500 font-medium px-4 py-2 rounded-lg"
          variant="outline"
          size={size}
          title="Disconnect from Spotify"
        >
          <CheckCircle2 className="h-4 w-4" />
          {size !== 'icon' && <span>Disconnect</span>}
        </Button>
      </div>
    );
  }

  // Default login button
  return (
    <Button 
      onClick={handleLogin} 
      disabled={isLoading}
      className={`bg-[#1DB954] hover:bg-[#1ed760] text-white font-bold flex items-center gap-2 ${className}`}
      variant={variant}
      size={size}
    >
      {isLoading ? (
        <>
          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
          Connecting...
        </>
      ) : (
        <>
          <Music2 className="h-4 w-4" />
          {size !== 'icon' && <span>Connect with Spotify</span>}
        </>
      )}
    </Button>
  );
};

export default SpotifyLogin;
