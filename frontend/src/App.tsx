import { RouterProvider, createBrowserRouter, Navigate } from 'react-router-dom';
import { Suspense, lazy, useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { performanceService } from './services/performanceService';
import { spotifyAutoSyncService } from './services/spotifyAutoSyncService';
import PerformanceMonitor from './components/PerformanceMonitor';
import { clearAuthRedirectState } from './utils/clearAuthRedirectState';
import { getLocalStorageJSON, getSessionStorage } from './utils/storageUtils';
import { PageLoading, Loading } from './components/ui/loading';
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
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const About = lazy(() => import('./pages/About'));
// import SharedSongPage from './pages/SharedSongPage';
import SplashScreen from './components/SplashScreen';
import { AuthProvider, useAuth } from './contexts/AuthContext';
//
const ApiDebugPage = lazy(() => import('./pages/debug/ApiDebugPage.jsx'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
import PWAInstallPrompt from './components/PWAInstallPrompt';
import AndroidPWAHelper from './components/AndroidPWAHelper';
import { useLocation } from 'react-router-dom';
import { SpotifyProvider } from './contexts/SpotifyContext';



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
	const hasCachedAuth = getLocalStorageJSON('auth-store', { isAuthenticated: false }).isAuthenticated;

	// Check if we're coming from a login redirect (smooth transition)
	const isFromLoginRedirect = getSessionStorage('auth_redirect') === '1';

	// Don't redirect while auth is still loading
	if (loading) {
		// If we have cached auth, render children optimistically for smooth UX
		if (hasCachedAuth) {
			return <>{children}</>;
		}

		// If coming from login redirect, show minimal loading
		if (isFromLoginRedirect) {
			return <Loading size="sm" />;
		}

		// Otherwise show loading indicator with smoother animation
		return <Loading size="md" />;
	}

	// If not authenticated, redirect to login with return URL
	if (!isAuthenticated) {
		// Store the redirect path so we can redirect back after login
		return <Navigate to="/login" state={{ from: location.pathname }} replace />;
	}

	// User is authenticated, render children
	return <>{children}</>;
};

const LandingRedirector = () => {
	const { isAuthenticated, loading } = useAuth();
	const hasCachedAuth = getLocalStorageJSON('auth-store', { isAuthenticated: false }).isAuthenticated;

	// Check if we're coming from a login redirect (smooth transition)
	const isFromLoginRedirect = getSessionStorage('auth_redirect') === '1';

	// If we have cached auth or are authenticated, redirect to home immediately
	if (hasCachedAuth || isAuthenticated) {
		return <Navigate to="/home" replace />;
	}

	// Still loading, but no cached auth - show loading indicator
	if (loading && !hasCachedAuth) {
		// Smaller spinner for login redirects
		if (isFromLoginRedirect) {
			return <Loading size="sm" />;
		}

		return <Loading size="md" />;
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
					path: '/privacy',
					element: <PrivacyPolicy />
				},
				{
					path: '/terms',
					element: <TermsOfService />
				},
				{
					path: '/about',
					element: <About />
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
				// Clear any Firebase auth redirect state to prevent errors
				clearAuthRedirectState();

				// Initialize performance optimizations
				performanceService.addResourceHints();
				// Mobile performance service initializes automatically

				// Initialize auto-sync service if user was previously authenticated
				const hasCachedAuth = getLocalStorageJSON('auth-store', { isAuthenticated: false }).isAuthenticated;
				if (hasCachedAuth) {
					// Check if auto-sync was previously enabled and start it
					const autoSyncConfig = spotifyAutoSyncService.getConfig();
					if (autoSyncConfig.enabled) {
						// Delay auto-sync start to avoid blocking app initialization
						setTimeout(() => {
							spotifyAutoSyncService.startAutoSync(autoSyncConfig.intervalMinutes);
						}, 3000);
					}
				}

				const fromAuthRedirect = getSessionStorage('auth_redirect') === '1';

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
			<Suspense fallback={<PageLoading text="Loading..." />}>
				<RouterProvider
					router={router}
					future={{ v7_startTransition: true }}
				/>
			</Suspense>
			<Toaster
				position="bottom-center"
				toastOptions={{
					style: {
						background: '#fff',
						color: '#000',
						borderRadius: '8px',
						fontSize: '14px',
						padding: '12px 16px',
						boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
						fontWeight: '500',
					},
					success: {
						iconTheme: {
							primary: '#1ed760',
							secondary: 'white',
						},
					},
					duration: 3000,
				}}
			/>
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
