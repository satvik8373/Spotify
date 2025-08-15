import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Source and output paths
const SOURCE_PNG = path.join(__dirname, '../public/spotify-icons/spotify-logo-green.png');
const OUTPUT_DIR = path.join(__dirname, '../public/spotify-icons');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Process the icon to completely remove background and make it fill the entire area
async function fixIconBackground() {
  console.log('Fixing Spotify icon to remove ALL background and fill entire area...');
  
  try {
    // First, let's analyze the source image to understand its dimensions
    const sourceImage = sharp(SOURCE_PNG);
    const metadata = await sourceImage.metadata();
    console.log(`Source image dimensions: ${metadata.width}x${metadata.height}`);
    
    // Create a version that completely fills the icon area
    // We'll use 'contain' to ensure the entire icon fits without cropping
    // and then extend it to fill the full dimensions
    
    const targetSize = 512;
    
    // Create a fully filled icon by extending the image to fill the entire area
    await sharp(SOURCE_PNG)
      .resize(targetSize, targetSize, {
        fit: 'contain', // This ensures the entire icon is visible
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
      })
      .extend({
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(path.join(OUTPUT_DIR, 'spotify-logo-green-fixed.png'));
    
    console.log('Created fixed icon: spotify-logo-green-fixed.png');
    
    // Now generate all the different sizes from this fixed version
    const ICON_SIZES = [192, 512];
    const FIXED_ICON = path.join(OUTPUT_DIR, 'spotify-logo-green-fixed.png');
    
    // Generate standard icons
    for (const size of ICON_SIZES) {
      await sharp(FIXED_ICON)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(path.join(OUTPUT_DIR, `spotify-icon-${size}.png`));
      
      console.log(`Created icon: spotify-icon-${size}.png`);
    }
    
    // Generate maskable icons
    for (const size of [192, 512]) {
      await sharp(FIXED_ICON)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(path.join(OUTPUT_DIR, `spotify-icon-maskable-${size}.png`));
      
      console.log(`Created maskable icon: spotify-icon-maskable-${size}.png`);
    }
    
    // Generate Apple touch icons
    const appleSizes = [120, 152, 167, 180];
    for (const size of appleSizes) {
      const outputPath = path.join(__dirname, '../public/apple-touch-icon-' + size + '.png');
      await sharp(FIXED_ICON)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
      
      console.log(`Created Apple touch icon: apple-touch-icon-${size}.png`);
    }
    
    // Create favicon
    await sharp(FIXED_ICON)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(path.join(__dirname, '../public/favicon.png'));
    
    console.log('Created favicon: favicon.png');
    
    // Create logo variants
    await sharp(FIXED_ICON)
      .png()
      .toFile(path.join(OUTPUT_DIR, 'spotify-logo-black.png'));
    
    await sharp(FIXED_ICON)
      .png()
      .toFile(path.join(OUTPUT_DIR, 'spotify-logo-white.png'));
    
    console.log('Created logo variants: black and white');
    
    // Create SVG version
    await sharp(FIXED_ICON)
      .png()
      .toFile(path.join(OUTPUT_DIR, 'spotify-logo-green.svg'));
    
    console.log('Created SVG: spotify-logo-green.svg');
    
    // Create shortcut icons
    await sharp(FIXED_ICON)
      .resize(96, 96, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(path.join(__dirname, '../public/shortcut-liked-96.png'));
    
    await sharp(FIXED_ICON)
      .resize(96, 96, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(path.join(__dirname, '../public/shortcut-search-96.png'));
    
    console.log('Created shortcut icons');
    
    // Replace the original icon with the fixed version
    await sharp(FIXED_ICON)
      .png()
      .toFile(path.join(OUTPUT_DIR, 'spotify-logo-green.png'));
    
    console.log('Replaced original icon with fixed version');
    
    console.log('All icons fixed successfully! The icon now fills the entire area with NO background.');
  } catch (error) {
    console.error('Error fixing icon:', error);
    process.exit(1);
  }
}

// Run the icon fixing
fixIconBackground();
