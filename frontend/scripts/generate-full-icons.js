import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define icon sizes to generate
const ICON_SIZES = [16, 32, 48, 72, 96, 128, 144, 152, 192, 384, 512];
const SOURCE_PNG = path.join(__dirname, '../../icon.spotify.png');
const OUTPUT_DIR = path.join(__dirname, '../public/spotify-icons');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Generate PNG icons in different sizes that fill the entire area
async function generateFullIcons() {
  console.log('Generating full-area Spotify icons from PNG...');
  
  try {
    // Generate standard icons - these will fill the entire area
    for (const size of ICON_SIZES) {
      await sharp(SOURCE_PNG)
        .resize(size, size, {
          fit: 'fill', // This ensures the icon fills the entire area
          background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
        })
        .png()
        .toFile(path.join(OUTPUT_DIR, `spotify-icon-${size}.png`));
      
      console.log(`Created full-area icon: spotify-icon-${size}.png`);
    }
    
    // Generate maskable icons - these will also fill the entire area
    for (const size of [192, 512]) {
      await sharp(SOURCE_PNG)
        .resize(size, size, {
          fit: 'fill', // This ensures the icon fills the entire area
          background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
        })
        .png()
        .toFile(path.join(OUTPUT_DIR, `spotify-icon-maskable-${size}.png`));
      
      console.log(`Created full-area maskable icon: spotify-icon-maskable-${size}.png`);
    }
    
    // Generate Apple touch icons - these will also fill the entire area
    const appleSizes = [120, 152, 167, 180];
    for (const size of appleSizes) {
      const outputPath = path.join(__dirname, '../public/apple-touch-icon-' + size + '.png');
      await sharp(SOURCE_PNG)
        .resize(size, size, {
          fit: 'fill', // This ensures the icon fills the entire area
          background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
        })
        .png()
        .toFile(outputPath);
      
      console.log(`Created full-area Apple touch icon: apple-touch-icon-${size}.png`);
    }
    
    // Create favicon - this will also fill the entire area
    await sharp(SOURCE_PNG)
      .resize(32, 32, {
        fit: 'fill', // This ensures the icon fills the entire area
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
      })
      .png()
      .toFile(path.join(__dirname, '../public/favicon.png'));
    
    console.log('Created full-area favicon: favicon.png');
    
    // Create logo variants that fill the entire area
    const logoVariants = ['green', 'black', 'white'];
    for (const variant of logoVariants) {
      await sharp(SOURCE_PNG)
        .resize(512, 512, {
          fit: 'fill', // This ensures the icon fills the entire area
          background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
        })
        .png()
        .toFile(path.join(OUTPUT_DIR, `spotify-logo-${variant}.png`));
      
      console.log(`Created full-area logo: spotify-logo-${variant}.png`);
    }
    
    // Create shortcut icons that fill the entire area
    await sharp(SOURCE_PNG)
      .resize(96, 96, {
        fit: 'fill', // This ensures the icon fills the entire area
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
      })
      .png()
      .toFile(path.join(__dirname, '../public/shortcut-liked-96.png'));
    
    await sharp(SOURCE_PNG)
      .resize(96, 96, {
        fit: 'fill', // This ensures the icon fills the entire area
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
      })
      .png()
      .toFile(path.join(__dirname, '../public/shortcut-search-96.png'));
    
    console.log('Created full-area shortcut icons');
    
    console.log('All full-area icons generated successfully!');
  } catch (error) {
    console.error('Error generating full-area icons:', error);
    process.exit(1);
  }
}

// Run the icon generation
generateFullIcons();
