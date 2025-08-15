import { RouterProvider, createBrowserRouter, Navigate } from 'react-router-dom';
import MainLayout from './layout/MainLayout';
import HomePage from './pages/home/HomePage';
import SearchPage from './pages/search/SearchPage';
import LibraryPage from './pages/LibraryPage';
import LikedSongsPage from './pages/liked-songs/LikedSongsPage';
import { Toaster } from 'react-hot-toast';
import AlbumPage from './pages/album/AlbumPage';
import { PlaylistPage } from './pages/playlist/PlaylistPage';
import SharedSongPage from './pages/SharedSongPage';
import { useState, useEffect } from "react";
import SplashScreen from './components/SplashScreen';
import { AuthProvider, useAuth } from './contexts/AuthContext';
// @ts-ignore
import ApiDebugPage from './pages/debug/ApiDebugPage.jsx';
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import Welcome from './pages/Welcome';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import AndroidPWAHelper from './components/AndroidPWAHelper';
import { useLocation } from 'react-router-dom';
import { SpotifyProvider } from './contexts/SpotifyContext';

// Simple fallback pages for routes with import issues
const NotFoundFallback = () => (
	<div className="min-h-screen flex flex-col items-center justify-center bg-zinc-900 p-4">
		<div className="text-center max-w-md">
			<h1 className="text-9xl font-bold text-green-500 mb-6">404</h1>
			<h2 className="text-2xl font-semibold mb-4">Page Not Found</h2>
			<p className="text-zinc-400 mb-8">
				The page you're looking for doesn't exist or has been moved.
			</p>
		</div>
	</div>
);

// Error page for when something goes wrong
const ErrorFallback = () => (
	<div className="min-h-screen flex flex-col items-center justify-center bg-zinc-900 p-4">
		<div className="text-center max-w-md">
			<h1 className="text-4xl font-bold mb-4">Something went wrong</h1>
			<p className="text-zinc-400 mb-8">
				We're sorry, but there was an error loading this page. Please try refreshing.
			</p>
		</div>
	</div>
);

// Auth gate that redirects to login if not authenticated
const AuthGate = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  
  // Check if we previously saved auth info in localStorage as a quick check
  // before the full authentication process completes
  const hasCachedAuth = Boolean(
    localStorage.getItem('auth-store') && 
    JSON.parse(localStorage.getItem('auth-store') || '{}').isAuthenticated
  );

  // Don't redirect while auth is still loading
  if (loading) {
    // If we have cached auth, render children optimistically
    if (hasCachedAuth) {
      return <>{children}</>;
    }
    
    // Otherwise show loading indicator
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-900">
        <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  // If not authenticated, redirect to login with return URL
  if (!isAuthenticated) {
    // Store the redirect path so we can redirect back after login
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // User is authenticated, render children
  return <>{children}</>;
};

// Landing page router redirector - checks auth status and redirects accordingly
const LandingRedirector = () => {
  const { isAuthenticated, loading } = useAuth();
  const hasCachedAuth = Boolean(
    localStorage.getItem('auth-store') && 
    JSON.parse(localStorage.getItem('auth-store') || '{}').isAuthenticated
  );
  
  // If we have cached auth or are authenticated, redirect to home
  if (hasCachedAuth || isAuthenticated) {
    return <Navigate to="/home" replace />;
  }
  
  // Still loading, but no cached auth - show loading indicator
  if (loading && !hasCachedAuth) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-900">
        <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }
  
  // Not authenticated, show welcome page
  return <Welcome />;
};

// Configure the router with React Router v6
const router = createBrowserRouter(
	[
		{
			path: '/',
			element: <LandingRedirector />
		},
		{
			path: '/login',
			element: <Login />
		},
		{
			path: '/register',
			element: <Register />
		},
		{
			path: '/reset-password',
			element: <ResetPassword />
		},
		{
			element: <MainLayout />,
			errorElement: <ErrorFallback />,
			children: [
				{
					path: '/home',
					element: <AuthGate><HomePage /></AuthGate>
				},
				{
					path: '/albums/:albumId',
					element: <AuthGate><AlbumPage /></AuthGate>
				},
				{
					path: '/library',
					element: <AuthGate><LibraryPage /></AuthGate>
				},
				{
					path: '/liked-songs',
					element: <AuthGate><LikedSongsPage /></AuthGate>
				},
				{
					path: '/search',
					element: <AuthGate><SearchPage /></AuthGate>
				},
				{
					path: '/playlist/:id',
					element: <AuthGate><PlaylistPage /></AuthGate>
				},
				{
					path: '/debug/api',
					element: <ApiDebugPage />
				},
				{
					path: '*',
					element: <NotFoundFallback />
				}
			]
		}
	]
);

function AppContent() {
	const [showSplash, setShowSplash] = useState(true);
	const [initialized, setInitialized] = useState(false);
	
	// Initialize Firestore data and check if user is already logged in
	useEffect(() => {
		const initializeApp = async () => {
			try {
				// Check for cached authentication
				const hasCachedAuth = Boolean(
					localStorage.getItem('auth-store') && 
					JSON.parse(localStorage.getItem('auth-store') || '{}').isAuthenticated
				);
				
				// Reduce splash screen time for logged-in users
				if (hasCachedAuth) {
					// For logged-in users, reduce splash screen time to minimum
					setTimeout(() => {
						setInitialized(true);
					}, 500); // Reduce to just 500ms for authenticated users
				} else {
					// For new visitors, keep the normal timing
					setTimeout(() => {
						setInitialized(true);
					}, 1000);
				}
			} catch (error) {
				console.error("Error initializing app:", error);
				// Continue anyway in case of initialization errors
				setInitialized(true);
			}
		};
		
		initializeApp();
	}, []);
	
	// Always show splash screen on initial load until initialization completes
	if (showSplash || !initialized) {
		return <SplashScreen onComplete={() => initialized && setShowSplash(false)} />;
	}
	
	// Always show main app content, login will be handled in the header
	return (
		<>
			<RouterProvider 
				router={router} 
				future={{ v7_startTransition: true }} 
			/>
			<Toaster />
			<PWAInstallPrompt />
			<AndroidPWAHelper />
		</>
	);
}

function App() {
	// Set CSS variable for viewport height to handle mobile browsers
	useEffect(() => {
		const setVh = () => {
			const vh = window.innerHeight * 0.01;
			document.documentElement.style.setProperty('--vh', `${vh}px`);
		};

		// Set initially and on resize
		setVh();
		window.addEventListener('resize', setVh);
		window.addEventListener('orientationchange', setVh);

		return () => {
			window.removeEventListener('resize', setVh);
			window.removeEventListener('orientationchange', setVh);
		};
	}, []);

	return (
		<AuthProvider>
			<SpotifyProvider>
				<AppContent />
			</SpotifyProvider>
		</AuthProvider>
	);
}

export default App;
