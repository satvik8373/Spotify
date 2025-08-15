import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define icon sizes to generate
const ICON_SIZES = [32, 64, 96, 192, 512];
const SOURCE_ICON = path.join(__dirname, '../public/spotify-icons/spotify-icon-new.jpg');
const OUTPUT_DIR = path.join(__dirname, '../public/spotify-icons');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Generate PNG icons in different sizes
async function generateIcons() {
  console.log('Generating new Spotify icons...');
  
  try {
    // Generate standard icons
    for (const size of ICON_SIZES) {
      await sharp(SOURCE_ICON)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
        })
        .png()
        .toFile(path.join(OUTPUT_DIR, `spotify-icon-${size}.png`));
      
      console.log(`Created icon: spotify-icon-${size}.png`);
    }

    // Generate maskable icons (with padding for adaptive icons)
    for (const size of ICON_SIZES) {
      if (size >= 192) { // Only generate maskable for larger sizes
        await sharp(SOURCE_ICON)
          .resize(Math.floor(size * 0.8), Math.floor(size * 0.8), {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .extend({
            top: Math.floor(size * 0.1),
            bottom: Math.floor(size * 0.1),
            left: Math.floor(size * 0.1),
            right: Math.floor(size * 0.1),
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .png()
          .toFile(path.join(OUTPUT_DIR, `spotify-icon-maskable-${size}.png`));
        
        console.log(`Created maskable icon: spotify-icon-maskable-${size}.png`);
      }
    }

    // Generate favicon
    await sharp(SOURCE_ICON)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(path.join(__dirname, '../public/favicon.png'));
    
    console.log('Created favicon.png');

    // Generate apple touch icons
    const appleSizes = [120, 152, 167, 180];
    for (const size of appleSizes) {
      await sharp(SOURCE_ICON)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(path.join(__dirname, `../public/apple-touch-icon-${size}.png`));
      
      console.log(`Created apple touch icon: apple-touch-icon-${size}.png`);
    }

    // Generate main apple touch icon
    await sharp(SOURCE_ICON)
      .resize(180, 180, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(path.join(__dirname, '../public/apple-touch-icon.png'));
    
    console.log('Created apple-touch-icon.png');
    
    console.log('All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

// Run the icon generation
generateIcons();
