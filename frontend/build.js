const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  // Install dependencies
  console.log('Installing dependencies...');
  execSync('npm install', { stdio: 'inherit' });
  
  // Make sure vite is installed
  console.log('Installing Vite...');
  execSync('npm install vite@latest --no-save', { stdio: 'inherit' });
  
  // Run the build
  console.log('Running build...');
  execSync('npx vite build', { stdio: 'inherit' });
  
  // Verify build output
  const distDir = path.join(__dirname, 'dist');
  if (fs.existsSync(distDir)) {
    console.log('Build completed successfully!');
    console.log('Contents of dist directory:');
    const files = fs.readdirSync(distDir);
    files.forEach(file => {
      console.log(` - ${file}`);
    });
  } else {
    console.error('Error: dist directory was not created');
    process.exit(1);
  }
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
} 