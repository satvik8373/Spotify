#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('📦 Installing dependencies in parallel...');

const installFrontend = () => {
  return new Promise((resolve, reject) => {
    console.log('🎨 Installing frontend dependencies...');
    const frontend = spawn('npm', ['ci'], {
      cwd: path.join(__dirname, '../frontend'),
      stdio: 'inherit',
      shell: true
    });

    frontend.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Frontend dependencies installed');
        resolve();
      } else {
        reject(new Error(`Frontend install failed with code ${code}`));
      }
    });
  });
};

const installBackend = () => {
  return new Promise((resolve, reject) => {
    console.log('🔧 Installing backend dependencies...');
    const backend = spawn('npm', ['ci'], {
      cwd: path.join(__dirname, '../backend'),
      stdio: 'inherit',
      shell: true
    });

    backend.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Backend dependencies installed');
        resolve();
      } else {
        reject(new Error(`Backend install failed with code ${code}`));
      }
    });
  });
};

// Run installs in parallel
Promise.all([installFrontend(), installBackend()])
  .then(() => {
    console.log('🎉 All dependencies installed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Install failed:', error.message);
    process.exit(1);
  });