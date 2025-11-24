import { useEffect, useState } from 'react';
import { signInWithGoogle } from '@/services/hybridAuthService';
import { auth } from '@/lib/firebase';

export default function AppAuthPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Check if user is already authenticated
    const currentUser = auth.currentUser;
    if (currentUser) {
      // User already logged in, send token back to app
      sendTokenToApp(currentUser.uid);
    }
  }, []);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      await signInWithGoogle();
      
      // Get Firebase ID token
      const user = auth.currentUser;
      if (user) {
        const idToken = await user.getIdToken();
        
        // Send token back to app
        sendTokenToApp(user.uid, idToken);
      }
    } catch (err: any) {
      console.error('Sign-in error:', err);
      setError(err.message || 'Failed to sign in');
      setLoading(false);
    }
  };

  const sendTokenToApp = (userId: string, token?: string) => {
    // Create a custom URL scheme that the app can intercept
    const authData = {
      userId,
      token: token || '',
      email: auth.currentUser?.email || '',
      name: auth.currentUser?.displayName || '',
      picture: auth.currentUser?.photoURL || '',
    };

    // Encode data
    const encodedData = btoa(JSON.stringify(authData));
    
    // Store in localStorage for app to read
    localStorage.setItem('app_auth_data', JSON.stringify(authData));
    
    // Mark as authenticated
    sessionStorage.setItem('app_authenticated', '1');
    
    // Try to communicate with app via custom URL scheme
    const appUrl = `mavrixfy://auth?data=${encodedData}`;
    
    // Try to redirect to app (will fail in browser, that's ok)
    try {
      window.location.href = appUrl;
    } catch (e) {
      // Ignore error
    }
    
    // Show success message
    setSuccess(true);
    setLoading(false);
    
    // Redirect to home page after a short delay
    setTimeout(() => {
      window.location.href = '/home';
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-blue-500 mb-4">
            <svg
              className="w-10 h-10 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Sign in to Mavrixfy
          </h1>
          <p className="text-gray-400">
            Continue with your Google account
          </p>
        </div>

        {/* Sign-in Card */}
        <div className="bg-gray-900 rounded-2xl p-8 shadow-2xl border border-gray-800">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-green-400 text-sm font-medium">
                ✓ Successfully signed in! Redirecting...
              </p>
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={loading || success}
            className="w-full bg-white hover:bg-gray-100 text-gray-900 font-semibold py-4 px-6 rounded-full transition-all duration-200 flex items-center justify-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              By continuing, you agree to Mavrixfy's{' '}
              <a href="/terms" className="text-blue-400 hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="text-blue-400 hover:underline">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>

        {/* Info */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            This page is for authenticating the Mavrixfy mobile app
          </p>
        </div>
      </div>
    </div>
  );
}
