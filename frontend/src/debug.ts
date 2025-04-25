// Debug script to help identify rendering issues
console.log('Starting debug...');

try {
  // Log environment variables
  console.log('Environment variables:', {
    NODE_ENV: process.env.NODE_ENV,
    VITE_CLERK_PUBLISHABLE_KEY: process.env.VITE_CLERK_PUBLISHABLE_KEY ? 'Set' : 'Not set',
  });

  // Check for critical imports
  console.log('Checking imports...');
  const reactImport = require('react');
  const routerImport = require('react-router-dom');
  const clerkImport = require('@clerk/clerk-react');

  console.log('React version:', reactImport.version);
  console.log('Router imports available:', Object.keys(routerImport));
  console.log('Clerk imports available:', Object.keys(clerkImport));

  console.log('All critical packages loaded successfully');
} catch (error) {
  console.error('Error during debug:', error);
}
