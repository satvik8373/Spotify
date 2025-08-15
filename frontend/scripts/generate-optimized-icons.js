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

// Generate PNG icons with small black border for maximum icon size
async function generateOptimizedIcons() {
  console.log('Generating optimized Spotify icons with small black border...');
  
  try {
    // Generate standard icons - with small black border for maximum icon size
    for (const size of ICON_SIZES) {
      // Create a canvas with black background
      const canvas = sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 1 } // Black background
        }
      });
      
      // Resize the icon to fill most of the canvas (90% of size for small border)
      const iconSize = Math.floor(size * 0.9);
      const offset = Math.floor((size - iconSize) / 2);
      
      await canvas
        .composite([{
          input: await sharp(SOURCE_PNG)
            .resize(iconSize, iconSize, { fit: 'fill' })
            .png()
            .toBuffer(),
          left: offset,
          top: offset
        }])
        .png()
        .toFile(path.join(OUTPUT_DIR, `spotify-icon-${size}.png`));
      
      console.log(`Created optimized icon: spotify-icon-${size}.png`);
    }
    
    // Generate maskable icons - with small black border for maximum icon size
    for (const size of [192, 512]) {
      const canvas = sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 1 } // Black background
        }
      });
      
      const iconSize = Math.floor(size * 0.9);
      const offset = Math.floor((size - iconSize) / 2);
      
      await canvas
        .composite([{
          input: await sharp(SOURCE_PNG)
            .resize(iconSize, iconSize, { fit: 'fill' })
            .png()
            .toBuffer(),
          left: offset,
          top: offset
        }])
        .png()
        .toFile(path.join(OUTPUT_DIR, `spotify-icon-maskable-${size}.png`));
      
      console.log(`Created optimized maskable icon: spotify-icon-maskable-${size}.png`);
    }
    
    // Generate Apple touch icons - with small black border for maximum icon size
    const appleSizes = [120, 152, 167, 180];
    for (const size of appleSizes) {
      const outputPath = path.join(__dirname, '../public/apple-touch-icon-' + size + '.png');
      
      const canvas = sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 1 } // Black background
        }
      });
      
      const iconSize = Math.floor(size * 0.9);
      const offset = Math.floor((size - iconSize) / 2);
      
      await canvas
        .composite([{
          input: await sharp(SOURCE_PNG)
            .resize(iconSize, iconSize, { fit: 'fill' })
            .png()
            .toBuffer(),
          left: offset,
          top: offset
        }])
        .png()
        .toFile(outputPath);
      
      console.log(`Created optimized Apple touch icon: apple-touch-icon-${size}.png`);
    }
    
    // Create favicon - with small black border for maximum icon size
    const faviconSize = 32;
    const faviconCanvas = sharp({
      create: {
        width: faviconSize,
        height: faviconSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 } // Black background
      }
    });
    
    const faviconIconSize = Math.floor(faviconSize * 0.9);
    const faviconOffset = Math.floor((faviconSize - faviconIconSize) / 2);
    
    await faviconCanvas
      .composite([{
        input: await sharp(SOURCE_PNG)
          .resize(faviconIconSize, faviconIconSize, { fit: 'fill' })
          .png()
          .toBuffer(),
        left: faviconOffset,
        top: faviconOffset
      }])
      .png()
      .toFile(path.join(__dirname, '../public/favicon.png'));
    
    console.log('Created optimized favicon: favicon.png');
    
    // Create logo variants - with small black border for maximum icon size
    const logoVariants = ['green', 'black', 'white'];
    for (const variant of logoVariants) {
      const logoSize = 512;
      const logoCanvas = sharp({
        create: {
          width: logoSize,
          height: logoSize,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 1 } // Black background
        }
      });
      
      const logoIconSize = Math.floor(logoSize * 0.9);
      const logoOffset = Math.floor((logoSize - logoIconSize) / 2);
      
      await logoCanvas
        .composite([{
          input: await sharp(SOURCE_PNG)
            .resize(logoIconSize, logoIconSize, { fit: 'fill' })
            .png()
            .toBuffer(),
          left: logoOffset,
          top: logoOffset
        }])
        .png()
        .toFile(path.join(OUTPUT_DIR, `spotify-logo-${variant}.png`));
      
      console.log(`Created optimized logo: spotify-logo-${variant}.png`);
    }
    
    // Create shortcut icons - with small black border for maximum icon size
    const shortcutSize = 96;
    const shortcutCanvas = sharp({
      create: {
        width: shortcutSize,
        height: shortcutSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 } // Black background
      }
    });
    
    const shortcutIconSize = Math.floor(shortcutSize * 0.9);
    const shortcutOffset = Math.floor((shortcutSize - shortcutIconSize) / 2);
    
    const shortcutBuffer = await sharp(SOURCE_PNG)
      .resize(shortcutIconSize, shortcutIconSize, { fit: 'fill' })
      .png()
      .toBuffer();
    
    // Create both shortcut icons
    await shortcutCanvas
      .composite([{
        input: shortcutBuffer,
        left: shortcutOffset,
        top: shortcutOffset
      }])
      .png()
      .toFile(path.join(__dirname, '../public/shortcut-liked-96.png'));
    
    await shortcutCanvas
      .composite([{
        input: shortcutBuffer,
        left: shortcutOffset,
        top: shortcutOffset
      }])
      .png()
      .toFile(path.join(__dirname, '../public/shortcut-search-96.png'));
    
    console.log('Created optimized shortcut icons');
    
    console.log('All optimized icons generated successfully!');
  } catch (error) {
    console.error('Error generating optimized icons:', error);
    process.exit(1);
  }
}

// Run the icon generation
generateOptimizedIcons();
