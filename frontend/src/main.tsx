import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // Ensure CSS is imported

// Register service worker
if ('serviceWorker' in navigator) {
	window.addEventListener('load', () => {
		navigator.serviceWorker.register('/service-worker.js')
			.then(registration => {
				console.log('ServiceWorker registration successful with scope: ', registration.scope);
			})
			.catch(err => {
				console.log('ServiceWorker registration failed: ', err);
			});
	});
}

// Error handler for unhandled errors
const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
	try {
		return <>{children}</>;
	} catch (error) {
		console.error("Error in React tree:", error);
		return (
			<div style={{ 
				padding: '20px', 
				margin: '20px', 
				backgroundColor: 'red', 
				color: 'white',
				borderRadius: '5px'
			}}>
				<h1>Something went wrong</h1>
				<p>Please refresh the page and try again.</p>
			</div>
		);
	}
};

try {
	const rootElement = document.getElementById("root");
	if (!rootElement) {
		throw new Error("Root element not found");
	}

	ReactDOM.createRoot(rootElement).render(
		<ErrorBoundary>
			<React.StrictMode>
				<App />
			</React.StrictMode>
		</ErrorBoundary>
	);
} catch (error) {
	console.error("Fatal error during app initialization:", error);
	
	// Show a minimal error UI
	const rootElement = document.getElementById("root");
	if (rootElement) {
		rootElement.innerHTML = `
			<div style="padding: 20px; margin: 20px; background-color: red; color: white; border-radius: 5px">
				<h1>Critical Error</h1>
				<p>The application failed to start. Please refresh or try again later.</p>
				<button onclick="window.location.reload()">Refresh</button>
			</div>
		`;
	}
}
