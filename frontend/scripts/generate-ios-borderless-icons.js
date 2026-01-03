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

// Generate PNG icons in different sizes - AGGRESSIVE CROPPING for iOS
async function generateIOSBorderlessIcons() {
  console.log('Generating iOS BORDERLESS Spotify icons (aggressive cropping)...');
  
  try {
    // First, let's analyze the image to find the green icon boundaries
    const metadata = await sharp(SOURCE_PNG).metadata();
    console.log('Original image size:', metadata.width, 'x', metadata.height);
    
    // For iOS, we need to be more aggressive with cropping
    // Let's crop a smaller area to ensure no black borders
    const originalSize = Math.min(metadata.width, metadata.height);
    const cropSize = Math.floor(originalSize * 0.8); // Crop 80% of the center
    const cropX = Math.floor((metadata.width - cropSize) / 2);
    const cropY = Math.floor((metadata.height - cropSize) / 2);
    
    console.log('Aggressive cropping from:', cropX, cropY, 'size:', cropSize);
    
    // Generate standard icons - AGGRESSIVE CROPPING
    for (const size of ICON_SIZES) {
      await sharp(SOURCE_PNG)
        .extract({ left: cropX, top: cropY, width: cropSize, height: cropSize })
        .resize(size, size, {
          fit: 'cover', // Use cover to fill the entire square
          background: { r: 29, g: 185, b: 84, alpha: 1 } // Spotify green background
        })
        .png()
        .toFile(path.join(OUTPUT_DIR, `spotify-icon-${size}.png`));
      
      console.log(`Created iOS borderless icon: spotify-icon-${size}.png`);
    }
    
    // Generate maskable icons - AGGRESSIVE CROPPING
    for (const size of [192, 512]) {
      await sharp(SOURCE_PNG)
        .extract({ left: cropX, top: cropY, width: cropSize, height: cropSize })
        .resize(size, size, {
          fit: 'cover',
          background: { r: 29, g: 185, b: 84, alpha: 1 } // Spotify green background
        })
        .png()
        .toFile(path.join(OUTPUT_DIR, `spotify-icon-maskable-${size}.png`));
      
      console.log(`Created iOS borderless maskable icon: spotify-icon-maskable-${size}.png`);
    }
    
    // Generate Apple touch icons - AGGRESSIVE CROPPING
    const appleSizes = [120, 152, 167, 180];
    for (const size of appleSizes) {
      const outputPath = path.join(__dirname, '../public/apple-touch-icon-' + size + '.png');
      await sharp(SOURCE_PNG)
        .extract({ left: cropX, top: cropY, width: cropSize, height: cropSize })
        .resize(size, size, {
          fit: 'cover',
          background: { r: 29, g: 185, b: 84, alpha: 1 } // Spotify green background
        })
        .png()
        .toFile(outputPath);
      
      console.log(`Created iOS borderless Apple touch icon: apple-touch-icon-${size}.png`);
    }
    
    // Create favicon - AGGRESSIVE CROPPING
    await sharp(SOURCE_PNG)
      .extract({ left: cropX, top: cropY, width: cropSize, height: cropSize })
      .resize(32, 32, {
        fit: 'cover',
        background: { r: 29, g: 185, b: 84, alpha: 1 } // Spotify green background
      })
      .png()
      .toFile(path.join(__dirname, '../public/favicon.png'));
    
    console.log('Created iOS borderless favicon: favicon.png');
    
    // Create shortcut icons - AGGRESSIVE CROPPING
    await sharp(SOURCE_PNG)
      .extract({ left: cropX, top: cropY, width: cropSize, height: cropSize })
      .resize(96, 96, {
        fit: 'cover',
        background: { r: 29, g: 185, b: 84, alpha: 1 } // Spotify green background
      })
      .png()
      .toFile(path.join(__dirname, '../public/shortcut-liked-96.png'));
    
    await sharp(SOURCE_PNG)
      .extract({ left: cropX, top: cropY, width: cropSize, height: cropSize })
      .resize(96, 96, {
        fit: 'cover',
        background: { r: 29, g: 185, b: 84, alpha: 1 } // Spotify green background
      })
      .png()
      .toFile(path.join(__dirname, '../public/shortcut-search-96.png'));
    
    console.log('Created iOS borderless shortcut icons');
    
    // Also create a new main logo without borders
    await sharp(SOURCE_PNG)
      .extract({ left: cropX, top: cropY, width: cropSize, height: cropSize })
      .resize(512, 512, {
        fit: 'cover',
        background: { r: 29, g: 185, b: 84, alpha: 1 } // Spotify green background
      })
      .png()
      .toFile(path.join(OUTPUT_DIR, 'spotify-logo-green.png'));
    
    console.log('Created iOS borderless main logo: spotify-logo-green.png');
    
    console.log('All iOS BORDERLESS icons generated successfully!');
    console.log('Icons now have NO black borders - truly full-bleed for iOS!');
  } catch (error) {
    console.error('Error generating iOS borderless icons:', error);
    process.exit(1);
  }
}

// Run the icon generation
generateIOSBorderlessIcons();
