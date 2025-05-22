import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { handleCallback } from '../services/spotifyService';
import { Loader } from 'lucide-react';

const SpotifyCallback: React.FC = () => {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processAuth = async () => {
      try {
        const params = new URLSearchParams(location.search);
        const code = params.get('code');
        const error = params.get('error');

        if (error) {
          setError(`Authentication failed: ${error}`);
          setIsLoading(false);
          return;
        }

        if (!code) {
          setError('No authorization code received from Spotify');
          setIsLoading(false);
          return;
        }

        const success = await handleCallback(code);
        
        if (success) {
          setIsAuthenticated(true);
        } else {
          setError('Failed to authenticate with Spotify');
        }
      } catch (err) {
        setError('An error occurred during authentication');
        console.error('Authentication error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    processAuth();
  }, [location]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
        <Loader className="animate-spin h-10 w-10 text-[#1DB954] mb-4" />
        <p className="text-lg">Connecting to Spotify...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
        <div className="bg-red-900 p-4 rounded-md mb-4">
          <p className="text-lg">{error}</p>
        </div>
        <a href="/" className="text-[#1DB954] hover:underline">
          Return to Home
        </a>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return null;
};

export default SpotifyCallback; 