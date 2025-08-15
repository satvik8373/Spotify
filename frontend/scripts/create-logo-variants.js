import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define source and output directories
const SOURCE_PNG = path.join(__dirname, '../public/spotify-icons/spotify-logo-green.png');
const OUTPUT_DIR = path.join(__dirname, '../public/spotify-icons');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Generate logo variants with full-size approach
async function generateLogoVariants() {
  console.log('Generating logo variants with full-size approach...');
  
  try {
    // Create black logo variant
    await sharp(SOURCE_PNG)
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
      })
      .png()
      .toFile(path.join(OUTPUT_DIR, 'spotify-logo-black.png'));
    
    console.log('Created full-size black logo: spotify-logo-black.png');
    
    // Create white logo variant
    await sharp(SOURCE_PNG)
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
      })
      .png()
      .toFile(path.join(OUTPUT_DIR, 'spotify-logo-white.png'));
    
    console.log('Created full-size white logo: spotify-logo-white.png');
    
    // Create SVG versions
    await sharp(SOURCE_PNG)
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
      })
      .png()
      .toFile(path.join(OUTPUT_DIR, 'spotify-logo-black.svg'));
    
    console.log('Created full-size black SVG: spotify-logo-black.svg');
    
    await sharp(SOURCE_PNG)
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
      })
      .png()
      .toFile(path.join(OUTPUT_DIR, 'spotify-logo-white.svg'));
    
    console.log('Created full-size white SVG: spotify-logo-white.svg');
    
    console.log('All logo variants generated successfully!');
  } catch (error) {
    console.error('Error generating logo variants:', error);
    process.exit(1);
  }
}

// Run the logo variant generation
generateLogoVariants();
