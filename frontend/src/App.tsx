import { RouterProvider, createBrowserRouter, Navigate } from 'react-router-dom';
import { Suspense, lazy, useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { performanceService } from './services/performanceService';
import PerformanceMonitor from './components/PerformanceMonitor';
const MainLayout = lazy(() => import('./layout/MainLayout'));
const HomePage = lazy(() => import('./pages/home/HomePage'));
const SearchPage = lazy(() => import('./pages/search/SearchPage'));
const LibraryPage = lazy(() => import('./pages/LibraryPage'));
const LikedSongsPage = lazy(() => import('./pages/liked-songs/LikedSongsPage'));
const AlbumPage = lazy(() => import('./pages/album/AlbumPage'));
const PlaylistPage = lazy(() => import('./pages/playlist/PlaylistPage').then(m => ({ default: m.PlaylistPage })));
const SongPage = lazy(() => import('./pages/song/SongPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SpotifyCallback = lazy(() => import('./pages/SpotifyCallback'));
// import SharedSongPage from './pages/SharedSongPage';
import SplashScreen from './components/SplashScreen';
import { AuthProvider, useAuth } from './contexts/AuthContext';
// @ts-ignore
const ApiDebugPage = lazy(() => import('./pages/debug/ApiDebugPage.jsx'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const AppAuthPage = lazy(() => import('./pages/app-auth/AppAuthPage'));
import PWAInstallPrompt from './components/PWAInstallPrompt';
import AndroidPWAHelper from './components/AndroidPWAHelper';
import { useLocation } from 'react-router-dom';
import { SpotifyProvider } from './contexts/SpotifyContext';
import { ThemeProvider } from './components/ThemeProvider';

// Simple fallback pages for routes with import issues
const NotFoundFallback = () => (
	<div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
		<div className="text-center max-w-md">
			<h1 className="text-9xl font-bold text-primary mb-6">404</h1>
			<h2 className="text-2xl font-semibold mb-4 text-foreground">Page Not Found</h2>
			<p className="text-muted-foreground mb-8">
				The page you're looking for doesn't exist or has been moved.
			</p>
		</div>
	</div>
);

// Error page for when something goes wrong
const ErrorFallback = () => (
	<div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
		<div className="text-center max-w-md">
			<h1 className="text-4xl font-bold mb-4 text-foreground">Something went wrong</h1>
			<p className="text-muted-foreground mb-8">
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

  // Check if we're coming from a login redirect (smooth transition)
  const isFromLoginRedirect = sessionStorage.getItem('auth_redirect') === '1';

  // Don't redirect while auth is still loading
  if (loading) {
    // If we have cached auth, render children optimistically for smooth UX
    if (hasCachedAuth) {
      return <>{children}</>;
    }
    
    // If coming from login redirect, show minimal loading
    if (isFromLoginRedirect) {
      return (
        <div className="flex items-center justify-center h-screen bg-background">
          <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        </div>
      );
    }
    
    // Otherwise show loading indicator with smoother animation
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
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
  
  // Check if we're coming from a login redirect (smooth transition)
  const isFromLoginRedirect = sessionStorage.getItem('auth_redirect') === '1';
  
  // If we have cached auth or are authenticated, redirect to home immediately
  if (hasCachedAuth || isAuthenticated) {
    return <Navigate to="/home" replace />;
  }
  
  // Still loading, but no cached auth - show loading indicator
  if (loading && !hasCachedAuth) {
    // Smaller spinner for login redirects
    if (isFromLoginRedirect) {
      return (
        <div className="flex items-center justify-center h-screen bg-background">
          <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        </div>
      );
    }
    
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }
  
  // Not authenticated, go to login
  return <Navigate to="/login" replace />;
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
			path: '/spotify-callback',
			element: <SpotifyCallback />
		},
		{
			path: '/app-auth',
			element: <AppAuthPage />
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
					path: '/profile',
					element: <AuthGate><ProfilePage /></AuthGate>
				},
				{
					path: '/playlist/:id',
					element: <AuthGate><PlaylistPage /></AuthGate>
				},
				{
					path: '/song/:songId',
					element: <AuthGate><SongPage /></AuthGate>
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
				// Initialize performance optimizations
				performanceService.addResourceHints();
				// Mobile performance service initializes automatically
				
				// Check for cached authentication
				const hasCachedAuth = Boolean(
					localStorage.getItem('auth-store') && 
					JSON.parse(localStorage.getItem('auth-store') || '{}').isAuthenticated
				);
				
				const fromAuthRedirect = (() => { try { return sessionStorage.getItem('auth_redirect') === '1'; } catch { return false; } })();

				// Reduce splash screen time for logged-in users or after auth redirect
				if (hasCachedAuth || fromAuthRedirect) {
					// Skip delay entirely for authenticated users
					setInitialized(true);
					setShowSplash(false); // Skip splash screen completely
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

	// Prefetch critical lazy routes to reduce render delay for first navigation
	useEffect(() => {
		// Only prefetch after first paint to avoid blocking FCP
		const idle = (cb: () => void) => {
			if ('requestIdleCallback' in window) {
				(window as any).requestIdleCallback(cb, { timeout: 1500 });
			} else {
				setTimeout(cb, 800);
			}
		};

		idle(() => {
			// Warm important route chunks
			import('./layout/MainLayout');
			import('./pages/home/HomePage');
			import('./pages/search/SearchPage');
		});
	}, []);
	
	// Always show splash screen on initial load until initialization completes
	if (showSplash || !initialized) {
		return <SplashScreen onComplete={() => initialized && setShowSplash(false)} />;
	}
	
	// Always show main app content, login will be handled in the header
	return (
		<>
			<PerformanceMonitor enabled={process.env.NODE_ENV === 'development'} />
			<Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div></div>}>
				<RouterProvider 
					router={router} 
					future={{ v7_startTransition: true }} 
				/>
			</Suspense>
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
				<ThemeProvider>
					<AppContent />
				</ThemeProvider>
			</SpotifyProvider>
		</AuthProvider>
	);
}

export default App;
