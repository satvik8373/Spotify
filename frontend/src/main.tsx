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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />,
)
