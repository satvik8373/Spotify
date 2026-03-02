import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_PNG = path.join(__dirname, '../public/mavrixfy.png');
const OUTPUT_PATH = path.join(__dirname, '../public/apple-touch-icon.png');

/**
 * Generate iOS icon with proper safe area padding
 * iOS automatically adds rounded corners and effects, so we need to:
 * 1. Add 20% safe area padding (10% on each side)
 * 2. Create a 180x180 icon (iOS standard size)
 */
async function generateIOSIcon() {
  console.log('Generating iOS PWA icon with safe area padding...');
  
  try {
    // Read the source image
    const image = sharp(SOURCE_PNG);
    const metadata = await image.metadata();
    
    // Calculate dimensions
    const finalSize = 180; // iOS standard size
    const iconSize = Math.floor(finalSize * 0.8); // 80% of final size (20% padding total)
    const padding = Math.floor((finalSize - iconSize) / 2); // Center the icon
    
    console.log(`Original size: ${metadata.width}x${metadata.height}`);
    console.log(`Icon size: ${iconSize}x${iconSize}`);
    console.log(`Padding: ${padding}px on each side`);
    console.log(`Final size: ${finalSize}x${finalSize}`);
    
    // Create the icon with padding
    await sharp(SOURCE_PNG)
      .resize(iconSize, iconSize, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
      })
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent padding
      })
      .png()
      .toFile(OUTPUT_PATH);
    
    console.log(`✓ Created iOS icon: ${OUTPUT_PATH}`);
    console.log('✓ Icon has 20% safe area padding for iOS');
    console.log('\nNext steps:');
    console.log('1. Test by adding to iOS home screen');
    console.log('2. Icon should appear properly sized without being cut off');
    
  } catch (error) {
    console.error('Error generating iOS icon:', error);
    process.exit(1);
  }
}

generateIOSIcon();
