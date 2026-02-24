/**
 * Test OTA Setup - Verify production backend is ready
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Testing OTA Production Setup');
console.log('='.repeat(50));
console.log('');

let allPassed = true;

// Test 1: Check if ota_bundles directory exists
console.log('Test 1: OTA bundles directory');
const bundleDir = join(__dirname, 'ota_bundles');
if (existsSync(bundleDir)) {
  console.log('✅ Directory exists:', bundleDir);
} else {
  console.log('❌ Directory missing:', bundleDir);
  allPassed = false;
}
console.log('');

// Test 2: Check if OTA route file exists
console.log('Test 2: OTA route file');
const routeFile = join(__dirname, 'src/routes/ota.route.js');
if (existsSync(routeFile)) {
  console.log('✅ Route file exists:', routeFile);
  
  // Check if it's properly structured
  const content = readFileSync(routeFile, 'utf8');
  if (content.includes('export default router')) {
    console.log('✅ Route file properly exports router');
  } else {
    console.log('❌ Route file missing export');
    allPassed = false;
  }
} else {
  console.log('❌ Route file missing:', routeFile);
  allPassed = false;
}
console.log('');

// Test 3: Check if routes are registered in index.js
console.log('Test 3: Routes registration');
const indexFile = join(__dirname, 'src/index.js');
if (existsSync(indexFile)) {
  const content = readFileSync(indexFile, 'utf8');
  
  if (content.includes('import otaRoutes from "./routes/ota.route.js"')) {
    console.log('✅ OTA routes imported');
  } else {
    console.log('❌ OTA routes not imported');
    allPassed = false;
  }
  
  if (content.includes('app.use("/api/ota", otaRoutes)')) {
    console.log('✅ OTA routes registered at /api/ota');
  } else {
    console.log('❌ OTA routes not registered');
    allPassed = false;
  }
} else {
  console.log('❌ Index file missing');
  allPassed = false;
}
console.log('');

// Test 4: Check .env configuration
console.log('Test 4: Environment configuration');
const envFile = join(__dirname, '.env');
if (existsSync(envFile)) {
  const content = readFileSync(envFile, 'utf8');
  
  if (content.includes('OTA_BASE_URL')) {
    console.log('✅ OTA_BASE_URL configured');
  } else {
    console.log('⚠️  OTA_BASE_URL not set (will use default)');
  }
  
  if (content.includes('FRONTEND_URL')) {
    console.log('✅ FRONTEND_URL configured');
  } else {
    console.log('❌ FRONTEND_URL not set');
    allPassed = false;
  }
} else {
  console.log('❌ .env file missing');
  allPassed = false;
}
console.log('');

// Test 5: Check vercel.json
console.log('Test 5: Vercel configuration');
const vercelFile = join(__dirname, 'vercel.json');
if (existsSync(vercelFile)) {
  console.log('✅ vercel.json exists');
  
  const content = readFileSync(vercelFile, 'utf8');
  const config = JSON.parse(content);
  
  if (config.routes && config.routes.length > 0) {
    console.log('✅ Routes configured');
  } else {
    console.log('❌ Routes not configured');
    allPassed = false;
  }
} else {
  console.log('❌ vercel.json missing');
  allPassed = false;
}
console.log('');

// Summary
console.log('='.repeat(50));
if (allPassed) {
  console.log('✅ All tests passed! Production backend is ready.');
  console.log('');
  console.log('Next steps:');
  console.log('1. Deploy a test bundle:');
  console.log('   cd ../../Mavrixfy_App');
  console.log('   npm run build:ota 1.2.1 android');
  console.log('   npm run deploy:ota 1.2.1 android 1.2.0 "Test" --prod');
  console.log('');
  console.log('2. Commit and push to Vercel:');
  console.log('   git add backend/ota_bundles/');
  console.log('   git commit -m "Test OTA bundle"');
  console.log('   git push');
  console.log('');
  console.log('3. Verify deployment:');
  console.log('   curl https://spotify-api-drab.vercel.app/api/ota/bundles');
} else {
  console.log('❌ Some tests failed. Please fix the issues above.');
}
console.log('='.repeat(50));
