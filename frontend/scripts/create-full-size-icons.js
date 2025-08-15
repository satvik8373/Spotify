import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define icon sizes to generate
const ICON_SIZES = [192, 512];
const SOURCE_PNG = path.join(__dirname, '../public/spotify-icons/spotify-logo-green.png');
const OUTPUT_DIR = path.join(__dirname, '../public/spotify-icons');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Generate full-size icons without background (like modern iOS apps)
async function generateFullSizeIcons() {
  console.log('Generating full-size Spotify icons without background...');
  
  try {
    // Generate standard icons - full size without padding
    for (const size of ICON_SIZES) {
      await sharp(SOURCE_PNG)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
        })
        .png()
        .toFile(path.join(OUTPUT_DIR, `spotify-icon-${size}.png`));
      
      console.log(`Created full-size icon: spotify-icon-${size}.png`);
    }
    
    // Generate maskable icons - full size without padding
    for (const size of ICON_SIZES) {
      await sharp(SOURCE_PNG)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
        })
        .png()
        .toFile(path.join(OUTPUT_DIR, `spotify-icon-maskable-${size}.png`));
      
      console.log(`Created full-size maskable icon: spotify-icon-maskable-${size}.png`);
    }
    
    // Generate Apple touch icons - full size without padding
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
      
      console.log(`Created full-size Apple touch icon: apple-touch-icon-${size}.png`);
    }
    
    // Create favicon - full size without padding
    await sharp(SOURCE_PNG)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
      })
      .png()
      .toFile(path.join(__dirname, '../public/favicon.png'));
    
    console.log('Created full-size favicon: favicon.png');
    
    // Create SVG version - full size without padding
    await sharp(SOURCE_PNG)
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
      })
      .png()
      .toFile(path.join(OUTPUT_DIR, 'spotify-logo-green.svg'));
    
    console.log('Created full-size SVG: spotify-logo-green.svg');
    
    console.log('All full-size icons generated successfully!');
  } catch (error) {
    console.error('Error generating full-size icons:', error);
    process.exit(1);
  }
}

// Run the icon generation
generateFullSizeIcons();
