#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting parallel build process...');

// Build frontend and backend in parallel
const buildFrontend = () => {
  return new Promise((resolve, reject) => {
    console.log('📦 Building frontend...');
    const frontend = spawn('npm', ['run', 'build'], {
      cwd: path.join(__dirname, '../frontend'),
      stdio: 'inherit',
      shell: true
    });

    frontend.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Frontend build completed');
        resolve();
      } else {
        reject(new Error(`Frontend build failed with code ${code}`));
      }
    });
  });
};

const buildBackend = () => {
  return new Promise((resolve, reject) => {
    console.log('🔧 Building backend...');
    const backend = spawn('npm', ['run', 'build'], {
      cwd: path.join(__dirname, '../backend'),
      stdio: 'inherit',
      shell: true
    });

    backend.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Backend build completed');
        resolve();
      } else {
        reject(new Error(`Backend build failed with code ${code}`));
      }
    });
  });
};

// Run builds in parallel
Promise.all([buildFrontend(), buildBackend()])
  .then(() => {
    console.log('🎉 All builds completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  });