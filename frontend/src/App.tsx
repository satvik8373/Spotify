import { RouterProvider, createBrowserRouter, Navigate } from 'react-router-dom';
import { Suspense, lazy, useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import SplashScreen from './components/SplashScreen';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SpotifyProvider } from './contexts/SpotifyContext';
import { useLocation } from 'react-router-dom';
import { getLocalStorageJSON, getSessionStorage } from './utils/storageUtils';

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
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
// @ts-ignore
const ApiDebugPage = lazy(() => import('./pages/debug/ApiDebugPage.jsx'));


// Simple fallback pages
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

const ErrorFallback = () => (
	<div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
		<div className="text-center max-w-md">
			<h1 className="text-4xl font-bold mb-4 text-foreground">Something went wrong</h1>
			<p className="text-muted-foreground mb-8">
				We're sorry, but there was an error loading this page. Please try refreshing.
			</p>
			<button
				onClick={() => window.location.reload()}
				className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
			>
				Reload Page
			</button>
		</div>
	</div>
);

// Auth gate that redirects to login if not authenticated
const AuthGate = ({ children }: { children: React.ReactNode }) => {
	const { isAuthenticated, loading } = useAuth();
	const location = useLocation();

	if (loading) {
		return (
			<div className="flex items-center justify-center h-screen bg-background">
				<div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
			</div>
		);
	}

	if (!isAuthenticated) {
		return <Navigate to="/login" state={{ from: location.pathname }} replace />;
	}

	return <>{children}</>;
};

const LandingRedirector = () => {
	const { isAuthenticated, loading } = useAuth();

	if (loading) {
		return (
			<div className="flex items-center justify-center h-screen bg-background">
				<div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
			</div>
		);
	}

	if (isAuthenticated) {
		return <Navigate to="/home" replace />;
	}

	return <Navigate to="/login" replace />;
};

// Configure the router with React Router v6
const router = createBrowserRouter([
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
]);

function AppContent() {
	const [showSplash, setShowSplash] = useState(true);
	const [initialized, setInitialized] = useState(false);

	useEffect(() => {
		const initializeApp = async () => {
			try {
				// Simple initialization
				setTimeout(() => {
					setInitialized(true);
				}, 1000);
			} catch (error) {
				console.error("Error initializing app:", error);
				setInitialized(true);
			}
		};

		initializeApp();
	}, []);

	if (showSplash || !initialized) {
		return <SplashScreen onComplete={() => initialized && setShowSplash(false)} />;
	}

	return (
		<>
			<Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div></div>}>
				<RouterProvider router={router} />
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
