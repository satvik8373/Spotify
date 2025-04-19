import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';
import MainLayout from './layout/MainLayout';
import HomePage from './pages/home/HomePage';
import SearchPage from './pages/search/SearchPage';
import LibraryPage from './pages/LibraryPage';
import LikedSongsPage from './pages/liked-songs/LikedSongsPage';
import { Toaster } from 'react-hot-toast';
import AlbumPage from './pages/album/AlbumPage';
import { useAuthStore } from "./stores/useAuthStore";
import { migrateAnonymousLikedSongs } from "./services/likedSongsService";
import { useEffect, useState } from "react";

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

const AuthCallbackFallback = () => (
	<div className="min-h-screen flex items-center justify-center bg-zinc-900">
		<div className="text-center">
			<h1 className="text-2xl font-bold mb-4">Processing authentication...</h1>
			<p className="text-zinc-400">You'll be redirected shortly.</p>
		</div>
	</div>
);

// Error Boundary Component
const ErrorFallback = () => (
	<div className="min-h-screen flex flex-col items-center justify-center bg-red-900 p-4">
		<div className="text-center max-w-md">
			<h1 className="text-4xl font-bold text-white mb-6">Something went wrong</h1>
			<p className="text-white mb-8">
				We're having trouble loading the app. Please try refreshing the page.
			</p>
			<button 
				onClick={() => window.location.reload()}
				className="bg-white text-red-900 px-4 py-2 rounded font-medium"
			>
				Refresh Page
			</button>
		</div>
	</div>
);

const router = createBrowserRouter([
	{
		path: '/auth-callback',
		element: <AuthCallbackFallback />
	},
	{
		element: <MainLayout />,
		errorElement: <ErrorFallback />,
		children: [
			{
				path: '/',
				element: <HomePage />
			},
			{
				path: '/albums/:albumId',
				element: <AlbumPage />
			},
			{
				path: '/library',
				element: <LibraryPage />
			},
			{
				path: '/liked-songs',
				element: <LikedSongsPage />
			},
			{
				path: '/search',
				element: <SearchPage />
			},
			{
				path: '*',
				element: <NotFoundFallback />
			}
		]
	}
]);

function App() {
	const { isSignedIn, isLoaded } = useAuth();
	const { user } = useUser();
	const [error, setError] = useState<Error | null>(null);
	
	// Debug logging
	useEffect(() => {
		console.log('App mounted');
		console.log('Auth state:', { isSignedIn, isLoaded, user: user?.id });
	}, [isSignedIn, isLoaded, user]);

	// Handle authentication state changes
	useEffect(() => {
		try {
			if (isLoaded) {
				const userId = user?.id || null;
				
				// Update auth state in store
				useAuthStore.getState().setAuthStatus(!!isSignedIn, userId);
				
				// If user just signed in, migrate their anonymous likes
				if (isSignedIn && userId) {
					migrateAnonymousLikedSongs(userId);
				}
			}
		} catch (err) {
			console.error('Error in auth effect:', err);
			setError(err instanceof Error ? err : new Error('Unknown error'));
		}
	}, [isSignedIn, isLoaded, user?.id]);

	// If there's an error, show the error fallback
	if (error) {
		return <ErrorFallback />;
	}

	return (
		<>
			<RouterProvider router={router} />
			<Toaster />
		</>
	);
}

export default App;
