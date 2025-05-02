import React, { useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/useAuthStore';

/**
 * Welcome page that serves as the landing page for unauthenticated users
 */
const WelcomePage = () => {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const returnTo = searchParams.get('return_to');

  // Redirect authenticated users to the app home page
  useEffect(() => {
    if (isAuthenticated) {
      navigate(returnTo && returnTo !== '/' ? returnTo : '/app');
    }
  }, [isAuthenticated, navigate, returnTo]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 to-black flex flex-col">
      {/* Header */}
      <header className="p-4 flex justify-between items-center">
        <div className="flex items-center">
          <svg viewBox="0 0 16 16" className="h-8 w-8 text-white" fill="currentColor">
            <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm3.669 11.539a.498.498 0 0 1-.686.166c-1.878-1.148-4.243-1.408-7.028-.772a.499.499 0 0 1-.222-.972c3.048-.696 5.662-.396 7.77.892a.5.5 0 0 1 .166.686zm.979-2.178a.624.624 0 0 1-.858.205c-2.15-1.322-5.428-1.705-7.972-.932a.624.624 0 1 1-.362-1.194c2.905-.881 6.517-.455 8.987 1.063a.624.624 0 0 1 .205.858zm.084-2.269c-2.578-1.531-6.832-1.672-9.294-.925a.75.75 0 1 1-.435-1.434c2.826-.858 7.523-.692 10.492 1.07a.75.75 0 0 1-.763 1.29z" />
          </svg>
          <span className="text-white text-xl font-bold ml-2">Spotify x Mavrix</span>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
          Music for everyone.
        </h1>
        <p className="text-xl md:text-2xl text-white mb-10 max-w-2xl">
          Millions of songs. No credit card needed.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <Button 
            asChild
            className="bg-green-500 hover:bg-green-400 text-black font-bold py-3 px-10 rounded-full text-lg"
          >
            <Link to={`/register${returnTo ? `?return_to=${encodeURIComponent(returnTo)}` : ''}`}>SIGN UP</Link>
          </Button>
          
          <Button 
            asChild
            variant="outline"
            className="border-2 border-white text-white hover:scale-105 py-3 px-10 rounded-full text-lg"
          >
            <Link to={`/login${returnTo ? `?return_to=${encodeURIComponent(returnTo)}` : ''}`}>LOG IN</Link>
          </Button>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="p-6 text-center text-zinc-400">
        <p className="text-sm">© {new Date().getFullYear()} Spotify x Mavrix</p>
        <p className="text-xs mt-1">Developed By Satvik Patel</p>
      </footer>
    </div>
  );
};

export default WelcomePage; 