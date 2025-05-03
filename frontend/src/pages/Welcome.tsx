import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Welcome = () => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users to home page
  useEffect(() => {
    if (isAuthenticated && !loading) {
      navigate('/home', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-between bg-gradient-to-b from-green-900 to-black p-6">
      {/* Header */}
      <div className="w-full flex items-center justify-center pt-6">
        <div className="flex items-center">
          <svg viewBox="0 0 16 16" className="h-8 w-8 text-white" fill="currentColor">
            <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm3.669 11.538a.498.498 0 0 1-.686.165c-1.879-1.147-4.243-1.407-7.028-.77a.499.499 0 0 1-.222-.973c3.048-.696 5.662-.397 7.77.892a.5.5 0 0 1 .166.686zm.979-2.178a.624.624 0 0 1-.858.205c-2.15-1.321-5.428-1.704-7.972-.932a.625.625 0 0 1-.362-1.194c2.905-.881 6.517-.454 8.986 1.063a.624.624 0 0 1 .206.858zm.084-2.268C10.154 5.56 5.9 5.419 3.438 6.166a.748.748 0 1 1-.434-1.432c2.825-.857 7.523-.692 10.492 1.07a.747.747 0 1 1-.764 1.288z"/>
          </svg>
          <span className="ml-2 text-white text-xl font-semibold">Spotify x Mavrix</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center text-center max-w-md">
        <h1 className="text-5xl font-bold text-white mb-4">Music for everyone.</h1>
        <p className="text-xl text-white mb-10">Millions of songs. No credit card needed.</p>
        
        <Link to="/register" className="mb-4 w-full max-w-xs">
          <button className="w-full bg-green-500 hover:bg-green-400 text-black font-bold py-3 px-8 rounded-full transition-colors">
            SIGN UP
          </button>
        </Link>
        
        <Link to="/login" className="w-full max-w-xs">
          <button className="w-full bg-transparent hover:bg-zinc-800 text-white font-bold py-3 px-8 rounded-full border border-white transition-colors">
            LOG IN
          </button>
        </Link>
      </div>

      {/* Footer */}
      <div className="w-full text-center py-4 text-zinc-400 text-sm">
        <p>© 2025 Spotify x Mavrix</p>
        <p className="mt-1">Developed By Satvik Patel</p>
      </div>
    </div>
  );
};

export default Welcome; 