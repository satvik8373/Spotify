import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import MainLayout from './layout/MainLayout';

// Loading component for suspense fallback
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-screen w-full bg-background">
    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
  </div>
);

// Error fallback pages
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

// Lazy-loaded components
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const HomePage = lazy(() => import('./pages/home/HomePage'));
const SearchPage = lazy(() => import('./pages/search/SearchPage'));
const LibraryPage = lazy(() => import('./pages/LibraryPage'));
const LikedSongsPage = lazy(() => import('./pages/liked-songs/LikedSongsPage'));
const AlbumPage = lazy(() => import('./pages/album/AlbumPage'));

// For named exports, we need to use this pattern
const PlaylistPageLazy = lazy(() => 
  import('./pages/playlist/PlaylistPage').then(module => ({
    default: module.PlaylistPage
  }))
);

// @ts-ignore
const ApiDebugPage = lazy(() => import('./pages/debug/ApiDebugPage.jsx'));

// Wrap lazy components with suspense
const LazyComponent = ({ Component }: { Component: React.LazyExoticComponent<any> }) => (
  <Suspense fallback={<LoadingFallback />}>
    <Component />
  </Suspense>
);

// Configure the router with React Router v6
export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LazyComponent Component={Login} />
  },
  {
    path: '/register',
    element: <LazyComponent Component={Register} />
  },
  {
    path: '/reset-password',
    element: <LazyComponent Component={ResetPassword} />
  },
  {
    element: <MainLayout />,
    errorElement: <ErrorFallback />,
    children: [
      {
        path: '/',
        element: <LazyComponent Component={HomePage} />
      },
      {
        path: '/albums/:albumId',
        element: <LazyComponent Component={AlbumPage} />
      },
      {
        path: '/library',
        element: <LazyComponent Component={LibraryPage} />
      },
      {
        path: '/liked-songs',
        element: <LazyComponent Component={LikedSongsPage} />
      },
      {
        path: '/search',
        element: <LazyComponent Component={SearchPage} />
      },
      {
        path: '/playlist/:id',
        element: <LazyComponent Component={PlaylistPageLazy} />
      },
      {
        path: '/debug/api',
        element: <LazyComponent Component={ApiDebugPage} />
      },
      {
        path: '*',
        element: <NotFoundFallback />
      }
    ]
  }
]); 