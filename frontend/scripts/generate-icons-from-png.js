import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define icon sizes to generate
const ICON_SIZES = [16, 32, 48, 72, 96, 128, 144, 152, 192, 384, 512];
const SOURCE_PNG = path.join(__dirname, '../../frontend/public/mavrixfy.png');
const OUTPUT_DIR = path.join(__dirname, '../assets/images');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Generate PNG icons in different sizes
async function generateIcons() {
  console.log('Generating Spotify icons from PNG...');
  
  try {
    // Generate standard icons
    for (const size of ICON_SIZES) {
      await sharp(SOURCE_PNG)
        .resize(size, size)
        .png()
        .toFile(path.join(OUTPUT_DIR, `spotify-icon-${size}.png`));
      
      console.log(`Created icon: spotify-icon-${size}.png`);
    }
    
    // Generate maskable icons (same as regular icons for now)
    for (const size of [192, 512]) {
      await sharp(SOURCE_PNG)
        .resize(size, size)
        .png()
        .toFile(path.join(OUTPUT_DIR, `spotify-icon-maskable-${size}.png`));
      
      console.log(`Created maskable icon: spotify-icon-maskable-${size}.png`);
    }
    
    // Generate Apple touch icons
    const appleSizes = [120, 152, 167, 180];
    for (const size of appleSizes) {
      const outputPath = path.join(__dirname, '../public/apple-touch-icon-' + size + '.png');
      await sharp(SOURCE_PNG)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`Created Apple touch icon: apple-touch-icon-${size}.png`);
    }
    
    // Create favicon.ico (using 32x32)
    await sharp(SOURCE_PNG)
      .resize(32, 32)
      .png()
      .toFile(path.join(__dirname, '../public/favicon.png'));
    
    console.log('Created favicon: favicon.png');
    
    // Create SVG version for better scaling
    await sharp(SOURCE_PNG)
      .resize(512, 512)
      .png()
      .toFile(path.join(OUTPUT_DIR, 'spotify-logo-green.svg'));
    
    console.log('Created SVG: spotify-logo-green.svg');
    
    console.log('All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

// Run the icon generation
generateIcons();
