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
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-800 to-black text-white">
        {/* Header with logo */}
        <header className="p-6 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-green-500 fill-current">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.52 17.34c-.24.36-.66.48-1.02.24-2.82-1.74-6.36-2.1-10.56-1.14-.42.12-.78-.18-.9-.54-.12-.42.18-.78.54-.9 4.56-1.02 8.52-.6 11.64 1.32.42.18.48.66.3 1.02zm1.44-3.3c-.3.42-.84.6-1.26.3-3.24-1.98-8.16-2.58-11.94-1.38-.48.12-1.02-.12-1.14-.6-.12-.48.12-1.02.6-1.14 4.38-1.32 9.78-.66 13.5 1.62.36.18.54.78.24 1.2zm.12-3.36c-3.84-2.28-10.2-2.5-13.86-1.38-.6.12-1.2-.24-1.32-.84-.12-.6.24-1.2.84-1.32 4.26-1.26 11.28-1.02 15.72 1.62.54.3.78 1.02.42 1.56-.3.42-1.02.66-1.8.36z"/>
            </svg>
            <span className="text-xl font-bold tracking-tight">Spotify<span className="text-green-500"> x  </span>Mavrix</span>
          </div>
          <Link 
            to="/about" 
            className="text-zinc-400 hover:text-white transition-colors duration-200"
          >
            About
          </Link>
        </header>

        {/* Main content */}
        <main className="flex-1 flex items-center justify-center p-4 md:p-8">
          <div className="max-w-4xl w-full grid md:grid-cols-2 gap-12 items-center">
            <div className="text-center md:text-left space-y-6">
              <div className="space-y-3">
                <h1 className="text-5xl md:text-6xl font-bold text-white">
                  Music without <span className="text-green-500">limits</span>
                </h1>
                <p className="text-xl text-zinc-300">Premium sound quality. Unlimited songs. Zero ads.</p>
              </div>
              
              <div className="space-y-4 max-w-sm mx-auto md:mx-0">
                <Link
                  to="/register"
                  className="block w-full bg-green-500 hover:bg-green-400 text-black font-medium py-3.5 px-6 rounded-full transition duration-200 text-center"
                >
                  Start Free Trial
                </Link>
                <Link
                  to="/login"
                  className="block w-full bg-transparent border border-white hover:bg-white/10 text-white font-medium py-3.5 px-6 rounded-full transition duration-200 text-center"
                >
                  Log In
                </Link>
              </div>
              
              <p className="text-sm text-zinc-400">
                No credit card required for free trial. Cancel anytime.
              </p>
            </div>
            
            {/* Creative visual element */}
            <div className="hidden md:block relative">
              <div className="absolute w-64 h-64 bg-green-500/20 rounded-full blur-2xl -z-10 animate-pulse"></div>
              <div className="relative bg-zinc-800/80 p-6 rounded-lg backdrop-blur-sm border border-zinc-700">
                <div className="aspect-square rounded-md overflow-hidden shadow-lg mb-6">
                  <img 
                    src="/default-playlist.jpg" 
                    alt="Music visualization" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="space-y-4">
                  <div className="h-3 bg-zinc-700 rounded-full w-3/4"></div>
                  <div className="h-2 bg-zinc-700 rounded-full w-1/2"></div>
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 text-black fill-current">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                    <div className="flex space-x-2">
                      <div className="w-8 h-8 rounded-full bg-zinc-700"></div>
                      <div className="w-8 h-8 rounded-full bg-zinc-700"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer with credits */}
        <footer className="py-6 px-4 border-t border-zinc-800">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-zinc-400 text-sm">
                  © 2025 Spotify×Mavrix. All rights reserved.
                </p>
                <p className="text-zinc-500 text-xs mt-1">
                  Developed by Satvik Patel & Team
                </p>
              </div>
              <div className="md:text-right">
                <div className="flex space-x-4 md:justify-end">
                  <a href="#" className="text-zinc-400 hover:text-green-500 transition-colors">
                    Terms
                  </a>
                  <a href="#" className="text-zinc-400 hover:text-green-500 transition-colors">
                    Privacy
                  </a>
                  <a href="#" className="text-zinc-400 hover:text-green-500 transition-colors">
                    Support
                  </a>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    );
  }
  
  // Fallback return (should not reach here due to the redirect)
  return null;
} 