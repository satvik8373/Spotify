/**
 * Add cache-busting query parameters to built files
 * Run after build to ensure mobile apps load fresh code
 */

const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '../dist');
const buildTime = Date.now();

function addCacheBusting(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      addCacheBusting(filePath);
    } else if (file.endsWith('.html')) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Add cache busting to script and link tags
      content = content.replace(
        /<script([^>]*) src="([^"]+)"/g,
        `<script$1 src="$2?v=${buildTime}"`
      );
      
      content = content.replace(
        /<link([^>]*) href="([^"]+\.css)"/g,
        `<link$1 href="$2?v=${buildTime}"`
      );
      
      fs.writeFileSync(filePath, content);
      console.log(`✅ Added cache busting to ${file}`);
    }
  });
}

console.log('🔧 Adding cache-busting parameters...');
addCacheBusting(distDir);
console.log('✅ Cache-busting complete!');
