import { RouterProvider, createBrowserRouter, Navigate } from 'react-router-dom';
import { Suspense, lazy, useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { performanceService } from './services/performanceService';
import PerformanceMonitor from './components/PerformanceMonitor';
import { clearAuthRedirectState } from './utils/clearAuthRedirectState';
import { getLocalStorageJSON, getSessionStorage } from './utils/storageUtils';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy load components with error handling
const MainLayout = lazy(() => import('./layout/MainLayout').catch(err => {
  console.error('Failed to load MainLayout:', err);
  return { default: () => <div>Error loading layout</div> };
}));

const HomePage = lazy(() => import('./pages/home/HomePage').catch(err => {
  console.error('Failed to load HomePage:', err);
  return { default: () => <div>Error loading home page</div> };
}));

const SearchPage = lazy(() => import('./pages/search/SearchPage').catch(err => {
  console.error('Failed to load SearchPage:', err);
  return { default: () => <div>Error loading search page</div> };
}));

const LibraryPage = lazy(() => import('./pages/LibraryPage').catch(err => {
  console.error('Failed to load LibraryPage:', err);
  return { default: () => <div>Error loading library page</div> };
}));

const LikedSongsPage = lazy(() => import('./pages/liked-songs/LikedSongsPage').catch(err => {
  console.error('Failed to load LikedSongsPage:', err);
  return { default: () => <div>Error loading liked songs page</div> };
}));

const AlbumPage = lazy(() => import('./pages/album/AlbumPage').catch(err => {
  console.error('Failed to load AlbumPage:', err);
  return { default: () => <div>Error loading album page</div> };
}));

const PlaylistPage = lazy(() => import('./pages/playlist/PlaylistPage').then(m => ({ default: m.PlaylistPage })).catch(err => {
  console.error('Failed to load PlaylistPage:', err);
  return { default: () => <div>Error loading playlist page</div> };
}));

const SongPage = lazy(() => import('./pages/song/SongPage').catch(err => {
  console.error('Failed to load SongPage:', err);
  return { default: () => <div>Error loading song page</div> };
}));

const ProfilePage = lazy(() => import('./pages/ProfilePage').catch(err => {
  console.error('Failed to load ProfilePage:', err);
  return { default: () => <div>Error loading profile page</div> };
}));

const SpotifyCallback = lazy(() => import('./pages/SpotifyCallback').catch(err => {
  console.error('Failed to load SpotifyCallback:', err);
  return { default: () => <div>Error loading Spotify callback</div> };
}));

const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy').catch(err => {
  console.error('Failed to load PrivacyPolicy:', err);
  return { default: () => <div>Error loading privacy policy</div> };
}));

const TermsOfService = lazy(() => import('./pages/TermsOfService').catch(err => {
  console.error('Failed to load TermsOfService:', err);
  return { default: () => <div>Error loading terms of service</div> };
}));

const About = lazy(() => import('./pages/About').catch(err => {
  console.error('Failed to load About:', err);
  return { default: () => <div>Error loading about page</div> };
}));

const ApiDebugPage = lazy(() => import('./pages/debug/ApiDebugPage.jsx').catch(err => {
  console.error('Failed to load ApiDebugPage:', err);
  return { default: () => <div>Error loading debug page</div> };
}));

const Login = lazy(() => import('./pages/Login').catch(err => {
  console.error('Failed to load Login:', err);
  return { default: () => <div>Error loading login page</div> };
}));

const Register = lazy(() => import('./pages/Register').catch(err => {
  console.error('Failed to load Register:', err);
  return { default: () => <div>Error loading register page</div> };
}));

const ResetPassword = lazy(() => import('./pages/ResetPassword').catch(err => {
  console.error('Failed to load ResetPassword:', err);
  return { default: () => <div>Error loading reset password page</div> };
}));

import SplashScreen from './components/SplashScreen';
import { AuthProvider, useAuth } from './contexts/AuthContext';
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

				// Check for cached authentication
				const hasCachedAuth = getLocalStorageJSON('auth-store', { isAuthenticated: false }).isAuthenticated;

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
			<Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div></div>}>
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

	// Global error handler for unhandled errors
	useEffect(() => {
		const handleError = (event: ErrorEvent) => {
			console.error('Global error:', event.error);
			// Prevent white screen by showing error message
			if (event.error && !document.querySelector('[data-error-boundary]')) {
				const errorDiv = document.createElement('div');
				errorDiv.setAttribute('data-error-boundary', 'true');
				errorDiv.innerHTML = `
					<div style="
						position: fixed;
						top: 0;
						left: 0;
						width: 100%;
						height: 100%;
						background: #000;
						color: #fff;
						display: flex;
						flex-direction: column;
						align-items: center;
						justify-content: center;
						z-index: 9999;
						padding: 20px;
						text-align: center;
					">
						<h1 style="font-size: 24px; margin-bottom: 16px;">Application Error</h1>
						<p style="margin-bottom: 20px;">Something went wrong. Please refresh the page.</p>
						<button onclick="window.location.reload()" style="
							background: #1ed760;
							color: #000;
							border: none;
							padding: 12px 24px;
							border-radius: 6px;
							cursor: pointer;
							font-size: 16px;
						">Reload Page</button>
					</div>
				`;
				document.body.appendChild(errorDiv);
			}
		};

		const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
			console.error('Unhandled promise rejection:', event.reason);
		};

		window.addEventListener('error', handleError);
		window.addEventListener('unhandledrejection', handleUnhandledRejection);

		return () => {
			window.removeEventListener('error', handleError);
			window.removeEventListener('unhandledrejection', handleUnhandledRejection);
		};
	}, []);

	return (
		<ErrorBoundary>
			<AuthProvider>
				<SpotifyProvider>
					<AppContent />
				</SpotifyProvider>
			</AuthProvider>
		</ErrorBoundary>
	);
}

export default App;
