import { RouterProvider, createBrowserRouter, Navigate } from 'react-router-dom';
import { Suspense, lazy, useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { performanceService } from './services/performanceService';
import { spotifyAutoSyncService } from './services/spotifyAutoSyncService';

import { clearAuthRedirectState } from './utils/clearAuthRedirectState';
import { getLocalStorageJSON } from './utils/storageUtils';
import { cleanupOfflineData } from './utils/cleanupOfflineData';

// Preload critical components immediately - no lazy loading for main pages
import MainLayout from './layout/MainLayout';
import HomePage from './pages/home/HomePage';
import SearchPage from './pages/search/SearchPage';
import LibraryPage from './pages/LibraryPage';
import LikedSongsPage from './pages/liked-songs/LikedSongsPage';
import LandingPage from './pages/LandingPage';

// Lazy load less critical pages only
const SyncLikedSongsPage = lazy(() => import('./pages/liked-songs/SyncLikedSongsPage'));
const AlbumPage = lazy(() => import('./pages/album/AlbumPage'));
const PlaylistPage = lazy(() => import('./pages/playlist/PlaylistPage').then(m => ({ default: m.PlaylistPage })));
const SongPage = lazy(() => import('./pages/song/SongPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SpotifyCallback = lazy(() => import('./pages/SpotifyCallback'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const About = lazy(() => import('./pages/About'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

// JioSaavn pages
const JioSaavnPlaylistPage = lazy(() => import('./pages/jiosaavn/JioSaavnPlaylistPage'));
const JioSaavnPlaylistsPage = lazy(() => import('./pages/jiosaavn/JioSaavnPlaylistsPage'));
const JioSaavnCategoriesPage = lazy(() => import('./pages/jiosaavn/JioSaavnCategoriesPage'));

import SplashScreen from './components/SplashScreen';
import { AuthProvider, useAuth } from './contexts/AuthContext';

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

// Auth gate that redirects to login if not authenticated - optimized for instant loading
const AuthGate = ({ children }: { children: React.ReactNode }) => {
	const { isAuthenticated, loading } = useAuth();
	const location = useLocation();

	// Quick check for cached auth to avoid unnecessary loading states
	const hasCachedAuth = getLocalStorageJSON('auth-store', { isAuthenticated: false }).isAuthenticated;

	// If we have cached auth, show content immediately for better UX (optimistic rendering)
	if (hasCachedAuth) {
		return <>{children}</>;
	}

	// If not authenticated, redirect to login immediately - no loading state
	if (!isAuthenticated && !loading) {
		return <Navigate to="/login" state={{ from: location.pathname }} replace />;
	}

	// Show content immediately if authenticated
	if (isAuthenticated) {
		return <>{children}</>;
	}

	// Minimal loading state - no animation
	return <div className="min-h-screen bg-[#121212]" />;
};

const LandingRedirector = () => {
	const { isAuthenticated, loading } = useAuth();
	const hasCachedAuth = getLocalStorageJSON('auth-store', { isAuthenticated: false }).isAuthenticated;

	// Show minimal loading while checking auth
	if (loading && !hasCachedAuth) {
		return <div className="min-h-screen bg-[#121212]" />;
	}

	// If authenticated (either from cache or real-time), redirect to home
	if (isAuthenticated || hasCachedAuth) {
		return <Navigate to="/home" replace />;
	}

	// Not authenticated, show public landing page
	return <LandingPage />;
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
			path: '/privacy',
			element: <Suspense fallback={<div className="min-h-screen bg-[#121212]" />}><PrivacyPolicy /></Suspense>
		},
		{
			path: '/terms',
			element: <Suspense fallback={<div className="min-h-screen bg-[#121212]" />}><TermsOfService /></Suspense>
		},
		{
			path: '/about',
			element: <Suspense fallback={<div className="min-h-screen bg-[#121212]" />}><About /></Suspense>
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
					element: <AuthGate><Suspense fallback={<div className="min-h-screen bg-[#121212]" />}><AlbumPage /></Suspense></AuthGate>
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
					path: '/liked-songs/sync',
					element: <AuthGate><Suspense fallback={<div className="min-h-screen bg-[#121212]" />}><SyncLikedSongsPage /></Suspense></AuthGate>
				},
				{
					path: '/search',
					element: <AuthGate><SearchPage /></AuthGate>
				},
				{
					path: '/profile',
					element: <AuthGate><Suspense fallback={<div className="min-h-screen bg-[#121212]" />}><ProfilePage /></Suspense></AuthGate>
				},
				{
					path: '/playlist/:id',
					element: <AuthGate><Suspense fallback={<div className="min-h-screen bg-[#121212]" />}><PlaylistPage /></Suspense></AuthGate>
				},
				{
					path: '/song/:songId',
					element: <AuthGate><Suspense fallback={<div className="min-h-screen bg-[#121212]" />}><SongPage /></Suspense></AuthGate>
				},
				{
					path: '/jiosaavn/playlist/:playlistId',
					element: <AuthGate><Suspense fallback={<div className="min-h-screen bg-[#121212]" />}><JioSaavnPlaylistPage /></Suspense></AuthGate>
				},
				{
					path: '/jiosaavn/playlists',
					element: <AuthGate><Suspense fallback={<div className="min-h-screen bg-[#121212]" />}><JioSaavnPlaylistsPage /></Suspense></AuthGate>
				},
				{
					path: '/jiosaavn/categories',
					element: <AuthGate><Suspense fallback={<div className="min-h-screen bg-[#121212]" />}><JioSaavnCategoriesPage /></Suspense></AuthGate>
				},
				{
					path: '/settings',
					element: <AuthGate><Suspense fallback={<div className="min-h-screen bg-[#121212]" />}><SettingsPage /></Suspense></AuthGate>
				},
				{
					path: '*',
					element: <NotFoundFallback />
				}
			]
		}
	],
	{
		future: {
			v7_relativeSplatPath: true
		}
	}
);

function AppContent() {
	const [showSplash, setShowSplash] = useState(true);
	const [appReady, setAppReady] = useState(false);
	// Auth loading state is handled internally by useAuth hook

	// Initialize app and handle splash screen - minimal delay
	useEffect(() => {
		const initializeApp = async () => {
			try {
				// Clear any Firebase auth redirect state to prevent errors
				clearAuthRedirectState();

				// Initialize performance optimizations immediately
				performanceService.addResourceHints();

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

				// Minimal splash time - 200ms only
				setTimeout(() => {
					setShowSplash(false);
					setAppReady(true);
				}, 200);

			} catch (error) {
				console.error("Error initializing app:", error);
				setShowSplash(false);
				setAppReady(true);
			}
		};

		initializeApp();
	}, []);

	// Show minimal splash screen
	if (showSplash) {
		return (
			<div className="fixed inset-0 bg-[#121212]">
				<SplashScreen />
			</div>
		);
	}

	// Don't render router until app is ready
	if (!appReady) {
		return <div className="min-h-screen bg-[#121212]" />;
	}

	// Main app content - no suspense wrapper to avoid delays
	return (
		<div className="min-h-screen bg-[#121212]">
			<RouterProvider
				router={router}
				future={{ v7_startTransition: true }}
			/>
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
	// Initialize audio context manager for proper autoplay policy compliance
	useEffect(() => {
		// Audio system is now auto-initialized in audioManager.ts
		// No manual setup needed
	}, []);

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
