#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting optimized build process...');

// Step 1: Clean previous build
console.log('📁 Cleaning previous build...');
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}

// Step 2: Build with optimizations
console.log('🔨 Building with optimizations...');
try {
  execSync('npm run build', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// Step 3: Analyze bundle size
console.log('📊 Analyzing bundle size...');
try {
  execSync('npx vite-bundle-analyzer dist/assets', { stdio: 'inherit' });
} catch (error) {
  console.log('⚠️  Bundle analyzer not available, skipping...');
}

// Step 4: Generate performance report
console.log('📈 Generating performance report...');
const performanceReport = {
  timestamp: new Date().toISOString(),
  buildSize: getDirectorySize('dist'),
  optimizations: {
    images: 'WebP/AVIF support, lazy loading, responsive images',
    javascript: 'Code splitting, tree shaking, minification',
    css: 'PurgeCSS, minification, critical CSS inlining',
    caching: 'Service worker, CDN caching, long-term headers',
    compression: 'Gzip/Brotli compression',
    pwa: 'Progressive Web App features',
    preloading: 'Resource hints, DNS prefetch, preconnect'
  },
  recommendations: [
    'Monitor Core Web Vitals in production',
    'Use CDN for static assets',
    'Implement image optimization pipeline',
    'Consider server-side rendering for critical pages',
    'Monitor bundle size growth'
  ]
};

// Save performance report
fs.writeFileSync(
  'dist/performance-report.json',
  JSON.stringify(performanceReport, null, 2)
);

console.log('✅ Optimized build completed successfully!');
console.log('📁 Build output: dist/');
console.log('📊 Performance report: dist/performance-report.json');

// Helper function to get directory size
function getDirectorySize(dirPath) {
  let totalSize = 0;
  
  function calculateSize(currentPath) {
    const items = fs.readdirSync(currentPath);
    
    for (const item of items) {
      const itemPath = path.join(currentPath, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        calculateSize(itemPath);
      } else {
        totalSize += stats.size;
      }
    }
  }
  
  if (fs.existsSync(dirPath)) {
    calculateSize(dirPath);
  }
  
  return formatBytes(totalSize);
}

// Helper function to format bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
