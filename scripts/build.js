// Build script for Vercel deployment
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('Running custom build script...');
console.log('Current directory:', process.cwd());
console.log('Root directory:', rootDir);

try {
  // List directory contents to debug
  console.log('Root directory contents:');
  const rootContents = fs.readdirSync(rootDir);
  console.log(rootContents);
  
  const frontendDir = path.join(rootDir, 'frontend');
  
  if (fs.existsSync(frontendDir)) {
    console.log('Frontend directory found, building project...');
    
    // Build the frontend
    execSync('npm run build', { 
      stdio: 'inherit',
      cwd: frontendDir,
      shell: true
    });
    
    // Create dist directory in root and empty it
    const distDir = path.join(rootDir, 'dist');
    fs.emptyDirSync(distDir);
    
    // Copy the frontend build to the root dist directory
    console.log('Copying build files to root dist directory...');
    const frontendDistDir = path.join(frontendDir, 'dist');
    fs.copySync(frontendDistDir, distDir);
    
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