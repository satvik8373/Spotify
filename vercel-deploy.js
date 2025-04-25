// Vercel Deployment Helper Script
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Starting Vercel deployment preparation...');

// Create scripts directory if it doesn't exist
const scriptsDir = path.join(__dirname, 'scripts');
if (!fs.existsSync(scriptsDir)) {
  console.log('Creating scripts directory...');
  fs.mkdirSync(scriptsDir, { recursive: true });
}

// Print current directory structure
console.log('Current directory structure:');
const rootFiles = fs.readdirSync(__dirname);
console.log(rootFiles);

// Ensure we're in the project root
const frontendDir = path.join(__dirname, 'frontend');
if (!fs.existsSync(frontendDir)) {
  console.error('Error: frontend directory not found. Current directory content:');
  console.log(fs.readdirSync(__dirname));
  process.exit(1);
}

// Check and fix dependencies
try {
  console.log('Checking frontend dependencies...');
  const packageJsonPath = path.join(frontendDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  
  const requiredDeps = [
    '@mui/material',
    '@emotion/react',
    '@emotion/styled',
    '@mui/icons-material',
    'http-proxy-middleware'
  ];
  
  let missing = [];
  for (const dep of requiredDeps) {
    if (!packageJson.dependencies[dep]) {
      missing.push(dep);
    }
  }
  
  if (missing.length > 0) {
    console.log(`Installing missing dependencies: ${missing.join(', ')}`);
    execSync(`cd frontend && npm install ${missing.join(' ')}`, { stdio: 'inherit' });
  }
  
  // Update vercel.json files for proper deployment
  console.log('Updating Vercel configuration...');
  
  // Root vercel.json
  const rootVercelJson = {
    "version": 2,
    "buildCommand": "npm run build",
    "outputDirectory": "dist",
    "routes": [
      { "handle": "filesystem" },
      { "src": "/api/(.*)", "dest": "/api/$1" },
      { "src": "/(.*)", "dest": "/index.html" }
    ]
  };
  
  fs.writeFileSync(
    path.join(__dirname, 'vercel.json'),
    JSON.stringify(rootVercelJson, null, 2),
    'utf-8'
  );
  
  // Frontend vercel.json
  const frontendVercelJson = {
    "version": 2,
    "framework": "vite",
    "routes": [
      { "handle": "filesystem" },
      { "src": "/api/(.*)", "dest": "/api/$1" },
      { "src": "/(.*)", "dest": "/index.html" }
    ]
  };
  
  fs.writeFileSync(
    path.join(frontendDir, 'vercel.json'),
    JSON.stringify(frontendVercelJson, null, 2),
    'utf-8'
  );
  
  // Create install.js script
  console.log('Creating installation script...');
  const installScript = `// Install script for Vercel deployment
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
}`;

  fs.writeFileSync(
    path.join(scriptsDir, 'install.js'),
    installScript,
    'utf-8'
  );
  
  // Create build.js script
  console.log('Creating build script...');
  const buildScript = `// Build script for Vercel deployment
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
}`;

  fs.writeFileSync(
    path.join(scriptsDir, 'build.js'),
    buildScript,
    'utf-8'
  );
  
  console.log('Vercel configuration updated successfully.');
  
  // Build the project
  console.log('Building the project...');
  execSync('cd frontend && npm run build', { stdio: 'inherit' });
  
  console.log('\nDeployment preparation complete!');
  console.log('You can now deploy to Vercel with:');
  console.log('  vercel');
  
} catch (error) {
  console.error('Error during deployment preparation:', error);
  process.exit(1);
} 