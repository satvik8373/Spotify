// Deploy helper script for Vercel
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Make sure all required dependencies are installed
console.log('Checking dependencies...');
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));
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
    execSync(`npm install ${missing.join(' ')}`, { stdio: 'inherit' });
  } else {
    console.log('All required dependencies are installed.');
  }
} catch (error) {
  console.error('Error checking dependencies:', error);
  process.exit(1);
}

// Run the build
console.log('Building application...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}

console.log('\nDeployment preparations complete. You can now deploy to Vercel.');
console.log('Make sure your Vercel project settings are configured correctly:');
console.log(' - Build Command: npm run vercel-build');
console.log(' - Output Directory: dist');
console.log(' - Install Command: node deploy.js && npm install'); 