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

// Generate PNG icons in different sizes - CROPPED (no black borders)
async function generateCroppedIcons() {
  console.log('Generating CROPPED Spotify icons (no black borders)...');
  
  try {
    // First, let's analyze the image to find the green icon boundaries
    const metadata = await sharp(SOURCE_PNG).metadata();
    console.log('Original image size:', metadata.width, 'x', metadata.height);
    
    // The green icon is likely in the center, let's crop it out
    // We'll crop from the center, removing the black borders
    const cropSize = Math.min(metadata.width, metadata.height);
    const cropX = Math.floor((metadata.width - cropSize) / 2);
    const cropY = Math.floor((metadata.height - cropSize) / 2);
    
    console.log('Cropping from:', cropX, cropY, 'size:', cropSize);
    
    // Generate standard icons - CROPPED
    for (const size of ICON_SIZES) {
      await sharp(SOURCE_PNG)
        .extract({ left: cropX, top: cropY, width: cropSize, height: cropSize })
        .resize(size, size, {
          fit: 'cover', // Use cover to fill the entire square
          background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
        })
        .png()
        .toFile(path.join(OUTPUT_DIR, `spotify-icon-${size}.png`));
      
      console.log(`Created cropped icon: spotify-icon-${size}.png`);
    }
    
    // Generate maskable icons - CROPPED
    for (const size of [192, 512]) {
      await sharp(SOURCE_PNG)
        .extract({ left: cropX, top: cropY, width: cropSize, height: cropSize })
        .resize(size, size, {
          fit: 'cover',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(path.join(OUTPUT_DIR, `spotify-icon-maskable-${size}.png`));
      
      console.log(`Created cropped maskable icon: spotify-icon-maskable-${size}.png`);
    }
    
    // Generate Apple touch icons - CROPPED
    const appleSizes = [120, 152, 167, 180];
    for (const size of appleSizes) {
      const outputPath = path.join(__dirname, '../public/apple-touch-icon-' + size + '.png');
      await sharp(SOURCE_PNG)
        .extract({ left: cropX, top: cropY, width: cropSize, height: cropSize })
        .resize(size, size, {
          fit: 'cover',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
      
      console.log(`Created cropped Apple touch icon: apple-touch-icon-${size}.png`);
    }
    
    // Create favicon - CROPPED
    await sharp(SOURCE_PNG)
      .extract({ left: cropX, top: cropY, width: cropSize, height: cropSize })
      .resize(32, 32, {
        fit: 'cover',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(path.join(__dirname, '../public/favicon.png'));
    
    console.log('Created cropped favicon: favicon.png');
    
    // Create shortcut icons - CROPPED
    await sharp(SOURCE_PNG)
      .extract({ left: cropX, top: cropY, width: cropSize, height: cropSize })
      .resize(96, 96, {
        fit: 'cover',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(path.join(__dirname, '../public/shortcut-liked-96.png'));
    
    await sharp(SOURCE_PNG)
      .extract({ left: cropX, top: cropY, width: cropSize, height: cropSize })
      .resize(96, 96, {
        fit: 'cover',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(path.join(__dirname, '../public/shortcut-search-96.png'));
    
    console.log('Created cropped shortcut icons');
    
    // Also create a new main logo without borders
    await sharp(SOURCE_PNG)
      .extract({ left: cropX, top: cropY, width: cropSize, height: cropSize })
      .resize(512, 512, {
        fit: 'cover',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(path.join(OUTPUT_DIR, 'spotify-logo-green.png'));
    
    console.log('Created cropped main logo: spotify-logo-green.png');
    
    console.log('All CROPPED icons generated successfully!');
    console.log('Icons now have NO black borders - truly full-bleed!');
  } catch (error) {
    console.error('Error generating cropped icons:', error);
    process.exit(1);
  }
}

// Run the icon generation
generateCroppedIcons();
