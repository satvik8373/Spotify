import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/mobile-optimizations.css'
import './styles/custom-utilities.css'

// Simple error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

// Get root element
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

// Create and render app
const root = ReactDOM.createRoot(rootElement);
root.render(<App />);
