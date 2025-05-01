import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { ErrorBoundary } from 'react-error-boundary'
import { Toaster } from 'sonner'

// Declare the window object with typed location
declare const window: Window & typeof globalThis;

// Register service worker for PWA support
if ('serviceWorker' in navigator) {
	window.addEventListener('load', function() {
		navigator.serviceWorker.register('/service-worker.js')
			.then(function(registration) {
				console.log('Service Worker registered with scope:', registration.scope);
				
				// Set up periodic update checks
				setInterval(() => {
					registration.update();
					console.log('Checking for Service Worker updates...');
				}, 60 * 60 * 1000); // Check every hour
				
				// Listen for messages from the service worker
				navigator.serviceWorker.addEventListener('message', (event) => {
					const data = event.data;
					if (data && data.type === 'NEW_VERSION') {
						console.log(`New app version available: ${data.version}`);
						
						// Show toast notification about the update
						if (window.confirm('A new version is available! Reload to update?')) {
							// Clear cache using caches API if available
							if ('caches' in window) {
								caches.keys().then(cacheNames => {
									return Promise.all(
										cacheNames.map(cacheName => {
											return caches.delete(cacheName);
										})
									);
								}).then(() => {
									window.location.href = window.location.href;
								});
							} else {
								// Force reload from server
								window.location.href = window.location.href;
							}
						}
					}
				});
			})
			.catch(function(err) {
				console.log('Service Worker registration failed:', err);
			});
			
		// Force update when tab becomes visible again
		document.addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'visible' && navigator.serviceWorker.controller) {
				navigator.serviceWorker.controller.postMessage({
					type: 'CHECK_UPDATE'
				});
			}
		});
	});
}

// Error fallback component for the error boundary
function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
	console.error('Unhandled error:', error);
	
	return (
		<div className="error-page">
			<h1>Something went wrong</h1>
			<p>We're sorry, but something unexpected happened. Please try refreshing the page.</p>
			<p className="error-details">{error.message}</p>
			<button onClick={() => { window.location.href = window.location.href; }}>Refresh Page</button>
		</div>
	);
}

const root = document.getElementById('root');
if (root) {
	ReactDOM.createRoot(root).render(
		<React.StrictMode>
			<ErrorBoundary FallbackComponent={ErrorFallback}>
				<App />
				<Toaster position="top-center" richColors />
			</ErrorBoundary>
		</React.StrictMode>
	);
}
