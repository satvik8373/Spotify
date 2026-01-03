const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Folders/files to include in the zip (essential app files only)
const includeFolders = [
  'frontend/src',
  'frontend/public',
  'backend/src'
];

const includeFiles = [
  'frontend/package.json',
  'frontend/vite.config.ts',
  'frontend/tailwind.config.js',
  'frontend/tsconfig.json',
  'frontend/index.html',
  'backend/package.json',
  'package.json'
];

// Folders to exclude (large/unnecessary)
const excludePatterns = [
  'node_modules',
  '.git',
  'dist',
  '.vercel',
  '.vite',
  'dev-dist',
  '*.log',
  '.env',
  '.env.*'
];

const outputZip = 'mavrixfy-app.zip';

console.log('🗜️  Compressing mavrixfy-app...\n');

// Remove old zip if exists
if (fs.existsSync(outputZip)) {
  fs.unlinkSync(outputZip);
  console.log('Removed old zip file');
}

// Build exclude args for PowerShell Compress-Archive workaround
// Using tar instead for better control
const excludeArgs = excludePatterns.map(p => `--exclude="${p}"`).join(' ');

try {
  // Use tar to create archive (available on Windows 10+)
  const tarCmd = `tar -cvf mavrixfy-app.tar --exclude="node_modules" --exclude=".git" --exclude="dist" --exclude=".vercel" --exclude=".vite" --exclude="dev-dist" --exclude="*.log" --exclude=".env*" --exclude="electron" --exclude="mavrixfy_flutter" --exclude="functions" frontend/src frontend/public frontend/package.json frontend/vite.config.ts frontend/tailwind.config.js frontend/tsconfig.json frontend/index.html backend/src backend/package.json package.json`;
  
  execSync(tarCmd, { stdio: 'inherit' });
  
  // Convert tar to zip using PowerShell
  console.log('\n📦 Converting to zip...');
  
  // Extract tar and recompress as zip
  execSync('tar -xf mavrixfy-app.tar -C .', { stdio: 'inherit' });
  
  // Create zip using PowerShell
  const zipCmd = `powershell -Command "Compress-Archive -Path 'frontend/src','frontend/public','frontend/package.json','frontend/vite.config.ts','frontend/tailwind.config.js','frontend/tsconfig.json','frontend/index.html','backend/src','backend/package.json','package.json' -DestinationPath 'mavrixfy-app.zip' -CompressionLevel Optimal -Force"`;
  
  execSync(zipCmd, { stdio: 'inherit' });
  
  // Clean up tar
  fs.unlinkSync('mavrixfy-app.tar');
  
  // Get file size
  const stats = fs.statSync(outputZip);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  
  console.log(`\n✅ Created: ${outputZip} (${sizeMB} MB)`);
  console.log('\nIncluded:');
  console.log('  - frontend/src (source code)');
  console.log('  - frontend/public (assets)');
  console.log('  - backend/src (API code)');
  console.log('  - Config files (package.json, vite, tailwind, etc.)');
  console.log('\nExcluded: node_modules, .git, dist, .env files');
  
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
