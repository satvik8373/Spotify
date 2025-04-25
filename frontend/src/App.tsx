import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import MainLayout from './layout/MainLayout';
import HomePage from './pages/home/HomePage';
import SearchPage from './pages/search/SearchPage';
import LibraryPage from './pages/LibraryPage';
import LikedSongsPage from './pages/liked-songs/LikedSongsPage';
import { Toaster } from 'react-hot-toast';
import AlbumPage from './pages/album/AlbumPage';
import { PlaylistPage } from './pages/playlist/PlaylistPage';
import { useState } from "react";
import SplashScreen from './components/SplashScreen';
import AuthCallback from './pages/auth/AuthCallback';
import { AuthProvider } from './contexts/AuthContext';
// @ts-ignore
import ApiDebugPage from './pages/debug/ApiDebugPage.jsx';

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

// Configure the router with React Router v6
const router = createBrowserRouter(
	[
		{
			path: '/auth/callback',
			element: <AuthCallback />
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
					path: '/playlist/:id',
					element: <PlaylistPage />
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
	
	// Always show splash screen on initial load
	if (showSplash) {
		return <SplashScreen onComplete={() => setShowSplash(false)} />;
	}
	
	// Always show main app content, login will be handled in the header
	return (
		<>
			<RouterProvider 
				router={router} 
				future={{ v7_startTransition: true }} 
			/>
			<Toaster />
		</>
	);
}

function App() {
	return (
		<AuthProvider>
			<AppContent />
		</AuthProvider>
	);
}

export default App;
