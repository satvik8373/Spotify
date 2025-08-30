import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Analyze bundle sizes and identify optimization opportunities
function analyzeBundle() {
  const distPath = path.join(__dirname, '../dist/js');
  
  if (!fs.existsSync(distPath)) {
    console.error('❌ Dist/js folder not found. Run npm run build first.');
    return;
  }

  const files = fs.readdirSync(distPath);
  const jsFiles = files.filter(file => file.endsWith('.js'));
  
  console.log('📊 Bundle Analysis Report');
  console.log('========================\n');
  
  const fileSizes = jsFiles.map(file => {
    const filePath = path.join(distPath, file);
    const stats = fs.statSync(filePath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    return {
      name: file,
      size: stats.size,
      sizeKB: parseFloat(sizeKB),
      sizeMB: parseFloat(sizeMB)
    };
  }).sort((a, b) => b.size - a.size);

  console.log('📦 Largest JavaScript Bundles:');
  console.log('--------------------------------');
  
  fileSizes.forEach((file, index) => {
    const icon = file.sizeMB > 1 ? '🔴' : file.sizeMB > 0.5 ? '🟡' : '🟢';
    console.log(`${icon} ${file.name}: ${file.sizeKB} KB (${file.sizeMB} MB)`);
    
    if (file.sizeMB > 1) {
      console.log(`   ⚠️  Large bundle detected! Consider splitting.`);
    }
  });

  const totalSize = fileSizes.reduce((sum, file) => sum + file.size, 0);
  const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
  
  console.log(`\n📈 Total JavaScript Size: ${totalSizeMB} MB`);
  
  // Mobile optimization recommendations
  console.log('\n🚀 Mobile Optimization Recommendations:');
  console.log('=====================================');
  
  const largeFiles = fileSizes.filter(file => file.sizeMB > 0.5);
  
  if (largeFiles.length > 0) {
    console.log('\n🔧 Large files to optimize:');
    largeFiles.forEach(file => {
      console.log(`   • ${file.name} (${file.sizeMB} MB)`);
    });
  }
  
  console.log('\n💡 Optimization strategies:');
  console.log('   • Use dynamic imports for route-based code splitting');
  console.log('   • Implement lazy loading for non-critical components');
  console.log('   • Optimize images with WebP/AVIF formats');
  console.log('   • Enable compression (gzip/Brotli)');
  console.log('   • Use CDN for static assets');
  console.log('   • Implement service worker for caching');
  console.log('   • Remove unused dependencies');
  
  // Check for specific optimization opportunities
  const vendorFile = fileSizes.find(file => file.name.includes('vendor'));
  if (vendorFile && vendorFile.sizeMB > 0.3) {
    console.log('\n⚠️  Vendor bundle is large. Consider:');
    console.log('   • Splitting vendor dependencies');
    console.log('   • Using tree shaking');
    console.log('   • Replacing heavy libraries with lighter alternatives');
  }
  
  const mainFile = fileSizes.find(file => file.name.includes('index') && !file.name.includes('vendor'));
  if (mainFile && mainFile.sizeMB > 0.2) {
    console.log('\n⚠️  Main bundle is large. Consider:');
    console.log('   • Code splitting by routes');
    console.log('   • Lazy loading components');
    console.log('   • Removing unused code');
  }
  
  console.log('\n✅ Analysis complete!');
}

// Run the analysis
analyzeBundle();
