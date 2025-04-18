import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ClerkProvider } from "@clerk/clerk-react";
import AuthProvider from "./providers/AuthProvider";
import './index.css'; // Ensure CSS is imported

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

// Get Clerk API key with type assertion
const PUBLISHABLE_KEY = (import.meta as any).env?.VITE_CLERK_PUBLISHABLE_KEY || "pk_test_dummy_key_for_development";

// Debug Clerk key
console.log("Clerk key available:", !!PUBLISHABLE_KEY);

// Remove error for testing
// if (!PUBLISHABLE_KEY) {
// 	throw new Error("Missing Publishable Key");
// }

try {
	const rootElement = document.getElementById("root");
	if (!rootElement) {
		throw new Error("Root element not found");
	}

	createRoot(rootElement).render(
		<ErrorBoundary>
			<StrictMode>
				<ClerkProvider 
					publishableKey={PUBLISHABLE_KEY}
					signInUrl="/sign-in"
					signUpUrl="/sign-up"
					afterSignUpUrl="/"
				>
					<AuthProvider>
						<App />
					</AuthProvider>
				</ClerkProvider>
			</StrictMode>
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
