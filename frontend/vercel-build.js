#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

// Log the current directory
console.log('Current directory:', process.cwd());

try {
  // Install Vite globally first
  console.log('Installing Vite globally...');
  execSync('npm install -g vite', { stdio: 'inherit' });
  
  // Make sure we're in the frontend directory
  console.log('Moving to frontend directory...');
  process.chdir(path.join(process.cwd(), 'frontend'));
  console.log('New current directory:', process.cwd());
  
  // Install dependencies
  console.log('Installing dependencies...');
  execSync('npm install', { stdio: 'inherit' });
  
  // Run the build
  console.log('Running build with npx...');
  execSync('npx vite build', { stdio: 'inherit' });
  
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
} 