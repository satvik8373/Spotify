// React import kept for JSX runtime compatibility in some tooling
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import './index.css'
import './styles/mobile-optimizations.css'
import './styles/custom-utilities.css'
import { configureWebViewAuth, getEnvironmentInfo } from './utils/webViewDetection'

// Configure WebView authentication on app start
configureWebViewAuth();

// Log environment info for debugging
if (import.meta.env.DEV) {
  // Environment info logged in development
}

// Detect iOS PWA mode
const isIOSPWA = ('standalone' in window.navigator) && (window.navigator as any).standalone === true;
const isIOSSafari = /iPhone|iPad|iPod/.test(navigator.userAgent);

// Global error handlers to catch crashes
window.addEventListener('error', (event) => {
  console.error('Global error caught:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error,
    stack: event.error?.stack,
    userAgent: navigator.userAgent,
    url: window.location.href,
    isIOSPWA,
    isIOSSafari,
    timestamp: new Date().toISOString()
  });
  
  // For iOS PWA, try to recover from certain errors
  if (isIOSPWA && event.error) {
    const errorMessage = event.error.message || '';
    
    // Handle localStorage quota errors
    if (errorMessage.includes('QuotaExceededError') || errorMessage.includes('quota')) {
      try {
        // Clear some cache to free up space
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.includes('_cache') || key.includes('metrics')) {
            localStorage.removeItem(key);
          }
        });
      } catch (e) {
        // Couldn't clear storage
      }
    }
  }
  
  // Prevent default error handling
  event.preventDefault();
});

// Catch unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', {
    reason: event.reason,
    promise: event.promise,
    userAgent: navigator.userAgent,
    url: window.location.href,
    isIOSPWA,
    isIOSSafari,
    timestamp: new Date().toISOString()
  });
  
  // For iOS PWA, handle specific promise rejection types
  if (isIOSPWA && event.reason) {
    const reason = String(event.reason);
    
    // Handle network errors gracefully
    if (reason.includes('NetworkError') || reason.includes('Failed to fetch')) {
      console.warn('Network error in iOS PWA - continuing execution');
      event.preventDefault();
      return;
    }
    
    // Handle storage errors
    if (reason.includes('QuotaExceededError') || reason.includes('storage')) {
      console.warn('Storage error in iOS PWA - attempting recovery');
      try {
        sessionStorage.clear();
      } catch (e) {
        // Couldn't clear storage
      }
      event.preventDefault();
      return;
    }
  }
  
  // Prevent default handling
  event.preventDefault();
});

// Register service worker (skip in iOS PWA standalone mode if causing issues)
if ('serviceWorker' in navigator && !isIOSPWA) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        // SW registered
        
        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker available, reload to activate
                console.log('New service worker available');
              }
            });
          }
        });
      })
      .catch((registrationError) => {
        console.error('SW registration failed:', registrationError);
      });
  });
} else if (isIOSPWA) {
  // For iOS PWA, unregister any existing service workers to prevent issues
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => {
        registration.unregister().catch(() => {});
      });
    }).catch(() => {});
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
)
