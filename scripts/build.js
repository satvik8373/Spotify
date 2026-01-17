// Build script for Vercel deployment
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('Running custom build script...');

// Copy directory function that works cross-platform
function copyDir(src, dest) {
  // Create destination directory if it doesn't exist
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  // Get all files in source directory
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      // Recursively copy directories
      copyDir(srcPath, destPath);
    } else {
      // Copy files
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

try {
  const frontendDir = path.join(rootDir, 'frontend');
  
  if (fs.existsSync(frontendDir)) {
    console.log('Frontend directory found, building project...');
    
    // Build the frontend
    execSync('npm run build', { 
      stdio: 'inherit',
      cwd: frontendDir 
    });
    
    // Create dist directory in root
    const distDir = path.join(rootDir, 'dist');
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }
    
    // Copy the frontend build to the root dist directory
    console.log('Copying build files to root dist directory...');
    const frontendDistDir = path.join(frontendDir, 'dist');
    copyDir(frontendDistDir, distDir);
    
    console.log('Build completed successfully!');
  } else {
    console.error('No frontend directory found!');
    console.log('Current directory structure:');
    const files = fs.readdirSync(rootDir);
    console.log(files);
    process.exit(1);
  }
} catch (error) {
  console.error('Error during build:', error);
  process.exit(1);
}