import { useEffect } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  useEffect(() => {
    // Check if user is already authenticated from cache
    const hasCachedAuth = Boolean(
      localStorage.getItem('auth-store') && 
      JSON.parse(localStorage.getItem('auth-store') || '{}').isAuthenticated
    );
    
    // For cached authenticated users, complete immediately
    // For new users, show splash for a minimum time to prevent flickering
    const delay = hasCachedAuth ? 0 : 500;
    
    const timer = setTimeout(onComplete, delay);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black"
      aria-label="Mavrixfy splash screen"
    >
      {/* Inline SVG to avoid network request and reduce LCP */}
      <svg
        viewBox="0 0 24 24"
        width={96}
        height={96}
        className="h-24 w-24"
        role="img"
        aria-label="App icon"
      >
        <circle cx="12" cy="12" r="12" fill="#1DB954" />
        <path
          d="M17.52 17.34c-.24.36-.66.48-1.02.24-2.82-1.74-6.36-2.1-10.56-1.14-.42.12-.78-.18-.9-.54-.12-.42.18-.78.54-.9 4.56-1.02 8.52-.6 11.64 1.32.42.18.48.66.3 1.02zm1.44-3.3c-.3.42-.84.6-1.26.3-3.24-1.98-8.16-2.58-11.94-1.38-.48.12-1.02-.12-1.14-.6-.12-.48.12-1.02.6-1.14 4.38-1.32 9.78-.66 13.5 1.62.36.18.54.78.24 1.2zm.12-3.36c-3.84-2.28-10.2-2.5-13.86-1.38-.6.12-1.2-.24-1.32-.84-.12-.6.24-1.2.84-1.32 4.26-1.26 11.28-1.02 15.72 1.62.54.3.78 1.02.42 1.56-.3.42-1.02.66-1.8.36z"
          fill="#000"
        />
      </svg>
    </div>
  );
};

export default SplashScreen;
