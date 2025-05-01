import React, { useState, useEffect, useCallback } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { ErrorBoundary } from 'react-error-boundary'
import { Toaster } from 'sonner'

// Declare the window object with typed location
declare const window: Window & typeof globalThis;

// Register service worker for PWA support
if ('serviceWorker' in navigator) {
	window.addEventListener('load', () => {
		navigator.serviceWorker.register('/service-worker.js')
			.then(registration => {
				// Successfully registered
				checkForUpdates(registration);
				
				// Set up periodic update checks (every 12 hours instead of hourly)
				let lastUpdateCheck = Date.now();
				const TWELVE_HOURS = 12 * 60 * 60 * 1000;
				const THIRTY_MINUTES = 30 * 60 * 1000;
				
				setInterval(() => {
					// Reduced frequency check
					lastUpdateCheck = Date.now();
					checkForUpdates(registration);
				}, TWELVE_HOURS);
				
				// Check for updates when the page becomes visible again
				// But only if it's been at least 30 minutes since the last check
				document.addEventListener('visibilitychange', () => {
					if (document.visibilityState === 'visible' && 
						Date.now() - lastUpdateCheck > THIRTY_MINUTES) {
						lastUpdateCheck = Date.now();
						checkForUpdates(registration);
					}
				});
				
				// Listen for messages from the service worker
				navigator.serviceWorker.addEventListener('message', (event) => {
					if (event.data && event.data.type === 'NEW_VERSION') {
						// Show reload notification to user
						if (confirm('New version available! Click OK to reload.')) {
							window.location.reload();
						}
					}
				});
			})
			.catch(error => {
				console.error('Service worker registration failed:', error);
			});
	});
}

// Function to check for service worker updates
function checkForUpdates(registration: ServiceWorkerRegistration) {
	// Removed console log to prevent spam
	registration.update().catch(err => {
		console.error('Error during service worker update:', err);
	});
	
	// Send message to service worker to check for updates
	if (registration.active) {
		registration.active.postMessage({
			type: 'CHECK_UPDATE'
		});
	}
}

// Error fallback component for the error boundary
function ErrorFallback({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) {
	return (
		<div className="error-page">
			<div className="error-container">
				<h2>Something went wrong</h2>
				<pre>{error.message}</pre>
				<button onClick={() => {
					resetErrorBoundary();
					window.location.href = '/';
				}}>
					Try again
				</button>
			</div>
		</div>
	);
}

const root = document.getElementById('root');
if (root) {
	ReactDOM.createRoot(root).render(
		<React.StrictMode>
			<ErrorBoundary FallbackComponent={ErrorFallback}>
				<Toaster position="top-center" richColors />
				<App />
			</ErrorBoundary>
		</React.StrictMode>
	);
}
