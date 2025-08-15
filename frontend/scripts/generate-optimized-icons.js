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

// Generate PNG icons with small black background to increase icon size
async function generateOptimizedIcons() {
  console.log('Generating optimized Spotify icons with small black background...');
  
  try {
    // Generate standard icons - with small black background to make icon appear larger
    for (const size of ICON_SIZES) {
      // Create a black background canvas
      const canvas = sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 1 } // Black background
        }
      });
      
      // Resize the icon to 90% of the canvas size (leaving 5% black border on each side)
      const iconSize = Math.floor(size * 0.9);
      const iconOffset = Math.floor((size - iconSize) / 2);
      
      const icon = sharp(SOURCE_PNG)
        .resize(iconSize, iconSize, {
          fit: 'fill'
        });
      
      // Composite the icon onto the black background
      await canvas
        .composite([{
          input: await icon.toBuffer(),
          top: iconOffset,
          left: iconOffset
        }])
        .png()
        .toFile(path.join(OUTPUT_DIR, `spotify-icon-${size}.png`));
      
      console.log(`Created optimized icon: spotify-icon-${size}.png`);
    }
    
    // Generate maskable icons - with small black background
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
      const iconOffset = Math.floor((size - iconSize) / 2);
      
      const icon = sharp(SOURCE_PNG)
        .resize(iconSize, iconSize, {
          fit: 'fill'
        });
      
      await canvas
        .composite([{
          input: await icon.toBuffer(),
          top: iconOffset,
          left: iconOffset
        }])
        .png()
        .toFile(path.join(OUTPUT_DIR, `spotify-icon-maskable-${size}.png`));
      
      console.log(`Created optimized maskable icon: spotify-icon-maskable-${size}.png`);
    }
    
    // Generate Apple touch icons - with small black background
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
      const iconOffset = Math.floor((size - iconSize) / 2);
      
      const icon = sharp(SOURCE_PNG)
        .resize(iconSize, iconSize, {
          fit: 'fill'
        });
      
      await canvas
        .composite([{
          input: await icon.toBuffer(),
          top: iconOffset,
          left: iconOffset
        }])
        .png()
        .toFile(outputPath);
      
      console.log(`Created optimized Apple touch icon: apple-touch-icon-${size}.png`);
    }
    
    // Create favicon - with small black background
    const faviconCanvas = sharp({
      create: {
        width: 32,
        height: 32,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 } // Black background
      }
    });
    
    const faviconIcon = sharp(SOURCE_PNG)
      .resize(29, 29, { fit: 'fill' }); // 90% of 32
    
    await faviconCanvas
      .composite([{
        input: await faviconIcon.toBuffer(),
        top: 1,
        left: 1
      }])
      .png()
      .toFile(path.join(__dirname, '../public/favicon.png'));
    
    console.log('Created optimized favicon: favicon.png');
    
    // Create main logo - with small black background
    const logoCanvas = sharp({
      create: {
        width: 512,
        height: 512,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 } // Black background
      }
    });
    
    const logoIcon = sharp(SOURCE_PNG)
      .resize(461, 461, { fit: 'fill' }); // 90% of 512
    
    await logoCanvas
      .composite([{
        input: await logoIcon.toBuffer(),
        top: 25,
        left: 25
      }])
      .png()
      .toFile(path.join(OUTPUT_DIR, 'spotify-logo-green.png'));
    
    console.log('Created optimized logo: spotify-logo-green.png');
    
    // Create shortcut icons - with small black background
    const shortcutCanvas = sharp({
      create: {
        width: 96,
        height: 96,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 } // Black background
      }
    });
    
    const shortcutIcon = sharp(SOURCE_PNG)
      .resize(86, 86, { fit: 'fill' }); // 90% of 96
    
    await shortcutCanvas
      .composite([{
        input: await shortcutIcon.toBuffer(),
        top: 5,
        left: 5
      }])
      .png()
      .toFile(path.join(__dirname, '../public/shortcut-liked-96.png'));
    
    await shortcutCanvas
      .composite([{
        input: await shortcutIcon.toBuffer(),
        top: 5,
        left: 5
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
