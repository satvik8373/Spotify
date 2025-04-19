import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';
import { Loader } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';

/**
 * This component handles the authentication callback after a user signs in.
 * It updates the auth store and redirects to the home page.
 */
const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wait for auth to be loaded
    if (!isLoaded) return;

    try {
      // Update the auth state in the store
      const userId = user?.id || null;
      useAuthStore.getState().setAuthStatus(!!isSignedIn, userId);

      // Redirect to home page after successful authentication
      if (isSignedIn) {
        navigate('/');
      } else {
        setError('Authentication failed. Please try again.');
      }
    } catch (err) {
      console.error('Error in auth callback:', err);
      setError('An error occurred during authentication. Please try again.');
    }
  }, [isLoaded, isSignedIn, navigate, user]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-900">
        <div className="text-center">
          <h1 className="text-xl font-medium text-red-500 mb-2">Authentication Error</h1>
          <p className="text-zinc-400">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-zinc-800 text-white rounded-md hover:bg-zinc-700"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-900">
      <div className="mb-4">
        <Loader className="w-12 h-12 animate-spin text-green-500" />
      </div>
      <h1 className="text-xl font-medium text-white mb-2">Authentication successful</h1>
      <p className="text-zinc-400">Redirecting you to the music app...</p>
    </div>
  );
};

export default AuthCallbackPage; 