import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { handleCallback, isAuthenticated as isSpotifyAuthenticated, debugAuthenticationState } from '../services/spotifyService';
import { Loader, AlertCircle, CheckCircle, Bug } from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';

const SpotifyCallback: React.FC = () => {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    const processAuth = async () => {
      try {
        const params = new URLSearchParams(location.search);
        const code = params.get('code');
        const error = params.get('error');
        const state = params.get('state');

        // Check if this is a mobile request by looking for mobile user agent or state parameter
        const isMobileRequest = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                               state?.includes('mobile') ||
                               params.get('mobile') === 'true';

        console.log('Callback processing:', {
          isMobileRequest,
          userAgent: navigator.userAgent,
          state,
          code: code ? 'present' : 'missing',
          error
        });

        // If this is a mobile request, redirect to mobile app
        if (isMobileRequest && code) {
          console.log('🔄 Redirecting to mobile app with authorization code');
          const mobileDeepLink = `mavrixfy://spotify-callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state || '')}`;
          
          // Try to redirect to mobile app
          window.location.href = mobileDeepLink;
          
          // Show mobile redirect UI
          setIsLoading(false);
          return;
        }

        if (error) {
          console.error('Spotify returned error:', error);
          setError('Spotify authentication was cancelled or failed');
          setErrorDetails(`Error: ${error}`);
          setIsLoading(false);
          return;
        }

        if (!code) {
          console.error('No authorization code received from Spotify');
          setError('No authorization code received');
          setErrorDetails('The authentication process was incomplete. Please try again.');
          setIsLoading(false);
          return;
        }

        console.log('Starting Spotify authentication process...');
        console.log('Authorization code received:', code ? 'present' : 'missing');
        console.log('User ID:', user?.id);
        
        const success = await handleCallback(code, user?.id);
        
        if (success) {
          console.log('Spotify authentication successful!');
          
          // Verify tokens are actually stored and valid
          if (isSpotifyAuthenticated()) {
            console.log('Tokens verified and stored successfully');
            try { sessionStorage.setItem('spotify_sync_prompt', '1'); } catch {}
            
            // Add a small delay to ensure tokens are properly stored
            await new Promise(resolve => setTimeout(resolve, 500));
            
            setIsAuthenticated(true);
          } else {
            console.error('Tokens not found after successful authentication');
            setError('Authentication completed but tokens not stored');
            setErrorDetails('Please try logging in again. If the problem persists, check your browser console for more details.');
          }
        } else {
          console.log('Spotify authentication failed - handleCallback returned false');
          setError('Authentication process incomplete');
          setErrorDetails('The authentication process did not complete successfully. Check the console for detailed logs.');
        }
      } catch (err: any) {
        console.error('Authentication error:', err);
        setError('Authentication process encountered an error');
        setErrorDetails(err?.message || 'An unexpected error occurred. Check the console for more details.');
      } finally {
        setIsLoading(false);
      }
    };

    processAuth();
  }, [location, user?.id]);

  if (isLoading) {
    const params = new URLSearchParams(location.search);
    const isMobileRequest = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                           params.get('state')?.includes('mobile') ||
                           params.get('mobile') === 'true';
    
    if (isMobileRequest && params.get('code')) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
          <div className="bg-green-900/20 border border-green-500/50 p-6 rounded-lg mb-6 max-w-md text-center">
            <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
            <h2 className="text-xl font-semibold text-green-400 mb-2">Authentication Successful!</h2>
            <p className="text-sm text-gray-300 mb-4">Redirecting you back to Mavrixfy app...</p>
            <div className="flex justify-center">
              <Loader className="animate-spin h-6 w-6 text-[#1DB954]" />
            </div>
          </div>
          <p className="text-xs text-gray-400 text-center max-w-sm">
            If you're not redirected automatically, please check if the Mavrixfy app is installed on your device.
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
        <Loader className="animate-spin h-10 w-10 text-[#1DB954] mb-4" />
        <p className="text-lg">Connecting to Spotify...</p>
        <p className="text-sm text-gray-400 mt-2">Please wait while we complete the authentication</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
        <div className="bg-red-900/20 border border-red-500/50 p-6 rounded-lg mb-6 max-w-md">
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle className="h-6 w-6 text-red-400" />
            <h2 className="text-xl font-semibold text-red-400">{error}</h2>
          </div>
          {errorDetails && (
            <p className="text-sm text-gray-300 mb-4">{errorDetails}</p>
          )}
          <div className="text-xs text-gray-400 space-y-1">
            <p>• Check that your Spotify app is properly configured</p>
            <p>• Verify the redirect URI matches exactly</p>
            <p>• Ensure you're logged into the correct Spotify account</p>
          </div>
        </div>
        <div className="flex gap-4">
          <a href="/" className="text-[#1DB954] hover:underline px-4 py-2 border border-[#1DB954] rounded-lg">
            Return to Home
          </a>
          <button 
            onClick={() => window.location.reload()} 
            className="text-white hover:text-[#1DB954] px-4 py-2 border border-gray-600 rounded-lg hover:border-[#1DB954]"
          >
            Try Again
          </button>
          <button 
            onClick={() => {
              console.log('=== Manual Debug Triggered ===');
              debugAuthenticationState();
              alert('Check browser console for detailed authentication state');
            }} 
            className="text-gray-400 hover:text-[#1DB954] px-4 py-2 border border-gray-600 rounded-lg hover:border-[#1DB954] flex items-center gap-2"
          >
            <Bug className="h-4 w-4" />
            Debug
          </button>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
        <div className="bg-green-900/20 border border-green-500/50 p-6 rounded-lg mb-6 max-w-md text-center">
          <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
          <h2 className="text-xl font-semibold text-green-400 mb-2">Authentication Successful!</h2>
          <p className="text-sm text-gray-300">Redirecting to Liked Songs...</p>
        </div>
        <Navigate to="/liked-songs" replace />
      </div>
    );
  }

  return null;
};

export default SpotifyCallback; 