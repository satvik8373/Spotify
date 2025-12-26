// Install script for Vercel deployment
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('Running custom install script...');

try {
  const frontendDir = path.join(rootDir, 'frontend');
  
  if (fs.existsSync(frontendDir)) {
    console.log('Frontend directory found, installing dependencies...');
    execSync('cd frontend && npm install', { 
      stdio: 'inherit',
      cwd: rootDir
    });
  } else {
    console.log('No frontend directory found at:', frontendDir);
    console.log('Current directory structure:');
    const files = fs.readdirSync(rootDir);
    console.log(files);
  }
} catch (error) {
  console.error('Error during installation:', error);
  process.exit(1);
}