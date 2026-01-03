// React import kept for JSX runtime compatibility in some tooling
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/mobile-optimizations.css'
import './styles/custom-utilities.css'
import { configureWebViewAuth, getEnvironmentInfo } from './utils/webViewDetection'
import { ErrorBoundary } from 'react-error-boundary'
import { reportError, reportReactError, checkReactEnvironment } from './utils/errorReporting'

// Add global error handler to catch unhandled errors
window.addEventListener('error', (event) => {
  reportError(event.error, 'Global Error Handler');
  
  // Show a simple error message if React fails to load
  if (event.error?.message?.includes('Children') || event.error?.message?.includes('React')) {
    document.body.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background: #121212;
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        padding: 20px;
        text-align: center;
      ">
        <h1 style="font-size: 2rem; margin-bottom: 1rem;">Something went wrong</h1>
        <p style="margin-bottom: 2rem; color: #ccc;">
          There was an error loading the application. Please try refreshing the page.
        </p>
        <button 
          onclick="window.location.reload()" 
          style="
            background: #1DB954;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 1rem;
            cursor: pointer;
          "
        >
          Reload Page
        </button>
      </div>
    `;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  reportError(new Error(event.reason), 'Unhandled Promise Rejection');
});

// Check React environment before proceeding
if (!checkReactEnvironment()) {
  console.error('React environment check failed');
}

// Configure WebView authentication on app start
configureWebViewAuth();

// Log environment info for debugging
if (import.meta.env.DEV) {
  console.log('🌍 Environment Info:', getEnvironmentInfo());
}

// Add error handling for the root element
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

// Create root with error handling
try {
  const root = ReactDOM.createRoot(rootElement);

  // Render with error boundary to catch React errors
  root.render(
    <ErrorBoundary
      fallback={<div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
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
      </div>}
      onError={(error, errorInfo) => {
        reportReactError(error, errorInfo);
      }}
    >
      <App />
    </ErrorBoundary>
  );
} catch (error) {
  console.error('Failed to initialize React app:', error);
  
  // Fallback to plain HTML if React fails to initialize
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background: #121212;
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        padding: 20px;
        text-align: center;
      ">
        <h1 style="font-size: 2rem; margin-bottom: 1rem;">Application Error</h1>
        <p style="margin-bottom: 2rem; color: #ccc;">
          Failed to initialize the application. Please try refreshing the page.
        </p>
        <button 
          onclick="window.location.reload()" 
          style="
            background: #1DB954;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 1rem;
            cursor: pointer;
          "
        >
          Reload Page
        </button>
      </div>
    `;
  }
}
