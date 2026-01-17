/**
 * Quick diagnostic script to check if authentication setup is correct
 * Run: node check-auth-setup.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Checking Authentication Setup...\n');

let allGood = true;

// Check 1: WebView detection utility exists
console.log('1️⃣ Checking WebView detection utility...');
const webViewDetectionPath = path.join(__dirname, 'src/utils/webViewDetection.ts');
if (fs.existsSync(webViewDetectionPath)) {
  console.log('   ✅ webViewDetection.ts exists');
} else {
  console.log('   ❌ webViewDetection.ts NOT FOUND');
  allGood = false;
}

// Check 2: Auth service imports WebView utils
console.log('\n2️⃣ Checking auth service imports...');
const authServicePath = path.join(__dirname, 'src/services/hybridAuthService.ts');
if (fs.existsSync(authServicePath)) {
  const authServiceContent = fs.readFileSync(authServicePath, 'utf8');
  if (authServiceContent.includes('isWebView') && authServiceContent.includes('clearAuthCache')) {
    console.log('   ✅ Auth service imports WebView utilities');
  } else {
    console.log('   ❌ Auth service missing WebView imports');
    allGood = false;
  }
  
  if (authServiceContent.includes('signInWithPopup')) {
    console.log('   ✅ Using signInWithPopup (correct!)');
  } else {
    console.log('   ⚠️  Not using signInWithPopup');
  }
  
  if (authServiceContent.includes('signInWithRedirect')) {
    console.log('   ❌ WARNING: Still using signInWithRedirect somewhere!');
    allGood = false;
  }
} else {
  console.log('   ❌ hybridAuthService.ts NOT FOUND');
  allGood = false;
}

// Check 3: Main.tsx initializes WebView
console.log('\n3️⃣ Checking main.tsx initialization...');
const mainPath = path.join(__dirname, 'src/main.tsx');
if (fs.existsSync(mainPath)) {
  const mainContent = fs.readFileSync(mainPath, 'utf8');
  if (mainContent.includes('configureWebViewAuth')) {
    console.log('   ✅ main.tsx initializes WebView configuration');
  } else {
    console.log('   ❌ main.tsx missing WebView initialization');
    allGood = false;
  }
} else {
  console.log('   ❌ main.tsx NOT FOUND');
  allGood = false;
}

// Check 4: Capacitor config
console.log('\n4️⃣ Checking Capacitor configuration...');
const capacitorConfigPath = path.join(__dirname, '../capacitor.config.json');
if (fs.existsSync(capacitorConfigPath)) {
  const capacitorConfig = JSON.parse(fs.readFileSync(capacitorConfigPath, 'utf8'));
  
  if (capacitorConfig.android?.allowNavigation) {
    console.log('   ✅ Android allowNavigation configured');
    const androidNav = capacitorConfig.android.allowNavigation;
    if (androidNav.includes('https://accounts.google.com')) {
      console.log('   ✅ Google accounts domain allowed');
    } else {
      console.log('   ⚠️  Google accounts domain not in allowNavigation');
    }
  } else {
    console.log('   ❌ Android allowNavigation NOT configured');
    allGood = false;
  }
  
  if (capacitorConfig.ios?.allowNavigation) {
    console.log('   ✅ iOS allowNavigation configured');
  } else {
    console.log('   ❌ iOS allowNavigation NOT configured');
    allGood = false;
  }
} else {
  console.log('   ❌ capacitor.config.json NOT FOUND');
  allGood = false;
}

// Check 5: Cache busting script
console.log('\n5️⃣ Checking cache busting script...');
const cacheBustingPath = path.join(__dirname, 'scripts/add-cache-busting.js');
if (fs.existsSync(cacheBustingPath)) {
  console.log('   ✅ Cache busting script exists');
} else {
  console.log('   ⚠️  Cache busting script not found (optional)');
}

// Check 6: Package.json scripts
console.log('\n6️⃣ Checking package.json scripts...');
const packageJsonPath = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  if (packageJson.scripts['build:mobile']) {
    console.log('   ✅ build:mobile script exists');
  } else {
    console.log('   ⚠️  build:mobile script not found');
  }
} else {
  console.log('   ❌ package.json NOT FOUND');
  allGood = false;
}

// Check 7: Index.html cache headers
console.log('\n7️⃣ Checking index.html cache headers...');
const indexPath = path.join(__dirname, 'index.html');
if (fs.existsSync(indexPath)) {
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  if (indexContent.includes('Cache-Control')) {
    console.log('   ✅ Cache-Control headers present');
  } else {
    console.log('   ❌ Cache-Control headers missing');
    allGood = false;
  }
} else {
  console.log('   ❌ index.html NOT FOUND');
  allGood = false;
}

// Summary
console.log('\n' + '='.repeat(60));
if (allGood) {
  console.log('✅ ALL CODE CHANGES ARE CORRECT!\n');
  console.log('If login still doesn\'t work, the issue is likely:');
  console.log('1. Firebase Console not configured (MOST COMMON)');
  console.log('   → Add "capacitor://localhost" to authorized domains');
  console.log('   → Add redirect URIs to Google Cloud Console');
  console.log('\n2. App not rebuilt after changes');
  console.log('   → Run: npm run build:mobile');
  console.log('   → Run: npx cap sync');
  console.log('   → Rebuild in Android Studio/Xcode');
  console.log('\n3. Android MainActivity not configured (Android only)');
  console.log('   → Use android-MainActivity-template.java');
  console.log('\n4. iOS Info.plist not configured (iOS only)');
  console.log('   → Use ios-Info-plist-additions.xml');
  console.log('\nSee DEBUG_WEBVIEW_AUTH.md for detailed troubleshooting.');
} else {
  console.log('❌ SOME CODE CHANGES ARE MISSING!\n');
  console.log('Please review the errors above and fix them.');
  console.log('Then run this script again to verify.');
}
console.log('='.repeat(60));
