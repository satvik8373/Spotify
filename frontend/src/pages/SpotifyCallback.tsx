import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAccessToken } from '@/services/spotifyService';
import { Loader2 } from 'lucide-react';

const SpotifyCallback: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Parse the URL to get authorization code
        const searchParams = new URLSearchParams(location.search);
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const storedState = localStorage.getItem('spotify_auth_state');
        
        // Clean up state from storage
        localStorage.removeItem('spotify_auth_state');
        
        // Check for error from Spotify
        if (error) {
          setStatus('error');
          setErrorMessage(`Authentication failed: ${error}`);
          return;
        }
        
        // Verify state to prevent CSRF attacks
        if (!state || state !== storedState) {
          setStatus('error');
          setErrorMessage('State verification failed. Please try again.');
          return;
        }
        
        // Exchange code for access token
        if (code) {
          const success = await getAccessToken(code);
          
          if (success) {
            setStatus('success');
            // Redirect after short delay to show success message
            setTimeout(() => {
              navigate('/spotify-playlists');
            }, 1500);
          } else {
            setStatus('error');
            setErrorMessage('Failed to get access token. Please try again.');
          }
        } else {
          setStatus('error');
          setErrorMessage('No authorization code received from Spotify.');
        }
      } catch (error) {
        console.error('Error in Spotify callback:', error);
        setStatus('error');
        setErrorMessage('An unexpected error occurred. Please try again.');
      }
    };
    
    handleCallback();
  }, [location.search, navigate]);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-900 text-white p-4">
      {status === 'loading' && (
        <div className="text-center">
          <Loader2 className="h-16 w-16 animate-spin text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Connecting to Spotify</h1>
          <p className="text-zinc-400">Please wait while we complete the authentication...</p>
        </div>
      )}
      
      {status === 'success' && (
        <div className="text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Successfully Connected!</h1>
          <p className="text-zinc-400">Redirecting you to your Spotify playlists...</p>
        </div>
      )}
      
      {status === 'error' && (
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Connection Failed</h1>
          <p className="text-zinc-400 mb-4">{errorMessage}</p>
          <button 
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-white"
          >
            Return to Home
          </button>
        </div>
      )}
    </div>
  );
};

export default SpotifyCallback; 