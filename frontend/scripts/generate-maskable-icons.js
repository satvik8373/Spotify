/**
 * Script to generate maskable icons for Android
 * 
 * To run this script:
 * 1. First install: npm install canvas sharp fs-extra
 * 2. Run: node scripts/generate-maskable-icons.js
 */

import fs from 'fs-extra';
import path from 'path';
import { createCanvas, loadImage } from 'canvas';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

// Get current file directory with ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_ICON = path.join(__dirname, '../public/pwa-icons/spotify-mavrix-icon.svg');
const OUTPUT_DIR = path.join(__dirname, '../public');

// Sizes for maskable icons
const sizes = [192, 512];

async function createMaskableIcon(size) {
  try {
    // Create a canvas with the final size
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Fill with Spotify green background
    ctx.fillStyle = '#1DB954';
    ctx.fillRect(0, 0, size, size);

    // Load the source icon
    const icon = await loadImage(SOURCE_ICON);
    
    // Calculate dimensions for the icon - use 75% of space to better match Spotify's style
    // Original Spotify icon uses more space with less padding
    const safeZoneRatio = 0.75; // Using 75% to better match Spotify's style
    const iconSize = Math.round(size * safeZoneRatio);
    
    // Calculate position to center the icon
    const x = (size - iconSize) / 2;
    const y = (size - iconSize) / 2;
    
    // Draw the icon centered within the safe zone
    ctx.drawImage(icon, x, y, iconSize, iconSize);
    
    // Convert canvas to buffer
    const buffer = canvas.toBuffer('image/png');
    
    // Write the file using sharp for optimization
    await sharp(buffer)
      .png({ quality: 90 })
      .toFile(path.join(OUTPUT_DIR, `spotify-icon-maskable-${size}.png`));
    
    console.log(`Created maskable icon: spotify-icon-maskable-${size}.png`);
  } catch (error) {
    console.error(`Error creating ${size}x${size} maskable icon:`, error);
  }
}

async function generateMaskableIcons() {
  try {
    // Make sure the output directory exists
    await fs.ensureDir(OUTPUT_DIR);
    
    // Generate each size
    for (const size of sizes) {
      await createMaskableIcon(size);
    }

    // Also generate a favicon for convenience
    try {
      await sharp(SOURCE_ICON)
        .resize(64, 64)
        .png({ quality: 90 })
        .toFile(path.join(OUTPUT_DIR, 'favicon.png'));
      
      console.log('Created favicon: favicon.png');
    } catch (error) {
      console.error('Error creating favicon:', error);
    }
    
    console.log('All icons generated successfully!');
  } catch (error) {
    console.error('Error generating maskable icons:', error);
  }
}

// Run the script
generateMaskableIcons(); 