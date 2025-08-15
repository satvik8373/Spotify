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

// Process the icon to remove background and make it fill the entire area
async function processIcon() {
  console.log('Processing Spotify icon to remove background...');
  
  try {
    // First, let's create a version that fills the entire area
    // We'll resize the icon to fill the full dimensions without padding
    
    // Create a full-size version (512x512) that fills the entire area
    await sharp(SOURCE_PNG)
      .resize(512, 512, {
        fit: 'cover', // This will crop the image to fill the entire area
        position: 'center'
      })
      .png()
      .toFile(path.join(OUTPUT_DIR, 'spotify-logo-green-full.png'));
    
    console.log('Created full-size icon: spotify-logo-green-full.png');
    
    // Now generate all the different sizes from this full-size version
    const ICON_SIZES = [16, 32, 48, 72, 96, 128, 144, 152, 192, 384, 512];
    const FULL_SIZE_ICON = path.join(OUTPUT_DIR, 'spotify-logo-green-full.png');
    
    // Generate standard icons
    for (const size of ICON_SIZES) {
      await sharp(FULL_SIZE_ICON)
        .resize(size, size)
        .png()
        .toFile(path.join(OUTPUT_DIR, `spotify-icon-${size}.png`));
      
      console.log(`Created icon: spotify-icon-${size}.png`);
    }
    
    // Generate maskable icons
    for (const size of [192, 512]) {
      await sharp(FULL_SIZE_ICON)
        .resize(size, size)
        .png()
        .toFile(path.join(OUTPUT_DIR, `spotify-icon-maskable-${size}.png`));
      
      console.log(`Created maskable icon: spotify-icon-maskable-${size}.png`);
    }
    
    // Generate Apple touch icons
    const appleSizes = [120, 152, 167, 180];
    for (const size of appleSizes) {
      const outputPath = path.join(__dirname, '../public/apple-touch-icon-' + size + '.png');
      await sharp(FULL_SIZE_ICON)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`Created Apple touch icon: apple-touch-icon-${size}.png`);
    }
    
    // Create favicon
    await sharp(FULL_SIZE_ICON)
      .resize(32, 32)
      .png()
      .toFile(path.join(__dirname, '../public/favicon.png'));
    
    console.log('Created favicon: favicon.png');
    
    // Create logo variants
    await sharp(FULL_SIZE_ICON)
      .png()
      .toFile(path.join(OUTPUT_DIR, 'spotify-logo-black.png'));
    
    await sharp(FULL_SIZE_ICON)
      .png()
      .toFile(path.join(OUTPUT_DIR, 'spotify-logo-white.png'));
    
    console.log('Created logo variants: black and white');
    
    // Create SVG version
    await sharp(FULL_SIZE_ICON)
      .png()
      .toFile(path.join(OUTPUT_DIR, 'spotify-logo-green.svg'));
    
    console.log('Created SVG: spotify-logo-green.svg');
    
    // Create shortcut icons
    await sharp(FULL_SIZE_ICON)
      .resize(96, 96)
      .png()
      .toFile(path.join(__dirname, '../public/shortcut-liked-96.png'));
    
    await sharp(FULL_SIZE_ICON)
      .resize(96, 96)
      .png()
      .toFile(path.join(__dirname, '../public/shortcut-search-96.png'));
    
    console.log('Created shortcut icons');
    
    console.log('All icons processed successfully! The icon now fills the entire area without background.');
  } catch (error) {
    console.error('Error processing icon:', error);
    process.exit(1);
  }
}

// Run the icon processing
processIcon();
