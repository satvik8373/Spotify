import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { handleGoogleCallback } from '../../services/auth-service';
import { Loader } from 'lucide-react';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const storedState = localStorage.getItem('oauth_state');

        if (!code) {
          throw new Error('No authorization code received');
        }

        if (state !== storedState) {
          throw new Error('Invalid state parameter');
        }

        // Clear the state from localStorage
        localStorage.removeItem('oauth_state');

        // Handle the Google callback
        await handleGoogleCallback(code);

        // Redirect to home page
        navigate('/');
      } catch (err) {
        console.error('Auth callback error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Authentication Error</h1>
          <p className="text-zinc-400 mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-zinc-800 text-white rounded-md hover:bg-zinc-700 transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-900">
      <div className="text-center">
        <Loader className="w-8 h-8 animate-spin text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Completing Sign In</h1>
        <p className="text-zinc-400">Please wait while we complete your authentication...</p>
      </div>
    </div>
  );
};

export default AuthCallback; 