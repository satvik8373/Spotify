import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define icon sizes to generate
const ICON_SIZES = [16, 32, 48, 72, 96, 128, 144, 152, 192, 384, 512];
const SOURCE_PNG = path.join(__dirname, '../public/spotify-icons/spotify-logo-green.png');
const OUTPUT_DIR = path.join(__dirname, '../public/spotify-icons');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Generate PNG icons in different sizes - FULL BLEED (no borders)
async function generateFullBleedIcons() {
  console.log('Generating FULL BLEED Spotify icons (no borders)...');
  
  try {
    // Generate standard icons - FULL BLEED
    for (const size of ICON_SIZES) {
      await sharp(SOURCE_PNG)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
        })
        .png()
        .toFile(path.join(OUTPUT_DIR, `spotify-icon-${size}.png`));
      
      console.log(`Created full-bleed icon: spotify-icon-${size}.png`);
    }
    
    // Generate maskable icons - FULL BLEED
    for (const size of [192, 512]) {
      await sharp(SOURCE_PNG)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
        })
        .png()
        .toFile(path.join(OUTPUT_DIR, `spotify-icon-maskable-${size}.png`));
      
      console.log(`Created full-bleed maskable icon: spotify-icon-maskable-${size}.png`);
    }
    
    // Generate Apple touch icons - FULL BLEED
    const appleSizes = [120, 152, 167, 180];
    for (const size of appleSizes) {
      const outputPath = path.join(__dirname, '../public/apple-touch-icon-' + size + '.png');
      await sharp(SOURCE_PNG)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
        })
        .png()
        .toFile(outputPath);
      
      console.log(`Created full-bleed Apple touch icon: apple-touch-icon-${size}.png`);
    }
    
    // Create favicon - FULL BLEED
    await sharp(SOURCE_PNG)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
      })
      .png()
      .toFile(path.join(__dirname, '../public/favicon.png'));
    
    console.log('Created full-bleed favicon: favicon.png');
    
    // Create shortcut icons - FULL BLEED
    await sharp(SOURCE_PNG)
      .resize(96, 96, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
      })
      .png()
      .toFile(path.join(__dirname, '../public/shortcut-liked-96.png'));
    
    await sharp(SOURCE_PNG)
      .resize(96, 96, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
      })
      .png()
      .toFile(path.join(__dirname, '../public/shortcut-search-96.png'));
    
    console.log('Created full-bleed shortcut icons');
    
    console.log('All FULL BLEED icons generated successfully!');
    console.log('Icons now have NO borders - like Snapchat!');
  } catch (error) {
    console.error('Error generating full-bleed icons:', error);
    process.exit(1);
  }
}

// Run the icon generation
generateFullBleedIcons();
