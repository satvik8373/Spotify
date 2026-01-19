#!/usr/bin/env node

/**
 * Cleanup script to remove unused files from production builds
 * This script removes development-only files and unused utilities
 */

const fs = require('fs');
const path = require('path');

const UNUSED_FILES = [
  // Test and debug utilities (development only)
  'src/utils/audioTestUtils.ts',
  'src/utils/audioDebugger.ts', 
  'src/utils/productionAudioTest.ts',
  
  // Unused components (if any are found)
  // Add more files here as needed
];

function cleanupUnusedFiles() {
  console.log('🧹 Cleaning up unused files...');
  
  let removedCount = 0;
  
  UNUSED_FILES.forEach(filePath => {
    const fullPath = path.join(__dirname, '..', filePath);
    
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
        console.log(`✅ Removed: ${filePath}`);
        removedCount++;
      } catch (error) {
        console.warn(`⚠️  Failed to remove ${filePath}:`, error.message);
      }
    } else {
      console.log(`ℹ️  File not found (already removed?): ${filePath}`);
    }
  });
  
  console.log(`\n📊 Cleanup complete: ${removedCount} files removed`);
}

function checkForUnusedImports() {
  console.log('\n🔍 Checking for unused imports...');
  
  const srcDir = path.join(__dirname, '..', 'src');
  
  // Check for imports of removed functions
  const checkPatterns = [
    'loadAudioWithFallback',
    'loadAudioForIOS', 
    'bypassServiceWorkerForAudio',
    'useIOSAudio'
  ];
  
  function scanDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        scanDirectory(filePath);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        checkPatterns.forEach(pattern => {
          if (content.includes(pattern)) {
            const relativePath = path.relative(path.join(__dirname, '..'), filePath);
            console.log(`⚠️  Found reference to '${pattern}' in: ${relativePath}`);
          }
        });
      }
    });
  }
  
  try {
    scanDirectory(srcDir);
    console.log('✅ Unused import check complete');
  } catch (error) {
    console.warn('⚠️  Error checking imports:', error.message);
  }
}

function generateCleanupReport() {
  console.log('\n📋 Cleanup Report');
  console.log('==================');
  console.log('Files removed:');
  UNUSED_FILES.forEach(file => {
    console.log(`  - ${file}`);
  });
  
  console.log('\n✨ Background playback improvements:');
  console.log('  - Added backgroundPlaybackManager for centralized audio handling');
  console.log('  - Enhanced MediaSession API integration for lock screen controls');
  console.log('  - Improved Wake Lock API usage to prevent screen sleep');
  console.log('  - Better iOS background playback support');
  console.log('  - Enhanced service worker audio streaming handling');
  console.log('  - Removed unused functions: loadAudioWithFallback, loadAudioForIOS, bypassServiceWorkerForAudio');
  console.log('  - Removed unused hook: useIOSAudio');
}

// Run cleanup if this script is executed directly
if (require.main === module) {
  console.log('🎵 Mavrixfy Audio Cleanup Script');
  console.log('================================\n');
  
  cleanupUnusedFiles();
  checkForUnusedImports();
  generateCleanupReport();
  
  console.log('\n🎉 All done! Your audio system is now optimized.');
}

module.exports = {
  cleanupUnusedFiles,
  checkForUnusedImports,
  generateCleanupReport
};