import { RouterProvider, createBrowserRouter, Navigate } from 'react-router-dom';
import { Suspense, lazy, useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { performanceService } from './services/performanceService';
import { spotifyAutoSyncService } from './services/spotifyAutoSyncService';
import PerformanceMonitor from './components/PerformanceMonitor';
import { clearAuthRedirectState } from './utils/clearAuthRedirectState';
import { getLocalStorageJSON, getSessionStorage } from './utils/storageUtils';
import { cleanupOfflineData } from './utils/cleanupOfflineData';
import { Loading } from './components/ui/loading';
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

// JioSaavn pages
const JioSaavnPlaylistPage = lazy(() => import('./pages/jiosaavn/JioSaavnPlaylistPage'));
const JioSaavnPlaylistsPage = lazy(() => import('./pages/jiosaavn/JioSaavnPlaylistsPage'));
const JioSaavnCategoriesPage = lazy(() => import('./pages/jiosaavn/JioSaavnCategoriesPage'));
// import SharedSongPage from './pages/SharedSongPage';
import SplashScreen from './components/SplashScreen';
import { AuthProvider, useAuth } from './contexts/AuthContext';
//
const ApiDebugPage = lazy(() => import('./pages/debug/ApiDebugPage.jsx'));
// DON'T lazy load auth pages to prevent flickering
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
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

	// Quick check for cached auth to avoid unnecessary loading states
	const hasCachedAuth = getLocalStorageJSON('auth-store', { isAuthenticated: false }).isAuthenticated;

	// If we have cached auth, show content immediately for better UX (optimistic rendering)
	if (hasCachedAuth) {
		return <>{children}</>;
	}

	// Show minimal loading while auth is being determined - invisible background
	if (loading) {
		return <div className="min-h-screen bg-[#121212]" />;
	}

	// If not authenticated, redirect to login
	if (!isAuthenticated) {
		return <Navigate to="/login" state={{ from: location.pathname }} replace />;
	}

	// User is authenticated, render children
	return <>{children}</>;
};

const LandingRedirector = () => {
	const hasCachedAuth = getLocalStorageJSON('auth-store', { isAuthenticated: false }).isAuthenticated;

	// Check cache FIRST - instant redirect without waiting for Firebase
	if (hasCachedAuth) {
		return <Navigate to="/home" replace />;
	}

	// No cached auth, go to login immediately
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
					path: '/jiosaavn/playlist/:playlistId',
					element: <AuthGate><JioSaavnPlaylistPage /></AuthGate>
				},
				{
					path: '/jiosaavn/playlists',
					element: <AuthGate><JioSaavnPlaylistsPage /></AuthGate>
				},
				{
					path: '/jiosaavn/categories',
					element: <AuthGate><JioSaavnCategoriesPage /></AuthGate>
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
	const [splashFading, setSplashFading] = useState(false);
	const [appReady, setAppReady] = useState(false);
	const { loading: authLoading } = useAuth();
	const [minTimeElapsed, setMinTimeElapsed] = useState(false);

	// Initialize app and handle splash screen
	useEffect(() => {
		const initializeApp = async () => {
			console.time('AppInitialization');
			console.log('🚀 App: initializeApp started at', new Date().toISOString());
			try {
				// Clear any Firebase auth redirect state to prevent errors
				clearAuthRedirectState();

				// Initialize performance optimizations immediately
				performanceService.addResourceHints();

				// Preload critical components in parallel (non-blocking)
				const preloadPromises = [
					import('./layout/MainLayout'),
					import('./pages/home/HomePage'),
					import('./pages/search/SearchPage'),
					import('./pages/LibraryPage')
				];

				// Start preloading but don't wait for it
				Promise.all(preloadPromises).catch(() => {
					console.warn('⚠️ App: Component preload warning');
				});

				// Set minimum timer for splash screen
				setTimeout(() => {
					setMinTimeElapsed(true);
				}, 500); // 500ms minimum display time

				// Clean up offline data and sync
				cleanupOfflineData().catch(() => { });

				const hasCachedAuth = getLocalStorageJSON('auth-store', { isAuthenticated: false }).isAuthenticated;
				if (hasCachedAuth) {
					setTimeout(() => {
						const autoSyncConfig = spotifyAutoSyncService.getConfig();
						if (autoSyncConfig.enabled) {
							spotifyAutoSyncService.startAutoSync(autoSyncConfig.intervalMinutes);
						}
					}, 3000);
				}

			} catch (error) {
				console.error("Error initializing app:", error);
				setMinTimeElapsed(true); // Ensure we don't get stuck
			}
		};

		initializeApp();
	}, []);

	// Handle splash screen dismissal
	useEffect(() => {
		// Only dismiss when:
		// 1. Minimum time has passed (to avoid flash)
		// 2. Auth loading is complete (to avoid login page flash)
		// 3. We are currently showing the splash
		if (minTimeElapsed && !authLoading && showSplash && !splashFading) {
			console.log('🏁 App: Conditions met (Time: %s, AuthLoaded: %s), fading splash', minTimeElapsed, !authLoading);
			setSplashFading(true);

			// Hide splash screen after fade animation completes
			setTimeout(() => {
				setShowSplash(false);
				setAppReady(true);
				console.timeEnd('AppInitialization');
			}, 200);
		}
	}, [minTimeElapsed, authLoading, showSplash, splashFading]);

	// No additional prefetching needed - components are preloaded during splash

	// Show splash screen for 500ms total with smooth fade
	if (showSplash) {
		return (
			<div
				className={`fixed inset-0 bg-black transition-opacity duration-200 ease-out ${splashFading ? 'opacity-0' : 'opacity-100'}`}
				style={{ willChange: 'opacity' }}
			>
				<SplashScreen />
			</div>
		);
	}

	// Don't render router until app is ready to prevent login page flash
	if (!appReady) {
		return <div className="min-h-screen bg-[#121212]" />;
	}

	// Main app content - render only after splash completes
	return (
		<div className="min-h-screen bg-[#121212]">
			<PerformanceMonitor enabled={process.env.NODE_ENV === 'development'} />
			<Suspense fallback={<div className="min-h-screen bg-[#121212]" />}>
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
		</div>
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
