import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axiosInstance from '../lib/axios';

const SpotifyCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing Spotify authorization...');
  const [errorDetails, setErrorDetails] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        if (error) {
          setStatus('error');
          setMessage(`Spotify authorization failed: ${error}`);
          setErrorDetails('The authorization was denied or cancelled.');
          setTimeout(() => navigate('/home'), 5000);
          return;
        }

        if (!code) {
          setStatus('error');
          setMessage('No authorization code received from Spotify');
          setErrorDetails('The callback URL did not contain the required authorization code.');
          setTimeout(() => navigate('/home'), 5000);
          return;
        }

        if (!user) {
          setStatus('error');
          setMessage('Please log in first');
          setErrorDetails('You need to be logged in to connect your Spotify account.');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        setMessage('Exchanging authorization code for access tokens...');

        // Send the authorization code to your backend
        const response = await axiosInstance.post('/api/spotify/callback', {
          code,
          state,
          userId: user.id,
          redirect_uri: window.location.origin + '/spotify-callback'
        });

        if (response.data.access_token) {
          setStatus('success');
          setMessage('Successfully connected to Spotify!');
          setTimeout(() => navigate('/home'), 2000);
        } else {
          setStatus('error');
          setMessage('Failed to connect to Spotify');
          setErrorDetails('The server did not return valid access tokens.');
          setTimeout(() => navigate('/home'), 5000);
        }
      } catch (error: any) {
        console.error('Spotify callback error:', error);
        setStatus('error');
        
        // Handle different types of errors
        if (error.response?.status === 500) {
          const errorData = error.response.data;
          if (errorData.error === 'MISSING_CREDENTIALS') {
            setMessage('Spotify integration not configured');
            setErrorDetails('The server is missing Spotify API credentials. Please contact the administrator.');
          } else if (errorData.error === 'INVALID_CREDENTIALS') {
            setMessage('Invalid Spotify credentials');
            setErrorDetails('The server\'s Spotify API credentials are invalid.');
          } else {
            setMessage('Server error occurred');
            setErrorDetails(errorData.message || 'An unexpected server error occurred.');
          }
        } else if (error.response?.status === 400) {
          const errorData = error.response.data;
          if (errorData.error === 'INVALID_CODE') {
            setMessage('Invalid authorization code');
            setErrorDetails('The authorization code has expired or is invalid. Please try connecting again.');
          } else {
            setMessage('Bad request');
            setErrorDetails(errorData.message || 'The request was invalid.');
          }
        } else if (error.code === 'NETWORK_ERROR' || !error.response) {
          setMessage('Network error');
          setErrorDetails('Could not connect to the server. Please check your internet connection.');
        } else {
          setMessage('An error occurred while connecting to Spotify');
          setErrorDetails(error.response?.data?.message || error.message || 'Unknown error');
        }
        
        setTimeout(() => navigate('/home'), 5000);
      }
    };

    handleCallback();
  }, [searchParams, navigate, user]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-card rounded-lg p-8 shadow-lg">
          {status === 'loading' && (
            <>
              <div className="h-12 w-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold mb-2 text-foreground">Connecting to Spotify</h2>
              <p className="text-muted-foreground">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="h-12 w-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2 text-foreground">Success!</h2>
              <p className="text-muted-foreground">{message}</p>
              <p className="text-sm text-muted-foreground mt-2">Redirecting to home...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="h-12 w-12 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2 text-foreground">Connection Failed</h2>
              <p className="text-muted-foreground mb-2">{message}</p>
              {errorDetails && (
                <p className="text-sm text-muted-foreground mb-4 p-3 bg-muted rounded-md text-left">
                  {errorDetails}
                </p>
              )}
              <p className="text-sm text-muted-foreground">Redirecting to home...</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpotifyCallback;