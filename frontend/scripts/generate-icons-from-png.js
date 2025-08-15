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

// Generate PNG icons in different sizes with proper padding
async function generateIcons() {
  console.log('Generating Spotify icons from PNG with proper padding...');
  
  try {
    // Generate standard icons with proper padding
    for (const size of ICON_SIZES) {
      // Calculate padding to ensure icon fits properly in the icon area
      const padding = Math.floor(size * 0.15); // 15% padding for better fit
      const iconSize = size - (padding * 2);
      
      await sharp(SOURCE_PNG)
        .resize(iconSize, iconSize)
        .extend({
          top: padding,
          bottom: padding,
          left: padding,
          right: padding,
          background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
        })
        .png()
        .toFile(path.join(OUTPUT_DIR, `spotify-icon-${size}.png`));
      
      console.log(`Created icon: spotify-icon-${size}.png`);
    }
    
    // Generate maskable icons with proper padding for PWA
    for (const size of [192, 512]) {
      // For maskable icons, we need more padding (about 25%)
      const padding = Math.floor(size * 0.25);
      const iconSize = size - (padding * 2);
      
      await sharp(SOURCE_PNG)
        .resize(iconSize, iconSize)
        .extend({
          top: padding,
          bottom: padding,
          left: padding,
          right: padding,
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(path.join(OUTPUT_DIR, `spotify-icon-maskable-${size}.png`));
      
      console.log(`Created maskable icon: spotify-icon-maskable-${size}.png`);
    }
    
    // Generate Apple touch icons with proper padding
    const appleSizes = [120, 152, 167, 180];
    for (const size of appleSizes) {
      const padding = Math.floor(size * 0.15);
      const iconSize = size - (padding * 2);
      const outputPath = path.join(__dirname, '../public/apple-touch-icon-' + size + '.png');
      
      await sharp(SOURCE_PNG)
        .resize(iconSize, iconSize)
        .extend({
          top: padding,
          bottom: padding,
          left: padding,
          right: padding,
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
      
      console.log(`Created Apple touch icon: apple-touch-icon-${size}.png`);
    }
    
    // Create favicon with proper padding
    const faviconSize = 32;
    const faviconPadding = Math.floor(faviconSize * 0.15);
    const faviconIconSize = faviconSize - (faviconPadding * 2);
    
    await sharp(SOURCE_PNG)
      .resize(faviconIconSize, faviconIconSize)
      .extend({
        top: faviconPadding,
        bottom: faviconPadding,
        left: faviconPadding,
        right: faviconPadding,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(path.join(__dirname, '../public/favicon.png'));
    
    console.log('Created favicon: favicon.png');
    
    // Create logo variants with proper padding (using different names to avoid conflicts)
    const logoVariants = ['green', 'black', 'white'];
    for (const variant of logoVariants) {
      const logoSize = 512;
      const logoPadding = Math.floor(logoSize * 0.15);
      const logoIconSize = logoSize - (logoPadding * 2);
      
      await sharp(SOURCE_PNG)
        .resize(logoIconSize, logoIconSize)
        .extend({
          top: logoPadding,
          bottom: logoPadding,
          left: logoPadding,
          right: logoPadding,
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(path.join(OUTPUT_DIR, `spotify-logo-${variant}-padded.png`));
      
      console.log(`Created logo variant: spotify-logo-${variant}-padded.png`);
    }
    
    // Create SVG version for better scaling
    await sharp(SOURCE_PNG)
      .resize(512, 512)
      .png()
      .toFile(path.join(OUTPUT_DIR, 'spotify-logo-green.svg'));
    
    console.log('Created SVG: spotify-logo-green.svg');
    
    console.log('All icons generated successfully with proper padding!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

// Run the icon generation
generateIcons();
