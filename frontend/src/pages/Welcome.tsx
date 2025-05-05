import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function Welcome() {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();
  
  // Check for cached authentication for an immediate redirect
  const hasCachedAuth = Boolean(
    localStorage.getItem('auth-store') && 
    JSON.parse(localStorage.getItem('auth-store') || '{}').isAuthenticated
  );

  // Immediately redirect authenticated users to home page
  useEffect(() => {
    // If we have cached auth or are authenticated, redirect to home immediately
    if (hasCachedAuth || isAuthenticated) {
      navigate("/home", { replace: true });
    }
  }, [isAuthenticated, navigate, hasCachedAuth]);

  // Show loading state while auth is checking
  if (loading && !hasCachedAuth) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-900">
        <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  // Only render the welcome page if definitely not authenticated
  if (!isAuthenticated && !hasCachedAuth) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-zinc-900 to-black text-white">
        <main className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="text-center max-w-md">
            <h1 className="text-5xl font-bold mb-8 text-green-500">Mavrix</h1>
            <p className="text-xl mb-10">Your music, your way.</p>
            
            <div className="space-y-4">
              <Link
                to="/register"
                className="block w-full bg-green-500 hover:bg-green-600 text-black font-medium py-3 px-4 rounded-full transition duration-200"
              >
                Sign up free
              </Link>
              <Link
                to="/login"
                className="block w-full bg-transparent border border-white hover:bg-white/10 text-white font-medium py-3 px-4 rounded-full transition duration-200"
              >
                Log in
              </Link>
            </div>
          </div>
        </main>
        <footer className="p-4 text-center text-zinc-400 text-sm">
          <p>© 2023 Mavrix. All rights reserved.</p>
        </footer>
      </div>
    );
  }
  
  // Fallback return (should not reach here due to the redirect)
  return null;
} 