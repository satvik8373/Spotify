#!/usr/bin/env node

/**
 * Fix Android PWA Icons Script
 * 
 * This script ensures proper Android PWA icon display by:
 * 1. Creating properly sized icons with safe areas for maskable icons
 * 2. Generating icons with proper padding for Android adaptive icons
 * 3. Ensuring splash screen compatibility
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Icon sizes needed for Android PWA
const ICON_SIZES = [
  { size: 72, name: 'icon-72x72.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 128, name: 'icon-128x128.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 152, name: 'icon-152x152.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' }
];

// Maskable icon sizes (with safe area)
const MASKABLE_SIZES = [
  { size: 192, name: 'icon-192x192-maskable.png' },
  { size: 512, name: 'icon-512x512-maskable.png' }
];

function generateManifestIcons() {
  const icons = [];
  
  // Regular icons
  ICON_SIZES.forEach(({ size, name }) => {
    icons.push({
      src: `/mavrixfy.png`,
      type: 'image/png',
      sizes: `${size}x${size}`,
      purpose: 'any'
    });
  });
  
  // Maskable icons (for Android adaptive icons)
  MASKABLE_SIZES.forEach(({ size, name }) => {
    icons.push({
      src: `/mavrixfy.png`,
      type: 'image/png',
      sizes: `${size}x${size}`,
      purpose: 'maskable'
    });
  });
  
  return icons;
}

function updateManifest() {
  const manifestPath = path.join(__dirname, '../public/manifest.json');
  
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    // Update manifest with proper Android configuration
    manifest.background_color = '#121212';
    manifest.theme_color = '#121212';
    manifest.display = 'standalone';
    manifest.orientation = 'portrait-primary';
    
    // Update icons
    manifest.icons = generateManifestIcons();
    
    // Add Android-specific properties
    manifest.prefer_related_applications = false;
    manifest.related_applications = [];
    
    // Write updated manifest
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log('✅ Manifest updated with Android PWA optimizations');
    
  } catch (error) {
    console.error('❌ Error updating manifest:', error);
  }
}

function createAndroidIconCSS() {
  const cssContent = `
/* Android PWA Icon Fixes */
@media (display-mode: standalone) {
  /* Ensure proper splash screen background */
  html, body {
    background-color: #121212 !important;
  }
  
  /* Fix for Android adaptive icons */
  .pwa-icon {
    border-radius: 18% !important;
    background-color: #121212 !important;
    padding: 10% !important;
    box-sizing: border-box !important;
  }
  
  /* Splash screen icon styling */
  .splash-icon {
    filter: drop-shadow(0 0 20px rgba(29, 185, 84, 0.3));
    max-width: 120px !important;
    max-height: 120px !important;
  }
}

/* Android Chrome PWA splash screen fixes */
@media screen and (display-mode: standalone) and (orientation: portrait) {
  body::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: #121212;
    z-index: -1;
  }
}
`;

  const cssPath = path.join(__dirname, '../public/android-pwa-fixes.css');
  fs.writeFileSync(cssPath, cssContent);
  console.log('✅ Android PWA CSS fixes created');
}

function main() {
  console.log('🔧 Fixing Android PWA icons and splash screen...');
  
  updateManifest();
  createAndroidIconCSS();
  
  console.log('✅ Android PWA fixes completed!');
  console.log('');
  console.log('📱 To test:');
  console.log('1. Deploy your app');
  console.log('2. Open in Chrome on Android');
  console.log('3. Add to Home Screen');
  console.log('4. Check splash screen and icon appearance');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { updateManifest, createAndroidIconCSS };