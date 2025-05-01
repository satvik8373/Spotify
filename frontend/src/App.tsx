import { RouterProvider } from 'react-router-dom';
import { useState, useEffect } from "react";
import SplashScreen from './components/SplashScreen';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { router } from './router';

function AppContent() {
	const [showSplash, setShowSplash] = useState(true);
	const [initialized, setInitialized] = useState(false);
	
	// Initialize app data
	useEffect(() => {
		const initializeApp = async () => {
			try {
				// Mark initialization as complete after a short delay
				// This allows the splash screen to show for a minimum amount of time
				setTimeout(() => {
					setInitialized(true);
				}, 1000);
			} catch (error) {
				console.error("Error initializing app:", error);
				// Continue anyway in case of initialization errors
				setInitialized(true);
			}
		};
		
		initializeApp();
	}, []);
	
	// Always show splash screen on initial load until initialization completes
	if (showSplash || !initialized) {
		return <SplashScreen onComplete={() => initialized && setShowSplash(false)} />;
	}
	
	// Always show main app content, login will be handled in the header
	return (
		<>
			<RouterProvider router={router} />
			<Toaster />
			<PWAInstallPrompt />
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
