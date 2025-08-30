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

  // Show optimized loading state while auth is checking
  if (loading && !hasCachedAuth) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-900">
        <div className="loading-spinner-fast h-6 w-6 rounded-full border-2 border-t-green-500 border-r-transparent border-b-transparent border-l-transparent"></div>
      </div>
    );
  }

  // Only render the welcome page if definitely not authenticated
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-black flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-md mx-auto space-y-8">
        {/* Logo */}
        <div className="space-y-4">
          <img
            src="/spotify-icons/spotify-logo-green.svg"
            alt="Mavrixfy"
            className="h-16 w-16 mx-auto smooth-transition-fast"
            loading="eager"
          />
          <h1 className="text-4xl font-bold text-white smooth-transition-fast">
            Mavrixfy
          </h1>
          <p className="text-zinc-400 text-lg smooth-transition-fast">
            Your Ultimate Music Experience
          </p>
        </div>

        {/* Features */}
        <div className="space-y-4 text-left">
          <div className="flex items-center space-x-3 text-zinc-300">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Stream millions of songs</span>
          </div>
          <div className="flex items-center space-x-3 text-zinc-300">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Create and share playlists</span>
          </div>
          <div className="flex items-center space-x-3 text-zinc-300">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Discover new music</span>
          </div>
          <div className="flex items-center space-x-3 text-zinc-300">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>High-quality audio streaming</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4 pt-8">
          <Link
            to="/login"
            className="block w-full bg-green-500 hover:bg-green-600 text-black font-semibold py-3 px-6 rounded-full transition-all duration-150 transform hover:scale-105 active:scale-95 btn-interactive"
          >
            Get Started
          </Link>
          <Link
            to="/register"
            className="block w-full bg-transparent border-2 border-zinc-600 hover:border-zinc-500 text-white font-semibold py-3 px-6 rounded-full transition-all duration-150 transform hover:scale-105 active:scale-95 btn-interactive"
          >
            Create Account
          </Link>
        </div>

        {/* Footer */}
        <div className="pt-8 text-center">
          <p className="text-zinc-500 text-sm">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
} 