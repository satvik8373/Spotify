// React import kept for JSX runtime compatibility in some tooling
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/mobile-optimizations.css'
import './styles/custom-utilities.css'
import { configureWebViewAuth, getEnvironmentInfo } from './utils/webViewDetection'

// Configure WebView authentication on app start
configureWebViewAuth();

// Log environment info for debugging
if (import.meta.env.DEV) {
  console.log('🌍 Environment Info:', getEnvironmentInfo());
}

// Register service worker for background audio support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
        
        // Send keep-alive messages for background audio
        const sendKeepAlive = () => {
          if (registration.active) {
            registration.active.postMessage({
              type: 'BACKGROUND_AUDIO',
              action: 'KEEP_ALIVE'
            });
          }
        };

        // Send keep-alive every 30 seconds when audio is playing
        setInterval(() => {
          // Check if audio is playing
          const audio = document.querySelector('audio');
          if (audio && !audio.paused) {
            sendKeepAlive();
          }
        }, 30000);

      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />,
)
